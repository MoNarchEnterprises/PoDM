# Fan Payment Plan — USDC on Base for Subscriptions, Tips, and PPV

## Current State: Fan Payment Flow

The system has **two parallel payment paths**, both broken or mocked:

### 1. Stripe Path (Legacy — endpoints return 404)

- `POST /payments/tip`, `/unlock-post`, `/unlock-message`, `/confirm-transaction` all dead
- `TipModal.tsx` and `UnlockModal.tsx` still call Stripe CardElement but get 404
- `useStripePayment` hook is effectively dead code
- ~~`POST /users/me/setup-payment-method` (Stripe Setup Intent) — ABORTED, removed from codebase~~

### 2. Crypto Path (Active but fully mocked)

- `SubscriptionModal.tsx` uses `useCryptoWallet` which returns hardcoded addresses and a fake `1250.00 USDC` balance
- Wallet connection simulates 800ms delay — no real wallet integration
- Backend `verifyAndRecordBasePayment()` has a **sandbox bypass**: any `txHash` starting with `0x0000` skips all on-chain verification
- Smart contract `PoDMPaymentProtocol.sol` (Solidity) exists on disk but **never deployed**
- No actual USDC moves — any authenticated user can create "verified" transactions with zero payment
- Contract addresses, event topic hashes all placeholder values
- No RPC API keys configured

### 3. Payout Path (Fully mocked)

- `processDebitCardOffRamp()` returns fake `{ transferId: 'mock_cb_...' }`
- No real on-chain payout
- Creators see confirmation but never receive funds

### 4. Stack is EVM/Solidity throughout

- Smart contract: `PoDMPaymentProtocol.sol` (Solidity, 147 LOC, `pragma solidity ^0.8.20`)
- Backend verification: `eth_getTransactionReceipt` via Ethereum JSON-RPC
- Frontend wallet: `window.ethereum` (MetaMask/EIP-1193) pattern
- Target chain: **Base** (Coinbase L2, chain ID 8453/84532) — Monad and MegaETH are being dropped

---

## Target State

```
Fan opens checkout
  ├── Has wallet with USDC on Base? ──> Pay / approve recurring subscription
  └── No wallet / no USDC? ──> Coinbase On-Ramp (card / Apple Pay / Google Pay)
                              └─> buys USDC on Base ──> contract processes payment

Creator payout:
  ├── Requests payout in dashboard
  └── Backend calls contract.processPayout() → USDC sent to creator wallet on Base Sepolia
```

Three payment types all use the same Base USDC pipeline:
- **Subscriptions** — fan approves recurring USDC allowance; keeper pulls payment each period via `processRenewal()`
- **Tips** — direct USDC transfer via `payTip()`
- **PPV** — USDC payment unlocks content via `payPPV()`

---

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Blockchain** | Base only | Monad/MegaETH dropped. Coinbase L2 for Coinbase on/off-ramp, Apple Pay, debit card cash-outs |
| **Deploy target** | Base Sepolia first | All testing on devnet before mainnet |
| **Token** | USDC (ERC-20 on Base) | Stable, widely adopted, natively supported by Coinbase |
| **Smart contract language** | Solidity | Already written (`PoDMPaymentProtocol.sol`), EVM tooling mature |
| **Wallet standard** | EIP-1193 (`window.ethereum`) | MetaMask, Coinbase Wallet, Phantom in EVM mode — all work with existing pattern |
| **Verification** | `eth_getTransactionReceipt` | Already built in `cryptoPayment.service.ts` |
| **Fee source** | `profiles.commission_rate` | Per-creator fee from settings, falls back to `DEFAULT_COMMISSION_RATE` (12.5%) |
| **Subscriptions** | Recurring allowance | Fan approves spend cap; keeper cron calls `processRenewal()` each period |
| **Payout** | On-chain USDC transfer | Platform treasury → creator wallet on Base Sepolia (not mocked) |
| **Fiat on-ramp** | Coinbase On-Ramp | Users buy USDC with card / Apple Pay |

---

## Implementation Phases

