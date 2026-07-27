# PPV Message Unlock Plan — Persist `isUnlocked` to Database

## Problem

After a fan successfully unlocks PPV message content:

1. `FanMessages.tsx` `markContentUnlocked` patches the message locally
   (`setMessages(prev => prev.map(msg => ... content: { isUnlocked: true })`)
2. Calls `apiClient.addContentToGallery(contentId)` — persists content to gallery

But it **never** calls `unlockContentInMessage` on the backend.  The
`messages.content` JSON column in the database still has
`isUnlocked: false`.  On page reload, `getMessagesForConversation` returns
the stale `isUnlocked: false` from the DB, so the message shows locked.

**Gallery works** because it checks `activeSubscription` per creator group,
not `isUnlocked` on the message.

---

## Root Cause Chain

```
FanMessages.tsx: handleUnlockContent
  → pay (success)
  → markContentUnlocked(msg)
    → setMessages (local React state only)
    → addContentToGallery(contentId)        ← persists to gallery table
    → (does NOT call unlockContentInMessage) ← MISSING: DB message not updated
  → reload page
  → getMessagesForConversation
  → message.content.isUnlocked === false     ← stale DB value
  → MessageBubble shows lock overlay again
```

---

## Fix (3 changes)

### Step 1 — Add API route on backend

**File:** `PoDM_project/server/routes/message.routes.ts`

Add a `PATCH /messages/:id/unlock` route that calls
`unlockContentInMessage(messageId)` from `message.model.ts`.

- Authenticate the requesting user (must be the fan recipient or the creator)
- Call `unlockContentInMessage`
- Return the updated message

### Step 2 — Add apiClient method

**File:** `podm-frontend/src/lib/apiClient.ts`

Add `unlockMessageContent(messageId: string): Promise<Message>`

Calls `PATCH /messages/${messageId}/unlock`.

### Step 3 — Call from FanMessages.tsx

**File:** `podm-frontend/src/features/fan/FanMessages.tsx`

In `markContentUnlocked`, after `addContentToGallery`, also call
`apiClient.unlockMessageContent(msgToUnlock.id)`.

No other state change needed — the local `setMessages` patch already
covers the current render; the DB write ensures it survives reload.

---

## Files Touched

| File | Change |
|---|---|
| `PoDM_project/server/routes/message.routes.ts` | Add `PATCH /messages/:id/unlock` route |
| `podm-frontend/src/lib/apiClient.ts` | Add `unlockMessageContent()` method |
| `podm-frontend/src/features/fan/FanMessages.tsx` | Call `unlockMessageContent` in `markContentUnlocked` |

---

## Verification

1. Fan opens PPV message — shows locked with unlock button
2. Fan unlocks — content plays, message shows unlocked
3. Fan reloads page — message still shows unlocked
4. Fan confirms content is also in gallery
