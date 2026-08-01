# PPV Attach-Modal Vault & Gallery Filter Plan

Plan for a single change: when a creator opens the attach-PPV-content modal in a message conversation, the modal must only list items **in the creator's vault** that have **not already been added to the fan's gallery**. No code changes yet — this is the plan to review.

---

## Summary of findings

| Issue | Current behavior | Desired behavior |
|---|---|---|
| Scope | Modal lists all of the creator's published **and** unlisted content | Only unlisted (vault) items |
| Gallery | Modal has no knowledge of the fan's gallery | Hide items the fan already saved |

---

## Current state

- `CreatorMessages.tsx` fetches the creator's content once on mount, filters it to `status === 'published' || visibility === 'unlisted'`, and stores it as `existingContent` (the vault is `visibility === 'unlisted'`).
- `CreatorMessages.tsx` renders `<AttachmentModal contentItems={existingContent} onSend={handleSendAttachment} />` — so every published feed post also shows up in the modal today.
- `AttachmentModal.tsx` renders every `contentItems` entry in a grid with no filtering; empty state says "You have no published or unlisted content to attach."
- The fan's gallery is stored server-side as a `galleries.content` JSON array of `GalleryItem` (`{ contentId, addedDate, isAccessible }`); per-message `inGallery` is already computed in `message.service.ts:222-239` using a `String(contentId)` compare.
- No existing creator-scoped endpoint returns a fan's gallery or the set of vault items available to attach to a given fan.

---

## Plan

### 1. Backend — creator-scoped "attachable vault content" endpoint (recommended)

Server-side filtering keeps the fan's gallery private and keeps the modal contract unchanged.

- New service `getAttachableVaultContent(creatorId, fanId)` in `message.service.ts` (or `content.service.ts`):
  1. Load the creator's content via `ContentModel.findContentByCreatorId(creatorId)`.
  2. Filter to vault items only: `visibility === 'unlisted'` (drop the `status === 'published'` inclusion so feed posts disappear from the modal).
  3. Load the fan's gallery via `GalleryModel.findGalleryByFanId(fanId)` (null gallery → empty exclusion set).
  4. Exclude any item whose `String(content.id) === String(galleryItem.contentId)`.
  5. Return the filtered items in the same shape `existingContent` uses today (thumbnails/title/type) so the modal needs no prop changes.
- New route `GET /api/v1/messages/fans/:fanId/attachable-content` behind `protectAndCreator`, handler in `message.controller.ts` using the standard `asyncHandler`/`ok(res, data)` pattern.
- Guard: validate the fan exists and shares a conversation with the requesting creator (reuse `findConversationByParticipants`) so a creator can't probe arbitrary fans; otherwise 403/404.

### 2. Frontend — fetch per fan, not once on mount

- `apiClient.ts`: add `getAttachableVaultContent(fanId)` calling the new endpoint.
- `CreatorMessages.tsx`:
  - Replace the on-mount `existingContent` fetch for the attachment modal with a per-conversation fetch that runs when the active fan changes (and when the modal is opened), keyed on the selected fan's id.
  - Pass the result to `AttachmentModal` as `contentItems` (no signature change).
  - Re-fetch after a successful attach send so the item no longer appears for that fan.
- `AttachmentModal.tsx`:
  - Update the empty-state copy to "No new vault content available for this fan." (vault items not yet saved to their gallery).
  - Optional: subtitle noting the list is limited to vault items not yet in the fan's gallery.
  - Keep the existing `onSend(content, price, text)` contract.

### 3. Edge cases

- Fan has no gallery row yet → treat as empty exclusion set (all vault items eligible).
- ContentId type mismatch → compare with `String()` on both sides (same approach as `message.service.ts:222-239`).
- Fan already saved every vault item → empty state message shown (no error).
- Broadcast flow (`BroadcastModal`) is out of scope — it targets multiple fans and is unchanged by this plan.

---

## Files to change (when implemented)

| Area | File | Change |
|---|---|---|
| Backend | `server/services/message.service.ts` (or `content.service.ts`) | new `getAttachableVaultContent(creatorId, fanId)` |
| Backend | `server/routes/message.routes.ts` | new `GET /fans/:fanId/attachable-content` route |
| Backend | `server/controllers/message.controller.ts` | new `asyncHandler` handler + fan/conversation guard |
| Frontend | `src/lib/apiClient.ts` | add `getAttachableVaultContent(fanId)` |
| Frontend | `src/features/creator/CreatorMessages.tsx` | per-fan fetch replacing on-mount `existingContent`; refresh after send |
| Frontend | `src/features/creator/components/AttachmentModal.tsx` | empty-state copy (optional subtitle) |

## Verification plan

1. Creator with several published posts **and** several vault items opens the attach modal for a fan → only vault items appear (no feed posts).
2. Fan saves one vault item to their gallery (from feed/message/detail) → reopening the modal for that fan hides that item; other vault items remain.
3. Fan with no gallery yet → all vault items visible.
4. Attach + send an item → it disappears for that fan on the next modal open.
5. Non-participating fan id → endpoint returns 403/404.
6. Backend `tsc` build + frontend `tsc`/Vite build pass; existing Jest suite passes.

## DOX note

Once implemented, update the owning AGENTS.md bullets (backend messaging/gallery + frontend creator messaging) per the DOX chain. This plan is indexed in the root AGENTS.md planning-docs list.
