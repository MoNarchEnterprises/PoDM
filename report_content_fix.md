# Fix Plan — Content Report 500 & Moderation Table Mismatch

- **Date**: 2026-08-02
- **Status**: **Implemented 2026-08-08.** Fix A (`content_reports` table + model/service/controller/frontend repoint, `details` pass-through), Fix B (`add_related_content_id_to_transactions.sql`), and the migrations-folder consolidation (issue F, `server/scripts/migrations/` merged into `PoDM_project/migrations/`) are applied. This file is now the maintained record of the root cause and implemented fix.
- **Trigger**: `ContentViewer.tsx:100 Failed to report content: AxiosError: Request failed with status code 500` when a fan submits a content-moderation report.

---

## 1. The error, end-to-end

```
ContentViewer.tsx:96  apiClient.reportContent(content.id, reason)
  → POST /api/v1/content/:id/report  { reason }                 (content.routes.ts:61, protect)
  → content.controller.ts:124  ContentService.reportContent(userId, contentId, reason)
  → content.service.ts:911     ReportModel.createReport(userId, contentId, reason)
  → report.model.ts:7          supabase.from('reports').insert([{ reporter_id, content_id: parseInt(contentId), reason, status:'pending' }])
  → Supabase/PostgREST error:  "Could not find the 'content_id' column of 'reports' in the schema cache"
  → handleQuery returns null → report.model.ts:15 (throw 'Failed to create report.' via content.service.ts:913)
  → AppError 500 → frontend alert('Failed to report content.')
```

Reproduced via curl with a creator token:
```
POST /api/v1/content/102/report  → 500 "Failed to create report."
Server log: [DB] create report: Could not find the 'content_id' column of 'reports' in the schema cache
```

---

## 2. Root cause — wrong table / name collision

There are **two unrelated concepts both named "reports"**, and the codebase targets the wrong one.

### What `report.model.ts` assumes (content moderation)
A table with columns: `id (uuid)`, `reporter_id (uuid)`, `content_id (bigint)`, `reason (text)`, `status (report_status enum)`, `created_at`. This definition exists in the repo at `PoDM_project/server/scripts/migrations/create_reports_table.sql:4-11` — but that migration is in the **historical bootstrap folder** (`server/scripts/migrations/`), was **never applied** to the live DB, and the live `reports` table is a different table that took the name.

### What the live `reports` table actually is (admin analytics)
Verified via the Supabase REST OpenAPI spec:
```
reports:  id (uuid), name (text), parameters (jsonb), created_by (uuid), created_at, last_run_at
```
This is the **admin saved analytics report** table — `name`/`parameters`/`created_by`/`last_run_at`. It is referenced by `admin.routes.ts:61` (`POST /admin/reports`, `generateReport`) and `transaction.model.ts:saveReport` — **wait, no**: `admin.service.ts:287` calls `TransactionModel.saveReport`, which writes to a **separate** `saved_reports` table (`transaction.model.ts:93`, verified columns `name, metrics, filters, date_range, data, created_at`). So the live `reports` table is a third, admin-only construct that collided with the moderation concept and won the name.

### Net
The content-moderation "report content" feature has **never worked on the live DB**. Every report insert fails because `content_id` doesn't exist on the live `reports` table; every read (`getReportsByContentId`) and update (`dismissReportsForContent`) would likewise return no-op. The route handler catches the null and throws a generic 500.

---

## 3. Blast radius (all broken by the same collision)

All three `report.model.ts` functions target the wrong `reports` table, so:

| Surface | File:line | Symptom |
|---|---|---|
| Fan reports content (the reported error) | `content.service.ts:911` → `report.model.ts:7` | 500 every time |
| Auto-flag after 3 reports | `content.service.ts:917-921` → `report.model.ts:20` | `getReportsByContentId` returns null → length 0 → never auto-flags (threshold unreachable) |
| Admin moderation queue `reportCount`/reason | `admin.service.ts:118` → `report.model.ts:20` | always `reportCount: 0`, reason falls back to "Manually flagged by system" (`admin.service.ts:124`) even for user-reported content |
| Admin "approve → dismiss pending reports" | `admin.service.ts:145` → `report.model.ts:30` | no-op (no `content_id` column to match) — reports never get dismissed |

Frontend callers of the moderation flow:
- `ContentViewer.tsx:96` (the failing `reportContent`) — the only `apiClient.reportContent` caller.
- `AdminPanel.tsx` loads `flaggedContent` via `GET /admin/content/flagged` (`AdminPanel.tsx:85`) → `admin.service.ts:getFlaggedContent` → aggregates now-empty reports.
- `ContentModerationPanel.tsx:116` displays `Reports: {item.reportCount}` — always 0.

