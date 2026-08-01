# Fix: Creator Analytics & Content Views Not Showing Properly

Diagnosis and fix plan only — **no code changes made** in producing this document.

## The two numbers that disagree

Views are read from **two independent sources** that are not kept in sync:

| Source | What it stores | Shown in |
|---|---|---|
| `content.stats.views` (JSONB) | Incremented by RPC `increment_content_view_count` only when a `post_view` event is logged | Content page "Views" column, CreatorAnalytics top-content table + sort, CSV export, FanGallery "Most Viewed" sort |
| `analytics_events` (event_type = `post_view`) | One row inserted per logged view | Dashboard "Post Views" StatCard and CreatorAnalytics StatCard via `countEventsForCreator('post_view')` |

## Verified evidence (live DB, project `jgdiwfmvxuwedndganje.supabase.co`)

For creator `e0cf39d6-9116-4090-904e-275988ce4825`:

- `SUM(content.stats.views)` = **281** (across their 8 published items)
- `analytics_events` `post_view` rows for that creator = **8** (both lifetime and last-30-days)

Per-content comparison (stats.views vs post_view events):

| content id | stats.views | post_view events | created_at |
|---|---|---|---|
| 15 | 102 | 0 | 2025-10-31 |
| 16 | 49 | 0 | — |
| 25 | 89 | 0 | — |
| 13 | 25 | 0 | — |
| 62 | 1 | 0 | — |
| 65 | 3 | 0 | — |
| 89 | 8 | 8 | — (matches) |
| 149 | 2 | 2 | — (matches) |

Table-wide: `analytics_events` contains only **75 rows total** (65 `profile_visit` + 10 `post_view`), with the **earliest row on 2026-07-24**. Content 15 was created 2025-10-31.

## Root causes

### 1. Historic views were never written to `analytics_events`
All views accumulated before ~2026-07-24 (content 15 = 102, content 16 = 49, content 25 = 89, etc.) live **only** in `content.stats.views`. The `analytics_events` table simply has no rows for them. Because the dashboard/analytics StatCards count from `analytics_events`, they will permanently under-report compared to `stats.views`. Content 89 and 149 prove the *current* code path is consistent — when it runs, both counters move together.

### 2. Only one call site logs `post_view`
The **only** place the frontend fires `post_view` is the standalone content viewer page:
`podm-frontend/src/features/viewer/ContentViewer.tsx:60-61` → `apiClient.logAnalyticsEvent({ eventType: 'post_view', ... })` → `POST /api/v1/analytics/log` → `analytics.service.ts:13-45`.

The fan gallery and messages **modal** viewer (`podm-frontend/src/features/fan/components/ContentViewerModal.tsx`) does **not** use that page. It calls `getSecureContentViewUrl` → `GET /content/:id/secure-url` → `getSecureUrlForViewing` (`server/services/content.service.ts:792-818`), and `getViewData` (`content.service.ts:826`) — **neither logs analytics**. So every view that happens inside the modal increments neither counter.

### 3. Frontend surfaces read different sources
- Dashboard StatCard "Post Views" + CreatorAnalytics StatCard: `AnalyticsService.countEventsForCreator(creator_id, 'post_view')` — `server/services/creator.service.ts:61,148-149`.
- Content page views column (`CreatorContent.tsx:487`), top-content sort (`CreatorAnalytics.tsx:198-199`), CSV export (`creator.service.ts:559`), FanGallery "Most Viewed" (`FanGallery.tsx:110`): `item.stats.views`.

So the dashboard can say "8" while the same creator's content page shows per-item views summing to 281 — both "correct" for their own source, and both wrong as a truthful view count.

### 4. Not a server/DB health problem
- `analytics_events` table exists with correct columns (`id, event_type, creator_id, viewer_id, content_id, created_at`); `content_id` stores numeric ids (89, 149).
- RPC `increment_content_view_count` verified working end-to-end (content 157: 0 → 1 → reverted to 0). Defined in `server/scripts/fix_analytics.sql`, search_path set by `migrations/fix_function_search_paths.sql`.
- `analytics.service.ts:16-21` correctly skips admin + self-views before insert **and** before the RPC, so neither counter is inflated by the creator/admin.
- Frontend `apiClient.logAnalyticsEvent` (`lib/apiClient.ts:350-362`) swallows errors via try/catch — a silent failure here would look exactly like "views don't show up" (see fix item 4).

## Fix plan

### A. Pick one source of truth for "views"
Recommendation: **`content.stats.views` stays canonical for display**, because it is the only number that contains the historic data. Migrate the StatCards off `countEventsForCreator('post_view')`:

1. `server/services/creator.service.ts:61,148-149` — replace the two `countEventsForCreator('post_view')` calls with `sumCreatorContentViews` (`server/models/content.model.ts:169-176`) over the creator's content. `getCreatorAnalyticsData`/`getMyContent` already attach `stats.views` per item; compute `totalViews` from those instead of from events.
2. Keep `analytics_events` for trend/time-series use only; historic trend data for periods before ~2026-07-24 will not exist there (backfill intentionally skipped).

### B. Make the modal actually log views
Add a `post_view` event (and stats increment) to the modal path so *future* views count:

1. In `server/services/content.service.ts`, `getSecureUrlForViewing` (or `getViewData`) — after a successful (non-admin, non-self) access, fire the same insert + RPC used by `analytics.service.ts:13-45`. Reuse `AnalyticsService.logAnalyticsEvent` with `eventType: 'post_view'` rather than duplicating logic.
2. This makes gallery/messages modal opens register like the full-page viewer does. Consider a light debounce/dedupe (e.g. same viewer + content within N seconds) if repeated modal opens should not count multiple views.

### C. Don't swallow analytics errors
`podm-frontend/src/lib/apiClient.ts:350-362` catches and silently drops `logAnalyticsEvent` failures. Change to at least `console.warn` (keep non-blocking for the viewer). Otherwise a broken RPC/endpoint masquerades as "views stopped showing."

## What NOT to do
- Do **not** reset `content.stats.views` — it is the only surviving record of historic views.
- Do **not** backfill `analytics_events` from `stats.views` — skipped by decision; `analytics_events` will only contain events from ~2026-07-24 onward.
- Do **not** change the modal to navigate to the full viewer page as a side effect — that changes UX, not just analytics.

## Verification
1. After A: dashboard "Post Views" StatCard and CreatorAnalytics StatCard should match `SUM(stats.views)` for a test creator (281 for the sample creator above).
2. After B: open a locked/unlocked post in the fan gallery modal, confirm a new `post_view` row appears and `stats.views` increments.
3. Run backend build (`npm run build`) and existing tests; frontend `npm run lint`/`npm run build` for `CreatorDashboard`/`CreatorAnalytics`/`ContentViewerModal` changes.

## Suggested commit order
1. A (source-of-truth migration, pure backend) — immediate visible fix.
2. B (modal logging) — makes new views count.
3. C (logging) — prevents silent future failures.