### Phase 1: Smart Contract — Deploy + Extend

**What exists:** `PoDM_project/contracts/PoDMPaymentProtocol.sol` — a payment splitter with `paySubscription()`, `payTip()`, `payPPV()`, fee config via BPS, owner-only treasury/fee controls.

**What's missing:** No compile pipeline, no deploy script, no test suite, no verified contract on Base. No recurring subscription support. No payout function.

#### Infrastructure

| Task | Detail |
|---|---|
| Add development tooling | Hardhat or Foundry config at `PoDM_project/contracts/hardhat.config.ts` |
| Add dependencies | `hardhat`, `@nomicfoundation/hardhat-toolbox`, `@openzeppelin/contracts-upgradeable`, `dotenv` |
| Write deploy script | `PoDM_project/contracts/scripts/deploy.ts` — deploys to Base Sepolia, verifies on BaseScan |
| Write tests | Unit tests for fee split, recurring renewals, payout, access control, pause |
| Deploy to Base Sepolia | Testnet deployment with test USDC (`0x036eFd9011037348926609f2A377B6729024D914`) |
| Deploy to Base mainnet | Production deployment, verify contract source on BaseScan |
| Update env vars | `BASE_CONTRACT_ADDRESS`, `BASE_TESTNET_CONTRACT_ADDRESS` — remove placeholder values |

#### Existing Contract Gaps to Fix

| Gap | Fix |
|---|---|
| No pause mechanism | Add `whenNotPaused` from OpenZeppelin's `Pausable` |
| `PaymentType` enum exists but not stored on-chain | Store payment type in event data for off-chain indexing |
| No upgrade mechanism | Add UUPS proxy pattern (OpenZeppelin) for future fee/treasury updates |

#### New Functions to Add

```solidity
// --- Recurring Subscription Allowance ---

struct RecurringAllowance {
    uint256 maxAmountPerPeriod;   // Max USDC per period (6 decimals)
    uint256 periodInSeconds;      // e.g. 30 days = 2592000
    uint256 lastRenewalAt;        // Unix timestamp of last pull
    bool active;
}

mapping(address => mapping(address => RecurringAllowance)) public allowances;

// Fan sets or updates a recurring allowance for a creator
function approveRecurringSubscription(
    address creator,
    uint256 maxAmountPerPeriod,
    uint256 periodInSeconds
) external;

// Fan revokes allowance
function revokeRecurringSubscription(address creator) external;

// Anyone can trigger a renewal. Pulls period amount if allowance covers it and period elapsed.
function processRenewal(address fan, address creator, uint256 amount) external returns (bool);

// --- Payout ---

// Platform treasury sends USDC to creator
function processPayout(address creator, uint256 amount) external onlyOwner;

// --- New Events ---
event SubscriptionApproved(address indexed fan, address indexed creator, uint256 maxAmount, uint256 period);
event SubscriptionRevoked(address indexed fan, address indexed creator);
event SubscriptionRenewed(address indexed fan, address indexed creator, uint256 amount, uint256 renewedAt);
event PayoutCompleted(address indexed creator, uint256 amount);
```

### Phase 2: Backend — Fee from Creator Settings, Drop Monad/MegaETH ✅ **DONE**

**`server/services/cryptoPayment.service.ts` — rewritten:**

```
1. Dedup check (blockchain_tx_hash unique)
2. Format validation (/^0x([A-Fa-f0-9]{64})$/)
3. Fetch creator profile → read crypto_wallet_address
4. Strict on-chain verification via eth_getTransactionReceipt:
   a. Verify receipt exists, status === 0x1
   b. Verify contract interaction (PoDMPaymentProtocol on Base)
   c. Verify creator address matches topics[2] in contract event log
   d. Decode totalAmount from log data, verify matches requested amount
5. Fetch creator profile → read commission_rate (per-creator fee)
6. Fee calculation: feeRate = creator.commission_rate ?? DEFAULT_COMMISSION_RATE
7. INSERT transaction with blockchain_tx_hash, chain_id, payment_method, payment_currency
8. Returns { transactionId, status, txHash, amount }
```