Secondary frontend bug (not the 500, but related): `ReportModal.tsx:26,34` collects `(reason, details)` but `ContentViewer.tsx:94 handleReportSubmit = async (reason: string)` ignores `details` and `apiClient.reportContent(content.id, reason)` only sends `reason`. So "Additional Details" textarea input is silently dropped.

---

## 4. Similar problems audit (在整个 model layer)

I ran a parallel audit of every `PoDM_project/server/models/*.ts` against the live Supabase schema (via the REST OpenAPI definitions) and the `migrations/` files. Results:

### ID-type clarification (rules out a whole class of suspected bugs)
Live PK types, verified directly from the Supabase schema cache:
```
content.id         = bigint   ← parseInt() in content.model.ts is SAFE
subscriptions.id   = bigint   ← parseInt() in subscription.service.ts is SAFE
messages.id        = bigint   ← parseInt() in message.model.ts is SAFE
conversations.id   = bigint   ← parseInt() in conversation.model.ts is SAFE
reports.id         = uuid     (but the model's content_id is bigint and the column doesn't exist anyway)
```
All `parseInt(idString)` call sites in `content.model.ts`, `message.model.ts`, `conversation.model.ts`, and `subscription.service.ts` operate on **bigint** PKs — **they are correct, not broken.** The earlier suspicion that these might be UUIDs is disproved. No action needed on parseInt IDs.

### Confirmed similar problems (runtime-broken or drift-risk)

| # | Issue | Severity | File:line | Notes |
|---|---|---|---|---|
| **A** | `reports` name collision (this bug) | **High — runtime broken** | `report.model.ts:7,20,30` | The only genuinely broken model. Live `reports` = admin analytics; moderation columns don't exist. |
| **B** | `related_content_id` untracked migration | **Low — drift risk only** | `transaction.model.ts:79`; written by `cryptoPayment.service.ts:291`, `userOperation.service.ts:333` | Column EXISTS on the live `transactions` table (verified), so current code works. But **no migration in the repo adds it** → a fresh DB restore/clone would omit it and silently break PPV unlock + content earnings enrichment. Needs a tracked `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS related_content_id BIGINT` migration. |
| **C** | `report.model.ts:9,22,34` parseInt on `content_id` | **Low — latent** | `report.model.ts` | `content.id` is bigint, so `parseInt` is correct *if* the moderation table is recreated with `content_id BIGINT`. Safe to keep as-is in the fix. |
| **D** | `subscriptions.id` mixed typing | **Low — sloppy but works** | `subscription.model.ts:12` (`id: number`) vs `:48` (`id: string`); `subscription.service.ts:152,181` parseInt | Live `subscriptions.id` is bigint, so both the number-typed find and the string-typed update work via Postgres implicit casts. Should still be standardized to one type for cleanliness, but not a bug. |
| **E** | `content.model.ts` inconsistent ID conversion (line 28 parseInt, lines 53/181/196 raw string) | **Low — works via implicit cast** | `content.model.ts:28,53,181,196` | bigint PK tolerates both number and string in `.eq()`/`.in()`. Not broken; standardize for clarity. |
| **F** | Two migrations folders not indexed in DOX | **Low — process gap** | `PoDM_project/migrations/` vs `PoDM_project/server/scripts/migrations/` | `PoDM_project/AGENTS.md:13` only lists `/migrations/`. The `server/scripts/migrations/` folder (where the intended-but-unapplied `create_reports_table.sql` lives) is unlisted, which let this collision hide. |

### Cleared (NOT bugs)
- Every other model (`user`, `transaction`, `contest`, `referral`, `gallery`, `notification`, `supportTicket`, `settings`, `message`, `conversation`) targets a table whose live columns match what the model uses. The `saved_reports` table (admin analytics, `transaction.model.ts:93`) is distinct from the broken `reports` and is correct.
- No `parseInt`-on-UUID ID bug exists anywhere — all numeric-PK tables are bigint.

**Bottom line: the report-content 500 is an isolated defect (issue A). The only other real concern is issue B (missing tracked migration for `related_content_id`), which is a drift risk, not a current runtime bug.**

---

## 5. Fix plan (to be implemented when approved)

### Fix A — Resolve the `reports` name collision (the 500)

**Recommended approach: create a dedicated `content_reports` table and repoint the model.**

1. **New tracked migration** in `PoDM_project/migrations/` (the canonical folder): `create_content_reports_table.sql`:
   ```sql
   CREATE TYPE IF NOT EXISTS report_status AS ENUM ('pending', 'reviewed', 'dismissed');
   CREATE TABLE IF NOT EXISTS content_reports (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
       content_id BIGINT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
       reason TEXT NOT NULL,
       details TEXT,
       status report_status DEFAULT 'pending',
       created_at TIMESTAMPTZ DEFAULT now() NOT NULL
   );
   CREATE INDEX IF NOT EXISTS idx_content_reports_content_id ON content_reports(content_id);
   CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
   ```
   - Use a **new non-colliding name** (`content_reports`) so the live admin `reports` table is untouched.
   - Add a `details` column to fix the secondary bug (the modal's "Additional Details" that's currently dropped).

