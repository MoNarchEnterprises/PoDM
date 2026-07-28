# Referral Fee Implementation Plan

## Overview

Two referral bonus types. **The referrer chooses one** when they share their
link — they are mutually exclusive, never both.

| Code | Bonus Type | Referrer Receives |
|---|---|---|
| `{USERNAME}-CASH` | Milestone cash bonus | $50 ($75 with speed bonus) when referred creator earns $750 in 30 days — from platform treasury |
| `{USERNAME}-PERCENT` | 1% revenue share | 1% of each transaction's `creator_payout` for 180 days — deducted from platform commission |

A referred creator is linked to exactly one referral code, which has exactly
one `bonus_type`. The two paths never overlap:

- `getPercentageReferralInfo` only matches `bonus_type = 'percentage'`
- Milestone bonus (`checkAndAwardMilestoneBonus`) only matches `bonus_type = 'cash'` and skips percentage — already enforced at `referral.model.ts:196`

Both totals are tracked in the referrer's dashboard/referral stats.

---

## Current State vs Target

### Transaction Fee Split (per $100 fan payment)

| Party | Current | With 1% Referral |
|---|---|---|
| Referred Creator | $87.50 (87.5%) | $87.50 (87.5%) — **unchanged** |
| Platform | $12.50 (12.5%) | $11.50 (11.5%) |
| Referrer | $0.00 | $1.00 (1%) |

The referred creator's payout never changes. The 1% is deducted from the platform's commission.

---

## Database Changes

### 1. Add `referral_fee` to `transactions` table

**Migration:** `migrations/add_referral_fee_to_transactions.sql`

```sql
ALTER TABLE transactions ADD COLUMN referral_fee INTEGER DEFAULT 0;
ALTER TABLE transactions ADD COLUMN referrer_id UUID REFERENCES profiles(id);
```

- `referral_fee` — cents deducted from `platform_fee` and owed to the referrer
- `referrer_id` — the user who referred the creator (referral bonus recipient)
- Existing transactions get `referral_fee = 0, referrer_id = null` — no migration needed for backfill

### 2. Add `referral_fee_earned` to `referrals` table

**Migration:** `migrations/add_referral_fee_earned_to_referrals.sql`

```sql
ALTER TABLE referrals ADD COLUMN referral_fee_earned INTEGER DEFAULT 0;
```

- Tracks total 1% fees earned by this referral code (separate from `total_bonus_earned` which tracks cash bonuses)

### 3. Update `Transaction` type

**File:** `common/types/Transaction.ts`

```typescript
export interface Transaction {
  // ... existing fields ...
  referral_fee?: number;   // NEW: cents deducted from platform_fee, owed to referrer
  referrer_id?: string;    // NEW: user who receives the referral fee
}
```

---

## Shared Service: `referral.service.ts` (NEW)

All referral fee logic lives here — the single source of truth called by every payment processing path.

**Location:** `PoDM_project/server/services/referral.service.ts`

### Function 1: `getPercentageReferralInfo`

```typescript
/**
 * Checks if a creator was referred under a percentage (revenue-share) referral.
 * Only matches bonus_type = 'percentage' (mutually exclusive with cash).
 * Returns null if not applicable or outside the 180-day window.
 */
async function getPercentageReferralInfo(
  creatorId: string
): Promise<{ referrerId: string; referralId: string; referredSince: Date } | null>
```

**Logic:**
1. Query `referral_applications` + `referrals` where `applicant_user_id = creatorId` and `bonus_type = 'percentage'`
2. If found and `now - referredSince < 180 days`, return referrer info
3. Otherwise return `null`

**Called by:** All 3 payment services (Step 2 of each).

### Function 2: `calculateReferralFee`

```typescript
/**
 * Calculates the referral fee for a given transaction.
 * The fee is deducted from the platform's commission, not from the creator's payout.
 *
 * @returns The referral fee in cents (0 if no percentage referral applies)
 */
async function calculateReferralFee(params: {
  creatorId: string;
  amountInCents: number;
  commissionRate: number;
}): Promise<{ referralFee: number; referrerId: string | null }>
```

**Logic:**
1. Call `getPercentageReferralInfo(creatorId)`
2. If no percentage referral → return `{ referralFee: 0, referrerId: null }`
3. Calculate `creatorPayout = amountInCents - Math.round(amountInCents * commissionRate / 100)`
4. Calculate `referralFee = Math.round(creatorPayout * 0.01)` — 1% of what the creator earns
5. Ensure `referralFee <= platformFee` — guard against negative platform fee
6. Return `{ referralFee, referrerId }`

**Called by:** All 3 payment services.

### Function 3: `recordReferralFee`

