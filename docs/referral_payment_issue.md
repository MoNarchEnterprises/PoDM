# Referral Payment Issue

## Summary

The 1% referral fee (revenue share for percentage-type referrals) is calculated and tracked in the database but **never actually transferred as USDC to the referrer's wallet**. Referrers see `referral_fee_earned` increment in the UI, but no on-chain payment ever occurs.

## Root Cause

### 1. Smart contract has no referrer concept

`contracts/contracts/PoDMPaymentProtocol.sol` — the three payment functions (`paySubscription`, `payTip`, `payPPV`) each split the amount into two destinations:

- `platformFee` → `platformTreasury` (hardcoded contract address)
- `creatorAmount` → creator wallet (passed as parameter)

There is no `referrer` address parameter, no third transfer. The contract architecture only supports a two-way split (platform + creator).

### 2. Referral fee is a paper-only deduction

In both payment flows, the referral fee is deducted from the **platform commission** on paper only:

**`userOperation.service.ts:289-304`** (embedded wallet flow):
```
platformFee = amount * commissionRate / 100
referralFee = amount * 0.01  (capped at platformFee)
adjustedPlatformFee = platformFee - referralFee
```
The `adjustedPlatformFee` is stored in the `transactions` table, but the on-chain UserOp still transfers the **full, unadjusted `platformFee`** to the platform treasury contract address. No on-chain transfer of `referralFee` to the referrer occurs.

**`cryptoPayment.service.ts:239-249`** (browser wallet flow):
Identical logic — same problem. The browser wallet calls the contract directly with `paySubscription(fan, creator, fullAmount)`, and the contract sends `platformFee` to treasury + `creatorAmount` to creator. The referral fee calculation only affects what's written to the `transactions.platform_fee` column.

### 3. `recordReferralFee` only updates a DB column

`referral.service.ts:96-117` — `recordReferralFee` simply adds the fee amount to `referrals.referral_fee_earned`. It does **not** initiate any USDC transfer.

### 4. Both payment flows are affected

| Flow | File | Referral Fee On-Chain? |
|---|---|---|
| Embedded wallet (UserOp) | `userOperation.service.ts` | No — only `adjustedPlatformFee` in DB |
| Browser wallet (MetaMask/Coinbase) | `cryptoPayment.service.ts` | No — only `adjustedPlatformFee` in DB |
| `SubscriptionService.createSubscriptionForUser` | `subscription.service.ts:42-49` | No — uses `cryptoPayment.service.ts` path |

### 5. Where the money actually goes

In a $10 subscription (`commissionRate = 20%`):

| Party | Expected | Actual On-Chain |
|---|---|---|
| Creator | $8.00 | $8.00 ✅ |
| Platform treasury | $1.90 ($2.00 - $0.10 referral) | $2.00 ❌ (keeps referral fee too) |
| Referrer | $0.10 | $0.00 ❌ (never paid) |

The platform treasury ends up keeping the referral fee that should have gone to the referrer.

## Consequence

Referrers never receive USDC for their 1% revenue share. The `referral_fee_earned` counter is misleading — it suggests earned value that cannot be withdrawn or claimed.