2. **Update `PoDM_project/server/models/report.model.ts`** (3 sites):
   - `createReport` (`:7`): `.from('content_reports')`, add `details` to the insert, return mapped report.
   - `getReportsByContentId` (`:20`): `.from('content_reports')`.
   - `dismissReportsForContent` (`:30`): `.from('content_reports')`.
   - Update `mapToReport` to include `details` if added to the `Report` type.

3. **Update `common/types/Report.ts`**: add optional `details?: string`.

4. **Update `content.service.ts:909-923 reportContent`**: pass `details` through (the controller currently forwards only `reason` — extend to forward `details` too).

5. **Update `content.controller.ts:115-126 reportContent`**: destructure `details` from `req.body` alongside `reason`; pass to the service.

6. **Update `apiClient.ts:741 reportContent`**: send `{ reason, details }` (currently sends only `{ reason }`).

7. **Update `ContentViewer.tsx:94 handleReportSubmit`**: change signature to `(reason: string, details: string)` and pass `details` to `apiClient.reportContent(content.id, reason, details)` so the modal's second argument (currently dropped) is sent.

8. **Apply the migration** to the live Supabase DB (run the SQL), then verify via curl that `POST /content/:id/report` returns 200.

### Fix B — Track the `related_content_id` migration (drift risk)

9. **New tracked migration** `PoDM_project/migrations/add_related_content_id_to_transactions.sql`:
   ```sql
   ALTER TABLE transactions ADD COLUMN IF NOT EXISTS related_content_id BIGINT REFERENCES content(id) ON DELETE SET NULL;
   CREATE INDEX IF NOT EXISTS idx_transactions_related_content ON transactions(related_content_id) WHERE related_content_id IS NOT NULL;
   ```
   (Column already exists live; this just closes the drift gap for fresh restores.)

### Fix C (optional cleanup, not required)

10. Standardize `content.model.ts` and `subscription.model.ts` ID conversion to one consistent pattern (all raw string, relying on bigint implicit cast — or all `Number(id)`). Cosmetic; not a bug.

### DOX updates after implementing

11. `PoDM_project/AGENTS.md:13` — index the second migrations folder (`server/scripts/migrations/`) OR document that it's historical/legacy and the canonical folder is `PoDM_project/migrations/`. This prevents a future collision from hiding again.
12. `PoDM_project/AGENTS.md` Ownership section — note the `content_reports` table under the moderation contract.
13. Root `AGENTS.md` planning-doc list — index this `report_content_fix.md`.

---

## 6. Verification steps (run after implementing A)

1. `cd PoDM_project/server && npm run build` — must compile clean.
2. Apply the new `create_content_reports_table.sql` migration to Supabase.
3. Restart the dev server.
4. Reproduce the original call:
   ```
   POST /api/v1/content/102/report  { "reason": "inappropriate", "details": "spam" }
   ```
   Expected: `{"success":true,"message":"Content reported successfully."}`
5. Insert two more reports for the same content `102` → confirm the third triggers auto-flagging (content status → `flagged`) via `content.service.ts:918-921`.
6. As admin, `GET /admin/content/flagged` → confirm `reportCount` reflects the real count and `reason` is the user-submitted reason (not "Manually flagged by system").
7. Approve that content (status → `published`) → confirm `content_reports` rows for that content become `dismissed`.
8. Frontend: open a content viewer → "Report Content" → submit with Details → confirm success alert and no console 500.

---

## 7. Why not just rename the live admin `reports` table instead?

Optionally, one could drop/rename the live admin `reports` table and rerun `create_reports_table.sql`. Rejected because:
- The live `reports` table may be referenced by admin-tooling or dashboards we haven't audited.
- Creating a distinctly-named `content_reports` table is non-destructive, additive, and unambiguous.
- The in-repo `create_reports_table.sql` uses `IF NOT EXISTS` and would be a no-op on the live DB because the admin `reports` table already exists (it would NOT create the moderation columns).

---

## 8. Uncertainty note

The two migrations folders (`PoDM_project/migrations/` canonical-hot-fix vs `PoDM_project/server/scripts/migrations/` historical-bootstrap) are the structural reason this bug evaded detection: the moderation `reports` definition lived in the historical folder and was never reconciled with the live schema. Consolidating or clearly labeling these folders (issue F) is the single most valuable preventative measure.