- **All Monad/MegaETH dropped** — Base-only (chain ID 8453 mainnet, 84532 testnet)
- **Fee reads from `profiles.commission_rate`** — per-creator, nullable, falls back to `DEFAULT_COMMISSION_RATE`
- **0x0000 sandbox bypass removed** — all transactions verified on-chain
- **Real keccak256 event topics** computed via `ethers.keccak256(toUtf8Bytes(signature))`
- **Contract address loaded from env** (`BASE_CONTRACT_ADDRESS` / `BASE_TESTNET_CONTRACT_ADDRESS`)

**`server/utils/fee.utils.ts` — rewritten:**

- `getCommissionRateForCreator(creatorId)` — reads `profiles.commission_rate`, falls back to `DEFAULT_COMMISSION_RATE`
- `calculatePlatformFee(amountInCents, feePercentage)` — simple math function

**No separate `VerificationService` file** — verification logic is inline in `verifyAndRecordBasePayment()` to keep DB writes and RPC calls in one transaction.

**Other fixes applied:**

| Issue | Fix |
|---|---|
| 0x0000 sandbox bypass | Removed entirely |
| Placeholder event topic hashes | Real `keccak256` computed via ethers.js |
| Hardcoded contract addresses | Loaded from env vars (`BASE_CONTRACT_ADDRESS`, `BASE_TESTNET_CONTRACT_ADDRESS`) |
| No RPC URL config | `getRpcConfig()` reads `BASE_RPC_URL` / `BASE_TESTNET_RPC_URL` with fallbacks |
| Amount tolerance | Reduced to 1-cent tolerance (integer USDC vs cents conversion) |

### Phase 3: Frontend — Replace Mocked Wallet with Real Integration

**What exists:** `useCryptoWallet.ts` returns hardcoded addresses, fake 1250 USDC balance, 800ms simulated delay.

**What it should do:** Connect to real browser wallets (MetaMask, Coinbase Wallet, Phantom in EVM mode) via `window.ethereum`.

**`src/shared/hooks/useCryptoWallet.ts` rewrite:**

```typescript
function useCryptoWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  async function connect(): Promise<void> {
    // Request accounts via window.ethereum.request({ method: 'eth_requestAccounts' })
    // Switch to Base Sepolia (chain ID 84532) for devnet
    // Fetch USDC balance via ERC-20 balanceOf call
    // Listen for accountsChanged, chainChanged events
  }

  async function switchToBaseSepolia(): Promise<void> {
    // wallet_switchEthereumChain for chain ID 84532
    // fallback wallet_addEthereumChain with Base Sepolia RPC
  }

  async function getUsdcBalance(address: string): Promise<number> {
    // ERC-20 balanceOf call via ethers.js or viem
  }

  return { address, balance, chainId, isConnected, connect, disconnect, switchToBaseSepolia };
}
```

**New dependency:** `viem` or `ethers` (or `wagmi` for full React integration)

**Remove from `useCryptoWallet`:** All mock data, setTimeout delays, hardcoded addresses. ✅ **Done — see updated implementation above.**

### Phase 4: Coinbase On-Ramp for Card Payments ✅ **DONE**

**For fans without crypto:** Let them buy USDC with a card, Apple Pay, or Google Pay. The USDC lands on Base and triggers the payment.

**`server/services/onramp.service.ts` (new):**

```typescript
class OnRampService {
  async createCharge(amount, fanId, destinationWallet): Promise<{ sessionId, hostUrl }>
    // POST to Coinbase API to create session
    // Records pending transaction in DB
    // Returns hosted URL for redirect or iframe embed

  async handleWebhook(rawBody, signature): Promise<void>
    // Verifies HMAC-SHA256 signature
    // Processes charge_completed events
    // Updates transaction status to Cleared + records txHash
  }
}
```

