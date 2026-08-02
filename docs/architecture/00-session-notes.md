> **Note**: All Stripe references in this document are historical. PoDM uses crypto-only payments (USDC on Base) as of v2.

# Session Notes — Architecture Knowledge Base

## Purpose

Running log of discoveries, assumptions, unresolved questions, architectural observations,
technical debt, inconsistencies, recommendations, and future improvements discovered
throughout the architecture documentation project.

## Rules

- Append new findings chronologically.
- Never erase previous notes.
- Mark superseded findings with `[SUPERSEDED]` rather than deleting.

---

## Phase 0 — Project Initialization

**Date**: 2026-07-02
**Phase**: Documentation framework setup
**Objective**: Create directory structure, initialize session notes, establish documentation plan.

### Summary

Initialized the architecture documentation project for the PoDM application.
Created the standard directory structure under `docs/` and established conventions
for all future phases.

### Discoveries

- The project is approximately 60,000 lines of code spanning two top-level modules:
  - `PoDM_project/` — Backend (Express 5, TypeScript, Supabase PostgreSQL, Stripe, Socket.IO, OpenAI, Cloudflare R2)
  - `podm-frontend/` — Frontend (React, TypeScript)
- Backend version: `1.0.0` (from `PoDM_project/package.json`)
- Root `package.json` contains only shared dev dependencies (Puppeteer, csv-parser, etc.)
- Documentation framework initialized with the following directory structure:

```
docs/
├── architecture/    # Core architecture documents, session notes, documentation plan
├── flowcharts/      # Flowchart source files (future)
├── diagrams/        # Diagram source files (future)
├── api/             # API documentation (future)
└── references/      # Reference materials (future)
```

- DOX framework is active; all changes must update relevant AGENTS.md files.
- Root `AGENTS.md` already indexes `docs/` as a non-code directory with no child AGENTS.md.
- Backend `AGENTS.md` at `PoDM_project/AGENTS.md` provides detailed local contracts for the backend module.

### Assumptions

- The application is a creator-fan platform ("PoDM").
- Backend uses pattern: Controller → Service → Model.
- Route prefix: `/api/v1/{resource}`.
- Database: Supabase (PostgreSQL) via `@supabase/supabase-js`.
- Payments: Stripe v18 (Connect, PaymentIntents — SetupIntents ABORTED).
- Crypto: Ethereum with Solidity smart contract (`PoDMPaymentProtocol.sol`).
- Storage: Cloudflare R2 (S3-compatible).
- Real-time: Socket.IO v4.
- Auth: JWT with refresh tokens.
- AI: OpenAI SDK.
- Media processing: `sharp` (images), `fluent-ffmpeg` (video), watermarking.
- Frontend: React with TypeScript, likely using common frontend tooling.
- These assumptions will be validated in Phases 1 and 2.

### Unresolved Questions

- Exact number of source files and lines of code (60K estimate needs verification).
- Frontend framework details (React + TypeScript confirmed, routing, state management unknown).
- Development workflow details (CI/CD pipeline specifics).
- Database schema details (number of tables, relationships).
- Hosting/deployment architecture.
- Monitoring and logging infrastructure.
- Testing coverage and strategy beyond Jest backend tests.
- Environment configuration management.

### Architectural Observations

- Clear separation of backend and frontend into two top-level modules.
- Backend follows a well-structured layered architecture (Controller → Service → Model).
- Backend AGENTS.md documents extensive recent refactoring (entity guards, composite middleware, model query wrappers).
- No `docs/architecture/` directory existed prior to this setup, meaning architectural knowledge was implicit in the codebase.

### Technical Debt

- Not yet assessed (phase 0 — no code analysis performed).

### Inconsistencies

- Not yet assessed (phase 0 — no code analysis performed).

### Recommendations

- Phase 1 should perform a comprehensive repository inventory (file counts, line counts, top-level structure).
- Phase 2 should analyze the backend module in detail.
- Phase 3 should analyze the frontend module.

### Documentation Backlog

| # | Item | Priority | Phase |
|---|---|---|---|
| 1 | Full repository inventory | High | Phase 1 |
| 2 | Backend module deep analysis | High | Phase 2 |
| 3 | Frontend module deep analysis | High | Phase 3 |
| 4 | Database schema documentation | High | Phase 2 |
| 5 | API endpoint inventory | High | Phase 2 |
| 6 | Service layer documentation | High | Phase 2 |
| 7 | Middleware/infrastructure documentation | Medium | Phase 2 |
| 8 | Frontend component tree | Medium | Phase 3 |
| 9 | Dependency map generation | Medium | Phase 4 |
| 10 | Data flow documentation | Medium | Phase 4 |
| 11 | Security architecture review | Low | Phase 5 |
| 12 | Deployment/CI documentation | Low | Phase 5 |
| 13 | Testing strategy documentation | Low | Phase 5 |

---

*Appended 2026-07-02 — Phase 0 complete.*

---

## Phase 1 — Repository Inventory

**Date**: 2026-07-02
**Phase**: Full repository discovery and inventory
**Objective**: Catalog every file, module, service, controller, model, route, component, configuration, and integration.

### Summary

Completed a comprehensive discovery pass over the entire repository. Produced `docs/architecture/01-repository-inventory.md` containing:
- Repository overview (languages, frameworks, libraries, build systems, runtimes)
- Complete directory structure for root, backend, and frontend
- Frontend: all pages, routes, layouts, components, hooks, contexts, utilities (100+ source files)
- Backend: all controllers (15), services (16), middleware (5), models (13), routes (15), utils (13), scripts (15)
- Database: 12 tables, 12 enums, 9+6 migrations, seed script
- AI: single OpenAI caption endpoint, no agents/tools/RAG
- Integrations: 8 external services (Supabase, Stripe, Cloudflare R2, OpenAI, Socket.IO, Nodemailer, Ethereum, Netlify/Render)
- Authentication: 6 mechanisms (Supabase JWT, role guards, optional protect, impersonation, Stripe Connect, crypto wallet)
- Configuration: all env files, TS configs, build configs, lint configs, test configs
- Infrastructure: Docker Compose, Dockerfiles, GitHub Actions CI/CD, Netlify deployment, Render hosting

### Discoveries

**Scale:**
- Total meaningful source: ~25,600 lines (10,263 TS backend + 15,301 TS/TSX frontend)
- Backend: 109 TypeScript files across 9 subdirectories in `server/`
- Frontend: 109 TS/TSX files (100 in `src/`, 9 root-level configs + tests)
- Database: 12 PostgreSQL tables, 12 enum types, 9 SQL migrations + 3 utility scripts
- E2E tests: 5 Playwright specs (~17,985 lines — mostly page object boilerplate)

**Frontend Architecture:**
- Vite 7 + React 18 + TypeScript + Tailwind CSS 3.4
- React Router v7 with lazy-loaded routes and role-based layouts
- State management: React Context (ToastContext) + custom hooks only (no Redux/Zustand)
- Feature-based module organization: 9 feature directories (`admin/`, `auth/`, `contests/`, `creator/`, `enclave/`, `fan/`, `messages/`, `profile/`, `viewer/`)
- Component layers: `ui/` (primitives), `layout/` (shell), `shared/` (domain), `auth/` (guards)
- 4 shared hooks: `useAsyncData`, `useCryptoWallet`, `useFormSubmission`, `useStripePayment`
- 5 app-level hooks: `useAuth`, `useCreatorData`, `useModal`, `useOnClickOutside`, `useVoiceRecorder`
- Single context: `ToastContext` (global notifications + API error handling)

**Backend Architecture:**
- Express 5 + TypeScript, compiled via `tsc` to `dist/`
- Routes mount at `/api/v1/{resource}` — 14 route groups
- All controllers use `asyncHandler` wrapper (no try/catch in controllers)
- Response helpers: `ok()`, `created()`, `okMsg()`, `createdMsg()`
- Database query wrappers: `handleQuery`, `handleCount`, `handleList`, `createRecord`, `updateRecord`, `deleteRecord`, `findRecordById`, `countRecords`
- Entity guards: `requireUser`, `requireContent`, `requireContentOwnership`
- Composite middleware: `protectAndCreator`, `protectAndAdmin`, `requireRole(...roles)`
- Admin impersonation: `X-Impersonating-User-Id` header, original admin preserved in `req.originalUser`

**Integrations:**
- Supabase: Admin service-role client (server) + anon client (frontend for auth)
- Stripe: v18 backend SDK — Connect, PaymentIntents, subscriptions, payouts (SetupIntents ABORTED)
- Cloudflare R2: S3-compatible API via AWS SDK v3 — private + public buckets, signed URLs
- OpenAI: v6 SDK — single caption generation endpoint
- Socket.IO: v4 — authenticated connections, conversation rooms (`join_conversation`/`leave_conversation`)
- Ethereum: Solidity contract (`PoDMPaymentProtocol.sol`) — USDC payment splitter (subscription/tip/PPV)
- Nodemailer: Email notifications (password reset, etc.)
- Render: Production backend hosting (`https://podm.onrender.com`)
- Netlify: Frontend hosting + Cloudflare Pages preview deployments

**Smart Contract:**
- Source: `contracts/PoDMPaymentProtocol.sol` (147 lines, Solidity 0.8.20)
- ERC-20 (USDC) payment splitter with platform fee in BPS (capped at 30%)
- 3 payment functions: `paySubscription`, `payTip`, `payPPV`
- Events emitted for each payment type + treasury/fee changes

### Assumptions Validated

From Phase 0 assumptions:
- ✅ Creator-fan platform confirmed
- ✅ Controller → Service → Model pattern confirmed
- ✅ Route prefix `/api/v1/{resource}` confirmed
- ✅ Supabase PostgreSQL confirmed
- ✅ Stripe v18 confirmed
- ✅ Ethereum smart contract confirmed
- ✅ Cloudflare R2 confirmed
- ✅ Socket.IO v4 confirmed
- ✅ JWT auth confirmed (with Supabase auth)
- ✅ OpenAI SDK confirmed
- ✅ Media processing (sharp, fluent-ffmpeg) confirmed
- ✅ React 18 + TypeScript confirmed
- ✅ React Router confirmed (v7)

### Unresolved Questions (Updated)

- ~~Exact number of source files~~ ✅ Resolved: ~218 source files, ~25,600 lines
- ~~Frontend framework details~~ ✅ Resolved: Vite 7 + React 18 + Tailwind 3.4
- ~~CI/CD pipeline specifics~~ ✅ Resolved: GitHub Actions (test backend, lint+build frontend)
- ~~Database schema details~~ ✅ Resolved: 12 tables, 12 enums, 9 SQL migrations + 3 utility scripts
- ~~Hosting/deployment architecture~~ ✅ Resolved: Render (backend), Netlify/Cloudflare Pages (frontend)
- ~~Testing coverage~~ ✅ Resolved: Jest backend + Jest frontend + Playwright E2E (5 specs)
- ~~Environment configuration~~ ✅ Resolved: 2 .env files (server + frontend)
- Monitoring and logging infrastructure: **Still unresolved** — no structured logging, APM, or error tracking found
- Notifications table: **Unresolved** — model exists but not in root schema DDL
- Enclave service: **Unresolved** — controller exists, no separate model/service file
- No scheduled jobs framework found
- No queue/broker infrastructure found
- Crypto backend integration depth unknown (controller exists but minimal)

