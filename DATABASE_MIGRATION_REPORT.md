# DATABASE MIGRATION REPORT

**Date:** 2026-08-15
**Target:** Production-beta Supabase PostgreSQL (project ref `jgdiwfmvxuwedndganje`, region us-east-2, PostgreSQL 17.6)
**Related blocker:** R-07 — "migration application was not proven"
**Status:** All required migrations applied and verified against the live database. 16/16 concurrent security checks PASS against the live database. Backend Jest suite 72/72 PASS. `tsc --noEmit` clean.

---

## 1. Objective

The beta-go-live audit flagged R-07: the application of database migrations to the actual production-beta Supabase project had never been proven — migration files existed in the repo, but the live database had not been confirmed to match them. This report provides per-migration evidence that every migration was applied and that every affected object (table, column, index, constraint, function, privilege, RLS policy) exists in the correct, hardened state.

## 2. Applied migrations (8)

Applied in dependency order against `postgres.jgdiwfmvxuwedndganje`. All returned OK. None were skipped; the two stale legacy renames were intentionally not applied (see §3).

| # | Migration file | What it applied | Verified on live DB |
|---|---|---|---|
| 1 | `migrations/add_subscription_renewal_payout_types.sql` (new) | Adds enum values `SubscriptionRenewal` and `Payout` to `transaction_type` | `SELECT enumlabel ...` → `Subscription, Tip, PPV Message, PPV Post, SubscriptionRenewal, Payout` |
| 2 | `migrations/add_payer_wallet_address.sql` | Adds `transactions.payer_wallet_address text` | Column exists |
| 3 | `migrations/add_blockchain_finality_metadata.sql` | Adds `transactions.blockchain_block_number bigint`, `blockchain_block_hash text` | Columns exist |
| 4 | `migrations/add_payment_intents.sql` | Creates `payment_intents` table + `payment_intents_pending_idx` + unique constraints + all CHECK/FK constraints | Table + indexes + constraints verified (see §5) |
| 5 | `migrations/add_payout_reservations.sql` | Creates `payout_reservations` table + partial unique index + `reserve_payout`, `complete_payout_reservation`, `release_payout_reservation` (SECURITY DEFINER) | Table, index, functions verified; grants locked (see §5, §6) |
| 6 | `migrations/add_renewal_grace_period.sql` (edited) | Adds `subscriptions` renewal columns + `price integer`, `fan_wallet_address text` + `claim_subscription_renewal` (SECURITY DEFINER) | Columns + function verified |
| 7 | `migrations/add_payout_lock_rpc.sql` (edited) | Recreates `acquire_payout_lock` / `release_payout_lock` with `SET search_path = public, pg_temp` + service_role-only grants | Functions verified secdef=true, search_path set, grants locked |
| 8 | `migrations/secure_payment_intents_payout_reservations.sql` (new) | Enables RLS on `payment_intents` + `payout_reservations`; revokes all DML from PUBLIC/anon/authenticated; grants to service_role | RLS enabled on both; only postgres + service_role hold DML |

## 3. Migrations intentionally NOT applied (stale/legacy)

| File | Reason |
|---|---|
| `migrations/rename_payment_gateway_id.sql` | Legacy rename of a column (`payment_gateway_id`) that has already been superseded — `transactions.blockchain_tx_hash` exists and the rename target no longer applies. Code no longer references `payment_gateway_id`. Applying would fail. |
| `migrations/rename_stripe_subscription_id.sql` | Same — `subscriptions.stripe_subscription_id` was already renamed to `blockchain_tx_hash`; code no longer references the legacy column. |

The `acquire_payout_lock` / `release_payout_lock` RPCs are retained (legacy path) but were hardened via the re-applied `add_payout_lock_rpc.sql`; the audit-relevant payout path uses `reserve_payout` + reservation functions.

## 4. Verification methodology

- Connected to the live project as the owner via the Supabase pooler (`aws-0-us-east-2.pooler.supabase.com:6543`, PostgreSQL 17.6).
- **Inventory pass:** enumerated all 23 public tables, columns, enums, constraints, indexes, functions, RLS flags/policies, and role grants.
- **Gap analysis:** compared every repo migration file against live-DB objects (by expected table/column/index/function signature).
- **Concurrent live-DB tests:** a standalone Node script (`concurrent-test.js`) ran 8-way parallel `reserve_payout`, 5-way parallel `payment_intents.client_intent_id` inserts, 5-way parallel duplicate `blockchain_tx_hash` inserts, and 6-way parallel `claim_subscription_renewal` calls through the **service-role client (exact production path)**, asserting exactly-one-wins semantics and correct error codes.
- **Privilege checks:** verified via `pg_proc`/`information_schema.routine_privileges` that every SECURITY DEFINER function has `search_path` set and EXECUTE granted only to `postgres`/`service_role`; via `role_table_grants` that the service-role-only tables are not accessible to anon/authenticated.

## 5. Verified object inventory (new/changed)

### 5.1 Tables created
- `payment_intents` (RLS enabled) — `id uuid PK`, `client_intent_id text NOT NULL UNIQUE`, `fan_id/creator_id uuid FK → profiles(id) ON DELETE CASCADE`, `transaction_type` CHECK in `('Tip','PPV Message','PPV Post','Subscription')`, `related_id text`, `amount_in_cents integer CHECK (>0)`, `blockchain_tx_hash text UNIQUE`, `status` CHECK in `('pending','verified','failed')` default `pending`, `created_at timestamptz`, `verified_at timestamptz`.
- `payout_reservations` (RLS enabled) — `id uuid PK`, `creator_id uuid FK → profiles(id) ON DELETE CASCADE`, `amount integer CHECK (>0)`, `status` CHECK in `('pending','completed','released')` default `pending`, `blockchain_tx_hash text`, `created_at timestamptz`, `completed_at timestamptz`.