**`server/controllers/onramp.controller.ts`** — `createOnRampSession`, `handleOnRampWebhook`
**`server/routes/onramp.routes.ts`** — `POST /api/v1/payments/onramp/session`, `POST /api/v1/payments/onramp/webhook`
**`src/components/shared/OnRampButton.tsx`** — Frontend card payment button:
- Calls backend to create session
- Opens Coinbase On-Ramp hosted URL in new tab
- Shows status/success/error states

**Env vars:** Already in `.env`:
```
COINBASE_ONRAMP_API_KEY=       # Set this
COINBASE_ONRAMP_WEBHOOK_SECRET= # Set this
COINBASE_ONRAMP_APP_ID=        # Set this
```

**Note:** Requires setting the three `COINBASE_ONRAMP_*` env vars before the API calls will succeed. Without them, the service returns a 500 with a clear configuration error message.

### Phase 5: Subscriptions — Recurring Allowances

**Frontend — `PaymentModal` subscription flow:**

```
Step 1: Connect wallet (Phase 3)
Step 2: Choose subscription tier
Step 3: Approve recurring allowance
  ├── "Set up recurring subscription"
  ├── Amount: {tier.price} USDC / {billing_cycle}
  ├── Period: Monthly (30 days)
  └── Sign → wallet submits approveRecurringSubscription() tx
Step 4: POST /payments/verify with txHash + transactionType: 'subscription_allowance'
Step 5: Backend records allowance, creates subscription with next_renewal_at = now + period
```

**Backend keeper — `server/jobs/renewSubscriptions.ts` (new):**

```typescript
// Cron job (runs daily at 00:00 UTC):
// 1. Query subscriptions WHERE next_renewal_at <= now AND status = 'active'
// 2. For each:
//    a. Check fan's contract allowance covers the tier price
//    b. Call contract.processRenewal(fanWallet, creatorWallet, amount)
//    c. On confirmed: INSERT transaction { type: 'SubscriptionRenewal', amount, ... }
//    d. Update subscription.next_renewal_at = now + period
//    e. On failure (allowance revoked, insufficient funds): mark subscription as 'expired'
```

**Fan cancellation:** Cancel button in `/fan/subscriptions` calls `revokeRecurringSubscription(creator)` on-chain via wallet, then `DELETE /subscriptions/:id` to update DB.

### Phase 6: Payout — Real On-Chain (Not Mocked)

**What exists:** `processDebitCardOffRamp()` returns fake `{ transferId: 'mock_cb_...' }`.

**What it should do:** Send USDC from platform treasury to creator's wallet via the smart contract `processPayout()` function.

**`server/services/payout.service.ts` (rewrite):**

```typescript
async function processPayout(
    creatorId: string,
    amountInCents: number
): Promise<{ txHash: string }> {
    // 1. Validate balance: SUM(creator_payout WHERE type IN ('Subscription','Tip','PPV'))
    //    - SUM(amount WHERE type = 'Payout')
    //    Reject if amountInCents > available
    // 2. Row-level lock: SELECT ... FROM transactions WHERE creator_id = ? FOR UPDATE
    // 3. Get creator's crypto_wallet_address from profile
    // 4. Call contract.processPayout(creatorWallet, amountInUSDC)
    //    (uses owner/treasury wallet signer — stored server-side)
    // 5. Wait for tx confirmation via eth_getTransactionReceipt
    // 6. INSERT transaction {
    //      type: 'Payout',
    //      amount: amountInCents,
    //      platform_fee: 0,
    //      creator_payout: -amountInCents,
    //      status: 'Cleared',
    //      blockchain_tx_hash: txHash,
    //      payment_method: 'crypto',
    //      payment_currency: 'USDC',
    //      chain_id: 84532  // Base Sepolia
    //    }
    // 7. Return txHash
}
```

**Env vars:**

```
TREASURY_PRIVATE_KEY=<platform treasury wallet private key for signing payouts>
(on Base Sepolia this can be funded with test ETH + test USDC)
```

### Phase 7: Unify Tip / PPV / Subscription UI

**What exists:** Three separate modals — `TipModal.tsx`, `UnlockModal.tsx`, `SubscriptionModal.tsx`.