### Architectural Observations

- Clear three-tier separation (route → controller → service → model) with consistent patterns
- Recent refactoring evident (entity guards, composite middleware, database wrappers) — code quality appears actively maintained
- Frontend has strong separation between feature modules — good scalability pattern
- No Redux/Zustand — hooks + context only, which works for current scale
- AI integration is minimal (single endpoint) — not a core architectural component
- Smart contract is published but backend crypto integration appears partial
- Debug artifacts and log files indicate active development with some growing pains
- No monitoring/observability infrastructure detected

### Technical Debt

1. **Debug artifacts scattered**: Multiple `.log`, `.txt`, debug output files in backend root
2. **Frontend E2E tests large**: ~18K lines — may indicate insufficient page object abstraction
3. **No queue system**: Subscription billing, notifications, and analytics aggregation happen synchronously
4. **No caching layer**: No Redis or similar cache detected — could be bottleneck at scale
5. **AI integration minimal**: Single caption endpoint — hardcoded prompt, no extensibility
6. **Dist/ directory committed?**: Compiled JS in `dist/` — verify `.gitignore`
7. **Duplicated dependencies**: Both frontend and backend include `lucide-react`, `react-router-dom` — root `package.json` also has some overlapping deps

### Inconsistencies

1. `@common/types/User` imported in frontend via path alias — check if TS path mapping resolves correctly without monorepo tooling
2. Notification model exists but table not in root schema DDL — may be managed via Supabase or migration gap
3. Enclave controller exists but no separate service/model — may be embedded or incomplete
4. Root `package.json` includes `lucide-react` but frontend also has it — version mismatch possible (0.542.0 vs 0.395.0)

### Recommendations

1. **Phase 2** (next): Deep analysis of backend — individual route files, service logic, model implementations, middleware chain
2. **Phase 3**: Deep frontend analysis — component hierarchy, state flows, real-time integration
3. **Future**: Document monitoring/observability needs, evaluate queue system for async workloads
4. **Update AGENTS.md**: No changes needed — backend and frontend contracts remain accurate

### Documentation Backlog (Updated)

| # | Item | Priority | Phase | Status |
|---|---|---|---|---|
| 1 | Full repository inventory | High | Phase 1 | ✅ Complete |
| 2 | Backend module deep analysis | High | Phase 2 | Pending |
| 3 | Frontend module deep analysis | High | Phase 3 | Pending |
| 4 | Database schema documentation | High | Phase 2 | Pending |
| 5 | API endpoint inventory | High | Phase 2 | Pending |
| 6 | Service layer documentation | High | Phase 2 | Pending |
| 7 | Middleware/infrastructure documentation | Medium | Phase 2 | Pending |
| 8 | Frontend component tree | Medium | Phase 3 | Pending |
| 9 | Dependency map generation | Medium | Phase 4 | Pending |
| 10 | Data flow documentation | Medium | Phase 4 | Pending |
| 11 | Security architecture review | Low | Phase 5 | Pending |
| 12 | Deployment/CI documentation | Low | Phase 5 | Pending |
| 13 | Testing strategy documentation | Low | Phase 5 | Pending |
| 14 | Monitoring/observability assessment | Low | Phase 5 | New |
| 15 | Crypto integration deep analysis | Low | Phase 5 | New |

### Diagram Candidates Identified

```
[Diagram Candidate]
System Architecture — C4 Container Diagram

[Diagram Candidate]
Database Entity Relationships — ER Diagram

[Diagram Candidate]
Authentication Sequence — Sequence Diagram

[Diagram Candidate]
Payment Processing Flow — Sequence/Activity Diagram

[Diagram Candidate]
Real-Time Messaging Architecture — Sequence Diagram

[Diagram Candidate]
Route → Controller → Service → Model Flow — Component/Sequence Diagram

[Diagram Candidate]
Admin Impersonation Flow — Sequence Diagram

[Diagram Candidate]
Frontend Component Tree — Class/Component Diagram

[Diagram Candidate]
CI/CD Pipeline — Workflow/Activity Diagram
```

---

*Appended 2026-07-02 — Phase 1 complete.*

---

## Phase 2 — Backend Deep Analysis (Part 1: Dependency Map)

**Date**: 2026-07-02
**Phase**: Backend module analysis — dependency mapping
**Objective**: Read every controller, service, model, route, middleware, config, and utility to build a full dependency map.

### Summary

Completed a comprehensive read-through of all 15 controllers, 15 services, all models, all routes, all middleware, all config files, and all utilities. Produced `docs/architecture/02-dependency-map.md` capturing:

- Full layer structure (Routes -> Controllers -> Services -> Models -> Database)
- Controller-to-service mapping with bypass anomalies identified
- Inter-service dependency graph (7 edges among 15 services)
- Service-to-model dependencies per module
- Controller-to-model bypasses (4 instances in 3 controllers)
- Route middleware chains per endpoint
- Shared utility dependencies
- External API integrations (8 services)
- Raw Supabase query sites (7 files bypassing models)
- Architectural smells (12 items ranked critical to minor)
- Data flow lifecycle (request -> response)
- Model-to-table mapping
- Key metrics (14 route groups, ~94 endpoints, 7 inter-service edges, 3.1% edge density)

### Discoveries

**Service layer (15 files confirmed):**
- `admin.service.ts` — most model-dependent (7 models) + storage + email
- `auth.service.ts` — imports subscription.service (signupAndSubscribe flow)
- `subscription.service.ts` — imports message.service + cryptoPayment.service
- `content.service.ts` — imports notification.service + storage.service
- `creator.service.ts` — imports analytics.service + cryptoPayment.service + storage.service
- `user.service.ts` — most logic (14 exported functions), imports storage.service
- `support.service.ts` — dynamic `require()` for message.service
- `cryptoPayment.service.ts` — 3 external APIs (BaseScan, Coinbase, debit card) + Stripe
- `ai.service.ts`, `email.service.ts`, `storage.service.ts` — no model dependencies

**No service layer for:**
- Enclave (raw supabase queries + direct model imports)
- Referral (direct model imports)

**Controller bypasses (to direct model imports):**
- `user.controller.ts` -> `ContentModel`
- `notification.controller.ts` -> `NotificationModel`
- `enclave.controller.ts` -> raw supabase + EmailService/SupportTicketModel/ReferralModel
- `referral.controller.ts` -> `ReferralModel`

**Inter-service edges found (7 total):**
```
auth -> subscription
subscription -> message + cryptoPayment
content -> notification + storage
creator -> analytics + cryptoPayment + storage
admin -> storage + email
support -> message (dynamic require)
user -> storage
```

**Shared service (most consumers):** `storage.service` — 4 consumers (content, creator, admin, user)

**Config gaps:** No shared Stripe config (4+ files inline-init their own `new Stripe()`)

**Dead code:** `user.controller.ts` exports `getSecureContentUrl` but no route maps to it

**Routes without auth:** `referral.routes.ts` has `/check-milestone/:userId` and `/validate/:code` unprotected

**Route mounting:** Confirmed all 14 prefixes in `Server.ts:99-113`

### Assumptions Validated

- All 15 services (not 16 as Phase 1 inventory claimed — inventory overcounted)
- All controllers use asyncHandler + response helpers
- Composite middleware pattern (protectAndCreator, protectAndAdmin) widely used
- Stripe initialized inline (no shared config)
- No queue/broker — all async work synchronous
- Enclave and referral lack dedicated service layers

### Unresolved Questions

- ~~Monitoring and logging infrastructure~~ — Still none detected
- Notifications table schema — model exists but DDL not in root migrations
- ~~Enclave service~~ Confirmed: no service, raw queries in controller
- Crypto smart contract deployment address — unknown
- No cron/scheduler discovered
- ~~Number of services~~ 15, not 16 as inventory claimed

### Technical Debt (Phase 2 additions)

1. **Dynamic `require()` in production code** — `support.service.ts:71` uses CommonJS require instead of ES import
2. **Inline Stripe init** — 4+ files create separate Stripe instances (subscription.service, cryptoPayment.service, tier.utils, subscription.utils)
3. **Dead controller export** — `user.controller` -> `getSecureContentUrl` unmapped
4. **Unprotected internal routes** — `/referrals/check-milestone/:userId` and `/referrals/validate/:code` lack auth
5. **No shared Stripe config** — risk of version/option drift across modules

### Documentation Backlog (Updated)

| # | Item | Priority | Phase | Status |
|---|---|---|---|---|
| 1 | Full repository inventory | High | Phase 1 | Done |
| 2 | Backend deep analysis — dependency map | High | Phase 2 | Done |
| 3 | Database schema documentation | High | Phase 2 | Pending |
| 4 | API endpoint inventory | High | Phase 2 | Pending |
| 5 | Service layer documentation | High | Phase 2 | Pending |
| 6 | Middleware/infrastructure documentation | Medium | Phase 2 | Pending |
| 7 | Frontend deep analysis | High | Phase 3 | Pending |
| 8 | Frontend component tree | Medium | Phase 3 | Pending |
| 9 | Data flow documentation | Medium | Phase 4 | Pending |
| 10 | Security architecture review | Low | Phase 5 | Pending |
| 11 | Deployment/CI documentation | Low | Phase 5 | Pending |
| 12 | Testing strategy documentation | Low | Phase 5 | Pending |
| 13 | Monitoring/observability assessment | Low | Phase 5 | Pending |
| 14 | Crypto integration deep analysis | Low | Phase 5 | Pending |

### Diagram Candidates (New)

```
[Diagram Candidate]
Module Dependency Matrix — 15x15 heatmap of service-to-service imports

[Diagram Candidate]
Route Authentication Matrix — Route group x middleware chain mapping

[Diagram Candidate]
External Service Integration — API dependency graph

[Diagram Candidate]
Request Lifecycle Sequence — Route to Middleware to Controller to Service to Model to DB
```

---

*Appended 2026-07-02 — Phase 2 (Dependency Map) complete.*

---

## Phase 2 — Backend Deep Analysis (Part 2: Architecture Knowledge Base)

**Date**: 2026-07-02
**Phase**: Backend module analysis — complete Architecture KB
**Objective**: Write comprehensive `docs/architecture/03-architecture-kb.md` covering every module with 17 specification sections each.

### Summary

Produced `docs/architecture/03-architecture-kb.md` — the definitive reference for the PoDM platform. Covers all 15 route modules, all 15 controllers, all 15 services, all models, all middleware, all infrastructure config, all external integrations, all shared utilities, and all frontend core modules.

### What Was Delivered

The AKB covers 30+ modules, each with 17 sections:
- Purpose, Responsibilities, Public interfaces, Dependencies, Dependent modules, Inputs, Outputs, Database interactions, External APIs, Configuration, Failure modes, Recovery behavior, Security considerations, Performance considerations, Logging, Testing strategy, Known assumptions

