# Flowchart Prompts — Batch 03b (Categories J–K)

> Self-contained prompts for generating Mermaid diagrams for the PoDM platform.
> Each prompt can be given to an AI system to produce a specific diagram.
>
> File: `docs/flowcharts/flowchart-prompts-03b.md`
> Covers: J-04–J-05, K-01–K-03

---

## J-04: Architectural Risk Matrix

**Type:** Graph (flowchart)
**Priority:** P2

Generate a Mermaid flowchart visualizing the 14-item risk matrix on a 3x3 impact x likelihood grid.

Use 3x3 grid:
- X-axis: Likelihood (Low / Medium / High)
- Y-axis: Impact (Low / Medium / High)

Place each risk as a labeled node in the grid:

**High Impact x High Likelihood** (CRITICAL):
1. `0x0000` sandbox bypass in crypto verify -- any authenticated user can create fake verified transactions
2. Missing fan route guard -- unauthenticated users can access `/fan/*` frontend routes
3. Memory exhaustion -- 1GB Multer buffer per upload, no streaming to R2

**High Impact x Medium Likelihood** (HIGH):
4. No Stripe webhooks -- payment state can drift (no async payment confirmation)
5. No DB transactions -- multi-table writes (signup, content publish, payout) have partial failure windows
6. Dynamic `require()` in support.service -- can cause runtime crash if circular dependency

**Medium Impact x High Likelihood** (HIGH):
7. 2 unprotected referral routes -- no auth middleware
8. `JWT_SECRET` in frontend `.env` -- secret exposed in client bundle
9. Duplicate `AppError` classes -- can cause `instanceof` checks to fail

**Medium Impact x Medium Likelihood** (MEDIUM):
10. Sync `fs.appendFileSync` logging -- blocks event loop on every write; writes PII to disk
11. Mocked off-ramp -- payout system has no real money movement
12. No Redis/ElastiCache -- every dashboard load runs full table scans

**Low Impact x Medium Likelihood** (MEDIUM):
13. Dead Stripe frontend endpoints -- API calls to `/payments/tip`, `/payments/unlock-post` return 404
14. CSS blur bypass -- client-side blur can be removed with DevTools

For each risk, add annotation text:
- Mitigation status: (mitigated / partial / none)
- Referenced module file path

**Sources:** `07-cross-cutting-concerns.md`, `11-data-flow.md`, `08-crypto-deep-dive.md`

---

## J-05: Crypto Security Gap Heatmap

**Type:** Graph (flowchart)
**Priority:** P2

Generate a Mermaid flowchart visualizing the 12 crypto gaps grouped by layer.

Use 4 subgraphs:

**Smart Contract Layer** (3 gaps):
1. **Immutable** -- No upgrade mechanism; if a bug is found, entire contract must be replaced
2. **No pause** -- No emergency stop function; if compromised, can't halt payments
3. **Missing type fields** -- `PaymentType` enum exists in events but not stored with each payment on-chain

**Backend Verification Layer** (4 gaps):
4. **Sandbox `0x0000` bypass** -- `if (txHash.startsWith('0x0000'))` skips all on-chain verification
5. **Placeholder event topics** -- Topics are hardcoded as placeholders; actual event signature hashes not computed
6. **Hardcoded contract addresses** -- `CONTRACT_ADDRESS` env var with no validation; if wrong, verification succeeds against wrong contract
7. **No RPC API keys** -- Public JSON-RPC endpoint used; rate limits and access control not managed

**Frontend Layer** (3 gaps):
8. **Mocked wallet** -- `useCryptoWallet.ts` returns fake `0x0000...` txHash; no real wallet SDK integration
9. **Dead Stripe endpoints** -- Frontend calls `/payments/tip`, `/payments/unlock-post` which 404
10. **Raw `fetch` bypass** -- Some crypto frontend calls use raw `fetch()` instead of `apiClient.ts`, skipping auth headers

**Infrastructure Layer** (2 gaps):
11. **Mocked off-ramp** -- `processPayout` returns fake transfer ID; no integration with Coinbase/Stripe payout API
12. **No webhooks** -- No on-chain event listener/webhook; all verification is poll-based via user HTTP request

Use severity colors per gap:
- Critical: gaps 4, 5, 6, 8, 9, 11, 12
- High: gaps 7, 10
- Medium: gaps 1, 2, 3

**Sources:** `08-crypto-deep-dive.md`, `PoDMPaymentProtocol.sol`, `cryptoPayment.service.ts`, `useCryptoWallet.ts`

---

## K-01: Test Coverage Gap Map

**Type:** Graph (flowchart)
**Priority:** P1

Generate a Mermaid flowchart showing visual coverage matrix across all module categories.

Use horizontal bars for each module category with fill percentage:

| Module Category | Total Files | Tested Files | Coverage |
|---|---|---|---|
| Controllers | 15 | 1 (auth.controller.test.ts) | ~7% |
| Services | 15 | 1 (auth.service.test.ts) | ~7% |
| Models | 13 | 0 | 0% |
| Middleware | 4 | 0 | 0% |
| Utils | 13 | 4 | ~31% |
| Frontend Components | 28+ | 0 | 0% |
| Frontend Hooks | 9 | 0 | 0% |
| Frontend Lib | 6 | 0 | 0% |
| Routes | 15 | 0 | 0% |
| Config files | 8+ | 0 | 0% |
| Smart Contract | 1 | 0 | 0% |
| E2E (Playwright) | 5 specs | 5 (but not in CI) | 100% written, 0% automated |

Add annotation for each:
- Controllers: `auth.controller.test.ts` only -- tests login/signup/session
- Services: `auth.service.test.ts` only -- tests auth CRUD
- Utils: `apiError.test.ts`, `asyncHandler.test.ts`, etc.
- E2E: 5 Playwright specs but none executed in CI pipeline

Highlight:
- 8 model files with 0 tests -- database layer completely untested
- 28+ frontend components with 0 tests
- 5 E2E tests not in CI -- coverage gap between dev and deployment

**Sources:** `09-testing-monitoring.md`, all test files in `PoDM_project/server/tests/` and `podm-frontend/tests/`

---

## K-02: End-to-End Test Journey Coverage

**Type:** Graph (flowchart)
**Priority:** P2

Generate a Mermaid flowchart mapping the 5 Playwright E2E specs against the 40 user journeys.

Use two columns:
- LEFT: 5 E2E test spec files
- RIGHT: 40 user journeys from `05-user-journeys.md`

Draw edges from each spec to the journeys it covers:

1. **auth.spec.ts** -> Journeys F-01 (signup), F-02 (login), F-03 (logout), C-01 (creator signup)
2. **fan-subscribe.spec.ts** -> F-05 (browse creator), F-06 (subscribe), F-07 (view content)
3. **tipping.spec.ts** -> F-09 (send tip)
4. **creator-dashboard.spec.ts** -> C-03 (dashboard view), C-04 (upload content), C-05 (manage content)
5. **admin-moderation.spec.ts** -> M-01 (admin login), M-03 (moderate content)

Journeys NOT covered:
- F-04 (password reset)
- F-08 (PPV unlock)
- F-10 (message creator)
- F-11 (enter contest)
- F-12 (refer friend)
- C-06 (creator payout)
- C-07 (broadcast message)
- C-08 (bulk upload)
- C-09 (AI captions)
- C-10 (run contest)
- M-02 (user management)
- M-04 (support tickets)
- M-05 (impersonation)
- M-06 (platform settings)
- M-07 (verification docs)
- All gallery/feed journeys

Stat box at bottom:
- 5/40 journeys covered = 12.5% E2E coverage
- 35/40 journeys have no E2E tests

**Sources:** `09-testing-monitoring.md`, `05-user-journeys.md`, Playwright spec files

---

## K-03: Monitoring & Observability Gap Diagram

**Type:** Graph (flowchart)
**Priority:** P2

Generate a Mermaid flowchart showing the ideal observability stack vs current reality.

Use two parallel columns:

**LEFT: Current State** (red tint)
1. `console.log()` -- 100+ scattered across codebase
2. `fs.appendFileSync('debug.log', ...)` -- synchronous file logging in `auth.middleware.ts` (27K+ lines in production)
3. No structured logging -- log format varies per developer
4. No request logging -- no morgan/winston middleware
5. No APM -- no Sentry, Datadog, or New Relic
6. No metrics -- no Prometheus/metrics endpoint
7. No health checks -- `/health` endpoint does not exist
8. No dashboards -- no Grafana or similar
9. No alerts -- no PagerDuty, OpsGenie, or Slack webhook on failure
10. **Zero monitoring infrastructure**

**RIGHT: Ideal State** (green tint)
1. Structured logger (pino/winston) with JSON output and request IDs
2. Request logger (morgan) with response time tracking
3. APM (Sentry) for error tracking and performance monitoring
4. Prometheus metrics endpoint (request count, latency histogram, error rate)
5. Health check endpoint (`/health` with DB + R2 + RPC connectivity checks)
6. Grafana dashboard (system overview, API performance, error trends)
7. PagerDuty / Slack alerts on error rate thresholds

Between each pair of current/ideal, draw a gap annotation with the recommendation number from `09-testing-monitoring.md`:
- Gap 1 -> Replace `console.log` with pino
- Gap 2 -> Remove `fs.appendFileSync`, replace with structured async logging
- Gap 3 -> Add morgan or pino-http as request logger
- Gap 4 -> Integrate Sentry for error tracking
- Gap 5 -> Expose Prometheus metrics at `/metrics`
- Gap 6 -> Implement `/health` endpoint with dependency checks
- Gap 7 -> Set up Grafana dashboard
- Gap 8 -> Configure alert thresholds

**Sources:** `09-testing-monitoring.md`, `auth.middleware.ts`, `07-cross-cutting-concerns.md`