```typescript
/**
 * Updates the referrer's referral_fee_earned after a transaction with referral fee is recorded.
 * Fire-and-forget (catches errors internally).
 */
async function recordReferralFee(referrerId: string, feeAmount: number): Promise<void>
```

**Logic:**
1. Query the percentage referral record for this referrer
2. `UPDATE referrals SET referral_fee_earned = referral_fee_earned + feeAmount WHERE id = ?`

### Function 4: `awardMilestoneBonus`

```typescript
/**
 * Checks if a referred creator has reached the $750 milestone and awards
 * the cash bonus from the platform treasury.
 * Only applies to bonus_type = 'cash' (mutually exclusive with percentage).
 * Existing eligibility logic in referral.model.ts checkAndAwardMilestoneBonus;
 * this function adds the actual payout step.
 */
async function awardMilestoneBonus(creatorId: string): Promise<void>
```

**Logic:**
1. Call existing `checkAndAwardMilestoneBonus` (only fires for `bonus_type = 'cash'`)
2. If bonus is awarded > 0: create a transaction of type `'ReferralBonus'` for the referrer
   - `fan_id` = referrer's ID (they receive the bonus)
   - `creator_id` = referrer's ID (they are the beneficiary)
   - `amount` = bonus amount in cents
   - `platform_fee` = 0
   - `creator_payout` = bonus amount in cents
   - `status` = 'Cleared'
   - `payment_method` = 'referral_bonus'

### Function 5: `getReferrerEarnings`

```typescript
/**
 * Gets total referral earnings for a user (both 1% fees and cash bonuses).
 */
async function getReferrerEarnings(userId: string): Promise<{
  referralFeeEarned: number;   // cents from 1% share
  cashBonusEarned: number;     // cents from milestone bonuses
  totalReferred: number;       // number of referred creators who have earnings
}>
```

**Logic:**
1. Query referrer's `referrals` records
2. Sum `referral_fee_earned` across all percentage referrals
3. Sum `total_bonus_earned` across all cash referrals
4. Return combined stats

---

## Payment Processing Changes (3 locations)

Every location that calculates `platform_fee` and `creator_payout` must also compute the referral fee and adjust `platform_fee` downward.

### Location 1: `cryptoPayment.service.ts` (browser wallet path)

**File:** `PoDM_project/server/services/cryptoPayment.service.ts`

**Insert after line 241** (after `creatorPayout` calculation, before transaction creation):

```typescript
// Check percentage referral fee (deducted from platform commission)
const { referralFee, referrerId } = await calculateReferralFee({
  creatorId: input.creatorId,
  amountInCents: amount,
  commissionRate,
});

const adjustedPlatformFee = platformFee - referralFee;
```

**Then pass to `createTransaction`:**
```typescript
platform_fee: adjustedPlatformFee,
referral_fee: referralFee,
referrer_id: referrerId,
```

**After transaction creation** (after line 271, before blockchain metadata update):
```typescript
if (referralFee > 0 && referrerId) {
  recordReferralFee(referrerId, referralFee);
}
```

### Location 2: `userOperation.service.ts` (embedded wallet path)

**File:** `PoDM_project/server/services/userOperation.service.ts`

**Insert after line 295** (after `creatorPayout` calculation, before transaction creation):

```typescript
const { referralFee, referrerId } = await calculateReferralFee({
  creatorId: intent.creatorId,
  amountInCents: intent.amountInCents,
  commissionRate,
});

const adjustedPlatformFee = platformFee - referralFee;
```

**Then pass to `createTransaction`:**
```typescript
platform_fee: adjustedPlatformFee,
referral_fee: referralFee,
referrer_id: referrerId,
```

**After transaction creation** (after the content stats update block at line 327):
```typescript
if (referralFee > 0 && referrerId) {
  recordReferralFee(referrerId, referralFee);
}
```

### Location 3: `verification.service.ts` (background verification)

**File:** `PoDM_project/server/services/verification.service.ts`

**Insert after line 175** (after `creatorPayout` recalculation, before the `UPDATE`):

```typescript
const { referralFee, referrerId } = await calculateReferralFee({
  creatorId,
  amountInCents,
  commissionRate,
});

const adjustedPlatformFee = platformFee - referralFee;
```

**Then in the `UPDATE` at line 177-178:**
```typescript
platform_fee: adjustedPlatformFee,
referral_fee: referralFee,
referrer_id: referrerId,
```

---

## Frontend: Referrer's Dashboard

### Add referral fee stats to `ReferralCodes.tsx`

**File:** `podm-frontend/src/features/creator/ReferralCodes.tsx`

1. **New API call** — `apiClient.getReferrerEarnings()` → `GET /referrals/earnings`

2. **Display cards** below existing referral codes:
   - "Referral Fees Earned" — total from 1% revenue share (in dollars)
   - "Cash Bonuses Earned" — total from milestone bonuses (in dollars)
   - "Active Referrals" — number of referred creators generating revenue

