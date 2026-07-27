# Creator Analytics Refactor Plan — DRY Payment Calculations

## Problem

Tips and PPV earnings are calculated in **three different ways** across the
codebase, producing inconsistent results:

| Endpoint | File | Tips Method | PPV Method | Works? |
|---|---|---|---|---|
| `GET /content/my-content` | `content.service.ts:358-389` | Recalculated from **all** transactions | Recalculated from **all** transactions | ✅ |
| `GET /creator/analytics` | `creator.service.ts:200-232` | Relies on `content.stats.tips` (DB value) | Recalculated from **top 10** transactions only | ❌ (type mismatch + scope limit) |
| `GET /creator/earnings` | `creator.service.ts:325-379` | Aggregate from transactions (no per-content) | Aggregate from transactions (no per-content) | ✅ (aggregate only) |

The analytics page shows wrong values because it has its own bespoke PPV
calculation with two bugs (type mismatch at line 230, scope limited to top 10
content at line 208), while the content page already works correctly because
`getContentByCreatorId` recalculates from all transactions on every request.

---

## Target Architecture

```
Single shared function
        │
        ├── getContentByCreatorId  (content.service.ts)
        │
        └── getAnalyticsData       (creator.service.ts)
                ↓
        Both return identical `stats.tips` and `stats.ppvEarnings`
        for the same content.
```

No endpoint computes tips or PPV inline. All call the same shared function.

---

## Refactor Steps

### Step 1 — Extract shared enrichment function

**Location:** `PoDM_project/server/services/content.service.ts` (new exported
function, alongside existing `incrementContentTipStats` and
`incrementContentPpvEarningsStats`)

```typescript
/**
 * Enriches an array of content items with actual Tip and PPV earnings
 * from cleared transactions. Both the content page and the analytics page
 * use this to guarantee identical tips/PPV values.
 */
export async function enrichContentWithEarnings(
  contentItems: Partial<Content>[],
  creatorId: string
): Promise<Content[]> {
  const contentIds = contentItems.map(c => c.id).filter(Boolean);
  if (contentIds.length === 0) return contentItems as Content[];

  const { data: tipTx } = await supabase
    .from('transactions')
    .select('related_content_id, amount')
    .eq('creator_id', creatorId)
    .eq('status', 'Cleared')
    .eq('type', 'Tip')
    .in('related_content_id', contentIds);

  const { data: ppvTx } = await supabase
    .from('transactions')
    .select('related_content_id, creator_payout')
    .eq('creator_id', creatorId)
    .eq('status', 'Cleared')
    .in('type', ['PPV Post', 'PPV Message'])
    .in('related_content_id', contentIds);

  const tipsByContent: Record<string, number> = {};
  const ppvByContent: Record<string, number> = {};

  (tipTx || []).forEach(tx => {
    const cid = String(tx.related_content_id);
    tipsByContent[cid] = (tipsByContent[cid] || 0) + (tx.amount || 0);
  });

  (ppvTx || []).forEach(tx => {
    const cid = String(tx.related_content_id);
    ppvByContent[cid] = (ppvByContent[cid] || 0) + (tx.creator_payout || 0);
  });

  return contentItems.map(item => {
    const cid = String(item.id);
    const existing = item.stats || ({} as ContentStats);
    return {
      ...item,
      id: cid,
      stats: {
        views: existing.views ?? 0,
        galleryAdds: existing.galleryAdds ?? 0,
        tips: tipsByContent[cid] ?? (existing.tips ?? 0),
        ppvEarnings: ppvByContent[cid] ?? (existing as any).ppvEarnings ?? 0,
      },
    } as Content;
  });
}
```

Key design decisions:
- `String(item.id)` everywhere — eliminates type-mismatch bug
- Returns `tips` from transactions when available, falls back to DB value
- Returns `ppvEarnings` from transactions when available, falls back to DB value
- Null-safe spread with defaults for `stats`
- Queries ALL passed content IDs — no arbitrary top-N limit

### Step 2 — Replace content page's inline calculation

**File:** `PoDM_project/server/services/content.service.ts`

In `getContentByCreatorId`, remove lines 358-397 (the inline `tipsByContent`
and `ppvEarningsByContent` queries and merge loop). Replace with a single
call:

```typescript
return await enrichContentWithEarnings(signedContent, creator_id);
```

### Step 3 — Replace analytics page's inline calculation

**File:** `PoDM_project/server/services/creator.service.ts`

In `getAnalyticsData`:

1. **Remove** lines 200-232 (the entire PPV earnings block — `ppvTransactions`,
   `ppvEarningsByContent`, `topContentWithPpv`)

2. **Replace** with:
   ```typescript
   const topContentWithPpv = await enrichContentWithEarnings(topContentData, creator_id);
   ```

3. **Fix** the ordering on line 195 — change from `stats->>tips` (always 0) to
   `created_at`:
   ```typescript
   .order('created_at', { ascending: false })
   ```

This single change fixes every analytics bug at once: type mismatch, scope
limit, missing PPV Message earnings, and null stats crash.

### Step 4 — Add null safety to frontend

**File:** `podm-frontend/src/features/creator/CreatorAnalytics.tsx`

Lines 88, 91 — add optional chaining to match `CreatorContent.tsx`:

```typescript
{item.stats?.views?.toLocaleString() || '0'}
{item.stats?.galleryAdds?.toLocaleString() || '0'}
```

Line 97 — add fallback:

```typescript
{formatCurrency(item.stats?.tips ?? 0)}
```

---

## Files Changed

| File | Change |
|---|---|
| `PoDM_project/server/services/content.service.ts` | **Add** `enrichContentWithEarnings()` (new exported function) |
| `PoDM_project/server/services/content.service.ts` | **Replace** inline tips/PPV calculation in `getContentByCreatorId` with call to `enrichContentWithEarnings` |
| `PoDM_project/server/services/creator.service.ts` | **Import** `enrichContentWithEarnings` from content service |
| `PoDM_project/server/services/creator.service.ts` | **Replace** inline PPV calculation in `getAnalyticsData` with call to `enrichContentWithEarnings` |
| `PoDM_project/server/services/creator.service.ts` | **Fix** `ORDER BY` on line 195 to `created_at DESC` |
| `podm-frontend/src/features/creator/CreatorAnalytics.tsx` | **Add** optional chaining on `item.stats` |

---

## Before / After

### Content page (`/content/my-content`)

| Metric | Before | After |
|---|---|---|
| Tips | Calculated inline in `getContentByCreatorId` | Via `enrichContentWithEarnings` |
| PPV | Calculated inline in `getContentByCreatorId` | Via `enrichContentWithEarnings` |
| Correct? | ✅ | ✅ (same method, extracted) |

### Analytics page (`/creator/analytics`)

| Metric | Before | After |
|---|---|---|
| Tips | From `content.stats.tips` DB field (stale if increment failed) | From transactions (always accurate) |
| PPV | Top-10-only, type-mismatch bug, missing PPV Message | From all transactions via shared function |
| Correct? | ❌ | ✅ |

---

## Verification

1. Open content page → PPV and Tips columns show correct amounts from transactions
2. Open analytics page → Top Performing Content shows identical PPV and Tips values as content page
3. Send a new tip → both pages update after refresh
4. Unlock a PPV Message → both pages show the PPV earnings
5. `npm run lint` and `npx tsc --noEmit` pass on backend
