# Phase 5: Crypto & Smart Contract Deep Dive

**Created:** 2026-07-02
**Phase:** 5 (Crypto & Smart Contract)
**Deliverable:** Smart contract analysis, blockchain integration architecture, transaction flow, crypto payment service
**Covers:** Solidity contract, crypto backend service/controller/routes, database schema, frontend wallet integration

---

## Table of Contents

1. [Smart Contract Analysis](#1-smart-contract-analysis)
2. [Backend Crypto Service](#2-backend-crypto-service)
3. [Crypto API Endpoints](#3-crypto-api-endpoints)
4. [Transaction Flow](#4-transaction-flow)
5. [Database Schema](#5-database-schema)
6. [Network Configuration](#6-network-configuration)
7. [Frontend Integration](#7-frontend-integration)
8. [Security Analysis](#8-security-analysis)
9. [Gap Analysis & Recommendations](#9-gap-analysis--recommendations)

---

## 1. Smart Contract Analysis

### 1.1 Contract Overview

| Property | Value |
|---|---|
| **File** | `PoDM_project/contracts/PoDMPaymentProtocol.sol` |
| **Language** | Solidity ^0.8.20 |
| **Lines** | 147 |
| **Type** | Payment splitter with event logging |
| **Standard** | ERC-20 `transferFrom` (USDC) |
| **Owner** | Single address (deployer) |
| **Deployment** | Base network (Ethereum L2) |

### 1.2 State Variables

```solidity
address public owner;                    // Deployer — controls treasury and fee
address public platformTreasury;         // Where platform fees are sent
uint256 public platformFeeBps;           // Fee in basis points (1 BPS = 0.01%)
```

All state variables are `public` (auto-generated getters). No upgrade mechanism (no proxy pattern, no UUPS).

### 1.3 Events

| Event | Parameters | When Emitted |
|---|---|---|
| `SubscriptionPaid` | `fan, creator, token, totalAmount, tierIdHash, platformFee, creatorAmount` | Successful subscription payment |
| `TipPaid` | `fan, creator, token, totalAmount, platformFee, creatorAmount` | Successful tip payment |
| `PPVPaid` | `fan, creator, token, totalAmount, contentIdHash, platformFee, creatorAmount` | Successful PPV unlock |
| `TreasuryUpdated` | `oldTreasury, newTreasury` | Treasury address changed |
| `FeeUpdated` | `oldFee, newFee` | Platform fee changed |

**Privacy consideration:** `tierIdHash` and `contentIdHash` are emitted as `bytes32` hashes rather than raw IDs to obscure the specific tier/content being purchased.

### 1.4 Payment Functions

All 3 payment functions follow the same pattern:

```
payX(tokenAddress, creator, amount, ...idHash):
    1. Validate: creator != address(0), amount > 0
    2. Calculate: platformFee = (amount * platformFeeBps) / 10000
    3. Calculate: creatorAmount = amount - platformFee
    4. Transfer: token.transferFrom(msg.sender, platformTreasury, platformFee)
    5. Transfer: token.transferFrom(msg.sender, creator, creatorAmount)
    6. Emit: Event(fan=msg.sender, ...)
```

**Key behavior:** Tokens are pulled directly from the payer (`msg.sender`) using `transferFrom`. The payer must have called `USDC.approve(contractAddress, amount)` before invoking the contract.

### 1.5 Admin Functions

| Function | Permission | Description |
|---|---|---|
| `setPlatformTreasury(address)` | `onlyOwner` | Update fee destination (requires non-zero address) |
| `setPlatformFeeBps(uint256)` | `onlyOwner` | Update fee rate (capped at 3000 BPS = 30%) |

### 1.6 Security Properties

| Property | Status |
|---|---|
| **Reentrancy** | Not vulnerable — only external calls are `token.transferFrom()` which follow checks-effects-interactions pattern |
| **Integer overflow** | Solidity 0.8+ has built-in overflow protection |
| **Access control** | `onlyOwner` modifier for admin functions |
| **Input validation** | Zero-address checks on creator and treasury; amount > 0; fee ≤ 30% |
| **No selfdestruct** | No `selfdestruct` or `delegatecall` — contract is permanent |
| **No upgradeability** | No proxy pattern — contract logic is immutable after deployment |

**No emergency pause mechanism exists** — if a vulnerability is discovered, the contract cannot be stopped.

---

## 2. Backend Crypto Service

### 2.1 File Overview

| File | Lines | Role |
|---|---|---|
| `services/cryptoPayment.service.ts` | 302 | Core logic — wallet config, on-chain verification, off-ramp |
| `controllers/cryptoPayment.controller.ts` | 69 | Request handling (4 endpoints) |
| `routes/cryptoPayment.routes.ts` | 40 | Route definitions mounted at `/api/v1/payments/crypto` |

### 2.2 Service Functions

#### `getUserWalletConfig(userId: string): WalletConfig`

Reads crypto wallet fields from `profiles` table.

```typescript
interface WalletConfig {
  walletAddress: string | null;
  walletType: 'none' | 'embedded' | 'custom';
  payoutPreference: 'debit_card' | 'on_chain' | 'base' | 'monad' | 'megaeth';
}
```

#### `updateUserWalletConfig(userId: string, input: WalletConfigInput): WalletConfig`

Updates the same three `crypto_*` columns on `profiles`.

#### `verifyAndRecordBasePayment(input: PaymentVerificationInput): Transaction` (Core Function, ~188 lines)

This is the most complex function in the crypto stack. Step-by-step logic:

```
INPUT: { txHash, fanId, creatorId, amountInCents, transactionType, relatedId? }
  │
  1. DEDUP CHECK
  │   └── TransactionModel.findByTxHash(txHash) ? → 409 Conflict
  │
  2. HASH VALIDATION
  │   └── /^0x([A-Fa-f0-9]{64})$/.test(txHash) ? → 400 Invalid format
  │
  3. CREATOR WALLET CHECK
  │   └── Get creator's wallet address from profiles → 400 if none
  │
  4. SANDBOX CHECK (⚠️ DEVELOPMENT BYPASS)
  │   └── txHash.startsWith('0x0000') ? → skip to step 8
  │
  5. NETWORK SELECTION (from creator's payoutPreference)
  │   ├── 'base' → RPC: mainnet.base.org / sepolia.base.org
  │   │             USDC: 0x8335...2913 / 0x036e...4D914
  │   ├── 'monad' → RPC: monad-mainnet.g.allthatnode.com / testnet
  │   └── 'megaeth' → RPC: mainnet.megaeth.systems / testnet
  │
  6. RPC CALL
  │   └── eth_getTransactionReceipt via axios.post
  │       ├── Receipt null? → 404 "Transaction not found on-chain"
  │       ├── Status != 0x1? → 400 "Transaction failed on-chain"
  │       └── Error? → 503 "Verification service offline"
  │
  7. CONTRACT INTERACTION VERIFICATION
  │   ├── receipt.to === contractAddress? → contract called directly
  │   ├── OR any receipt.logs[].address === contractAddress?
  │   └── Neither? → 400 "Interacted target is not the PoDM smart contract"
  │
  8. RECIPIENT VERIFICATION
  │   └── event.topics[2] → extract last 20 bytes as address
  │       └── Matches creator's configured wallet? → 400 "Recipient mismatch"
  │
  9. AMOUNT VERIFICATION
  │   └── Parse first 32 bytes of log data as totalAmount (6-decimal USDC)
  │       └── abs(totalAmount/10000 - amountInCents) > 1? → 400 "Amount mismatch"
  │
  10. FINANCIAL CALCULATION
  │    ├── platformFee = Math.round(amount * 0.125)  // 12.5% platform commission
  │    └── creatorPayout = amount - platformFee
  │
  11. DATABASE RECORD
  │    ├── TransactionModel.createTransaction({ status: 'Cleared', ... })
  │    └── Update tx with: blockchain_tx_hash, payment_method: 'crypto',
  │        payment_currency: 'USDC', chain_id
  │
  OUTPUT: Created Transaction record
```

#### `processDebitCardOffRamp(creatorId, amountInCents, debitCardToken?): PayoutResult`

```
INPUT: { creatorId, amountInCents, debitCardToken? }
  │
  1. VERIFY WALLET CONFIGURED
  │   └── Get creator's wallet → 400 if no wallet
  │
  2. VERIFY PAYOUT PREFERENCE === 'debit_card'
  │   └── → 400 if preference is 'on_chain'
  │
  3. CREATE TRANSACTION
  │   └── TransactionModel.createTransaction({ type: 'Payout', ... })
  │
  4. RETURN MOCK RESPONSE
  │   └── { transferId: 'mock_cb_...', estimatedArrival: 'In 5-10 minutes' }
  
  ⚠️ This is a mock implementation — no actual payout API is called.
```

### 2.3 External API Calls

| Call | Method | URL | Purpose |
|---|---|---|---|
| `eth_getTransactionReceipt` | POST (JSON-RPC) | Per-network RPC URL | Fetch on-chain transaction receipt |
| None | — | — | No BaseScan, Etherscan, or other block explorer API used |

### 2.4 RPC Configuration

```typescript
// Network determination based on creator's payout preference
let rpcUrl: string;
let usdcAddress: string;
let chainId: number;

if (network === 'base') {
  // Production
  rpcUrl = 'https://mainnet.base.org';
  usdcAddress = '0x8335...2913';    // Base USDC placeholder
  chainId = 8453;
  // Development
  // rpcUrl = 'https://sepolia.base.org';
  // usdcAddress = '0x036e...4D914'; // Base Sepolia USDC placeholder
  // chainId = 84532;
} else if (network === 'monad') {
  rpcUrl = 'https://monad-mainnet.g.allthatnode.com';
  chainId = 10143;
} else if (network === 'megaeth') {
  rpcUrl = 'https://mainnet.megaeth.systems';
  chainId = 9999;
}
```

All RPC URLs and contract addresses are hardcoded fallbacks — environment variables (`BASE_RPC_URL`, `MONAD_RPC_URL`, etc.) are not defined in any `.env` file.

### 2.5 Event Topic Hashes (Placeholder)

```typescript
const EVENT_TOPICS = {
  SubscriptionPaid: '0x7b233a1b...placeholder...',
  TipPaid: '0x629c4202...placeholder...',
  PPVPaid: '0x3289abcc...placeholder...'
};
```

**These are explicitly placeholder values** — not real keccak256 hashes. The actual log parsing logic uses `to` address matching and log origin address rather than topic filtering.

---

## 3. Crypto API Endpoints

### 3.1 Route Map

All mounted at `/api/v1/payments/crypto`:

| Endpoint | Method | Auth | Controller | Purpose |
|---|---|---|---|---|
| `/wallet` | GET | `protect` | `getWalletConfig` | Read user's wallet configuration |
| `/wallet` | POST | `protect` | `updateWalletConfig` | Update wallet address/type/preference |
| `/verify` | POST | `protect` | `verifyCryptoPayment` | Verify on-chain transaction and record |
| `/withdraw` | POST | `protect` | `requestWithdrawal` | Request crypto withdrawal (mock) |

### 3.2 Request/Response Shapes

**GET /wallet**
```
→ { walletAddress: string | null, walletType: string, payoutPreference: string }
```

**POST /wallet**
```
Body: { walletAddress: string, walletType: 'embedded' | 'custom', payoutPreference: 'debit_card' | 'on_chain' }
→ { success: true, data: { walletConfig } }
```

**POST /verify**
```
Body: {
  txHash: string,          // 0x-prefixed 64-char hex
  creatorId: string,
  amountInCents: number,
  transactionType: 'Tip' | 'PPV Message' | 'PPV Post' | 'Subscription',
  relatedId?: string        // contentId for PPV, tierId for subscription
}
→ { success: true, data: { transaction } }
```

**POST /withdraw**
```
Body: { amountInCents: number, debitCardToken?: string }
→ { success: true, data: { transferId, estimatedArrival } }
```

---

## 4. Transaction Flow

### 4.1 Complete Crypto Payment Flow

```
FAN WALLET                  FRONTEND                  BACKEND                  BLOCKCHAIN
    │                          │                        │                        │
    │  1. Connect wallet       │                        │                        │
    │  (MetaMask/embedded)     │                        │                        │
    │<─────────────────────────│                        │                        │
    │                          │                        │                        │
    │  2. Approve USDC spend   │                        │                        │
    │  (USDC.approve(contract,  │                        │                        │
    │   amount))               │                        │                        │
    │<─────────────────────────│                        │                        │
    │                          │                        │                        │
    │  3. Sign contract tx     │                        │                        │
    │  (contract.payTip/Tip/   │                        │                        │
    │   PPV(...))              │                        │                        │
    │─────────────────────────>│                        │                        │
    │                          │                        │                        │
    │  [Wallet confirms tx]    │                        │                        │
    │──────────────────────────┼────────────────────────┼───────────────────────>│
    │                          │                        │                        │
    │                          │                        │  4. Transaction         │
    │                          │                        │  submitted to mempool  │
    │                          │                        │                        │
    │  [Tx mined]              │                        │                        │
    │<─────────────────────────┼────────────────────────┼────────────────────────│
    │                          │                        │                        │
    │  5. POST /verify         │                        │                        │
    │  { txHash, creatorId,   │                        │                        │
    │    amountInCents, ... }  │                        │                        │
    │─────────────────────────>│                        │                        │
    │                          │  6. eth_getTransaction │                        │
    │                          │  Receipt(txHash)       │                        │
    │                          │────────────────────────────────────────────────>│
    │                          │                        │                        │
    │                          │  7. Verify receipt:    │                        │
    │                          │  - status == 0x1       │                        │
    │                          │  - to == contract      │                        │
    │                          │  - topics[2] == creator│                        │
    │                          │  - data[0:32] == amount│                        │
    │                          │                        │                        │
    │                          │  8. Create DB record   │                        │
    │                          │  (status: Cleared)     │                        │
    │                          │                        │                        │
    │  ← { success, data }     │                        │                        │
    │<─────────────────────────│                        │                        │
```

### 4.2 Subscriber Use: Frontend → Backend → Contract

1. Fan visits creator profile → selects subscription tier
2. `SubscriptionModal` prompts wallet connection (`useCryptoWallet`)
3. Fan approves USDC spend (pre-approval step)
4. Fan signs transaction with contract
5. On success, fan's wallet submits tx hash to `POST /verify`
6. Backend verifies on-chain → creates subscription + transaction record
7. Fan now has access to tier-gated content

### 4.3 Verification Failure Recovery

| Failure Point | User Experience | Data State |
|---|---|---|
| RPC connection fails | "Verification service offline, try again later" | No DB record created |
| Transaction still pending | "Transaction not found on-chain, it might still be pending" | No DB record created |
| Transaction failed | "Transaction failed on the blockchain" | No DB record created |
| Wrong contract | "Interacted target is not the PoDM smart contract" | No DB record created |
| Recipient mismatch | "Transaction recipient does not match creator's wallet" | No DB record created |
| Amount mismatch | "Transaction amount mismatch" | No DB record created |
| Duplicate hash | "Already processed" | Existing record returned |
| Sandbox bypass (0x0000) | Succeeds with fake verification | Record created with sandbox hash |

---

## 5. Database Schema

### 5.1 Profiles Table (Crypto Fields)

| Column | Type | Default | Constraint |
|---|---|---|---|
| `crypto_wallet_address` | `text` | — | — |
| `crypto_wallet_type` | `text` | `'none'` | `IN ('none', 'embedded', 'custom')` |
| `crypto_wallet_payout_preference` | `text` | `'debit_card'` | `IN ('debit_card', 'on_chain', 'base', 'monad', 'megaeth')` |

Index: `idx_profiles_crypto_wallet` on `crypto_wallet_address`

### 5.2 Transactions Table (Crypto Fields)

| Column | Type | Default | Constraint |
|---|---|---|---|
| `blockchain_tx_hash` | `text` | — | Unique (application-enforced) |
| `payment_method` | `text` | `'stripe'` | `IN ('stripe', 'crypto')` |
| `payment_currency` | `text` | `'USD'` | `IN ('USD', 'USDC')` |
| `chain_id` | `integer` | — | 8453 (Base), 10143 (Monad), 9999 (MegaETH) |

Index: `idx_transactions_tx_hash` on `blockchain_tx_hash`

### 5.3 Type Definitions Gap

The shared type at `common/types/Transaction.ts` does **not** include any of the blockchain-specific fields:

```typescript
// Current Transaction type (MISSING crypto fields):
interface Transaction {
  id: string;
  fan_id: string;
  creator_id: string;
  amount_in_cents: number;
  platform_fee: number;
  creator_payout: number;
  type: string;
  status: string;
  // MISSING: blockchain_tx_hash, payment_method, payment_currency, chain_id
}
```

---

## 6. Network Configuration

### 6.1 Supported Networks

| Network | Type | Chain ID | RPC URL | USDC Address |
|---|---|---|---|---|
| **Base** (prod) | L2 (Ethereum) | 8453 | `mainnet.base.org` | `0x8335...2913` (placeholder) |
| **Base Sepolia** (dev) | Testnet | 84532 | `sepolia.base.org` | `0x036e...4D914` (placeholder) |
| **Monad** | L1 | 10143 | `monad-mainnet.g.allthatnode.com` | N/A (native) |
| **MegaETH** | L1 | 9999 | `mainnet.megaeth.systems` | N/A (native) |

### 6.2 Smart Contract Addresses

All contract addresses are **placeholder values** in the code:

```typescript
const contractAddress = process.env.CONTRACT_ADDRESS
  || '0xBasePoDMPaymentProtocolAddressPlaceholder';
```

The actual deployed contract address must be set via `CONTRACT_ADDRESS` environment variable.

### 6.3 Environment Variables

| Variable | Status | Source |
|---|---|---|
| `ETHEREUM_RPC_URL` | Defined in `.env` | Generic RPC fallback |
| `CONTRACT_ADDRESS` | Defined in `.env` | Smart contract address |
| `PRIVATE_KEY` | Defined in `.env` | Wallet private key |
| `PLATFORM_TREASURY_ADDRESS` | Defined in `.env` | Treasury destination |
| `BASE_RPC_URL` | **Not defined** | Uses hardcoded fallback |
| `MONAD_RPC_URL` | **Not defined** | Uses hardcoded fallback |
| `MEGAETH_RPC_URL` | **Not defined** | Uses hardcoded fallback |

---

## 7. Frontend Integration

### 7.1 Wallet Hook

Located at `src/shared/hooks/useCryptoWallet.ts` (98 LOC)

**Exports:**
```typescript
const useCryptoWallet = () => ({
  isConnected: boolean,
  walletAddress: string | null,
  balance: number,           // Always 1250.00 USDC
  isLoading: boolean,
  error: string | null,
  connectWallet: (type: 'embedded' | 'custom') => Promise<void>,
  disconnectWallet: () => Promise<void>,
  verifyTransactionOnBackend: (params: {
    txHash, creatorId, amountInCents, transactionType, relatedId?
  }) => Promise<any>,
});
```

**CRITICAL: Wallet connection is fully mocked:**
```typescript
const connectWallet = async (type: 'embedded' | 'custom') => {
  setIsLoading(true);
  await new Promise(r => setTimeout(r, 800));  // Fake delay
  setWalletAddress(type === 'embedded'
    ? '0x84f2...78453'      // Hardcoded embedded address
    : '0x5C3C...5F78'       // Hardcoded custom address
  );
  setBalance(1250.00);       // Always the same fake balance
  setIsConnected(true);
  setIsLoading(false);
};
```

**Uses raw `fetch()` instead of apiClient:**
```typescript
const verifyTransactionOnBackend = async (params) => {
  const response = await fetch('/api/v1/payments/crypto/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  // ⚠️ No auth interceptor — bypasses apiClient entirely
};
```

### 7.2 Wallet Settings UI

Located at `src/features/creator/WalletSettings.tsx` (480 LOC)

- Embedded vs custom wallet selection
- Payout network selector (Base/Monad/MegaETH)
- USDC balance display (from mock hook)
- Withdrawal modal with debit card off-ramp
- Also uses raw `fetch()` for crypto endpoints

### 7.3 Subscription Modal (Crypto Flow)

Located at `src/features/profile/SubscriptionModal.tsx` (251 LOC)

- Two-step flow: connect wallet → approve subscription
- Uses `useCryptoWallet` hook
- Network detection/switch for Base/Monad/MegaETH
- Simulated on-chain transaction

---

## 8. Security Analysis

### 8.1 Risk Assessment

| Risk | Severity | Status | Mitigation Needed |
|---|---|---|---|
| **Sandbox bypass in production** | Critical | **Unmitigated** | Gate `0x0000` prefix skip behind `NODE_ENV !== 'production'` |
| **No event topic verification** | High | Mitigated (partial) | Using `to` address match instead — weaker than topic-based filtering |
| **Hardcoded contract addresses** | High | **Unmitigated** | Relying on env variable override, but placeholders would fail silently |
| **No RPC authentication** | Medium | **Unmitigated** | Public RPC endpoints used — no API keys, rate limit sharing |
| **Missing type definitions** | Medium | **Unmitigated** | `Transaction` type doesn't include blockchain fields |
| **Raw fetch in frontend** | Medium | **Unmitigated** | Bypasses apiClient auth interceptors |
| **Mock wallet integration** | Medium | **Acceptable** | Known limitation — placeholder until real wallet SDK integrated |
| **No rate limiting on /verify** | Low | **Unmitigated** | No protection against spam RPC calls |
| **No contract upgradeability** | Low | Acceptable | Immutable is standard for value-holding contracts |
| **No emergency pause** | Low | Acceptable | Risk accepted by design |
| **No on-chain subscription renewal** | Low | Acceptable | One-time payments only |

### 8.2 Smart Contract Security

| Property | Detail |
|---|---|
| **Reentrancy** | Not vulnerable — `transferFrom` calls after state changes |
| **Overflow** | Solidity 0.8+ provides built-in overflow protection |
| **Access control** | `onlyOwner` modifier for admin functions |
| **Input validation** | Zero-address checks, amount > 0, fee ≤ 30% |
| **No delegatecall** | No proxy/upgrade mechanism |
| **No selfdestruct** | Contract is permanent on-chain |

---

## 9. Gap Analysis & Recommendations

### 9.1 Critical Gaps

| # | Gap | Impact | Target |
|---|---|---|---|
| 1 | **Sandbox hash bypass** — `0x0000` prefix skips all on-chain verification | Anyone can create fake verified transactions in production | Gate with `NODE_ENV !== 'production'` |
| 2 | **Type definitions lagging** — `Transaction` type missing `blockchain_tx_hash`, `payment_method`, `payment_currency`, `chain_id` | TypeScript errors, no compile-time safety | Add fields to `common/types/Transaction.ts` |
| 3 | **No event topic hash verification** — `EVENT_TOPICS` are placeholders, unused in parsing | Cannot filter specific event types — any event from contract address matches | Compute actual keccak256 hashes and filter by topic0 |
| 4 | **Hardcoded contract addresses** — All are placeholder strings | Production deployment would verify against non-existent contract | Ensure env vars set for production |

### 9.2 Moderate Gaps

| # | Gap | Impact | Target |
|---|---|---|---|
| 5 | **No RPC API keys** — Public endpoints used | Rate limiting, potential reliability issues | Add `BASE_RPC_API_KEY`, `ALLTHATNODE_API_KEY` env vars |
| 6 | **Frontend uses raw fetch** — Bypasses apiClient | No auth interceptor, no error handling | Route through apiClient.post() |
| 7 | **No BaseScan/Etherscan API** — Only direct RPC calls | No indexed log lookup, no historical data, higher RPC load | Add block explorer API for event log verification |
| 8 | **Off-ramp is mock** — `processDebitCardOffRamp` returns fake data | Cannot actually withdraw crypto to fiat | Integrate Stripe/Coinbase On-Ramp API |

### 9.3 Minor Gaps

| # | Gap | Impact | Target |
|---|---|---|---|
| 9 | **No rate limiting on /verify** | Potential RPC spam | Add express-rate-limit middleware |
| 10 | **No subscription renewal contract** | One-time payments only | Consider recurring payment contract pattern |
| 11 | **No contract deployment verification** | Unknown if Solidity source matches deployed bytecode | Verify on BaseScan |
| 12 | **No automated tests for crypto service** | Regression risk | Add Jest unit tests for verification logic |

### 9.4 Recommendations

**Immediate (before production):**
1. Gate sandbox bypass with `NODE_ENV !== 'production'`
2. Compute real keccak256 event topic hashes and use topic0 filtering
3. Add blockchain fields to `Transaction` type definition
4. Verify deployed contract address and set env var

**Short-term:**
5. Add RPC API keys to environment variables
6. Route frontend crypto calls through `apiClient` instead of raw `fetch`
7. Add rate limiting to `/verify` endpoint

**Medium-term:**
8. Replace mock wallet connection with real SDK (MetaMask, WalletConnect)
9. Implement real off-ramp via Stripe/Coinbase
10. Add unit tests for `verifyAndRecordBasePayment`
11. Consider adding BaseScan API for indexed event log verification

---

## Appendix: File Reference

| File | Path | LOC | Role |
|---|---|---|---|
| Smart Contract | `PoDM_project/contracts/PoDMPaymentProtocol.sol` | 147 | On-chain payment splitter |
| Crypto Service | `PoDM_project/server/services/cryptoPayment.service.ts` | 302 | Verification + wallet mgmt |
| Crypto Controller | `PoDM_project/server/controllers/cryptoPayment.controller.ts` | 69 | Request handlers |
| Crypto Routes | `PoDM_project/server/routes/cryptoPayment.routes.ts` | 40 | Route definitions |
| Wallet Hook | `podm-frontend/src/shared/hooks/useCryptoWallet.ts` | 98 | Frontend wallet (mock) |
| Wallet Settings | `podm-frontend/src/features/creator/WalletSettings.tsx` | 480 | Wallet UI |
| Subscription Modal | `podm-frontend/src/features/profile/SubscriptionModal.tsx` | 251 | Subscription crypto flow |
| Migration 1 | `PoDM_project/migrations/add_crypto_fields.sql` | — | DB schema: crypto columns |
| Migration 2 | `PoDM_project/migrations/update_crypto_constraints.sql` | — | DB schema: expanded prefs |
| Transaction Type | `PoDM_project/common/types/Transaction.ts` | — | Shared type (missing crypto fields) |
| Creator Type | `PoDM_project/common/types/Creator.ts` | — | Has crypto_wallet_payout_preference |