**Target:** Single `PaymentModal.tsx` component used by all three flows.

```tsx
<PaymentModal
  type: 'tip' | 'ppv' | 'subscription'
  amount: number
  recipient: Creator
  relatedId?: contentId | tierId
  onSuccess: () => void
/>
```

**Modal flow:**

```
Step 1: "How would you like to pay?"
  ├── [Connect Wallet] — MetaMask / Coinbase Wallet / Phantom (EVM)
  │     Shows USDC balance, address
  └── [Buy USDC with Card] — Coinbase On-Ramp
        Card form → buys USDC → auto-pays

Step 2: Confirm / Approve Recurring
  ├── type === 'tip' || 'ppv':        "Pay {amount} USDC" → submit tx → POST /verify
  ├── type === 'subscription':         Approve recurring {amount} USDC / {period}
  │                                    → sign approveRecurringSubscription() → POST /verify
  └── Both: show loading, tx hash

Step 3: Success / Error
  ├── Show tx link to BaseScan
  └── On error: retry or change payment method
```

**Remove dead code:**

| File | Action |
|---|---|
| `TipModal.tsx` | Replace with `PaymentModal({ type: 'tip' })` |
| `UnlockModal.tsx` | Replace with `PaymentModal({ type: 'ppv' })` |
| `SubscriptionModal.tsx` | Replace with `PaymentModal({ type: 'subscription' })` |
| `useStripePayment.ts` | Delete — Stripe replaced by on-ramp |
| `CARD_ELEMENT_OPTIONS` constant | Delete |
| `FanSettings.tsx` Stripe payment method section | Replace with wallet connection panel |

### Phase 8: Fix Security Gaps

| Gap | Severity | Fix |
|---|---|---|
| 0x0000 sandbox bypass | Critical | Remove entirely — even in devnet, require real tx |
| Frontend uses raw `fetch()` for crypto verify | High | Route through `apiClient` to get auth headers |
| Placeholder event topics in backend | Medium | Compute real `keccak256` in code |
| Hardcoded contract addresses | Medium | Load from env vars |
| No RPC API keys | High | Add env vars, rate limit |
| Balance race condition on payout | High | Row-level locking (`SELECT ... FOR UPDATE`) |
| No minimum payout threshold | Low | Configurable minimum (e.g., $10) |
| No webhook for tx confirmation | Medium | Coinbase On-Ramp webhook endpoint |

---

## What Does NOT Change

| Layer | What stays |
|---|---|
| **Smart contract language** | Solidity |
| **Backend verification** | `eth_getTransactionReceipt` on Base |
| **Frontend wallet pattern** | `window.ethereum` (EIP-1193) |
| **Token** | USDC (ERC-20) |
| **Platform fee default** | 12.5% (used as fallback if creator has no custom `commission_rate`) |
| **Transaction table** | Same schema — `payment_method: 'crypto'`, `payment_currency: 'USDC'` |

---

## Implementation Order

| Phase | Description | Effort | Risk | Dependencies |
|---|---|---|---|---|
| 1 | **Smart contract** — deploy, add recurring subscription + payout functions, add tests | High | High | Hardhat/Foundry, BaseScan API key |
| 2 | **Backend** — fee from creator settings, drop Monad/MegaETH, fix verification ✅ | Medium | Low | Phase 1 (contract address) |
| 3 | **Wallet** — replace mock with real `window.ethereum` integration ✅ | Medium | Medium | raw EIP-1193 (no new deps) |
| 4 | **On-Ramp** — Coinbase On-Ramp for card → USDC ✅ | Medium | Low | Coinbase API keys |
| 5 | **Subscriptions** — recurring allowance UI + keeper cron job | Medium | Medium | Phase 1, Phase 3 |
| 6 | **Payout** — real on-chain USDC transfer, remove mock | Medium | Medium | Phase 1 (processPayout function) |
| 7 | **Unify payment UI** — single `PaymentModal` | Medium | Low | Phases 3-5 |
| 8 | **Security gaps** — fix alongside all phases | Low | High | Throughout |