### 5.2 Indexes
- `payment_intents_pending_idx` on `(status, created_at)` — drives the reconciler's pending-intent scan.
- `payout_reservations_one_pending_per_creator` partial unique index on `(creator_id) WHERE status='pending'` — the atomic one-pending-reservation guarantee.
- `payment_intents_client_intent_id_key` UNIQUE, `payment_intents_blockchain_tx_hash_key` UNIQUE.

### 5.3 Columns added
- `transactions.payer_wallet_address text`
- `transactions.blockchain_block_number bigint`
- `transactions.blockchain_block_hash text`
- `subscriptions.price integer`
- `subscriptions.fan_wallet_address text`
- `subscriptions.renewal_attempts integer`
- `subscriptions.renewal_locked_at timestamptz`
- `subscriptions.renewal_claim_id uuid`
- `subscriptions.renewal_claimed_at timestamptz`
- `subscriptions.renewal_pending_tx_hash text`

### 5.4 Functions (all SECURITY DEFINER, `search_path = public, pg_temp`, lang plpgsql)
| Function | Verified signature |
|---|---|
| `reserve_payout` | `(p_creator_id uuid, p_amount integer) → uuid`; rejects concurrent pending; enforces available balance |
| `complete_payout_reservation` | `(p_reservation_id uuid, p_tx_hash text) → boolean` |
| `release_payout_reservation` | `(p_reservation_id uuid) → boolean` |
| `claim_subscription_renewal` | `(p_subscription_id bigint, p_claim_id uuid) → boolean` |
| `acquire_payout_lock` | `(p_creator_id uuid) → boolean` (legacy path, hardened) |
| `release_payout_lock` | `(p_creator_id uuid) → boolean` (legacy path, hardened) |

### 5.5 Enums
- `transaction_type` now: `Subscription, Tip, PPV Message, PPV Post, SubscriptionRenewal, Payout`.
- `transaction_status` includes `Cleared` (unchanged, correct).

## 6. Privilege & RLS hardening

The audit flagged SECURITY DEFINER functions without `search_path` and over-granted EXECUTE (PUBLIC/anon/authenticated). The apply pass fixed this and also closed two newly-discovered gaps on the migration-created tables.

### 6.1 Function grants (after apply — all EXECUTE locked to `postgres` + `service_role` only)
`acquire_payout_lock`, `release_payout_lock`, `reserve_payout`, `complete_payout_reservation`, `release_payout_reservation`, `claim_subscription_renewal` — each verified EXECUTE only for `postgres` and `service_role`. The `anon` and `authenticated` grants that Supabase auto-applies at function creation were explicitly revoked in `add_payout_lock_rpc.sql`, `add_payout_reservations.sql`, and `add_renewal_grace_period.sql` (files updated to match).

### 6.2 Table RLS + grants (new gap found & fixed)
`payment_intents` and `payout_reservations` were created by the migrations **without RLS** and inherited full anon/authenticated DML from Supabase defaults. Both are service-role-only tables (written/read exclusively by the server via SECURITY DEFINER RPCs and the reconciler job). Fixed via `secure_payment_intents_payout_reservations.sql`:
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on both.
- `REVOKE ALL ... FROM PUBLIC/anon/authenticated`; `GRANT ALL ... TO service_role` on both.
- Verified live: RLS enabled on both; only `postgres` + `service_role` hold privileges.
- Confirmed the anonymous role is rejected: `anon` → `42501 permission denied for function reserve_payout`.

## 7. Concurrent live-DB test results (16/16 PASS)

Run through the service-role client against the live project:

| Check | Result |
|---|---|
| `reserve_payout` — exactly 1 of 8 concurrent calls wins | PASS (1 won, 7 rejected) |
| Losers rejected with "Another payout is already being processed" | PASS (7/7) |
| Second reservation while a pending reservation exists | PASS (rejected) |
| `complete_payout_reservation` transitions pending → completed | PASS |
| `payout_reservations` row durable `completed` + tx hash | PASS |
| New `reserve_payout` allowed after completion | PASS |
| `release_payout_reservation` returns true | PASS |
| `payment_intents.client_intent_id` UNIQUE under 5-way concurrency | PASS (1 ok, 4× `23505`) |
| Reconciler pending-intent query path | PASS |
| `transactions.type` accepts `SubscriptionRenewal` | PASS |
| `transactions.type` accepts `Payout` | PASS |
| `transactions.blockchain_tx_hash` dedup under 5-way concurrency (V-A01) | PASS (1 ok, 4× `23505`) |
| `claim_subscription_renewal` — exactly 1 of 6 concurrent workers claims | PASS (1 claimed) |
| Durable `renewal_claim_id` / `renewal_claimed_at` recorded | PASS |
| `payer_wallet_address` + finality metadata writable | PASS |
| Anon role cannot execute `reserve_payout` | PASS (permission denied) |

## 8. Regression confirmation

- Backend Jest suite: **15 suites / 72 tests PASS** (`npm test`).
- TypeScript: `tsc --noEmit` clean.
- RLS on `payment_intents`/`payout_reservations` does not affect the service-role production path (service_role bypasses RLS; re-ran §7 after enabling RLS — still 16/16 PASS).

## 9. Security notes

- DB credentials (host/user/password) are held only in `PoDM_project/.env` / `server/.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) and were never written to this report or the repository.
- The pooler connection string used for this verification is not persisted in any versioned file.
- Test rows created during verification were cleaned up (subscriptions, payout_reservations, payment_intents, transactions, profiles, auth users).