3. **Add to each referral code card:**
   - For percentage codes: show "1% revenue share active — $X earned so far"
   - For cash codes: show "$50 base bonus + $25 speed bonus"

### Add referral earnings to `ReferralStats` model

**File:** `PoDM_project/server/models/referral.model.ts`

Update `getReferralStats` to also return `referralFeeEarned` by summing `referral_fee_earned` across the user's percentage referrals.

---

## Milestone Bonus: Actual Payout

### Fix `checkAndAwardMilestoneBonus` to record a transaction

**File:** `PoDM_project/server/models/referral.model.ts`

**Current:** The function updates `bonus_awarded` and `total_bonus_earned` but does not create any financial record. The referrer never actually receives the money.

**Fix:** After line 245 (the `UPDATE referrals SET total_bonus_earned`), add:

```typescript
// Record the bonus as a platform payout transaction
await TransactionModel.createTransaction({
  fan_id: referral.user_id,           // referrer receives the bonus
  creator_id: referral.user_id,       // self-referential (platform grants)
  type: 'ReferralBonus',             // NEW transaction type
  amount: Math.round(bonusAmount * 100),
  platform_fee: 0,
  creator_payout: Math.round(bonusAmount * 100),
  status: 'Cleared',
  payment_method: 'referral_bonus',
});
```

### Add `'ReferralBonus'` to `TransactionType`

**File:** `common/types/Transaction.ts`

```typescript
export type TransactionType = 'Subscription' | 'SubscriptionRenewal' | 'Tip'
  | 'PPV Message' | 'PPV Post' | 'Payout' | 'OnRamp' | 'ReferralBonus';
```

---

## 6-Month Cutoff

The `getPercentageReferralInfo` function enforces the 180-day window:

```typescript
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const daysSinceReferral = (now.getTime() - referredSince.getTime()) / MS_PER_DAY;
if (daysSinceReferral > 180) return null; // outside 6-month window
```

The 6-month clock starts from `referral_applications.created_at` (the date the referred creator signed up). After 180 days, `calculateReferralFee` returns 0 for all future transactions.

---

## Files Changed Summary

| File | Change |
|---|---|
| `migrations/add_referral_fee_to_transactions.sql` | NEW — add `referral_fee`, `referrer_id` to `transactions` |
| `migrations/add_referral_fee_earned_to_referrals.sql` | NEW — add `referral_fee_earned` to `referrals` |
| `common/types/Transaction.ts` | Add `referral_fee`, `referrer_id` fields; add `'ReferralBonus'` type |
| `server/services/referral.service.ts` | NEW — shared referral fee logic |
| `server/services/cryptoPayment.service.ts` | Insert referral fee calculation before `createTransaction` |
| `server/services/userOperation.service.ts` | Insert referral fee calculation before `createTransaction` |
| `server/services/verification.service.ts` | Insert referral fee recalculation before `UPDATE` |
| `server/models/referral.model.ts` | Add `referral_fee_earned` to stats; add `createTransaction` in milestone bonus |
| `server/models/transaction.model.ts` | No changes needed (uses generic `createTransaction`) |
| `server/controllers/referral.controller.ts` | Add `getReferrerEarnings` handler |
| `server/routes/referral.routes.ts` | Add `GET /earnings` route |
| `podm-frontend/src/features/creator/ReferralCodes.tsx` | Display referral fee earnings |
| `podm-frontend/src/lib/apiClient.ts` | Add `getReferrerEarnings` method |

---

## DRY Verification

Every piece of referral fee logic is called from exactly one place:

| Logic | Location | Called By |
|---|---|---|
| Check if creator has percentage referral | `referral.service.ts` `getPercentageReferralInfo` | `calculateReferralFee` (same file) |
| Calculate 1% fee amount | `referral.service.ts` `calculateReferralFee` | 3 payment services |
| Update referrer's `referral_fee_earned` | `referral.service.ts` `recordReferralFee` | 3 payment services |
| Award milestone bonus | `referral.service.ts` `awardMilestoneBonus` | cron/event trigger |
| Get referrer's total earnings | `referral.service.ts` `getReferrerEarnings` | controller → frontend |

No payment service computes a referral fee inline. No duplication across the three payment processing paths.

---

## Order of Implementation

1. **Migration** — add columns to `transactions` and `referrals`
2. **Types** — update `TransactionType` and `Transaction` interface
3. **Service** — create `referral.service.ts` with all 5 functions
4. **Payment services** — insert calls in all 3 locations
5. **Model** — update `referral.model.ts` milestone bonus to create a transaction
6. **Controller + Route** — add earnings endpoint
7. **Frontend** — display referral fee stats

Steps 1-3 are prerequisites. Steps 4-7 can be done in parallel after step 3.
