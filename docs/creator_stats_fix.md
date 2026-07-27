# Creator Stats Fix — PPV & Tips Amounts Not Showing

## Diagnosis

Two separate root causes found after tracing the full payment-to-analytics pipeline.

---

## Root Cause 1 — Background verification reverts embedded-wallet transactions to `Failed`

**The chain:**

```
processPaymentIntent (userOperation.service.ts:301)
  → TransactionModel.createTransaction({ status: 'Cleared' })
  → verifyPaymentReceiptInBackground (fires async, not awaited)
    → polls eth_getTransactionReceipt up to 60s
    → CHECK: receipt.to ?   ← FAILS: receipt.to is EntryPoint (0x000…32),
                              NOT the PoDM contract address
    → FIRST CHECK FAILS
    → receipt.to === contractAddress?  → NO
    → falls to logs check (correct)
    → BUT: all other checks are pass/fail gates
    → If ANY check fails → sets status = 'Failed'
    → Analytics query: .eq('status', 'Cleared') → returns empty
```

The background verification at `verification.service.ts:104` checks `receipt.to.toLowerCase() === contractAddress.toLowerCase()`. For ERC-4337 UserOps, the transaction goes to the **EntryPoint** contract, not the PoDM contract. This check always fails. The fallback log check eventually runs, but if any subsequent check fails (recipient address mismatch, amount precision, event topic mismatch), the transaction is marked **Failed**.

**Result:** All embedded-wallet transactions (PPV Messages, Tips, Subscriptions) get reverted to `Failed` within 60 seconds of creation. The analytics queries (`.eq('status', 'Cleared')`) return nothing. Revenue Breakdown pie chart, Top Content PPV/Tips columns, and Earnings summary all show $0.

### Fix

**File:** `PoDM_project/server/services/verification.service.ts`

1. **Line 104** — Remove the `receipt.to` check for ERC-4337 transactions. For UserOps, the `to` address is always the EntryPoint. Only rely on log inspection:

    ```typescript
    const contractInteracted = receipt.logs && receipt.logs.some((log: any) =>
      log.address && log.address.toLowerCase() === contractAddress.toLowerCase() &&
      log.topics && log.topics[0] === expectedTopic
    );

    if (!contractInteracted) {
      // ... set Failed ...
    }
    ```

2. **Lines 133–145** — The recipient check uses `getCreatorWalletFromProfile` which reads `crypto_wallet_address` from profiles. For embedded-wallet payments, `processPaymentIntent` calls `getCryptoWalletForUser(intent.creatorId)` which may return the treasury address (see AGENTS.md violation). The verification must use the same wallet resolution chain:

    1. Try `crypto_wallet_address` from profile
    2. Fall back to `getCryptoWalletForUser(creatorId)` (which may return treasury — needs separate fix per AGENTS.md rule)
    3. If still empty, skip the recipient check (cannot verify what we don't know)

3. **Lines 147–161** — The amount precision check uses `parseInt(totalAmountHex, 16)` then `/ 10000`. USDC has 6 decimals. `rawAmount` is in micro-units (e.g. 5000000 for $5). `blockchainAmountInCents = Math.round(5000000 / 10000)` = 500 cents. This is correct. No change needed.

4. **Optional** — Add a `skipOnChainVerification` flag on the transaction (or check `payment_method`) to skip background verification for browser-wallet transactions that were already verified by `verifyAndRecordBasePayment`.

---

## Root Cause 2 — `content.stats.tips` and `content.stats.ppvEarnings` never persisted

**Two separate issues:**

### 2a. `stats.tips` is initialized to 0 at content creation and never incremented

`content.service.ts:277`: `stats: { views: 0, galleryAdds: 0, tips: 0 }`

No code in the entire codebase updates `content.stats.tips` after a tip is received. The old `cryptoPayments.ts` didn't either. This column has always been $0.

**Fix:** Add a `supabase.rpc('increment_content_tip_count', ...)` call (similar to `increment_content_view_count` and `increment_gallery_add_count`) and call it after recording a tip transaction.

**Files to change:**
- `PoDM_project/server/services/cryptoPayment.service.ts` — after `verifyAndRecordBasePayment` creates the transaction, if `input.relatedId` is set, increment `content.stats.tips`
- `PoDM_project/server/services/userOperation.service.ts` — after `processPaymentIntent` creates the transaction, if `intent.relatedId` is set and type is `Tip`, increment `content.stats.tips`

### 2b. `stats.ppvEarnings` only computed by analytics endpoint, not stored in DB

`creator.service.ts:225-232` merges `ppvEarnings` into the response of `getAnalyticsData()` only. The `GET /content/my-content` endpoint returns raw `content.stats` from the DB, which doesn't have `ppvEarnings`.

**Fix (option A — easier):** Add the same PPV transaction merge to the content fetch endpoint.

**Fix (option B — more robust):** Persist `ppvEarnings` into `content.stats` when a PPV transaction is recorded (similar to 2a). Then all endpoints automatically include it.

**File to change (option A):** The `getMyCreatorContent` route/service should merge PPV earnings into each content item's stats before returning.

**File to change (option B):** `cryptoPayment.service.ts` and `userOperation.service.ts` — after creating a PPV transaction, increment `content.stats.ppvEarnings` by the `creator_payout` amount.

---

## Summary of Changes

| File | Priority | Change |
|---|---|---|
| `verification.service.ts` | **HIGH** | Fix `receipt.to` check for EntryPoint; fix recipient wallet resolution fallback |
| `userOperation.service.ts` | **HIGH** | After creating a Tip/PPV transaction, increment `content.stats.tips` or `content.stats.ppvEarnings` |
| `cryptoPayment.service.ts` | **MEDIUM** | Same stats update for browser-wallet payments |
| `creator.service.ts` (analytics) | **LOW** | Expand PPV earnings query to include `'PPV Message'` (currently only `'PPV Post'`) |
| `content.service.ts` | **LOW** | Merge PPV earnings into content response or rely on persisted stats |

## Verification

1. Send a tip via embedded wallet → check `content.stats.tips` is incremented
2. Send a tip via browser wallet → same
3. Unlock a PPV Message → check `content.stats.ppvEarnings` is incremented (or at least visible in analytics)
4. Reload analytics page → Revenue Breakdown shows Tip and PPV with correct values
5. Reload content page → PPV and Tips columns show correct amounts
6. `npm run lint` and `npx tsc --noEmit` pass on both backend and frontend
