# Content & Gallery Fix Plan

Investigation plan for three related issues: (A) tips not showing on the creator content page, (B) verifying PPV shows correctly on the content page, and (C) marking content as saved in feed/messages so it can't be added to the gallery twice. No code changes yet — this is the plan to review.

---

## Summary of findings

| Issue | Root cause | Severity |
|---|---|---|
| A. Tips don't show on content page | Tip crypto transactions never carry `related_content_id`, and the content `stats.tips` JSONB is never incremented (frontend never sends the contentId with the tip intent) | High |
| B. PPV on content page | Works correctly today — PPV transactions DO store `related_content_id` and the enrichment aggregates `creator_payout`. Needs verification + minor hardening | Low |
| C. Gallery double-add | `GalleryModel.addItemToGallery` appends without dedupe; `inGallery` is missing on the creator public-profile and content-detail endpoints | Medium |

---

## A. Tips not showing on the creator content page

### Symptom
- Money reaches the creator's wallet; `amount`, `platform_fee`, `referral_fee`, `creator_payout` are all correct in the transaction.
- The **Tips** column on the creator content page (`CreatorContent.tsx:490`, `item.stats?.tips`) shows **$0.00**.

### Root cause (two compounding gaps)

The content page gets tips via `enrichContentWithEarnings` (`server/services/content.service.ts:374-428`), which has two sources:
1. **Transactions** — sums `transactions.amount` for `type='Tip'` matched by `related_content_id`.
2. **Fallback** — `content.stats.tips` JSONB, which is only maintained by `incrementContentTipStats` (`content.service.ts:433`).

**Gap 1 — Tip transactions never store `related_content_id`.**
Both transaction-recording paths guard `related_content_id` behind a "content transaction" check that excludes Tips:
- `server/services/cryptoPayment.service.ts:279-280` — `isContentTransaction = type === 'PPV Post' || type === 'PPV Message'`
- `server/services/userOperation.service.ts:317-318` — same guard

So `related_content_id` is `NULL` on every Tip transaction → the enrichment's transaction query (`content.service.ts:381-387`) returns nothing for tips.

**Gap 2 — The frontend never sends the contentId with the tip intent, so the JSONB fallback never fires either.**
- `TipModal` is rendered from `ContentCard.tsx:88-93` with only `creator` — the content id is NOT passed.
- Embedded path: `TipModal.tsx:114-124` renders `<EmbeddedPaymentModal type="Tip" .../>` with **no `relatedId`** → `EmbeddedPaymentModal.tsx:50-55` builds an intent with `relatedId: undefined`.
- Browser path: `TipModal.tsx:80-89` → `payWithBrowserWallet({ paymentType: 'Tip', amount, creatorId, ... })` with **no `contentId`** → `PaymentOrchestrator.ts:122-132` → `useCryptoPayment` verify call has `relatedId: undefined`.
- Because `relatedId` is always undefined, `incrementContentTipStats(intent.relatedId, ...)` (`userOperation.service.ts:352`, `cryptoPayment.service.ts:310`) is never invoked → `content.stats.tips` stays 0 → enrichment falls back to 0.

### Fix plan for A

1. **Frontend — pass the content id through the tip flow.**
   - `ContentCard.tsx` → pass `contentId={post.id}` to `<TipModal>`.
   - `TipModal.tsx` → accept `contentId` prop; pass it to `EmbeddedPaymentModal` as `relatedId`, and to `PaymentOrchestrator.payWithBrowserWallet` as `contentId`.
   - Result: embedded intents carry `relatedId`; browser verify calls carry `relatedId`.

2. **Backend — record `related_content_id` on Tip transactions.**
   - Include `'Tip'` in `isContentTransaction` in **both** `cryptoPayment.service.ts:279` and `userOperation.service.ts:317`.
   - This makes the enrichment's transaction aggregation the authoritative tips source (same pattern already used by PPV).