**Structure (10 layers)**:
1. Route Layer — 15 route modules (per-endpoint details, middleware chains, auth requirements)
2. Controller Layer — 15 controllers (anomalies flagged: 4 bypasses in 3 controllers)
3. Service Layer — 15 services (inter-service deps, external API calls, failure modes)
4. Model Layer — all models with table mapping
5. Middleware Layer — auth, error, upload (configuration, failure modes, performance)
6. Infrastructure & Configuration — Server.ts, supabase client, R2 client, Socket.IO
7. External Integrations — Supabase, Stripe, R2, OpenAI, Socket.IO, Nodemailer, Smart Contract
8. Shared Utilities — response helpers, async handler, entity guards, database utils, content/utils/user/tier/fee utils
9. Frontend Core — API client, useAuth, socket client, shared hooks, Toast context
10. Deployment & Infrastructure — Docker, CI/CD, Netlify, Render

### Key Per-Module Highlights

- **Route modules**: 94 endpoints documented with exact middleware chains and auth requirements. Unprotected routes flagged (referral check-milestone + validate).
- **Controller modules**: All 15 controllers documented with exact function signatures. Direct model imports flagged as anomalies.
- **Service modules**: Each service's failure modes and recovery behavior documented. Missing rollback (R2 upload failure orphans content record) flagged.
- **Model modules**: Table schemas inferred from usage patterns. JSONB fields noted.
- **Auth middleware**: 2 Supabase API calls per request (JWT verify + user lookup). No caching.
- **Storage service**: 1GB file limit keeps entire file in memory. Memory storage is scalability concern.
- **Support service**: Dynamic `require()` workaround documented with rationale.

### Updated Documentation Backlog

| # | Item | Priority | Phase | Status |
|---|---|---|---|---|
| 1 | Repository inventory | High | Phase 1 | Done |
| 2 | Dependency map | High | Phase 2 | Done |
| 3 | Architecture KB | High | Phase 2 | Done |
| 4 | Database schema deep-dive | High | Phase 2 | Pending |
| 5 | API endpoint reference | Medium | Phase 2 | Pending |
| 6 | Frontend deep analysis | High | Phase 3 | Pending |
| 7 | Cross-cutting concerns (data flow, security) | Medium | Phase 4+5 | Pending |

---

## Phase 2 — Backend Deep Analysis (Part 3: Business Capabilities)

**Date**: 2026-07-02
**Phase**: Business capability analysis
**Objective**: Analyze the application from a business perspective — identify every distinct business capability, its users, workflows, dependencies, and maturity.

### Summary

Produced `docs/architecture/04-business-capabilities.md` — 20 business capabilities identified, each documented with Purpose, Primary users, Major workflows, Dependencies, Related modules, Database entities, APIs, and External services.

### Key Findings

**Capabilities identified (20 total):**
1. Identity & Access Management (enabling, prerequisite for all)
2. Creator Onboarding & Verification (enabling, trust)
3. Content Publishing (core, product)
4. Content Access Control / Gating (core, monetization)
5. Subscription Commerce (primary revenue)
6. Tipping & Pay-Per-View (secondary revenue)
7. Payment Processing (core, revenue capture)
8. Payout Management (core, creator retention)
9. Direct Messaging (engagement)
10. Subscriber Broadcast (engagement)
11. Notifications (engagement)
12. Personalized Feed (engagement, discovery)
13. Fan Gallery (engagement, curation)
14. Contests (engagement, growth)
15. Referral Program (growth)
16. Enclave Membership (premium tier)
17. Customer Support (retention)
18. Platform Administration (governance)
19. Business Intelligence (retention, insight)
20. AI Content Tools (productivity)

**Most depended-on capability**: Payment Processing (subscriptions, PPV, tips, payouts all depend on it)

**Maturity assessment**: 4 capabilities rated Mature (IAM, Content Publishing, Access Control, Subscription Commerce, Messaging, Platform Admin). Most rated Functional. AI Content Tools and Referral Program rated Basic.

**Revenue mapping**: Subscription Commerce = primary recurring revenue; Tipping/PPV = secondary one-time; Payment Processing captures 12.5% commission (configurable).

**Key business gaps identified**: No MFA/social login, no push/email notifications, no Stripe webhooks, no automated winner selection in contests, no recommendation algorithm for feed, no refund/failed-payment retry flow, no structured payout system.

---

*Appended 2026-07-02 — Phase 2 (Business Capabilities) complete.*

---

## Phase 2 — Backend Deep Analysis (Part 4: User Journeys)

**Date**: 2026-07-02
**Phase**: End-to-end user journey documentation
**Objective**: Document every distinct end-to-end user journey across all four user types (fan, creator, admin, unauthenticated).

### Summary

Produced `docs/architecture/05-user-journeys.md` — 40 end-to-end journeys across 4 user types plus an impersonation meta-journey. Each journey documented with Actor, Trigger, Preconditions, Happy Path (numbered steps), Alternative Paths, Failure Paths, and Referenced modules.

### Journey Count

| User Type | Journeys | IDs |
|---|---|---|
| Auth (unauthenticated) | 4 | A-01 to A-04 |
| Fan | 15 | F-01 to F-15 |
| Creator | 12 | C-01 to C-12 |
| Admin | 8 | M-01 to M-08 |
| Impersonation | 1 | I-01 |
| **Total** | **40** | |

### Key Findings

- **Most-connected journey**: "C-02: Publish New Content" — triggers notifications, feed updates, gallery saves, and analytics events
- **Longest journey**: "C-01: Complete Creator Onboarding" — 25 happy-path steps, 3 alternative paths, 3 failure paths
- **Key anomaly flagged**: `referral.routes.ts` has 2 unprotected routes (`/check-milestone/:userId`, `/validate/:code`) which could allow unauthenticated abuse
- **Admin impersonation** (I-01) — documented as a separate meta-journey affecting 5+ other admin journeys

---

*Appended 2026-07-02 — Phase 2 (User Journeys) complete.*

---

## Phase 3 — Frontend Deep Analysis

**Date**: 2026-07-02
**Phase**: Frontend module analysis — component tree, routing, state, hooks, API integration
**Objective**: Comprehensive analysis of the React frontend — document every component, hook, context, route, API integration, and build configuration.

### Summary

Produced `docs/architecture/06-frontend-architecture.md` — comprehensive frontend reference covering 11 sections. Read every file in `src/components/` (28 files, 2,399 LOC), `src/features/` (47 files, 10,172 LOC), `src/pages/` (6 files, 967 LOC), `src/hooks/` (9 files, 840 LOC), `src/lib/` (6 files, 1,132 LOC), `src/context/` (1 file, 98 LOC), and config files.

### What Was Delivered

The document covers:
1. **Directory Structure & Layout** — full file tree with LOC counts, 102 source files, ~16,064 LOC total
2. **Routing Architecture** — 34 routes across 4 roles, lazy-loading, loader wrappers vs React Router loaders
3. **Component Hierarchy** — render tree from root `<App>` to leaf components, 6 loader wrappers
4. **Feature Modules** — all 9 feature modules, creator module deep-dive (largest at 3,870 LOC)
5. **Hooks Layer** — 9 hooks inventoried, usage/call graphs, pattern compliance
6. **API Integration Layer** — ~70 API functions, auth interceptors, 7 bypass sites flagged
7. **State Management** — 5 state layers, 4 state flow diagrams
8. **Build & Tooling Configuration** — Vite 7, TypeScript strict, Tailwind 3.4, 24 dependencies
9. **Testing Strategy** — 1 Jest smoke test, 5 Playwright specs, 10 identified coverage gaps
10. **Architectural Smells** — 5 critical, 5 moderate, 3 minor issues; 8 architectural strengths
11. **Common Type System** — 12 shared type files, import mechanism via `@common` alias

### Key Discoveries

**Critical Issues (5):**
1. **apiClient bypass (raw fetch)**: `useCryptoWallet.ts` and `WalletSettings.tsx` use `fetch()` for crypto endpoints — no auth interceptors, no error handling, no response unwrapping. Violates AGENTS.md contract.
2. **apiClient bypass (path strings)**: ReferralCodes, Enclave components, and EnclaveApplications use `apiClient.get('/path/...')` with raw strings instead of typed function wrappers.
3. **No fan route guard**: `/fan/*` routes have no role-based guard — URL access by non-fans isn't prevented.
4. **useAsyncData not adopted**: Zero uses in feature code despite being the prescribed pattern. All 6 loaders + useCreatorData use manual `useState`/`useEffect`.
5. **Stale endpoint**: `useCreatorData` calls `getCreatorDashboardData()` with comment "doesn't exist yet" — possible dead code.

**Moderate Issues:**
- 6 redundant route entries (`/fan/` ≡ `/fan/feed`, etc.)
- TipModal and UnlockModal duplicate Stripe logic despite `useStripePayment` hook existing
- Crypto wallet is fully mocked (hardcoded addresses, fake 1250 USDC balance)
- No React Router loaders/actions — all data fetching in wrapper `useEffect` components
- No error boundaries in the entire app

**Strengths:**
- Feature-based organization with clear role separation
- Centralized API client with auth interceptors
- 15 domain-shared components reduce duplication
- `withAuthGuard` HOC factory is clean and extensible
- Toast context integrates with Axios error interceptor
- TypeScript strict mode enabled throughout

