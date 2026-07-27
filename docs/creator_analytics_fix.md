# Creator Analytics Fix — Top Performing Content Not Working

## Root Causes

Five bugs in the analytics pipeline, all in `getAnalyticsData()`.

---

### Bug 1 — Ordering by `stats->>tips` is meaningless

**File:** `creator.service.ts:195`

```typescript
.order('stats->>tips', { ascending: false, nullsFirst: false } as any)
```

`content.stats.tips` is initialized to 0 at content creation and **never incremented** anywhere in the codebase. Every item has `tips: 0`. The ORDER BY produces arbitrary output (effectively insertion order from Supabase). The section is labelled "Top Performing Content" but does not sort by any performance metric.

**Fix:** Change the default sort to `created_at DESC` (newest first) and let the frontend's sort controls (Views, Gallery Adds, PPV, Tips) handle user-driven ordering. Or use a combined metric from the transactions table. Simplest correct approach:

```typescript
.order('created_at', { ascending: false })
```

Users can click any column header in the table to sort by that metric.

---

### Bug 2 — Type mismatch in PPV earnings lookup

**File:** `creator.service.ts:230`

```typescript
ppvEarnings: ppvEarningsByContent[item.id] || 0,
```

`item.id` comes from `supabase.from('content').select('*')` which returns the `id` column as a **number**. But `ppvEarningsByContent` is keyed by `tx.related_content_id` from the `transactions` table, which is stored as a **string** (UUID/text). So `ppvEarningsByContent[42]` returns `undefined` when the key was set as `"42"`. Every content item shows `ppvEarnings: 0` regardless of actual PPV revenue.

**Fix:** Stringify the lookup key:

```typescript
ppvEarnings: ppvEarningsByContent[String(item.id)] || 0,
```

---

### Bug 3 — No null safety on `item.stats` (backend spread)

**File:** `creator.service.ts:228-231`

```typescript
stats: {
    ...item.stats,   // crashes if item.stats is null
    ppvEarnings: ppvEarningsByContent[item.id] || 0,
},
```

Older content created before the `stats` column was added may have `stats: null` in the database. The spread operator throws. This would cause the analytics endpoint to 500 for creators with legacy content.

**Fix:**

```typescript
stats: {
    ...(item.stats || { views: 0, galleryAdds: 0, tips: 0 }),
    ppvEarnings: ppvEarningsByContent[String(item.id)] || 0,
},
```

---

### Bug 4 — No optional chaining on `item.stats` in frontend

**File:** `CreatorAnalytics.tsx:88, 91`

```typescript
{item.stats.views.toLocaleString()}   // crash if stats is undefined
{item.stats.galleryAdds.toLocaleString()}  // crash if stats is undefined
```

Even if bug 3 is fixed (stats is always present in the API response), a transient error or bad data could still reach the frontend. Add optional chaining to match the pattern used in `CreatorContent.tsx`:

```typescript
{item.stats?.views?.toLocaleString() || '0'}
{item.stats?.galleryAdds?.toLocaleString() || '0'}
```

---

### Bug 5 — PPV query limited to top 10 content IDs

**File:** `creator.service.ts:201, 208`

The flow is:
1. Fetch 10 content items by `stats->>tips DESC`
2. Extract their IDs
3. Query PPV transactions where `related_content_id IN (...10 IDs...)`

Because bug 1 randomizes the order, the wrong content IDs are used. Even after fixing ordering, this query misses PPV earnings for any content outside the top 10. The PPV earnings for the lower items would show as $0, and if sorted by PPV on the frontend, those items would appear at the bottom (correctly $0, but missing their actual earnings!).

**Fix:** Remove the `.in('related_content_id', contentIds)` restriction. Query ALL Cleared PPV transactions for this creator, then merge by content ID. This ensures every content item has accurate PPV earnings regardless of whether it's in the top 10.

```typescript
const { data: ppvTransactions, error: ppvError } = await supabase
    .from('transactions')
    .select('related_content_id, creator_payout')
    .eq('creator_id', creator_id)
    .eq('status', 'Cleared')
    .in('type', ['PPV Post', 'PPV Message']);
```

---

## Summary of Changes

| File | Line(s) | Fix |
|---|---|---|
| `PoDM_project/server/services/creator.service.ts` | 195 | Change order to `created_at DESC` |
| `PoDM_project/server/services/creator.service.ts` | 201, 208 | Remove `.in('related_content_id', contentIds)` — query all PPV transactions |
| `PoDM_project/server/services/creator.service.ts` | 226-232 | Fix type mismatch (`String(item.id)` + null-safe spread) |
| `podm-frontend/src/features/creator/CreatorAnalytics.tsx` | 88, 91 | Add optional chaining on `item.stats` |

## Verification

1. Open analytics page → Top Performing Content shows newest content first
2. PPV column shows actual earnings for both PPV Post and PPV Message unlocks
3. Click PPV column header → content re-sorts by PPV earnings correctly
4. Creators with legacy content (null stats) do not get a 500 error
5. `npm run lint` and `npx tsc --noEmit` pass on both backend and frontend