3. **Backend — prevent Tip transactions from unlocking PPV content (safety).**
   - `TransactionModel.findSuccessfulTransactionByFanAndContent` (`transaction.model.ts:77`) is used as the PPV unlock gate (`content.service.ts:608`) and currently matches **any** transaction type for `fan + content`.
   - Once Tips set `related_content_id`, a tip could be mistaken for a PPV purchase. Constrain the query to `.in('type', ['PPV Post', 'PPV Message'])`.

4. **Frontend cleanup — stop the dead double-record after a successful crypto tip.**
   - After a successful crypto tip, `TipModal` calls `onSubmit(finalAmount, message)` → `ContentCard.tsx:72` `handleTipSubmit` → `apiClient.sendTip` (`apiClient.ts:536`) which POSTs to `/payments/crypto/verify` with a **random fake txHash** → on-chain validation fails → the `.catch` swallows it. This path is dead and misleading; remove the `onSubmit` call for crypto tips (the real transaction is already recorded with the real hash).

5. **Consistency** — `enrichContentWithEarnings` tips use `transactions.amount` (full tip), matching `incrementContentTipStats`'s `amount`. No unit mismatch; keep as-is.

### Result
Tips on the content page will aggregate from the transactions table (and the JSONB fallback for historical tips, once the contentId is sent).

---

## B. PPV on the content page

### Current state (verified working)
- PPV unlock flows already pass the content id:
  - Browser: `UnlockModal.tsx:44-51` → `payWithBrowserWallet({ paymentType: 'PPV Post', contentId })` → verify body `relatedId = contentId`.
  - Embedded: `UnlockModal.tsx:72-81` → `EmbeddedPaymentModal relatedId={contentId}` → intent `relatedId`.
- PPV transactions store `related_content_id` (guarded correctly for PPV in both `cryptoPayment.service.ts:279` and `userOperation.service.ts:317`).
- `enrichContentWithEarnings` (`content.service.ts:389-395`) sums `creator_payout` for `type IN ('PPV Post','PPV Message')` → `stats.ppvEarnings` (`CreatorContent.tsx:489`).

### Fix plan for B (verify + harden)
1. **Manual verification**: create + publish a PPV post, buy it once via each path (browser + embedded), confirm the PPV column on the content page shows the aggregated `creator_payout`.
2. **Hardening — unit coverage**: add/extend a unit test for `enrichContentWithEarnings` asserting tips + PPV aggregation from transactions (and the PPV-type filter), so the tips fix in Part A can't regress PPV.
3. **Edge case**: if any legacy PPV transactions predate `creator_payout` being populated, they'll aggregate as 0 — acceptable; note for data backfill only if the user observes it.

---

## C. Gallery — mark saved so content can't be added twice

### Current state
- Backend computes `inGallery` in the **feed** (`server/utils/content.utils.ts:232-252`, via `enrichContentWithUnlockStatus`) and **messages** for the receiver (`server/services/message.service.ts:222-239`).
- Frontend disables Save once saved:
  - `ContentCard.tsx:172` (`disabled={isBookmarked || isSaving}`, `isBookmarked = post.inGallery`).
  - `MessageBubble.tsx:89` (`disabled={... || message.content.inGallery}`).

### Gaps
1. **No server-side dedupe** — `GalleryModel.addItemToGallery` (`gallery.model.ts:29`) appends unconditionally: `[...existingGallery.content, newItem]`. A fan can end up with duplicate entries for the same content, and each duplicate re-increments `gallery_add_count` (`user.service.ts:108`).
2. **`inGallery` missing on two fan-facing surfaces**:
   - Creator public profile — `getContentForPublicProfile` (`content.service.ts:502-565`) returns content without `inGallery` → a logged-in fan sees an enabled Save button on the profile even if the item is already saved.
   - Content detail — `getContentForFan` (`content.service.ts:574+`) likewise doesn't set `inGallery`.