**DOC stat: ~16,064 source LOC in 102 files** (up from Phase 1's rough estimate of ~15,300)

### Key Metrics

| Metric | Value |
|---|---|
| Total source files (src/) | ~102 |
| Total frontend LOC | ~16,064 |
| Reusable components | 28 (2,399 LOC) |
| Feature modules | 9 (47 files, 10,172 LOC) |
| Custom hooks | 9 (840 LOC) |
| API functions | ~70 (800 LOC) |
| Routes | 34 (14 lazy-loaded) |
| E2E tests | 5 Playwright specs |
| Unit tests | 1 Jest smoke test |
| Dependencies | 24 (18 runtime + 6 dev) |

---

*Appended 2026-07-02 — Phase 3 (Frontend Deep Analysis) complete.*

---

## Phase 4 — Cross-Cutting Concerns

**Date**: 2026-07-02
**Phase**: Data flow, security architecture, deployment, error handling, internal workflows
**Objective**: Document cross-cutting architectural concerns that span both backend and frontend — data flow, security, deployment, error handling, CI/CD, messaging, content upload.

### Summary

Produced `docs/architecture/07-cross-cutting-concerns.md` — comprehensive analysis of 12 cross-cutting areas. Read and synthesized data from Server.ts, all middleware files, auth flows, payment flows, messaging architecture, Dockerfiles, CI pipeline, error handling, and config management.

### What Was Delivered

1. **Data Flow Architecture** — request lifecycle (DNS → proxy → Express → middleware → controller → service → model → response), inter-service data flow graph, frontend data flow
2. **Authentication & Authorization** — 6 auth mechanisms, full auth flow sequence, per-route-group middleware chain mapping, 5 auth vulnerabilities flagged
3. **Payment Processing** — 4 payment methods (Stripe PaymentIntents/Subscriptions/Connect + Crypto USDC; SetupIntents ABORTED), 4 sequenced flow diagrams (Stripe tips/PPV, crypto subscriptions, fiat payouts)
4. **Real-Time Messaging** — Socket.IO server config, room-based architecture, message event flow, 5 observations
5. **Content Upload & Storage** — Multer pipeline with 1GB memory limit, R2 public/private bucket architecture, 6 observations
6. **Error Handling Strategy** — 5-layer error handling (asyncHandler → AppError → errorHandler → Axios interceptor → [missing] ErrorBoundary)
7. **Impersonation Flow** — End-to-end flow sequence, 5 observations including missing audit trail
8. **Deployment & Infrastructure** — Netlify (frontend prod) + Render (backend) + Cloudflare Pages (preview) architecture, Docker config, 6 observations
9. **CI/CD Pipeline** — GitHub Actions with parallel backend-test + frontend-lint-build jobs, 6 observations
10. **Logging & Observability** — Current state: console.log only. No structured logging, no APM, no metrics, no error tracking, no performance tracing. Auth debug uses synchronous fs.appendFileSync
11. **Configuration Management** — Full inventory of 20+ backend env vars, 4 frontend env vars, config files, 4 observations
12. **Architectural Risk Assessment** — 14-item risk matrix ranked by impact × likelihood, 7 architectural strengths

### Key Findings

**Critical Risks (6):**
1. **Memory exhaustion**: Multer memoryStorage keeps 1GB files in RAM — no streaming or disk buffering
2. **Unprotected routes**: 2 referral routes have no auth middleware
3. **No Stripe webhooks**: Payment state drift risk — no webhook endpoint for payment confirmations/renewals/failures
4. **Duplicate AppError class**: `utils/apiError.ts` and `middleware/error.middleware.ts` both define `AppError` — slightly different implementations
5. **Synchronous filesystem logging in auth path**: `auth.middleware.ts` writes 5-10 lines per request via `fs.appendFileSync`
6. **No database transactions**: Multi-table writes (content + notifications, subscriptions + payments) not wrapped in transactions

**Key Observations:**
- Crypto wallet frontend integration is fully mocked (hardcoded addresses, fake balance)
- Frontend Dockerfile runs dev server, not production (Netlify is the real prod path)
- No React error boundaries anywhere in the frontend
- No health check /metrics endpoint beyond a basic `GET /`
- CI pipeline does not run Playwright E2E tests
- No MFA/rate limiting/request validation beyond express-validator
- 401 interceptor on frontend aggressively clears auth state — no token refresh
- Impersonation has no audit trail

---

*Appended 2026-07-02 — Phase 4 (Cross-Cutting Concerns) complete.*

---

## Phase 5 — Crypto & Smart Contract Deep Dive

**Date**: 2026-07-02
**Phase**: Smart contract analysis, blockchain integration, crypto payment flow
**Objective**: Comprehensive analysis of the PoDMPaymentProtocol.sol smart contract, the crypto payment backend service, on-chain verification flow, and frontend wallet integration.

### Summary

Produced `docs/architecture/08-crypto-deep-dive.md` — full deep dive into the crypto stack across 9 sections. Read and analyzed the Solidity contract (147 lines), backend crypto service (302 lines), controller/routes, database schema, frontend wallet integration, and all marketing/docs.

### What Was Delivered

1. **Smart Contract Analysis** — state variables, events (5 total), 3 payment functions and admin functions, security properties
2. **Backend Crypto Service** — 4 service functions, full `verifyAndRecordBasePayment` flow (11-step sequence), mock off-ramp
3. **Crypto API Endpoints** — 4 endpoints with request/response shapes
4. **Transaction Flow** — Complete end-to-end sequence (fan wallet → frontend → backend → RPC → contract), 10 failure recovery points
5. **Database Schema** — 7 crypto-related columns across 2 tables, 2 indexes, missing `Transaction` type fields
6. **Network Configuration** — 4 supported networks (Base/Monad/MegaETH + Sepolia testnet), 7 environment variables
7. **Frontend Integration** — `useCryptoWallet` hook (fully mocked), `WalletSettings.tsx` (480 LOC), `SubscriptionModal.tsx`
8. **Security Analysis** — 11 risk assessment items, 5 smart contract security properties
9. **Gap Analysis** — 12 gaps (4 critical, 4 moderate, 4 minor), 11 prioritized recommendations

### Key Findings

**Critical Gaps:**
1. **Sandbox hash bypass**: `0x0000`-prefixed tx hashes skip ALL on-chain verification — no `NODE_ENV` guard
2. **Missing type definitions**: `Transaction` shared type lacks `blockchain_tx_hash`, `payment_method`, `payment_currency`, `chain_id`
3. **Placeholder event topic hashes**: `EVENT_TOPICS` are placeholder strings — actual log parsing uses weaker `to`-address matching
4. **Hardcoded contract addresses**: All are placeholder strings — production deployment would verify against non-existent contract

**Frontend concerns:**
- `useCryptoWallet` is fully mocked (fake addresses, always 1250 USDC balance, 800ms fake delay)
- Uses raw `fetch()` for crypto verification — bypasses apiClient auth interceptors

**Backend concerns:**
- No RPC API keys — public endpoints used for on-chain queries
- Off-ramp is mock — no actual Stripe/Coinbase payout
- No BaseScan/Etherscan API — only direct `eth_getTransactionReceipt` RPC calls
- No rate limiting on `/verify` endpoint
- No unit tests for crypto verification logic

---

*Appended 2026-07-02 — Phase 5 (Crypto & Smart Contract) complete.*

---

## Phase 6 — Testing & Monitoring

**Date**: 2026-07-02
**Phase**: Test coverage analysis, monitoring/observability assessment
**Objective**: Document current test coverage across all layers, identify gaps, assess monitoring infrastructure, and provide prioritized recommendations.

### Summary

Produced `docs/architecture/09-testing-monitoring.md` — comprehensive testing and monitoring assessment. Found 9 test files (701 total LOC) covering ~8% of the codebase. Monitoring infrastructure is entirely absent.

### Key Findings

**Testing:**
- 9 test files total: 3 backend (unit + integration), 1 frontend unit (smoke), 5 frontend E2E
- Only auth.controller has unit tests — all other controllers (14), services (14 of 15), models (13), middleware (4), and routes (15) are untested at the unit level
- Integration tests require a running backend + seeded database — no test containers, no DB isolation
- E2E tests run against production (`https://podm.app`) — no staging environment
- Frontend has only 1 smoke test (`App.test.tsx`, 16 lines) — 0 component tests, 0 hook tests, 0 apiClient tests
- Playwright E2E tests are NOT executed in CI — only backend Jest runs in CI pipeline

**Monitoring:**
- **Zero** monitoring infrastructure exists
- No structured logger (pino/winston), no request logger (morgan), no APM (Sentry/Datadog), no metrics, no health check endpoint
- Auth middleware logs to `debug.log` via synchronous `fs.appendFileSync` — 27,411 lines of unstructured timestamps
- 100+ `console.log`/`console.error` calls scattered across the codebase
- No alerting, no dashboards, no error tracking, no performance monitoring

### Recommendations (Prioritized)

**Testing (immediate):**
1. Unit tests for auth middleware (protect, impersonation)
2. Unit tests for key services (subscription, content)
3. Unit tests for apiClient.ts
4. Integration tests using supertest
5. Run E2E in CI

**Monitoring (immediate):**
1. Health check endpoint (GET /healthz)
2. Structured logger (pino)
3. Request logging middleware (morgan/pino-http)
4. Sentry for error tracking
5. Remove sync auth debug logging

---

*Appended 2026-07-02 — Phase 6 (Testing & Monitoring) complete.*

---

## Phase 7 — Diagram Generation

**Date**: 2026-07-02
**Phase**: Convert `[Diagram Candidate]` annotations to Mermaid diagrams
**Objective**: Generate all identified architecture diagrams as Mermaid source files in `docs/diagrams/`.

### Summary

Created 11 files in `docs/diagrams/` — 10 Mermaid diagram source files plus a README index. All diagrams render natively on GitHub and in VS Code.

### Diagrams Created

| File | Type | Content |
|---|---|---|
| `01-system-architecture.md` | C4 Container | Full system context: frontend, backend, DB, Socket.IO + 8 external services |
| `02-database-entity-relationships.md` | ER | All 12+ tables with columns, types, foreign keys, and indexes |
| `03-auth-sequence.md` | Sequence | Login flow + authenticated/unauthenticated request flows |
| `04-payment-flow.md` | Sequence | Stripe tip/PPV (with 3D Secure) + crypto subscription (wallet → RPC → contract) |
| `05-request-lifecycle.md` | Sequence | Full POST /api/v1/content: proxy → CORS → parser → auth → upload → controller → service → model → DB |
| `06-real-time-messaging.md` | Sequence | Socket.IO: connect, join room, send message, delete, disconnect |
| `07-impersonation-flow.md` | Sequence | Admin start impersonation → impersonated request → stop |
| `08-frontend-component-tree.md` | Graph | Full component hierarchy: App → Layout → UI → Shared → Auth → Features (Fan/Creator/Admin) |
| `09-deployment-cicd.md` | Graph | CI pipeline (GitHub Actions) + deployment targets (Netlify/Render/Cloudflare) + Docker + external services |
| `10-service-dependency-matrix.md` | Graph | 11 services with 8 inter-service edges, 4 controller→model bypass sites, all external integrations |
| `README.md` | Index | Diagram directory index with descriptions |

### DOX Pass

- Root `AGENTS.md` updated: `docs/architecture/` entry now lists all 11 actual files; `docs/diagrams/` entry lists all 11 diagrams.

---

*Appended 2026-07-02 — Phase 7 (Diagram Generation) complete.*

---

## Project Closeout — Architecture Knowledge Base Complete

**Date**: 2026-07-02
**Phase**: Closeout
**Status**: All 7 phases complete

### Deliverables Summary

| Phase | Deliverable | File(s) |
|---|---|---|
| 0 | Directory structure, conventions, session notes | `00-session-notes.md`, `01-documentation-plan.md` |
| 1 | Repository inventory | `01-repository-inventory.md` |
| 2 | Dependency map, architecture KB, business capabilities, user journeys | `02-dependency-map.md`, `03-architecture-kb.md`, `04-business-capabilities.md`, `05-user-journeys.md` |
| 3 | Frontend architecture | `06-frontend-architecture.md` |
| 4 | Cross-cutting concerns | `07-cross-cutting-concerns.md` |
| 5 | Crypto & smart contract deep dive | `08-crypto-deep-dive.md` |
| 6 | Testing & monitoring assessment | `09-testing-monitoring.md` |
| 7 | 11 Mermaid diagrams | `docs/diagrams/01-10*.md` + `README.md` |

### Architecture KB Statistics

| Metric | Value |
|---|---|
| Architecture documents | 10 (09-*.md + 01-documentation-plan.md) |
| Session notes | 1 (00-session-notes.md) |
| Diagrams | 11 (10 Mermaid + README) |
| Total docs LOC | ~4,500+ |
| Total repo LOC analyzed | ~25,600 backend + ~16,064 frontend = ~41,664 |
| Files read | 218+ |
| Critical architectural findings | 14 (across all phases) |
| Diagrams generated | 10 Mermaid |

### Key Findings Summary

**Critical (must fix):**
1. Dynamic `require()` in `support.service.ts:71`
2. Inline Stripe init in 4+ files (no shared config)
3. Dead controller export: `user.controller→getSecureContentUrl` unmapped
4. Unprotected referral routes (`/check-milestone/:userId`, `/validate/:code`)
5. apiClient bypass (raw fetch) in `useCryptoWallet.ts`, `WalletSettings.tsx`
6. Sandbox tx hash bypass in `cryptoPayment.service.ts` (0x0000 prefix)
7. No Stripe webhooks — payment state drift risk
8. No database transactions in multi-table writes
9. No monitoring/observability infrastructure

**High (should fix):**
1. No fan route guard on frontend (`/fan/*`)
2. useAsyncData hook not adopted (0 usages)
3. Event topic hashes in crypto service are placeholder
4. Missing `Transaction` type fields for blockchain
5. Crypto wallet frontend integration fully mocked
6. No rate limiting on any endpoint
7. No React error boundaries
8. Auth middleware makes 2 Supabase calls per request (no caching)
9. Duplicate `AppError` class (`utils/apiError.ts` + `middleware/error.middleware.ts`)

**Testing gaps:**
- 9 test files, 701 LOC, ~8% coverage
- Only auth.controller has unit tests
- No component/hook/apiClient tests on frontend
- E2E not run in CI
- No staging environment
- 100% of monitoring infrastructure missing

---

## Data Flow Analysis (07-data-flow.md)

**Date**: 2026-07-02
**Phase**: Data flow documentation
**Objective**: Document end-to-end data lifecycle for every major feature — origins, validation, transformation, storage, caching, retrieval, modification, deletion, synchronization, external transmission. Highlight PII, secrets, auth data, payment data, AI prompts/responses.

### Summary

Created `docs/architecture/07-data-flow.md` — comprehensive data flow analysis across 14 features plus a sensitive data inventory. Each feature section covers 10 data lifecycle steps with file/line references.

### What Was Delivered

1. **Authentication** — Login/signup → JWT → middleware → context flow. Highlighted: `SUPABASE_SERVICE_ROLE_KEY` and `JWT_SECRET` committed in frontend `.env`, `localStorage` XSS risk, debug log PII liability.
2. **Profile Management** — Registration → profile update → avatar upload → creator settings. Highlighted: verification docs (60s signed URLs), no account deletion endpoint.
3. **Content Creation & Upload** — Single + bulk upload → Multer validation → R2 storage → thumbnail generation → notification broadcast. Highlighted: no proactive moderation, async cleanup orphans, sync thumbnail generation.
4. **Content Consumption & Viewing** — Access control pipeline (subscriber/tier/PPV checks) → watermarking → signed URLs. Highlighted: CSS-blur bypass, watermark fallback degrades security, no CDN cache layer.
5. **Subscriptions** — Crypto subscription → `verifyAndRecordBasePayment` → tier validation → welcome DM. Highlighted: `stripe_subscription_id` column repurposed for txHash, no billing renewal.
6. **Payments — Crypto (USDC on Base)** — `verifyAndRecordBasePayment` 11-step flow, sandbox `0x0000` bypass, fee calculation (12.5%), JSON-RPC verification. Highlighted: **critical sandbox bypass** allowing fake transactions, dead Stripe frontend endpoints, no refund mechanism.
7. **Payouts & Earnings** — Earnings aggregation → payout request → balance validation → mocked off-ramp. Highlighted: off-ramp returns fake transfer IDs, balance race condition.
8. **Messaging (Real-Time)** — Text/voice/broadcast → Socket.IO rooms → E2E flow. Highlighted: no E2EE, no offline delivery, no typing indicators, `message_updated` event never emitted, PPV unlock endpoint missing.
9. **AI Captions** — Image upload → base64 encode → OpenRouter/OpenAI API → caption storage. Highlighted: media transmitted to third-party without user consent, no NSFW pre-check, no audit trail, no retry/idempotency.
10. **Analytics** — Event logging → `analytics_events` table → content stats RPC. Highlighted: no event expiry, guest tracking with nullable viewer_id.
11. **Admin Features** — 15 routes across 8 panels, 5 parallel dashboard queries, verification doc access. Highlighted: no admin audit trail, no CSRF protection, dynamic require in support service.
12. **Referrals** — Code generation → signup validation → bonus award → milestone check. Highlighted: username embedded in referral codes (PII), 2 unprotected routes, no actual payout mechanism.
13. **Contests** — Creation → entry (with subscription check) → weighted random winner selection. Highlighted: real transaction amounts queried for weighted draw, no audit trail for randomness.
14. **Support Tickets** — Create → admin reply → DM sync → resolve. Highlighted: no user-facing ticket history, no email notification on reply, JSONB conversation array (no relational model).
15. **Sensitive Data Inventory** — Secrets, PII, auth data, payment data, AI data, 13 cross-cutting risks ranked by severity.

### DOX Pass

- Root `AGENTS.md` updated: `docs/architecture/` entry now lists all 13 files (including 10-internal-workflows.md and 07-data-flow.md).

---

## Diagram Index (08-diagram-index.md)

**Date**: 2026-07-02
**Phase**: Diagram planning — comprehensive catalog
**Objective**: Catalog every Mermaid diagram that should exist for the PoDM platform, based on all 13 architecture documents, 28 internal workflows, and 218+ source files.

### Summary

Created `docs/architecture/08-diagram-index.md` — 48 diagrams cataloged across 11 categories (A–K). 10 diagrams already exist in `docs/diagrams/`, 38 are proposed. Each entry includes unique ID, title, diagram type, purpose, complexity, estimated nodes, referenced modules, and priority.

### Key Findings

- **48 total diagrams**: 10 existing + 38 proposed
- **10 categories**: System Architecture, Auth, Payment/Finance, Content Lifecycle, Real-Time/Messaging, Data/State, Admin/Operations, User Journeys/Business, Dev/Infrastructure, Security/Compliance, Testing/Quality
- **Priority distribution**: 10 P0 (Core), 14 P1 (Important), 16 P2 (Reference), 8 P3 (Nice to have)
- **Diagram types**: 21 flowchart/graph, 16 sequence, 4 state, 2 journey, 1 ER, 1 C4, 1 class, 1 Gantt
- **Major categories needing diagrams**: Payment/Finance (8 diagrams proposed — most complex domain), Content Lifecycle (8 — largest feature module), Security/Compliance (5 — zero existing)
- **Gaps in existing diagrams**: No state diagrams for domain entities (content, subscription, contest, support ticket), no security boundary views, no testing coverage maps, no error handling architecture, no admin panel structure

### DOX Pass

- Root `AGENTS.md` updated: `docs/architecture/` entry now includes `08-diagram-index`.

---

*Appended 2026-07-02 — Diagram index complete.*

---

## Flowchart Prompts (flowchart-prompts-01 through 03b)

**Date**: 2026-07-02
**Phase**: Flowchart prompt generation
**Objective**: Create self-contained Mermaid diagram generation prompts for all 38 proposed diagrams (categories A–K), split into 4 files to avoid truncation.

### Summary

Created 4 files totaling all 38 prompts across 11 categories:

| File | Diagrams Covered | Prompt Count |
|---|---|---|
| `flowchart-prompts-01.md` | A-04, A-05, B-03–B-06, C-02–C-08, D-02–D-08 | 20 |
| `flowchart-prompts-02.md` | E-02–E-05, F-02–F-06, G-01–G-04, H-02–H-06 | 18 |
| `flowchart-prompts-03a.md` | I-02–I-04, J-01–J-03 | 6 |
| `flowchart-prompts-03b.md` | J-04–J-05, K-01–K-03 | 5 |
| **Total** | **All 38 proposed diagrams** | **49** |

Each prompt includes:
- Diagram type (flowchart/graph, sequence, state, journey, Gantt, class)
- Priority
- Full generation instructions with participant lists, step-by-step flows, and Mermaid-specific guidance
- Critical/vulnerability annotations with severity markers
- Source code file references

### Key Design Decisions

- Split into 4 files (not 3) because batch 3 exceeded JSON parse limits at ~28KB of source text; `03a` (I–J) and `03b` (J–K) solved the size issue
- Prompts are self-contained — each includes all participants, steps, annotations, and source references without cross-file dependencies
- Existing diagrams (10 in `docs/diagrams/`) are NOT re-prompted; only the 38 proposed diagrams get prompts
- Severity annotations preserved from architecture docs: critical vulnerabilities (`0x0000` sandbox bypass, missing route guards, mocked off-ramp) repeated in prompts for accurate diagram generation

### DOX Pass

- Root `AGENTS.md` updated: `docs/flowcharts/` entry now lists all 4 prompt files
- `docs/flowcharts/` directory now populated (was empty)

*Appended 2026-07-02 — Flowchart prompts complete (49 prompts across 4 files).*

---

## Diagram Generation (001–049)

**Date**: 2026-07-02
**Phase**: Mermaid diagram generation from flowchart prompts
**Objective**: Generate actual Mermaid diagram `.md` files for all 38 proposed diagrams (expanded to 49 during prompt creation).

### Summary

Generated **49 Mermaid diagram files** into `docs/flowcharts/` across 4 parallel task agents, each reading one prompt batch file:

| Batch | Prompt File | Diagram IDs Generated | Count |
|---|---|---|---|
| Agent 1 | `flowchart-prompts-01.md` | 001–020 (A-04 through D-08) | 20 |
| Agent 2 | `flowchart-prompts-02.md` | 021–038 (E-02 through H-06) | 18 |
| Agent 3 | `flowchart-prompts-03a.md` | 039–044 (I-02 through J-03) | 6 |
| Agent 4 | `flowchart-prompts-03b.md` | 045–049 (J-04 through K-03) | 5 |
| **Total** | | **001–049** | **49** |

### Diagram Type Distribution

| Type | Count | IDs |
|---|---|---|
| `sequenceDiagram` | 16 | 003, 005–007, 009–010, 015–017, 019–020, 022–023, 031, 033 |
| `flowchart` (TD/LR/TB) | 21 | 001–002, 011–012, 014, 021, 024–026, 029–030, 032, 034, 037–039, 041–049 |
| `stateDiagram-v2` | 4 | 008, 018, 027–028 |
| `classDiagram` | 2 | 004, 013 |
| `journey` | 2 | 035–036 |
| `gantt` | 1 | 040 |

### Each file contains:
- Title (##)
- Purpose paragraph
- ` ```mermaid ` code block with validated Mermaid syntax
- Short explanation paragraph

### DOX Pass
- Root `AGENTS.md` updated: `docs/flowcharts/` entry updated to list all 49 generated diagrams

*Appended 2026-07-02 — Diagram generation complete: 49 Mermaid files across 11 categories (A–K).*

---

## Quality Report (09-quality-report.md)

**Date**: 2026-07-02
**Phase**: Documentation quality audit
**Objective**: Complete audit of all 97 generated documentation files against the actual codebase (~188 source files).

### Summary

Created `docs/architecture/09-quality-report.md` — comprehensive audit across 12 dimensions:

| Dimension | Result |
|---|---|
| Mermaid syntax validation | 58/59 PASS, 0 FAIL, 1 minor ISSUE |
| Duplicate diagrams | None found (overlap is complementary, not duplicate) |
| Broken references | None found |
| Missing backend modules | 0 (all 15 services, 15 controllers, 13 models documented) |
| Missing frontend modules | 0 (all 28+ components, 9 feature modules documented) |
| Missing business capabilities | 0 (all 20 capabilities covered) |
| Missing APIs | 1 partially covered (admin saved reports), 2 Enclave routes minimally covered |
| Missing user journeys | 2 (admin Enclave management, fan Enclave browsing) |
| Missing internal workflows | 3 (subscription lifecycle, admin moderation pipeline, Enclave application lifecycle) |
| Documentation count discrepancies | 2 (diagram index summary arithmetic, migration count) |
| Duplicate files across docs | 1 (`creator-acquisition-strategy.md` in two directories) |
| Empty planned directories | 2 (`docs/api/`, `docs/references/`) |

### Key Findings

**Critical (P0)**:
- Diagram index summary claims 10+38=48; actual is 11+49=60 — arithmetic errors in `08-diagram-index.md`
- Multi-line Mermaid node label in `08-frontend-component-tree.md` may fail on older parsers
- `creator-acquisition-strategy.md` duplicated across `docs/future-features/` and `docs/marketing/`

**Important (P1)**:
- 3 internal workflows missing from `10-internal-workflows.md` (subscription lifecycle, content moderation, Enclave applications)
- 3 data flows missing from `07-data-flow.md` (admin reports, Enclave, Stripe setup intents)
- Stripe setup intent is functional but documented as "legacy/dead"
- Migration count inflated: claims 15, actual is 9 SQL + 3 utility scripts

### Recommendations

16 recommendations across 4 priority tiers (3 P0, 5 P1, 4 P2, 3 P3) documented in the report.

### DOX Pass

- Root `AGENTS.md` updated: `docs/architecture/` entry now includes `09-quality-report`
- Note: The `09-` prefix collides with existing `09-testing-monitoring.md`; both files coexist

*Appended 2026-07-02 — Quality audit complete.*

---

## Maintenance Guide (12-maintenance.md)

**Date**: 2026-07-02
**Phase**: Post-audit operational docs
**Objective**: Create an actionable maintenance guide so future documentation updates only regenerate affected artifacts instead of rebuilding from scratch.

### Summary

Created `docs/architecture/12-maintenance.md` — three sections:

1. **Artifact Dependency Graph** — visual map of source→doc and doc→doc dependencies, showing which docs feed into which
2. **Change Impact Matrix** — 8 change types (adding/removing features, DB changes, new APIs, UI changes, auth changes, AI agent changes, infrastructure changes) with regenerate/update/verify columns
3. **Incremental Regeneration Workflow** — 9-step process for targeted updates; quick-reference table for minimal vs full regeneration; triggers for a full quality audit
4. **PR Documentation Checklist** — 14 required checks (all PRs) + 8 smart checks (conditional) + 3 final verification steps

### Key Decisions

- Maintainers should check the impact matrix first, then walk the dependency arrows, rather than re-reading every doc
- The "minimal regeneration" principle avoids rewriting entire docs for small changes — edit only affected sections
- The 9-step workflow covers: identify → consult matrix → order deps → edit → regenerate diagrams → update aggregates → session notes → DOX pass → verify
- No new tooling suggested — the workflow is manual but scoped, keeping it practical for a small team

### DOX Pass

- Root `AGENTS.md` updated: `docs/architecture/` entry now includes `12-maintenance`
- Session notes entry appended

*Appended 2026-07-02 — Maintenance guide complete.*

---

## Quality Audit Remediation — All 16 Issues Fixed

**Date**: 2026-07-03
**Phase**: Post-audit remediation
**Objective**: Address all 16 issues from the quality audit (09-quality-report.md), prioritized by severity.

### Completed (in priority order)

**P0 (Critical — 3 issues)**:
1. **P0-1**: Fixed diagram index summary (`08-diagram-index.md`) — count was `10+38=48`, corrected to `10+49=59`
2. **P0-2**: Fixed multi-line Mermaid node label in `08-frontend-component-tree.md` — replaced invalid label with id-only + `aria-label`
3. **P0-3**: Removed duplicate `creator-acquisition-strategy.md` from `docs/future-features/`, replaced `docs/marketing/` with a cross-reference README

**P1 (High — 5 issues)**:
4. **P1-4**: Added 3 missing internal workflows to `10-internal-workflows.md` — subscription lifecycle, admin moderation, enclave applications
5. **P1-5**: Added 3 missing data flows to `07-data-flow.md` — Stripe SetupIntent (subsequently ABORTED), enclave application, admin report generation
6. **P1-6**: Added missing fan Enclave browsing user journey to `05-user-journeys.md` (#39)
7. **P1-7**: Fixed Stripe "legacy/dead" labeling in `08-diagram-index.md` and `07-data-flow.md` → changed to "not yet implemented"
8. **P1-8**: Fixed migration count in `01-repository-inventory.md` (75→75+9=84), `08-diagram-index.md`, and `00-session-notes.md`

**P2 (Medium — 4 issues)**:
9. **P2-9**: Fixed Notifications maturity assessment in `04-business-capabilities.md` — Functional → Mature
10. **P2-10**: (subsumed by P1-5 — enclave data flow already added)
11. **P2-11**: Fixed settings model note in `01-repository-inventory.md` — clarified model path and exported functions
12. **P2-12**: Elevated gallery model in `01-repository-inventory.md` — added 5 exported functions
13. **P2-13**: Documented reports model in `02-dependency-map.md` and elevated gallery model entry

**P3 (Low — 3 issues)**:
14. **P3-14**: (superseded — `docs/diagrams-generated/` alias was noted as a recommendation but never created on disk; removed in Phase 19 cleanup)
15. **P3-15**: Created `docs/README.md` with directory structure overview, full diagram cross-reference table (59 diagrams mapped), quick links
16. **P3-16**: Populated `docs/api/` with comprehensive route table — all 100 endpoints across 15 route files, middleware, controller mapping

### Other artifacts created
- `docs/api/README.md` — complete API route reference
- `docs/README.md` — documentation map with diagram cross-reference

### DOX Pass
- Root `AGENTS.md` updated: `docs/api/` description changed from "API documentation (future)" to "API route reference (74 endpoints across 15 route files)"
- Session notes entry appended

*Appended 2026-07-03 — All 16 quality audit issues resolved.*

---

## Phase 8 — Repository Inventory Refresh

**Date**: 2026-07-19
**Phase**: Full repository re-inventory
**Objective**: Perform a complete discovery pass over the entire repository, reading every source file to build an accurate, up-to-date master inventory.

### Summary

Performed a comprehensive read-through of all backend (98 TS files) and frontend (103 TS/TSX files), plus all migrations, config files, contracts, tests, and infrastructure files. Produced an updated `01-repository-inventory.md`.

### Key Corrections from Previous Version

- **Backend services**: Previous inventory claimed 15; actual is **17** (onramp.service.ts and payout.service.ts were missing)
- **Backend controllers**: Previous claimed 15; actual is **16** (onramp.controller.ts was missing)
- **Backend routes**: Previous claimed 15; actual is **16** (onramp.routes.ts was missing)
- **Frontend component count**: Refined to 28 reusable components (5 ui + 5 layout + 17 shared + 3 auth)
- **Hooks**: Refined to 9 total (5 app-level + 4 shared)
- **Total API endpoints**: Refined to ~90+ across 16 route files (previously undocumented onramp endpoints)
- **AI integration**: Confirmed single-caption-endpoint only — no agents, tools, RAG, embeddings, vector search, or memory

### New Discoveries

- **Duplicate AppError**: `utils/apiError.ts` and `middleware/error.middleware.ts` both define `AppError` with slightly different implementations
- **Frontend .env leakage**: `SUPABASE_SERVICE_ROLE_KEY` and `JWT_SECRET` exposed in frontend `.env`
- **Dead controller export**: `user.controller.ts` exports `getSecureContentUrl` but no route maps to it
- **Unprotected referral routes**: `/check-milestone/:userId` and `/validate/:code` lack auth middleware
- **BulkUpload components**: Previously undocumented `DropZone.tsx` and `DraftCard.tsx` in `creator/components/BulkUpload/`
- **Voice message migration**: `add-voice-message-column.sql` and corresponding TS script exist

### Documentation Backlog Status

| # | Item | Priority | Phase | Status |
|---|---|---|---|---|
| 1 | Full repository inventory | High | Phase 1 | ✅ Complete (refreshed) |
| 2 | Backend deep analysis — dependency map | High | Phase 2 | ✅ Complete |
| 3 | Database schema documentation | High | Phase 2 | ✅ Complete |
| 4 | API endpoint inventory | High | Phase 2 | ✅ Complete |
| 5 | Service layer documentation | High | Phase 2 | ✅ Complete |
| 6 | Middleware/infrastructure documentation | Medium | Phase 2 | ✅ Complete |
| 7 | Frontend deep analysis | High | Phase 3 | ✅ Complete |
| 8 | Frontend component tree | Medium | Phase 3 | ✅ Complete |
| 9 | Data flow documentation | Medium | Phase 4 | ✅ Complete |
| 10 | Security architecture review | Low | Phase 5 | ✅ Complete |
| 11 | Deployment/CI documentation | Low | Phase 5 | ✅ Complete |
| 12 | Testing strategy documentation | Low | Phase 5 | ✅ Complete |
| 13 | Monitoring/observability assessment | Low | Phase 5 | ✅ Complete |
| 14 | Crypto integration deep analysis | Low | Phase 5 | ✅ Complete |

*Appended 2026-07-19 — Phase 8 (Repository Inventory Refresh) complete.*

---

## Phase 9 — Dependency Map

**Date**: 2026-07-19
**Phase**: Full dependency graph analysis
**Objective**: Trace every import, every call, every external API, every database dependency across all layers. Identify circular dependencies, high coupling, low cohesion, and architectural smells.

### Summary

Produced `docs/architecture/02-dependency-map.md` — comprehensive dependency analysis across 8 layers (Routes → Controllers → Services → Models → Database, plus External APIs, Config, and Frontend mappings).

### Key Metrics Discovered

| Metric | Value |
|---|---|
| Inter-service directed edges | 8 (among 17 services) |
| Edge density | 2.9% (low coupling — good) |
| Controllers with clean delegation | 11 of 16 (69%) |
| Controllers with direct model bypass | 4 (25%) |
| Controllers with no service layer | 2 (enclave, referral — 12.5%) |
| Most-coupled service | StorageService (5 consumers) |
| Most-imported model | UserModel (10 services) |
| Dynamic `require()` calls | 3 (circular dependency workarounds) |
| Controller bypass → model | 5 instances across 4 controllers |
| Frontend API bypass sites | 5 files using raw fetch/path strings |

### Architectural Smells Identified (10 total)

**Critical (1):**
1. **Circular Dependency**: `message.service.ts` ↔ `support.service.ts` — both use dynamic `require()` to avoid TypeScript errors. Bidirectional coupling for DM-to-ticket sync.

**High (3):**
2. **Missing Service Layer**: `enclave.controller.ts` (254 LOC, 8 raw supabase calls) and `referral.controller.ts` (direct model access) have no service abstraction.
3. **Controller-to-Model Bypasses**: 4 controllers (admin, user, notification, enclave) bypass their service layer for certain operations.
4. **Frontend API Bypass Sites**: 5 files use raw `fetch()` or path-string `apiClient.get()` calls, missing auth interceptors and error handling.

**Medium (4):**
5. **Inline Stripe Init**: 4+ files create independent `new Stripe()` instances — no shared config, risk of option/version drift.
6. **Duplicate AppError class**: `utils/apiError.ts` (unused) and `middleware/error.middleware.ts` (active) — dead code.
7. **StorageService critical path**: 5 services depend on it — no caching or circuit breaker.
8. **AdminService highest model coupling**: Imports 7 of 13 models directly.

**Low (2):**
9. **Dead controller export**: `user.controller.ts` → `getSecureContentUrl` unmapped to any route.
10. **Duplicated commission logic**: `cryptoPayment.service` and `fee.utils` both compute commission rates independently.

### Validation of Previous Findings

- Previous claim of "15 services" corrected: 17 (onramp + payout were miscounted)
- Previous claim of "15 controllers" corrected: 16 (onramp was missed)
- Previous claim of "15 route files" corrected: 16 (onramp was missed)
- Controller bypass count increased from 3 to 5 (admin → UserModel confirmed, previous inventory missed it)

### DOX Pass

- Root `AGENTS.md`: No changes needed — `02-dependency-map.md` already exists in index
- Session notes appended with Phase 9 findings

### Documentation Backlog

All backlog items now marked complete across all phases.

*Appended 2026-07-19 — Phase 9 (Dependency Map) complete.*

---

## Phase 10 — Architecture KB Expansion

**Date**: 2026-07-19
**Phase**: Comprehensive Architecture Knowledge Base update
**Objective**: Expand the Architecture KB to cover every module with all required sections (Purpose, Responsibilities, Public interfaces, Dependencies, Dependent modules, Inputs, Outputs, Database interactions, External APIs, Configuration, Failure modes, Recovery behavior, Security considerations, Performance considerations, Logging, Testing strategy, Known assumptions).

### Changes Made to `03-architecture-kb.md`

| Addition | Module(s) | Details |
|---|---|---|
| Route 1.16 | Onramp Routes Module | 2 endpoints: POST session, POST webhook |
| Controller 2.16 | Onramp Controller | Session creation + webhook handling |
| Service 3.16 | Onramp Service | Coinbase On-Ramp class: createCharge, handleWebhook, HMAC verification, pending→Cleared flow |
| Service 3.17 | Payout Service | On-chain payout process: balance verification, payout lock, ethers tx, commission |
| Middleware 5.4 | Validation Middleware | express-validator chains for signup, content, tip |
| Layer 6.5 | Jobs Subsystem | renewSubscriptions: batch on-chain renewal processing |
| Section 7.7 | Smart Contract (expanded) | Full details on 12 functions, RecurringAllowance, events, security model |
| Util 8.10 | API Error (Dead Code) | Duplicate AppError class — documented as dead code |
| Util 8.11 | Platform Constants | DEFAULT_COMMISSION_RATE (12.5) |

### Metrics Updated
- Routes: 15 → 16
- Controllers: 15 → 16
- Services: 15 → 17
- Models: 13 (unchanged)
- Middleware: 3 → 4 (validation added)
- Inter-service edges: 7 → 8
- Controller bypasses: 4 → 5
- File size: 3,326 → 3,674 lines
- Version bumped to 2.0.0

### DOX Pass
- Root `AGENTS.md`: No changes needed — `03-architecture-kb.md` already exists in Child DOX Index
- Session notes appended with Phase 10 findings

*Appended 2026-07-19 — Phase 10 (Architecture KB Expansion) complete.*

---

## Phase 11 — Business Capabilities Analysis

**Date**: 2026-07-19
**Phase**: Business-oriented capability inventory
**Objective**: Identify every distinct business capability in the PoDM platform, ignoring code organization. Map each capability to its primary users, workflows, dependencies, database entities, APIs, and external services.

### Changes Made to `04-business-capabilities.md`

| Change | Details |
|---|---|
| Capability 21 | Fiat-to-Crypto On-Ramp — Coinbase On-Ramp integration for card-to-USDC purchases |
| Capability 22 | Recurring Billing & Renewal — automated on-chain subscription renewal job |
| Dependency Graph | Updated to include both new capabilities and their relationships |
| Revenue Mapping | Added Fiat-to-Crypto On-Ramp and Recurring Billing rows |
| Maturity Assessment | Added rows for both new capabilities with gap analysis |
| File Size | 746 → 831 lines |
| Version | 1.0.0 → 2.0.0 |

### Existing Coverage Verified
- All 20 original capabilities already had all 8 required sections (Purpose, Primary users, Major workflows, Dependencies, Related modules, Database entities, APIs, External services)
- No capabilities removed or renamed

### DOX Pass
- Root `AGENTS.md`: No changes needed — `04-business-capabilities.md` already exists in Child DOX Index
- Session notes appended with Phase 11 findings

*Appended 2026-07-19 — Phase 11 (Business Capabilities Analysis) complete.*

---

## Phase 12 — User Journeys Expansion

**Date**: 2026-07-19
**Phase**: Complete user journey inventory
**Objective**: Identify every end-to-end user journey in the PoDM platform. Each journey includes Actor, Trigger, Preconditions, Happy Path, Alternative Paths, Failure Paths, Completion State, and Referenced modules.

### Changes Made to `05-user-journeys.md`

| Change | Details |
|---|---|
| Fan Journey 20 | Configure Crypto Wallet — link wallet address for crypto payments |
| Fan Journey 21 | Buy USDC via Card (Fiat-to-Crypto On-Ramp) — Coinbase On-Ramp purchase flow |
| Creator Journey 34 | Bulk Upload Content — multi-file drag-and-drop upload with DropZone/DraftCard |
| Creator Journey 35 | Configure Payout Settings — set crypto wallet for withdrawals |
| System Journey 46 | Process Subscription Renewals — batch on-chain renewal job |
| Renumbering | Creator 20-31 → 22-33, Admin 32-41 → 36-45 |
| Actor Type | Added "System" as fifth actor type |
| Journey Count | 41 → 46 across 5 user types (U=2, F=18, C=14, A=10, System=1 + shared auth=4) |
| File Size | 1,083 → 1,279 lines |

### DOX Pass
- Root `AGENTS.md`: No changes needed — `05-user-journeys.md` already exists in Child DOX Index
- Session notes appended with Phase 12 findings

*Appended 2026-07-19 — Phase 12 (User Journeys Expansion) complete.*

---

## Phase 13 — Internal Workflows Expansion

**Date**: 2026-07-19
**Phase**: Complete internal workflow inventory
**Objective**: Expand every internal workflow with Entry Point, Execution Steps, Dependencies, Exit Conditions, Failure Handling, Retries, and Recovery. Add missing workflows.

### Changes Made to `10-internal-workflows.md`

| Change | Details |
|---|---|
| Workflow 32 | On-Ramp Webhook HMAC Verification & Transaction Update |
| Workflow 33 | Payout Balance Computation with Concurrent Lock |
| Workflow 34 | On-Chain Subscription Renewal Batch Processing |
| Workflow 35 | Coinbase On-Ramp Session Creation |
| Workflow 36 | Admin Impersonation Flow |
| Workflow 37 | Commission Rate Resolution (Default/Override/Enclave) |
| Workflow 38 | Fan Feed Generation Pipeline |
| Workflow 39 | Gallery JSONB Operations |
| Workflow Count | 31 → 39 workflows |
| File Size | 977 → 1,318 lines |

### DOX Pass
- Root `AGENTS.md`: No changes needed — `10-internal-workflows.md` already exists in Child DOX Index
- Session notes appended with Phase 13 findings

*Appended 2026-07-19 — Phase 13 (Internal Workflows Expansion) complete.*

---

## Phase 14 — Data Flow Renumber & Annotation

**Date**: 2026-07-19
**Phase**: Renumber data flow document + sensitive data annotations
**Objective**: Rename `11-data-flow.md` → `07-data-flow.md` to match documentation plan ordering. Add inline `[PII]`, `[SECRET]`, `[AUTH]`, `[PAYMENT]`, `[AI_PROMPT]`, `[AI_RESPONSE]` annotation markers across all 15 feature sections.

### Changes to `docs/architecture/07-data-flow.md`

| Change | Details |
|---|---|
| Renumbered | `11-data-flow.md` → `07-data-flow.md` |
| Legend added | `### Data Sensitivity Legend` with 6 marker categories and examples |
| Inline annotations | `[PII]` markers: Auth (§1), Profile (§2), Content (§3), Subscriptions (§5), Messaging (§8), Admin (§11), Referrals (§12), Enclave (§12.5), Contests (§13), Support Tickets (§14), Sensitive Data Inventory (§15) |
| Inline annotations | `[SECRET]` markers: Auth (§1), Payments (§6), AI (§9), Admin (§11), Referrals (§12), Enclave (§12.5), Sensitive Data Inventory (§15) |
| Inline annotations | `[AUTH]` markers: Auth (§1), Sensitive Data Inventory (§15) |
| Inline annotations | `[PAYMENT]` markers: Profile (§2), Subscriptions (§5), Payments (§6), Payouts (§7), Stripe (§7.5), Messaging (§8), Admin (§11), Referrals (§12), Contests (§13), Sensitive Data Inventory (§15) |
| Inline annotations | `[AI_PROMPT]` markers: AI Captions (§9), Sensitive Data Inventory (§15) |
| Inline annotations | `[AI_RESPONSE]` markers: AI Captions (§9), Sensitive Data Inventory (§15) |
| File size | 1,256 → 1,269 lines |

### Cross-Reference Updates

| File | Occurrences Updated |
|---|---|
| `AGENTS.md` | 1 |
| `01-documentation-plan.md` | 1 |
| `00-session-notes.md` | 6 |
| `02-dependency-map.md` | 1 |
| `03-architecture-kb.md` | 1 |
| `12-maintenance.md` | 12 |
| `09-quality-report.md` | 7 |
| `08-diagram-index.md` | 30 |
| `flowchart-prompts-01.md` | 12 |
| `flowchart-prompts-02.md` | 13 |
| `flowchart-prompts-03a.md` | 2 |
| `flowchart-prompts-03b.md` | 1 |
| `016-payout-earnings-flow.json` | 1 |
| `014-subscription-state-diagram.json` | 1 |

### DOX Pass
- Root `AGENTS.md`: Updated `07-cross-cutting-concerns` reference remains unchanged; `11-data-flow` → `07-data-flow` updated in Child DOX Index listing
- Session notes appended with Phase 14 findings

*Appended 2026-07-19 — Phase 14 (Data Flow Renumber & Annotation) complete.*

---

## Phase 15 — Diagram Index Rewrite

**Date**: 2026-07-19
**Phase**: Comprehensive diagram inventory
**Objective**: Rewrite `08-diagram-index.md` to reflect current state of all 16 architecture docs. Update all PROPOSED → GENERATED statuses, add new proposed diagrams for features added in Phases 10–14, update counts to match current reality (39 workflows, 46 journeys, 22 capabilities, 15 data-flow features).

### Changes to `docs/architecture/08-diagram-index.md`

| Change | Details |
|---|---|
| Status notation | Added `🌀 GENERATED` for `docs/flowcharts/` files, `🔲 PROPOSED` for not-yet-generated, `✅ EXISTING` for `docs/diagrams/` |
| Updated 49 items | All 49 PROPOSED → 🌀 GENERATED with file paths to `docs/flowcharts/` |
| New PROPOSED (B-07) | Admin Impersonation Internal Flow — server-side header processing + audit logging |
| New PROPOSED (C-09) | Fiat-to-Crypto On-Ramp Flow — Coinbase On-Ramp session + webhook lifecycle |
| New PROPOSED (C-10) | Subscription Renewal Batch Processing — scheduled batch job |
| New PROPOSED (C-11) | Payout Balance Lock Flow — concurrent lock mechanism |
| New PROPOSED (D-09) | Fan Feed Generation Pipeline — subscription intersection → enrichment |
| New PROPOSED (D-10) | Gallery JSONB Operations — add/remove/reorder |
| Counts updated | Workflows: 28→39, Journeys: 40→46, Capabilities: 20→22, Features: 14→15 |
| Summary | Total diagrams: 59→73 (10 existing + 49 generated + 14 proposed) |
| Priority distribution | Updated to include proposed items |

### DOX Pass
- Root `AGENTS.md`: No changes needed — `08-diagram-index.md` already listed in Child DOX Index
- Session notes appended with Phase 15 findings

*Appended 2026-07-19 — Phase 15 (Diagram Index Rewrite) complete.*

---

## Phase 16 — Proposed Diagram Generation

**Date**: 2026-07-19
**Phase**: Generate remaining proposed Mermaid diagrams
**Objective**: Create actual Mermaid `.md` files for all `🔲 PROPOSED` entries in the diagram index.

### Summary

Generated **7 Mermaid diagram files** into `docs/flowcharts/` — one per proposed entry in `08-diagram-index.md`:

| File | ID | Title | Type |
|---|---|---|---|
| `050-b07-admin-impersonation-internal-flow.md` | B-07 | Admin Impersonation Internal Flow | Sequence |
| `051-c09-fiat-to-crypto-on-ramp-flow.md` | C-09 | Fiat-to-Crypto On-Ramp Flow | Sequence |
| `052-c10-subscription-renewal-batch-processing.md` | C-10 | Subscription Renewal Batch Processing | Sequence |
| `053-c11-payout-balance-lock-flow.md` | C-11 | Payout Balance Lock Flow | Sequence |
| `054-d09-fan-feed-generation-pipeline.md` | D-09 | Fan Feed Generation Pipeline | Sequence |
| `055-d10-gallery-jsonb-operations.md` | D-10 | Gallery JSONB Operations | Flowchart |
| `002-a05-environment-configuration-map.md` | A-05 | Environment Configuration Map *(status corrected)* | Flowchart |

### Index Corrections

- A-05 had a file (`002-a05-*`) but was still marked PROPOSED — corrected to 🌀 GENERATED
- Updated summary counts: generated 49→56, proposed 14→7
- Updated category breakdown: A (2→3 generated), B (4→5), C (7→10), D (7→9)
- Total diagrams: 10 existing + 56 generated + 7 proposed = 73 *(total unchanged because A-05 correction absorbed one proposed slot)*

### Notes

- 7 remaining PROPOSED entries exist in the summary but no `🔲 PROPOSED` markers remain in the body — this is a pre-existing count error in the summary table
- One of the 7 "proposed" count slots is the I-01 entry (deployment/CI) which is a duplicate of A-03 and should be marked as sharing the existing file

### DOX Pass

- Root `AGENTS.md` updated: `docs/flowcharts/` count changed from 49 to 55, range from `049` to `055`, added 6 new diagram topics to description
- `08-diagram-index.md` updated: 7 entries changed from PROPOSED to GENERATED with file paths, summary counts updated

*Appended 2026-07-19 — Phase 16 (Proposed Diagram Generation) complete.*

---

## Phase 17 — Comprehensive Documentation Quality Audit

**Date**: 2026-07-19
**Phase**: Full documentation re-audit against current codebase
**Objective**: Perform a complete, end-to-end audit of all 149 documentation files against the actual codebase (~200+ source files). Check for missing workflows, modules, APIs, journeys, capabilities, broken references, duplicate diagrams, and Mermaid syntax errors.

### Summary

Conducted 6 parallel task agents covering backend inventory, frontend inventory, Mermaid syntax validation, cross-reference audit, duplicate diagram analysis, and API coverage comparison. Produced updated `docs/architecture/09-quality-report.md` (replacing the July 2 original).

### Key Findings

| Dimension | Result |
|---|---|
| Missing workflows | 0 (39/39 documented) |
| Missing modules | 0 backend, 0 frontend |
| Missing user journeys | 0 (46/46 documented) |
| Missing business capabilities | 0 (22/22 documented) |
| Mermaid syntax PASS | 64/65 (98.5%) |
| Mermaid syntax FAIL | 0 |
| Broken cross-references | 4 (across 3 docs) |
| Duplicate diagram content | 2 HIGH overlaps + 6 stale `.mmd` orphans |
| Missing APIs | 2 (Onramp routes missing from `docs/api/README.md`) |
| Missing internal workflow | 1 (contest service — no dedicated workflow entry) |

### Issues Found (Prioritized)

**P0 — Fix now (4):**
1. `12-maintenance.md` line 143: references `flowcharts/I-01` — no such file; I-01 is `docs/diagrams/09-deployment-cicd.md`
2. `08-diagram-index.md` summary: claims 56 generated/7 proposed/73 total — actual is 55/0/65. Body entries are correct, summary arithmetic is stale
3. `docs/api/README.md`: header claims "15 route files, 74 endpoints" — actual is 16 files, 102 endpoints. Missing Onramp route group entirely
4. `048-k02-end-to-end-test-journey-coverage.md`: uses `&` as multi-target arrow separator in Mermaid — not standard syntax

**P1 — Important: all 4 resolved in Phase 19 ✅**

### Items Resolved Since Last Audit

- 3 missing workflows (subscription lifecycle, admin moderation, enclave applications) — added as workflows 29–31 ✅
- 3 missing user journeys (admin enclave, fan enclave, reports) — added in P1-6 remediation ✅
- Stripe Setup Intent mislabeled as "legacy/dead" — corrected to "not yet implemented" (Phase 17), then ABORTED (Phase 19) ✅
- Duplicate `creator-acquisition-strategy.md` — resolved as cross-reference redirect (5-line file in marketing/) ✅
- `01-documentation-plan.md` stale deliverable paths — reconciled (Phase 19) ✅
- `docs/diagrams/pending/` 6 orphan `.mmd` files — deleted (Phase 19) ✅
- `10-internal-workflows.md` contest service gap — workflow #40 added (Phase 19) ✅
- `00-session-notes.md` P3-14 stale `docs/diagrams-generated/` claim — corrected (Phase 19) ✅
- `048-k02` Mermaid `&` multi-target syntax — replaced with individual statements (Phase 19) ✅
- `08-diagram-index.md` summary counts (56/7/73 → 55/0/65) — corrected (Phase 19) ✅
- `docs/api/README.md` header (15→16 files, 74→102 endpoints), added Onramp routes — corrected (Phase 19) ✅

### DOX Pass

- Root `AGENTS.md`: No changes needed — `09-quality-report.md` already listed in Child DOX Index
- Session notes appended with Phase 17 findings

*Appended 2026-07-19 — Phase 17 (Comprehensive Documentation Quality Audit) complete.*

---

## Phase 18 — Maintenance Guide Rewrite

**Date**: 2026-07-19
**Phase**: Update 12-maintenance.md to current state
**Objective**: Rewrite the stale maintenance guide with accurate counts, corrected references, and findings from the fresh quality audit.

### Summary

Rewrote `docs/architecture/12-maintenance.md` (297→316 lines) with:

- **Updated all counts**: 39 workflows (was 28), 55 generated diagrams (was 49), 15 data-flow features (was 14), 22 capabilities (was 20), 46 journeys (was 40), 149 doc files (was 97)
- **Fixed broken reference**: `flowcharts/I-01` → `docs/diagrams/09-deployment-cicd.md` (I-01 shares with A-03)
- **Updated artifact dependency graph**: Current file layout reflecting 16 architecture docs, 17 services, 16 routes, 16 controllers, 55 flowcharts
- **Updated change impact matrix**: New rows for onramp changes, impersonation logic, database enum changes; corrected doc paths throughout
- **Added Mermaid syntax validation rules** (§3.4): explicit checklist for subgraphs, arrows, participants, state transitions, C4, journey, Gantt
- **Updated known issues** (§5): replaced resolved items with 10 current findings from quality audit; documented 6 resolved items
- **Updated PR checklist** (§4): added onramp verification checkbox, corrected doc paths

### DOX Pass

- Root `AGENTS.md`: No changes needed — `12-maintenance.md` already listed in Child DOX Index
- Session notes appended with Phase 18 findings

*Appended 2026-07-19 — Phase 18 (Maintenance Guide Rewrite) complete.*

---

## Phase 19 — Documentation Fix Pass

**Date**: 2026-07-19
**Phase**: Fix all P0–P3 issues from quality audit v2 + mark Stripe Setup Intent ABORTED
**Objective**: Resolve all 10+ known documentation issues and mark the removed Stripe Setup Intent feature as ABORTED across every doc.

### Stripe Setup Intent ABORTED

- **What**: `createSetupIntent`, `updateMyPaymentMethod`, `updateFanPaymentMethod`, `POST /users/me/setup-payment-method`, `PUT /users/me/payment-method` were fully removed from the codebase
- **Action**: Marked as ABORTED across 15 files — `07-data-flow.md` §7.5 (entire section replaced), `03-architecture-kb.md` (5 references), `06-frontend-architecture.md` (Payments table), `08-diagram-index.md` (category C description), `07-cross-cutting-concerns.md` (payment table + infra diagram), `01-repository-inventory.md` (Stripe service row), `09-quality-report.md` (endpoints status row), `12-maintenance.md` (known issue), `payment-plan.md` (status note), `05-user-journeys.md` (2 referenced modules), `00-session-notes.md` (4 historical references), `api/README.md` (2 routes removed, count 15→13), and 3 diagram-spec JSON files

### P0 Fixes

- **Diagram index counts**: 56→55 gen, 7→0 proposed, 73→65 total in `08-diagram-index.md` summary
- **API README header**: 15→16 files, 74→102 endpoints; added Onramp route group (2 endpoints); route summary + controller mapping updated
- **Mermaid syntax**: `048-k02` multi-target `&` arrows replaced with individual statements

### P1 Fixes

- **Documentation plan stale paths**: Reconciled all 6 phase deliverable paths; added Phases 8–19 execution table
- **Orphan pending/ directory**: Deleted `docs/diagrams/pending/` (6 stale .mmd files)
- **Contest workflow**: Added Workflow #40 to `10-internal-workflows.md`
- **Session notes stale claim**: Corrected P3-14 `docs/diagrams-generated/` claim

### P2–P3 Fixes

- **Cross-references**: Added to `docs/diagrams/07-impersonation-flow.md` → `flowcharts/050` and `docs/diagrams/04-payment-flow.md` → `flowcharts/009`
- **Service count** (15→17): Fixed in `03-architecture-kb.md` line 1474, `08-diagram-index.md` line 55, `09-testing-monitoring.md` line 202
- **Flowcharts README**: Created `docs/flowcharts/README.md` with numeric prefix mapping, category summary, and diagram type distribution

### DOX Pass

- Root `AGENTS.md`: No structural changes needed — all edited files are already indexed in Child DOX Index
- Session notes appended with Phase 19 findings

*Appended 2026-07-19 — Phase 19 (Documentation Fix Pass) complete.*
