# Referral Fee Fix Plan

## Problem

The 1% referral fee is calculated off-chain and stored in `referrals.referral_fee_earned` but never sent as USDC to the referrer's wallet. The smart contract (`PoDMPaymentProtocol.sol`) only splits payments between the creator and the platform treasury — it has no referrer concept.

## Approach

After each payment involving a referral fee, send the `referralFee` USDC from the **platform treasury** to the **referrer's wallet** as a separate on-chain transfer. The referral fee is deducted from the platform's commission (as designed), so the treasury forwards the fee after receiving the full platform share.

## Prerequisites

- A server-side wallet that controls USDC at the platform treasury address (`PLATFORM_TREASURY_ADDRESS`). Either:
  - A Privy embedded wallet for the platform (recommended — consistent with existing architecture)
  - Or an EOA private key in env vars
- The treasury wallet must be funded with enough USDC to cover referral fees + gas

## Implementation Steps

### Step 1: Create `referralPayout.service.ts`

New service file with two exports:

**`sendReferralFee(txHash: string, referrerId: string, feeInCents: number): Promise<void>`**

- Called after a payment with a referral fee is confirmed on-chain
- Fetches the referrer's wallet address via `getCryptoWalletForUser(referrerId)`
- If no wallet configured → log warning and return (cannot pay)
- Converts `feeInCents` to USDC units (6 decimals)
- Builds and signs a USDC `transfer(referrerWallet, feeInUnits)` from the platform treasury account
- For the embedded wallet platform: use a platform-specific Privy wallet (could be a singleton created at startup or a designated platform user ID like `__platform__`)
- For an EOA: use `ethers.Wallet` with the private key to sign and send the tx
- Waits for receipt, logs result, records a `ReferralFee` transaction

**`processPendingReferralPayouts(): Promise<void>`**

- Scans `referral_payouts` table for unprocessed payouts
- Processes each one (same logic as above)
- Useful for retries and batch processing

### Step 2: Create `referral_payouts` table

Migration SQL:

```sql
CREATE TABLE IF NOT EXISTS referral_payouts (
  id SERIAL PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES profiles(id),
  source_transaction_id INTEGER NOT NULL REFERENCES transactions(id),
  fee_in_cents INTEGER NOT NULL,
  fee_in_units NUMERIC NOT NULL,  -- USDC decimal amount
  referrer_wallet_address TEXT,
  blockchain_tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, confirmed, failed
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0
);
```

### Step 3: Integrate into payment flows

#### 3a: Embedded wallet flow (`userOperation.service.ts`)

After `recordReferralFee(referrerId, referralFee)` at line 335, add:

```
if (referralFee > 0 && referrerId) {
  sendReferralFee(txHash, referrerId, referralFee)
    .catch(err => console.error('[UserOpService] Referral fee payout failed:', err));
}
```

#### 3b: Browser wallet flow (`cryptoPayment.service.ts`)

After `recordReferralFee(referrerId, referralFee)` at line 278, add the same call.

#### 3c: Verification service (`verification.service.ts`)

Check if `verification.service.ts` also calculates referral fees during background verification (line 195 shows `updatePayload.referral_fee = referralFee`). If so, add the payout call there too.

### Step 4: Platform treasury wallet setup

Two options:

**Option A — Privy embedded wallet (recommended)**
- Create a designated platform user ID (e.g., `__platform_treasury__`)
- Call `ensureEmbeddedWalletForUser('__platform_treasury__')` at startup
- Store the smart account address
- Use the existing `PrivyWalletProvider` + `getOrCreateSmartAccount` + `PimlicoBundlerService` to send UserOps from the treasury
- This matches the existing account abstraction architecture

**Option B — EOA private key**
- Add `PLATFORM_TREASURY_PRIVATE_KEY` to `.env`
- Use `ethers.Wallet` + `JsonRpcProvider` to sign and broadcast USDC transfers directly
- Simpler but harder to rotate keys securely

### Step 5: Handle edge cases

- **No referrer wallet configured**: Log error, set payout status to `failed` with message "Referrer has no wallet". Do NOT retry automatically.
- **Payout tx fails (insufficient balance)**: Set status to `failed`, retry later when treasury is funded.
- **Retry logic**: Max 3 retries with exponential backoff. After that, flag for manual admin intervention.
- **Gas costs**: For the embedded wallet path, gas can be sponsored via the existing Pimlico paymaster. For the EOA path, the treasury must hold ETH for gas.

## Files to modify

| File | Change |
|---|---|
| `server/services/referralPayout.service.ts` | **New** — send USDC from treasury to referrer |
| `server/models/referralPayout.model.ts` | **New** — CRUD for `referral_payouts` table |
| `server/services/userOperation.service.ts` | Call `sendReferralFee` after `recordReferralFee` (line ~336) |
| `server/services/cryptoPayment.service.ts` | Call `sendReferralFee` after `recordReferralFee` (line ~279) |
| `server/services/verification.service.ts` | Call `sendReferralFee` if referral fee is recalculated in background verification |
| `migrations/add_referral_payouts_table.sql` | **New** — migration for `referral_payouts` table |
| `server/.env.example` | Add `PLATFORM_TREASURY_PRIVATE_KEY` if Option B chosen |

## What does NOT need to change

- The smart contract (`PoDMPaymentProtocol.sol`) — no changes needed
- The referral calculation logic (`calculateReferralFee`) — stays the same
- The DB recording (`recordReferralFee`) — stays the same
- The frontend referral stats display — stays the same

## Verification

- After a payment with a referral fee, check that a row appears in `referral_payouts` with status `confirmed`
- Check that the referrer's wallet received the correct USDC amount on BaseScan
- Check that a `ReferralFee` transaction was recorded in the `transactions` table
- Verify in the UI that `referral_fee_earned` still increments correctly