### Fix plan for C
1. **Server-side idempotency (the core guarantee)**:
   - In `GalleryModel.addItemToGallery`, if the gallery already contains `contentId`, return the existing gallery unchanged (no-op) instead of appending.
   - In `user.service.ts addToUserGallery`, only call `increment_gallery_add_count` when the item was actually newly added.
   - Return the current gallery + `added: boolean` so the frontend can reflect state.
2. **Add `inGallery` to the remaining surfaces**:
   - `getContentForPublicProfile`: when `viewerId` is present, check the fan's gallery and set `inGallery` on each returned post.
   - `getContentForFan`: same check for the requesting fan.
   - Refactor the per-post gallery lookup (currently an N+1 `.single()` in `content.utils.ts:236`) into a single `galleries` fetch reused across these functions (small perf win + consistency).
3. **Frontend consistency**:
   - `ContentCard`: ensure it re-reads `post.inGallery` after props change (currently initialized in `useState` at mount; add an effect like the `localIsUnlocked` pattern at `ContentCard.tsx:50-53`) so a refetched card reflects saved state without a reload.
   - `MessageBubble`: after a successful save (`handleSave`), also set `message.content.inGallery = true` locally (already handled by `isSaved`, but keep both in sync).
4. **Optional UX**: return `added:false` on duplicate add and show "Already saved" rather than erroring — avoids confusing the fan if the button was somehow still enabled.

### Result
Adding content to the gallery is idempotent, `inGallery` is true everywhere a fan views content (feed, messages, profile, detail), and the Save button is disabled on all surfaces once saved.

---

## Files to change (when implemented)

| Area | File | Change |
|---|---|---|
| Frontend | `src/components/shared/ContentCard.tsx` | pass `contentId` to TipModal; effect to re-read `post.inGallery` |
| Frontend | `src/components/shared/TipModal.tsx` | accept `contentId`; pass to embedded `relatedId` + browser `contentId`; drop redundant `onSubmit` after crypto success |
| Frontend | `src/components/shared/EmbeddedPaymentModal.tsx` | (no change — already forwards `relatedId`) |
| Backend | `server/services/cryptoPayment.service.ts:279` | include `'Tip'` in `isContentTransaction` |
| Backend | `server/services/userOperation.service.ts:317` | include `'Tip'` in `isContentTransaction` |
| Backend | `server/models/transaction.model.ts:77` | constrain `findSuccessfulTransactionByFanAndContent` to PPV types |
| Backend | `server/models/gallery.model.ts` | dedupe in `addItemToGallery` (return `added` flag) |
| Backend | `server/services/user.service.ts:92-115` | only increment count on new add; handle `added` flag |
| Backend | `server/services/content.service.ts` | add `inGallery` to `getContentForPublicProfile` + `getContentForFan` |
| Backend | `server/utils/content.utils.ts` | reuse gallery fetch for `inGallery` |
| Tests | `server/tests/` (e.g. `content.service` / `transaction.model`) | enrichment aggregation + PPV-type filter + gallery dedupe |

## Verification plan
1. Send a tip to specific content via browser wallet → content page Tips column shows the amount.
2. Send a tip via embedded wallet → same.
3. Buy PPV via browser + embedded → PPV column aggregates `creator_payout` (no regression from the tips change).
4. Save a content item from the feed → button shows Saved and is disabled; save the same item from the creator profile and content detail → marked saved, no duplicate gallery entry.
5. Add the same content twice via the API directly → second add is a no-op (gallery unchanged, `gallery_add_count` not double-incremented).
6. Unit tests for enrichment + gallery dedupe pass; backend build + frontend build pass.

## DOX note
Once implemented, update the owning AGENTS.md (backend payments/gallery bullets + frontend Payments UI/Feed bullets) per the DOX chain. This plan itself is indexed in the root AGENTS.md planning-docs list.
