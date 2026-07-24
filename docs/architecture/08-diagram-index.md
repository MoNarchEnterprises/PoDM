# Diagram Index

**File:** `docs/architecture/08-diagram-index.md`
**Status:** Complete
**Scope:** Comprehensive catalog of every Mermaid diagram that should exist for the PoDM platform. Covers all 16 architecture documents, 10 existing diagrams, 55 generated flowcharts, 39 internal workflows, 46 user journeys, 22 business capabilities, 15 data-flow features.

**Existing diagrams** are in `docs/diagrams/`. **Generated flowcharts** are in `docs/flowcharts/`. **Proposed diagrams** are not yet generated.

> **Status notation:** ✅ = `docs/diagrams/` — 🌀 = `docs/flowcharts/` — 🔲 = not yet generated

---

## Contents

- [Category A: System Architecture & Context](#category-a-system-architecture--context)
- [Category B: Authentication & Authorization](#category-b-authentication--authorization)
- [Category C: Payment & Finance](#category-c-payment--finance)
- [Category D: Content Lifecycle](#category-d-content-lifecycle)
- [Category E: Real-Time & Messaging](#category-e-real-time--messaging)
- [Category F: Data & State](#category-f-data--state)
- [Category G: Admin & Operations](#category-g-admin--operations)
- [Category H: User Journeys & Business](#category-h-user-journeys--business)
- [Category I: Development & Infrastructure](#category-i-development--infrastructure)
- [Category J: Security & Compliance](#category-j-security--compliance)
- [Category K: Testing & Quality](#category-k-testing--quality)
- [Summary](#summary)

---

## Category A: System Architecture & Context

High-level views of the entire platform — containers, deployments, dependencies.

### A-01 — System Architecture (C4 Container)

| Property | Value |
|---|---|
| **Status** | ✅ EXISTING — `docs/diagrams/01-system-architecture.md` |
| **Diagram Type** | C4 Container |
| **Purpose** | Full system context: frontend (React), backend (Express), PostgreSQL (Supabase), Socket.IO, and all 8 external integrations (Supabase Auth, Stripe, R2, OpenAI/OpenRouter, Ethereum RPC, BaseScan, Nodemailer, Netlify/Render). |
| **Complexity** | High |
| **Estimated Nodes** | 15 |
| **Referenced Modules** | Server.ts, supabaseClient.ts, r2Client.ts, socket.ts, all external integrations |
| **Priority** | P0 — Core |

### A-02 — Service Dependency Matrix

| Property | Value |
|---|---|
| **Status** | ✅ EXISTING — `docs/diagrams/10-service-dependency-matrix.md` |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | All 11 services with inter-service edges (7 found), controller→model bypass sites (4), and all external API integrations. |
| **Complexity** | Medium |
| **Estimated Nodes** | 18 |
| **Referenced Modules** | All 17 services, all 16 controllers, all external integrations, 02-dependency-map.md |
| **Priority** | P0 — Core |

### A-03 — Deployment & CI/CD Architecture

| Property | Value |
|---|---|
| **Status** | ✅ EXISTING — `docs/diagrams/09-deployment-cicd.md` |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | CI pipeline (GitHub Actions: parallel backend test + frontend lint/build), deployment targets (Netlify production, Cloudflare Pages preview, Render backend), Docker Compose local dev, and external service connections. |
| **Complexity** | Medium |
| **Estimated Nodes** | 14 |
| **Referenced Modules** | .github/workflows/, netlify.toml, Dockerfile, docker-compose.yml, Server.ts, 07-cross-cutting-concerns.md §8–9 |
| **Priority** | P0 — Core |

### A-04 — Internal Workflow Dependency Map

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/001-a04-internal-workflow-dependency-map.md` |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Show how the 39 internal workflows (10-internal-workflows.md) connect to each other and to external boundaries. Which workflows call which others, which share retry logic, which are fire-and-forget vs synchronous. |
| **Complexity** | High |
| **Estimated Nodes** | 35 |
| **Referenced Modules** | 10-internal-workflows.md (all 39 workflows), storage.service.ts, content.service.ts, notification.service.ts, cryptoPayment.service.ts |
| **Priority** | P2 — Reference |

### A-05 — Environment Configuration Map

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/002-a05-environment-configuration-map.md` |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Show which env vars feed which modules — 20+ backend environment variables mapped to their config files, initialization points, and consuming modules. Highlight the 3 `.env` file copies and the distinction between server-side and client-exposed vars. |
| **Complexity** | Medium |
| **Estimated Nodes** | 25 |
| **Referenced Modules** | All config files (supabaseClient, r2Client, stripe configs, cryptoPayment, ai.service, email.service, Server.ts), 07-cross-cutting-concerns.md §11 |
| **Priority** | P2 — Reference |

---

## Category B: Authentication & Authorization

Auth flows — registration, login, token lifecycle, role checks, impersonation, session management.

### B-01 — Auth Sequence (Login + Request)

| Property | Value |
|---|---|
| **Status** | ✅ EXISTING — `docs/diagrams/03-auth-sequence.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Login flow (email/password → Supabase Auth → JWT → frontend storage) + authenticated request flow (Bearer token → protect middleware → Supabase getUser → profile fetch → reshape → controller). |
| **Complexity** | Medium |
| **Estimated Nodes** | 10 participants, 18 steps |
| **Referenced Modules** | auth.service.ts, auth.middleware.ts, auth.controller.ts, useAuth.tsx, apiClient.ts, supabaseClient.ts |
| **Priority** | P0 — Core |

### B-02 — Impersonation Flow

| Property | Value |
|---|---|
| **Status** | ✅ EXISTING — `docs/diagrams/07-impersonation-flow.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Admin impersonation: start impersonation → X-Impersonating-User-Id header → protect middleware swap → impersonated request → ImpersonationBanner → stop. |
| **Complexity** | Low |
| **Estimated Nodes** | 6 participants, 12 steps |
| **Referenced Modules** | auth.middleware.ts, useAuth.tsx, apiClient.ts, ImpersonationBanner.tsx |
| **Priority** | P0 — Core |

### B-03 — Auth Token Lifecycle

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/003-b03-auth-token-lifecycle.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Full token lifecycle from Supabase Auth creation through storage (localStorage/sessionStorage), transmission (Bearer header), verification (supabase.auth.getUser), expiry (401 → auto-clear), and logout (clear storage + supabase.auth.signOut). Show the refresh token gap (no rotation implemented). |
| **Complexity** | Medium |
| **Estimated Nodes** | 5 participants, 14 steps |
| **Referenced Modules** | auth.service.ts, auth.middleware.ts, apiClient.ts (response interceptor), useAuth.tsx, 07-data-flow.md §1 |
| **Priority** | P1 — Important |

### B-04 — Route Authentication Matrix

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/004-b04-route-authentication-matrix.md` |
| **Diagram Type** | Graph (classDiagram or flowchart) |
| **Purpose** | Map all 14 route groups to their middleware chains — show which routes use `protect`, `protectAndCreator`, `protectAndAdmin`, `optionalProtect`, or no auth. Highlight the 2 unprotected referral routes and the missing fan route guard as anomalies. |
| **Complexity** | High |
| **Estimated Nodes** | 20 |
| **Referenced Modules** | All 15 route files, auth.middleware.ts, 02-dependency-map.md, 06-frontend-architecture.md |
| **Priority** | P1 — Important |

### B-05 — Auth Orphan Cleanup Flow

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/005-b05-auth-orphan-cleanup-flow.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Show the fragile signup flow: Supabase auth user created → profile creation attempted → if profile fails, delete auth user via admin API. Highlight the lack of DB transaction and the race window where orphan could persist if cleanup fails. |
| **Complexity** | Low |
| **Estimated Nodes** | 4 participants, 8 steps |
| **Referenced Modules** | auth.service.ts:98-141, 10-internal-workflows.md §23 |
| **Priority** | P2 — Reference |

### B-06 — Password Reset Flow

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/006-b06-password-reset-flow.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Forgot password → resetPasswordForEmail → Supabase email → redirect → new password form → admin.updateUserById. Highlight the email-enumeration prevention (always returns success) and the fact that existing sessions are not invalidated. |
| **Complexity** | Low |
| **Estimated Nodes** | 5 participants, 8 steps |
| **Referenced Modules** | auth.service.ts:289, auth.routes.ts, Supabase Auth |
| **Priority** | P3 — Nice to have |

### B-07 — Admin Impersonation Internal Flow

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/050-b07-admin-impersonation-internal-flow.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Server-side impersonation header processing within `protect` middleware: JWT validated → role check → `X-Admin-Impersonate` header read → target user query → `req.user` swap → `req.impersonatedBy` set → audit log write. Show the 404 path when target user not found and the admin-continues-as-self fallback on DB error. |
| **Complexity** | Low |
| **Estimated Nodes** | 4 participants, 10 steps |
| **Referenced Modules** | auth.middleware.ts:80-96, UserModel, 10-internal-workflows.md §36, 07-data-flow.md §1 |
| **Priority** | P2 — Reference |

---

## Category C: Payment & Finance

All money-moving flows — Stripe (PaymentIntents/Connect only; Setup Intent ABORTED, frontend payment endpoints dead), crypto (USDC on Base), subscriptions, tipping, PPV, payouts, platform fees, referral bonuses.

### C-01 — Payment Flow (Stripe + Crypto)

| Property | Value |
|---|---|
| **Status** | ✅ EXISTING — `docs/diagrams/04-payment-flow.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Stripe tip/PPV flow (frontend → Stripe.js → PaymentIntent → 3DS → confirm → backend verify) AND crypto subscription flow (wallet → smart contract → event → txHash → backend verify → RPC → DB record). |
| **Complexity** | High |
| **Estimated Nodes** | 8 participants, 22 steps |
| **Referenced Modules** | cryptoPayment.service.ts, cryptoPayment.controller.ts, subscription.service.ts, apiClient.ts, PoDMPaymentProtocol.sol |
| **Priority** | P0 — Core |

### C-02 — Crypto Verification Sequence (11-Step)

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/007-c02-crypto-verification-sequence.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Detailed 11-step `verifyAndRecordBasePayment` flow: hash format check → dedup → creator wallet fetch → network selection → JSON-RPC eth_getTransactionReceipt → receipt status check → contract address match → topics[2] parse → data field decode → amount match (1¢ tolerance) → fee calc → DB insert. Highlight the `0x0000` sandbox bypass as a critical vulnerability annotation. |
| **Complexity** | High |
| **Estimated Nodes** | 6 participants, 20 steps |
| **Referenced Modules** | cryptoPayment.service.ts:80-267, transaction.model.ts, 08-crypto-deep-dive.md, 10-internal-workflows.md §11, 07-data-flow.md §6 |
| **Priority** | P0 — Core |

### C-03 — Subscription State Diagram

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/008-c03-subscription-state-diagram.md` |
| **Diagram Type** | State |
| **Purpose** | Subscription lifecycle: active (initial state after crypto verification) → canceled (fan action). No renewal, no pause, no expired states in current implementation. Highlight the absence of billing renewal logic and the missing `expired` auto-transition. |
| **Complexity** | Low |
| **Estimated Nodes** | 3 states, 2 transitions |
| **Referenced Modules** | subscription.service.ts, subscription.model.ts, 07-data-flow.md §5 |
| **Priority** | P1 — Important |

### C-04 — Tipping & PPV Payment Flow

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/009-c04-tipping-and-ppv-payment-flow.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Fan tips creator or unlocks PPV content: frontend wallet interaction → smart contract payTip/payPPV → event emitted → txHash → POST /api/v1/payments/crypto/verify → on-chain verification → DB record → content unlocked. Highlight that the frontend calls dead Stripe endpoints (`/payments/tip`, `/payments/unlock-post`) that 404. |
| **Complexity** | Medium |
| **Estimated Nodes** | 6 participants, 14 steps |
| **Referenced Modules** | cryptoPayment.service.ts, cryptoPayment.controller.ts, apiClient.ts (dead endpoints), 07-data-flow.md §6, 08-crypto-deep-dive.md |
| **Priority** | P1 — Important |

### C-05 — Payout & Earnings Flow

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/010-c05-payout-and-earnings-flow.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Creator requests payout: earnings aggregation query → available balance check → payout lock → negative transaction creation → off-ramp call (MOCKED → returns fake `tr_offramp_<random>`). Highlight the mocked off-ramp, balance race condition (no lock), and the absence of actual Stripe/Coinbase integration. |
| **Complexity** | Medium |
| **Estimated Nodes** | 5 participants, 12 steps |
| **Referenced Modules** | creator.service.ts:389-424, payout.service.ts, cryptoPayment.service.ts:272-301, 07-data-flow.md §7, 10-internal-workflows.md §20, §33 |
| **Priority** | P1 — Important |

### C-06 — Platform Fee Calculation Flow

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/011-c06-platform-fee-calculation-flow.md` |
| **Diagram Type** | Flowchart |
| **Purpose** | Show how the default commission rate flows from `lib/constants.ts` through `verifyAndRecordBasePayment` to per-transaction `platform_fee` and `creator_payout`. Include the Enclave 10% override, per-creator `commission_rate` override, and three-tier hierarchy resolution. |
| **Complexity** | Low |
| **Estimated Nodes** | 8 |
| **Referenced Modules** | fee.utils.ts, lib/constants.ts, cryptoPayment.service.ts, transaction.model.ts, 08-crypto-deep-dive.md, 10-internal-workflows.md §14, §37 |
| **Priority** | P2 — Reference |

### C-07 — Referral Bonus Awarding Flow

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/012-c07-referral-bonus-awarding-flow.md` |
| **Diagram Type** | Flowchart |
| **Purpose** | Full referral lifecycle: code generation (`{USERNAME}-CASH` / `{USERNAME}-PERCENT`) → signup validation → trackReferralUse (increment uses_count) → awardReferralBonus (cash vs percent) → milestone check ($750 earnings, 30-day window, $25 speed bonus). Highlight that no actual payout mechanism disburses the bonuses. |
| **Complexity** | Medium |
| **Estimated Nodes** | 12 |
| **Referenced Modules** | referral.model.ts, auth.service.ts (signup integration), 07-data-flow.md §12, 10-internal-workflows.md §26 |
| **Priority** | P2 — Reference |

### C-08 — Smart Contract Structure (PoDMPaymentProtocol)

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/013-c08-smart-contract-structure.md` |
| **Diagram Type** | Class |
| **Purpose** | Solidity contract structure: state variables (owner, platformTreasury, platformFeeBps), 3 payment functions (paySubscription/payTip/payPPV), 2 admin functions (updateTreasury/updateFee), 5 events, ERC-20 transferFrom flow. Show the relationship between on-chain events and backend parsing. |
| **Complexity** | Low |
| **Estimated Nodes** | 8 |
| **Referenced Modules** | PoDMPaymentProtocol.sol, 08-crypto-deep-dive.md |
| **Priority** | P2 — Reference |

### C-09 — Fiat-to-Crypto On-Ramp Flow

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/051-c09-fiat-to-crypto-on-ramp-flow.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Complete Coinbase On-Ramp lifecycle: fan clicks "Buy USDC" → frontend sends createSession → backend POST to Coinbase On-Ramp API → session URL returned → pending_transaction record created → fan completes purchase in Coinbase widget → Coinbase webhook (charge:confirmed) → HMAC signature verification → transaction status update → subscription activation (if applicable). Highlight the 401 path on signature mismatch and the balance race window between webhook and manual submission. |
| **Complexity** | High |
| **Estimated Nodes** | 7 participants, 18 steps |
| **Referenced Modules** | onramp.controller.ts, onramp.service.ts, coinbaseCommerce SDK, transaction.service.ts, subscription.service.ts, 10-internal-workflows.md §32, §35, 07-data-flow.md §6 |
| **Priority** | P1 — Important |

### C-10 — Subscription Renewal Batch Processing

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/052-c10-subscription-renewal-batch-processing.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Scheduled batch job: `renewSubscriptions.ts` queries expired auto-renew subscriptions → per-subscriber decision (crypto vs stripe) → crypto path: query blockchain for USDC transfer → stripe path: charge saved payment method → on success: extend subscription → on failure: set past_due. Show per-subscriber error isolation and the grace period window. |
| **Complexity** | Medium |
| **Estimated Nodes** | 5 participants, 14 steps |
| **Referenced Modules** | jobs/renewSubscriptions.ts, subscription.service.ts, cryptoPayment.service.ts, stripe SDK, ethers.js, 10-internal-workflows.md §34, 07-data-flow.md §5 |
| **Priority** | P2 — Reference |

### C-11 — Payout Balance Lock Flow

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/053-c11-payout-balance-lock-flow.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Show the concurrent payout lock mechanism: `getPayoutBalance` reads Cleared earnings minus Pending payouts → `lockPayoutBalance` opens DB transaction → re-reads balance → verifies sufficiency → inserts Pending payout record (acts as lock) → external transfer → on success: mark Completed → on failure: mark Failed (releases lock). Highlight the race window without idempotency key. |
| **Complexity** | Medium |
| **Estimated Nodes** | 4 participants, 12 steps |
| **Referenced Modules** | payout.service.ts, transaction.service.ts, creator.service.ts, 10-internal-workflows.md §33, 07-data-flow.md §7 |
| **Priority** | P2 — Reference |

---

## Category D: Content Lifecycle

Content creation, upload, processing, access control, consumption, watermarking, AI captioning, deletion.

### D-01 — Request Lifecycle (Content Upload)

| Property | Value |
|---|---|
| **Status** | ✅ EXISTING — `docs/diagrams/05-request-lifecycle.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Full POST /api/v1/content lifecycle: DNS → Render → CORS → JSON parser → Multer (1GB, MIME filter) → auth middleware (JWT verify + profile fetch + impersonation check) → controller → service (R2 upload + thumbnail generation + DB insert + notification). |
| **Complexity** | High |
| **Estimated Nodes** | 8 participants, 20 steps |
| **Referenced Modules** | Server.ts, upload.middleware.ts, auth.middleware.ts, content.controller.ts, content.service.ts, storage.service.ts, notification.service.ts, ContentModel |
| **Priority** | P0 — Core |

### D-02 — Content Access Control Decision Tree

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/014-d02-content-access-control-decision-tree.md` |
| **Diagram Type** | Flowchart |
| **Purpose** | Decision tree for content access: Is viewer the creator? (bypass all) → Is content subscribers_only? → Has active subscription? → Is min_tier_level set? → Does fan's tier meet requirement? → Is content PPV? → Has fan purchased? → Unlocked or placeholder. Show the 4 exit conditions (full access, locked-by-tier, locked-by-subscription, locked-by-ppv). |
| **Complexity** | Medium |
| **Estimated Nodes** | 15 |
| **Referenced Modules** | content.service.ts:461-502, subscription.model.ts, transaction.model.ts, 07-data-flow.md §4, 10-internal-workflows.md §9 |
| **Priority** | P1 — Important |

### D-03 — Content Upload Pipeline (Media Processing)

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/015-d03-content-upload-pipeline.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Detailed upload pipeline per file: Multer memory buffer → R2 original upload (3 retry, exp backoff) → image? sharp thumbnail (400×400 WebP) → video? ffmpeg thumbnail (1s, 400px) → R2 thumbnail upload → file URL assembly → DB insert → on DB failure: R2 cleanup of all uploaded files. |
| **Complexity** | High |
| **Estimated Nodes** | 6 participants, 16 steps |
| **Referenced Modules** | content.service.ts:168-311, storage.service.ts, sharp, fluent-ffmpeg, ContentModel, 10-internal-workflows.md §7, 07-data-flow.md §3 |
| **Priority** | P1 — Important |

### D-04 — Dynamic Watermarking Sequence

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/016-d04-dynamic-watermarking-sequence.md` |
| **Diagram Type** | Sequence |
| **Purpose** | On-view watermarking: fan requests view → access check → is photo + not owner? → download original from R2 → sharp composite SVG `@username` (tiled, 25% opacity) → convert to WebP → upload to `temp/wm-{fanId}-{timestamp}` → 60s signed URL → response. Show the security degradation fallback (original file served if any step fails). |
| **Complexity** | Medium |
| **Estimated Nodes** | 4 participants, 12 steps |
| **Referenced Modules** | content.service.ts:41-99, storage.service.ts (downloadFromPrivate, uploadToPrivate), sharp, 10-internal-workflows.md §8, 07-data-flow.md §4 |
| **Priority** | P1 — Important |

### D-05 — AI Caption Generation Flow

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/017-d05-ai-caption-generation-flow.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Creator clicks "AI Caption" → frontend sends image to POST /api/v1/ai/caption → multer memory storage → base64 encode → OpenAI SDK call (OpenRouter or OpenAI based on key prefix) → model `gemma-3-27b-it:free` → caption response → frontend textarea → edit → publish → caption stored as `content.description`. Show the synchronous HTTP wait, missing NSFW pre-check, and no audit trail. |
| **Complexity** | Medium |
| **Estimated Nodes** | 6 participants, 14 steps |
| **Referenced Modules** | ai.service.ts, ai.controller.ts, ai.routes.ts, BulkUploadPage.tsx, DraftCard.tsx, 10-internal-workflows.md §3, 07-data-flow.md §9 |
| **Priority** | P1 — Important |

### D-06 — Content Lifecycle State Diagram

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/018-d06-content-lifecycle-state-diagram.md` |
| **Diagram Type** | State |
| **Purpose** | Content status states: draft → published (immediate or scheduled) → flagged (auto after 3 reports) → removed (admin action). Show transitions: publish, schedule, report threshold reached, admin flag/remove, admin restore. Highlight the absence of a `deleted` state (hard delete only). |
| **Complexity** | Medium |
| **Estimated Nodes** | 5 states, 8 transitions |
| **Referenced Modules** | content.service.ts, ContentModel, 10-internal-workflows.md §22, 07-data-flow.md §3 |
| **Priority** | P1 — Important |

### D-07 — Bulk Upload Pipeline

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/019-d07-bulk-upload-pipeline.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Creator opens BulkUploadPage → DropZone (react-dropzone, accepts image/* + video/*) → DraftCard creation (local UUID, URL.createObjectURL preview) → per-draft AI caption generation (5s delay between, 30s on 429) → "Publish All" → sequential FormData POST /api/v1/content per draft → status tracking. |
| **Complexity** | Medium |
| **Estimated Nodes** | 5 participants, 14 steps |
| **Referenced Modules** | BulkUploadPage.tsx, DropZone.tsx, DraftCard.tsx, apiClient.ts (generateCaption, createContent), 07-data-flow.md §3 |
| **Priority** | P2 — Reference |

### D-08 — Content Signed URL Generation Flow

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/020-d08-content-signed-url-generation-flow.md` |
| **Diagram Type** | Sequence |
| **Purpose** | How signed URLs are generated for content thumbnails and full files: `generateSignedUrlsForContent` iterates content files → checks if already HTTP URL → calls `StorageService.getPrivateSignedUrl(path, 3600)` → R2 `getSignedUrl` via AWS SDK → returns `{ signedUrl, contentType }`. Show the 60-second vs 3600-second expiry difference. |
| **Complexity** | Low |
| **Estimated Nodes** | 3 participants, 8 steps |
| **Referenced Modules** | content.utils.ts, storage.service.ts, 10-internal-workflows.md §16 |
| **Priority** | P3 — Nice to have |

### D-09 — Fan Feed Generation Pipeline

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/054-d09-fan-feed-generation-pipeline.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Fan requests feed → GET /api/v1/feed → auth middleware → query active subscriptions → get subscribed creator IDs → query content table (paginated, visibility filtered) → enrichContentWithUnlockStatus (signed URLs, unlock status, gallery info) → sorted by created_at desc → returned to fan. Show the empty feed path (no subscriptions → empty array). |
| **Complexity** | Medium |
| **Estimated Nodes** | 5 participants, 12 steps |
| **Referenced Modules** | creator.controller.ts (getFeed), content.service.ts, content.utils.ts, SubscriptionModel, ContentModel, 10-internal-workflows.md §38, 07-data-flow.md §4 |
| **Priority** | P2 — Reference |

### D-10 — Gallery JSONB Operations

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/055-d10-gallery-jsonb-operations.md` |
| **Diagram Type** | Flowchart |
| **Purpose** | Show the three gallery operations on the `creator_profiles.gallery` JSONB array: Add (ownership check → max limit check → append if not present → UPDATE), Remove (read array → filter out ID → UPDATE), Reorder (validate all IDs owned → set new ordered array → UPDATE). All operations are fully reversible. |
| **Complexity** | Low |
| **Estimated Nodes** | 6 |
| **Referenced Modules** | creator.service.ts, content.service.ts, 10-internal-workflows.md §39, 07-data-flow.md §3 |
| **Priority** | P3 — Nice to have |

---

## Category E: Real-Time & Messaging

Socket.IO connections, conversation rooms, message delivery, read receipts, broadcast, support ticket sync, typing indicators (missing).

### E-01 — Real-Time Messaging Sequence

| Property | Value |
|---|---|
| **Status** | ✅ EXISTING — `docs/diagrams/06-real-time-messaging.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Socket.IO lifecycle: connect (JWT auth via handshake) → join conversation room → send message (REST POST + Socket.IO broadcast new_message) → receive real-time → delete message → broadcast message_deleted → disconnect. |
| **Complexity** | Medium |
| **Estimated Nodes** | 5 participants, 16 steps |
| **Referenced Modules** | socket.ts, message.service.ts, message.controller.ts, FanMessages.tsx, CreatorMessages.tsx |
| **Priority** | P0 — Core |

### E-02 — WebSocket Event Catalog

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/021-e02-websocket-event-catalog.md` |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Complete catalog of all Socket.IO events: server-emitted (new_message, message_deleted, conversation_read), client-emitted (join_conversation, leave_conversation), and the dead `message_updated` event (registered on frontend, never emitted). Show which events flow to which rooms and which are broken. |
| **Complexity** | Medium |
| **Estimated Nodes** | 12 |
| **Referenced Modules** | socket.ts, message.service.ts, FanMessages.tsx, CreatorMessages.tsx, 07-data-flow.md §8, 07-cross-cutting-concerns.md §4 |
| **Priority** | P1 — Important |

### E-03 — Support Ticket ↔ DM Sync Sequence

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/022-e03-support-ticket-dm-sync-sequence.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Cross-service synchronization: admin replies to ticket → `support.service.ts` appends to ticket conversation + calls `MessageService.sendDirectMessage()` via dynamic require → DM delivered via Socket.IO to user's inbox → user replies → `message.service.ts` detects admin receiver → `supportService.appendUserMessageToActiveTicket()` → ticket status changes `Pending → Open`. |
| **Complexity** | Medium |
| **Estimated Nodes** | 6 participants, 14 steps |
| **Referenced Modules** | support.service.ts, message.service.ts, SupportTicketsPanel.tsx, FanMessages.tsx, 10-internal-workflows.md §13, 07-data-flow.md §14 |
| **Priority** | P1 — Important |

### E-04 — Creator Broadcast Message Delivery

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/023-e04-creator-broadcast-delivery.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Creator sends broadcast → POST /api/v1/messages/mass-message → service iterates all active subscribers → per-subscriber: check preferences → call sendDirectMessage → Socket.IO broadcast → message created in each conversation. Show the N+1 pattern and fire-and-forget nature. |
| **Complexity** | Medium |
| **Estimated Nodes** | 5 participants, 10 steps |
| **Referenced Modules** | message.service.ts (sendMassMessage), BroadcastModal.tsx, SubscriptionModel, 10-internal-workflows.md §12 |
| **Priority** | P2 — Reference |

### E-05 — Subscriber Notification Delivery Flow

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/024-e05-subscriber-notification-delivery.md` |
| **Diagram Type** | Flowchart |
| **Purpose** | Content published → notifySubscribersOfNewContent → fetch all subscriptions → filter active → check each subscriber's `preferences.notifications.newContent` → batch create notification records in DB → (no Socket.IO broadcast — user sees on next page load). Show the fire-and-forget `.catch()` and the per-notification failure isolation. |
| **Complexity** | Medium |
| **Estimated Nodes** | 8 |
| **Referenced Modules** | notification.service.ts:12-66, content.service.ts:298-301, SubscriptionModel, NotificationModel, 10-internal-workflows.md §5 |
| **Priority** | P2 — Reference |

---

## Category F: Data & State

Database schemas, data flow layers, state machines for domain entities, analytics pipeline, caching architecture (absence of).

### F-01 — Database Entity Relationships

| Property | Value |
|---|---|
| **Status** | ✅ EXISTING — `docs/diagrams/02-database-entity-relationships.md` |
| **Diagram Type** | ER |
| **Purpose** | All 12+ PostgreSQL tables with columns, types, foreign keys, indexes, and relationships. Covers profiles, content, subscriptions, transactions, messages, conversations, galleries, analytics_events, monthly_analytics_summary, platform_settings, support_tickets, reports, contests, contest_entries, referral_codes, referral_redemptions, enclave_applications + 12 enums. |
| **Complexity** | Very High |
| **Estimated Nodes** | 18 tables, 40+ relationships |
| **Referenced Modules** | All 13+ models, 9 SQL migrations + 3 utility scripts, common/types/* |
| **Priority** | P0 — Core |

### F-02 — Data Flow Layer Architecture

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/025-f02-data-flow-layer-architecture.md` |
| **Diagram Type** | Flowchart |
| **Purpose** | Cross-cutting data flow showing how all 15 features (07-data-flow.md) share the same 10-step lifecycle (Origin → Validation → Transformation → Storage → Caching → Retrieval → Modification → Deletion → Synchronization → External Transmission). Show the common patterns and where each feature deviates. |
| **Complexity** | High |
| **Estimated Nodes** | 17 |
| **Referenced Modules** | 07-data-flow.md (all 15 features), 07-cross-cutting-concerns.md §1, 03-architecture-kb.md |
| **Priority** | P0 — Core |

### F-03 — Analytics Pipeline

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/026-f03-analytics-pipeline.md` |
| **Diagram Type** | Flowchart |
| **Purpose** | Event lifecycle: user action (view, visit, gallery add, tip) → POST /api/v1/analytics/log → optionalProtect → controller → service (skip admin/self) → INSERT analytics_events → (if post_view) RPC increment_content_view_count → content.stats.views updated → creator dashboard reads count via `countEventsForCreator`. Highlight the absence of aggregation/caching and unbounded table growth. |
| **Complexity** | Medium |
| **Estimated Nodes** | 10 |
| **Referenced Modules** | analytics.service.ts, analytics.controller.ts, analytics.routes.ts, ContentModel (stats JSONB), 10-internal-workflows.md §4, 07-data-flow.md §10 |
| **Priority** | P2 — Reference |

### F-04 — Support Ticket State Diagram

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/027-f04-support-ticket-state-diagram.md` |
| **Diagram Type** | State |
| **Purpose** | Support ticket states: Open (user created or user replied) → Pending (admin viewed) → Open (user replied again) → Resolved (admin closed). Show the auto-transition when admin views ticket (Open → Pending) and when user replies to active ticket (Pending → Open). |
| **Complexity** | Low |
| **Estimated Nodes** | 3 states, 4 transitions |
| **Referenced Modules** | support.service.ts, supportTicket.model.ts, 07-data-flow.md §14, 05-user-journeys.md §M-07 |
| **Priority** | P2 — Reference |

### F-05 — Contest Lifecycle State Diagram

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/028-f05-contest-lifecycle-state-diagram.md` |
| **Diagram Type** | State |
| **Purpose** | Contest states: draft (creator creates) → active (creator publishes) → completed (creator finalizes with winner). Support for `canceled` transition from draft or active. Show the entry period window (`start_date` → `end_date`). |
| **Complexity** | Low |
| **Estimated Nodes** | 4 states, 5 transitions |
| **Referenced Modules** | contest.service.ts, contest.model.ts, 07-data-flow.md §13, 05-user-journeys.md §C-10 |
| **Priority** | P2 — Reference |

### F-06 — Contest Winner Selection Flow

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/029-f06-contest-winner-selection-flow.md` |
| **Diagram Type** | Flowchart |
| **Purpose** | Two winner selection algorithms: `standard` (uniform random from entries) and `weighted_spend` (fetch transaction amounts per entrant → compute `1 + floor(totalSpend / spendThreshold) * additionalEntries` tickets → weighted random). Show the cross-service query to transactions table and the absence of randomness audit trail. |
| **Complexity** | Medium |
| **Estimated Nodes** | 10 |
| **Referenced Modules** | contest.service.ts (finalize), TransactionModel, 07-data-flow.md §13 |
| **Priority** | P3 — Nice to have |

---

## Category G: Admin & Operations

Admin dashboard, platform settings management, user and content moderation, verification document access, email to users.

### G-01 — Admin Dashboard Data Flow

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/030-g01-admin-dashboard-data-flow.md` |
| **Diagram Type** | Flowchart |
| **Purpose** | Admin dashboard `getDashboardStats()` → 5 parallel Promise.all queries: countAllUsers, countActiveCreators, sumPlatformFeeForPeriod(30), countOpenTickets, getNewUsersOverTime(6). Show the data sources (profiles, transactions, support_tickets), the aggregation logic, and the absence of caching (runs 5 queries per page load). |
| **Complexity** | Medium |
| **Estimated Nodes** | 10 |
| **Referenced Modules** | admin.service.ts (getDashboardStats), admin.controller.ts, UserModel, TransactionModel, SupportTicketModel, 07-data-flow.md §11 |
| **Priority** | P1 — Important |

### G-02 — Admin Moderation Workflow

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/031-g02-admin-moderation-workflow.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Content reporting → user reports content with reason → analytics_events tracked → after 3 reports auto-flag (status: flagged) → admin views flagged content (GET /admin/content/flagged, enriched with reportCount + creator) → admin approves (→ published, reports auto-dismissed) or removes (→ status: removed). |
| **Complexity** | Medium |
| **Estimated Nodes** | 5 participants, 12 steps |
| **Referenced Modules** | admin.service.ts, content.service.ts (reportContent, auto-flag), ReportModel, ContentModerationPanel.tsx, 10-internal-workflows.md §22, 05-user-journeys.md §M-03 |
| **Priority** | P2 — Reference |

### G-03 — Admin Panel Structure & Data Sources

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/032-g03-admin-panel-structure.md` |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Map all 8 admin panels to their backend routes, services, models, and DB tables: Dashboard (5 queries), Users, Analytics (transactions), Content Moderation (content + reports), Support Tickets, Reports (custom reporting), Settings, Verification Docs (R2 signed URLs). Show which ones read-only vs read-write. |
| **Complexity** | High |
| **Estimated Nodes** | 18 |
| **Referenced Modules** | admin.routes.ts, admin.controller.ts, admin.service.ts, all admin panel components (AdminPanel.tsx, DashboardPanel.tsx, etc.), 07-data-flow.md §11 |
| **Priority** | P2 — Reference |

### G-04 — Verification Document Access Flow

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/033-g04-verification-document-access-flow.md` |
| **Diagram Type** | Sequence |
| **Purpose** | Admin requests verification docs for a creator → GET /admin/users/:id/verification-docs → checks `verification_data` JSONB has idFilePath + selfieFilePath → StorageService.getPrivateSignedUrl(filePath, 60) → 60-second signed URLs returned → admin views ID/selfie images. Highlight the temporary URL window and PII sensitivity. |
| **Complexity** | Low |
| **Estimated Nodes** | 4 participants, 8 steps |
| **Referenced Modules** | admin.service.ts, storage.service.ts, VerificationDetailPanel.tsx, 07-data-flow.md §11 |
| **Priority** | P2 — Reference |

---

## Category H: User Journeys & Business

Business capability maps, user journey diagrams, role-based access boundaries, feature maturity.

### H-01 — Frontend Component Tree

| Property | Value |
|---|---|
| **Status** | ✅ EXISTING — `docs/diagrams/08-frontend-component-tree.md` |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Full component hierarchy from root `<App>` through `<AuthProvider>`, `<BrowserRouter>`, role-based layouts (`FanLayout`, `CreatorLayout`, `AdminLayout`, `AuthLayout`), UI primitives (15 shared), feature modules (9), admin panels (8), loader wrappers (6). |
| **Complexity** | Very High |
| **Estimated Nodes** | 40+ |
| **Referenced Modules** | All 28+ components, all 9 feature modules, all 6 pages, 06-frontend-architecture.md |
| **Priority** | P0 — Core |

### H-02 — Business Capability Dependency Graph

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/034-h02-business-capability-dependency-graph.md` |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Show dependencies among all 22 business capabilities (04-business-capabilities.md). IAM at root → Payment Processing as most-depended-on hub → Subscription Commerce/Tipping/PPV as revenue leaves → Notifications/Feed/Gallery as engagement spokes. Distinguish enabling, core, and growth capabilities by visual grouping. |
| **Complexity** | High |
| **Estimated Nodes** | 24 |
| **Referenced Modules** | 04-business-capabilities.md (all 22 capabilities), 03-architecture-kb.md |
| **Priority** | P1 — Important |

### H-03 — User Journey Map (Fan)

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/035-h03-user-journey-map-fan.md` |
| **Diagram Type** | Journey |
| **Purpose** | Mermaid Journey diagram showing a fan's emotional journey through signup → browse creator → subscribe → view content → tip → message → enter contest → refer friend. Highlight friction points: Stripe 404 errors on payment, mocked crypto wallet, no email notifications. |
| **Complexity** | Medium |
| **Estimated Nodes** | 7 milestones |
| **Referenced Modules** | 05-user-journeys.md (F-01 through F-18), 06-frontend-architecture.md |
| **Priority** | P2 — Reference |

### H-04 — User Journey Map (Creator)

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/036-h04-user-journey-map-creator.md` |
| **Diagram Type** | Journey |
| **Purpose** | Mermaid Journey diagram showing a creator's journey through signup → verification → first content → subscriber notification → earnings dashboard → payout request. Highlight friction: mocked off-ramp (no real payouts), synchronous thumbnail generation (slow uploads), no content scheduling flexibility. |
| **Complexity** | Medium |
| **Estimated Nodes** | 7 milestones |
| **Referenced Modules** | 05-user-journeys.md (C-01 through C-14), 06-frontend-architecture.md |
| **Priority** | P2 — Reference |

### H-05 — Role-Based Access Boundaries

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/037-h05-role-based-access-boundaries.md` |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Show the three role boundaries (unauthenticated, fan, creator, admin) and what each role can access in terms of route groups, UI features, and data. Overlay the access control gaps: missing fan route guard (`/fan/*`), 2 unprotected referral routes, and the impersonation boundary bypass. |
| **Complexity** | Medium |
| **Estimated Nodes** | 15 |
| **Referenced Modules** | auth.middleware.ts, all route files, App.tsx (routing), withAuthGuard.tsx, 07-cross-cutting-concerns.md §2, 06-frontend-architecture.md §3 |
| **Priority** | P1 — Important |

### H-06 — Feature Maturity Radar

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/038-h06-feature-maturity-radar.md` |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Visual classification of all 22 business capabilities into Mature/Functional/Basic tiers (from 04-business-capabilities.md maturity assessment). Group by domain (Core Commerce, Engagement, Growth, Governance, Productivity). Use subgraphs to show which need investment. |
| **Complexity** | Medium |
| **Estimated Nodes** | 24 |
| **Referenced Modules** | 04-business-capabilities.md (maturity rubrics per capability) |
| **Priority** | P3 — Nice to have |

---

## Category I: Development & Infrastructure

CI/CD pipelines, Docker architecture, migration timeline, local dev environment, build pipelines.

### I-01 — CI/CD Pipeline

| Property | Value |
|---|---|
| **Status** | ✅ EXISTING — `docs/diagrams/09-deployment-cicd.md` |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | GitHub Actions workflow: push/PR → parallel jobs (backend-test: Jest, frontend-lint-build: ESLint + Vite build) → deploy (Netlify prod, Cloudflare Pages preview, Render auto-deploy). Highlight that E2E tests are NOT in CI. |
| **Complexity** | Medium |
| **Estimated Nodes** | 12 |
| **Referenced Modules** | .github/workflows/ci.yml, netlify.toml, Dockerfile (frontend + backend), docker-compose.yml |
| **Priority** | P0 — Core |

### I-02 — Docker Local Development Architecture

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/039-i02-docker-local-development-architecture.md` |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Local `docker-compose up` architecture: frontend service (Vite dev server on :5173) + backend service (Express on :5000, with ts-node-dev). Show the Vite proxy (`/api → localhost:5000`), the absence of Nginx or PostgreSQL containers (relies on remote Supabase), and the frontend Dockerfile running dev server (not production build). |
| **Complexity** | Low |
| **Estimated Nodes** | 6 |
| **Referenced Modules** | docker-compose.yml, Dockerfile (frontend), Dockerfile (backend), Server.ts, 07-cross-cutting-concerns.md §8 |
| **Priority** | P2 — Reference |

### I-03 — Database Migration Timeline

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/040-i03-database-migration-timeline.md` |
| **Diagram Type** | Gantt |
| **Purpose** | Show the 9 SQL migrations (+ 3 utility scripts) in chronological order, grouped by feature area (auth, profiles, content, payments, subscriptions, messaging, analytics, contests, referrals, enclave). Use Gantt to visualize when each table was added and which migrations are post-launch patches (e.g., `update_contests_schema.sql`). |
| **Complexity** | Medium |
| **Estimated Nodes** | 15 tasks |
| **Referenced Modules** | All migration files in migrations/ and scripts/migrations/, 01-repository-inventory.md §6 |
| **Priority** | P2 — Reference |

### I-04 — Build & Deploy Pipeline (Frontend)

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/041-i04-build-and-deploy-pipeline-frontend.md` |
| **Diagram Type** | Flowchart |
| **Purpose** | Frontend build pipeline: TypeScript (tsc) → Vite build → output to `dist/` → Netlify deploy (SPA redirect rules, `_redirects` file, `netlify.toml` headers). Show the build environment variables and the production vs preview vs local distinction. |
| **Complexity** | Low |
| **Estimated Nodes** | 8 |
| **Referenced Modules** | podm-frontend/vite.config.ts, netlify.toml, podm-frontend/package.json, 06-frontend-architecture.md §8, 07-cross-cutting-concerns.md §8 |
| **Priority** | P3 — Nice to have |

---

## Category J: Security & Compliance

Security boundaries, risk mapping, data sensitivity classification, error handling layers.

### J-01 — Error Handling Layer Architecture

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/042-j01-error-handling-layer-architecture.md` |
| **Diagram Type** | Flowchart |
| **Purpose** | Show the 5-layer error handling pipeline: asyncHandler (catch wrapper) → AppError (typed error class, 2 variants exist — highlight duplication) → errorHandler middleware (global catch-all, stack trace pruning) → Axios response interceptor (401 auto-clear, toast display) → [missing] React ErrorBoundary. Show how errors propagate through the stack and where they get lost. |
| **Complexity** | Medium |
| **Estimated Nodes** | 12 |
| **Referenced Modules** | asyncHandler.ts, utils/apiError.ts, middleware/error.middleware.ts, apiClient.ts (response interceptor), 07-cross-cutting-concerns.md §6, 10-internal-workflows.md §2 (DB wrappers) |
| **Priority** | P1 — Important |

### J-02 — Security Boundary & Trust Diagram

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/043-j02-security-boundary-and-trust-diagram.md` |
| **Diagram Type** | Graph (C4 or flowchart) |
| **Purpose** | Define trust boundaries: Browser (untrusted client) ↔ HTTPS → Express server (trusted) ↔ Supabase PostgreSQL (trusted) ↔ External APIs (Stripe, R2, OpenAI, Ethereum RPC — partially trusted). Highlight the sandbox 0x0000 bypass (any authenticated user can create verified transactions without on-chain proof — weakened boundary). Show localStorage JWT as XSS attack surface. |
| **Complexity** | High |
| **Estimated Nodes** | 14 |
| **Referenced Modules** | auth.middleware.ts, cryptoPayment.service.ts, apiClient.ts, 08-crypto-deep-dive.md, 07-cross-cutting-concerns.md §2, 07-data-flow.md §15 |
| **Priority** | P1 — Important |

### J-03 — Sensitive Data Flow Map

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/044-j03-sensitive-data-flow-map.md` |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Trace where sensitive data categories (PII, secrets, payment data, AI prompts/responses, auth tokens) enter, flow through, and leave the system. Use color-coded subgraphs for each category. Highlight the critical leaks: JWT_SECRET in frontend .env, verification docs via 60s signed URLs, media sent to AI API without consent, auth debug log writing PII to disk. |
| **Complexity** | High |
| **Estimated Nodes** | 20 |
| **Referenced Modules** | 07-data-flow.md §15 (sensitive data inventory), 07-cross-cutting-concerns.md §2, auth.middleware.ts, podm-frontend/.env, cryptoPayment.service.ts |
| **Priority** | P1 — Important |

### J-04 — Architectural Risk Matrix

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/045-j04-architectural-risk-matrix.md` |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Visualize the 14-item risk matrix from 07-cross-cutting-concerns.md §12 on a 3×3 impact×likelihood grid. Use color coding (red=critical, yellow=high, blue=medium, gray=low). Show mitigation status (mitigated, partial, none) for each. Risks: memory exhaustion, unprotected routes, no Stripe webhooks, duplicate AppError, sync fs logging, no DB transactions, etc. |
| **Complexity** | Medium |
| **Estimated Nodes** | 18 |
| **Referenced Modules** | 07-cross-cutting-concerns.md §12, 07-data-flow.md §15 (cross-cutting risks), 08-crypto-deep-dive.md §9 |
| **Priority** | P2 — Reference |

### J-05 — Crypto Security Gap Heatmap

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/046-j05-crypto-security-gap-heatmap.md` |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Visualize the 12 gaps from 08-crypto-deep-dive.md grouped by layer: smart contract (immutable, no pause), backend verification (0x0000 sandbox bypass, placeholder event topics, hardcoded contract addresses), frontend (mocked wallet, dead Stripe endpoints, raw fetch bypass), infrastructure (no RPC API keys, mocked off-ramp, no webhooks). Show severity and fix priority. |
| **Complexity** | Medium |
| **Estimated Nodes** | 15 |
| **Referenced Modules** | 08-crypto-deep-dive.md (all 12 gaps), PoDMPaymentProtocol.sol, cryptoPayment.service.ts, useCryptoWallet.ts |
| **Priority** | P2 — Reference |

---

## Category K: Testing & Quality

Test coverage visualization, recommended test targets, monitoring gaps.

### K-01 — Test Coverage Gap Map

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/047-k01-test-coverage-gap-map.md` |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Visual coverage matrix: 15 controllers (1 tested), 15 services (1 tested), 13 models (0 tested), 4 middleware (0 tested), 28 components (0 tested), 9 hooks (0 tested), 6 lib files (0 tested), 5 E2E specs (not in CI). Use percentage fill bars for each module category. Show the 22 recommendations from 09-testing-monitoring.md as overlay annotations. |
| **Complexity** | High |
| **Estimated Nodes** | 20 |
| **Referenced Modules** | 09-testing-monitoring.md (all sections), all test files in tests/ directories |
| **Priority** | P1 — Important |

### K-02 — End-to-End Test Journey Coverage

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/048-k02-end-to-end-test-journey-coverage.md` |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Map the 5 Playwright E2E specs against the 46 user journeys from 05-user-journeys.md. Show which journeys are covered (auth login, fan subscribe+unlock, tipping, creator dashboard+content, admin reports+moderation) and which are not (password reset, impersonation, messaging, contests, referrals, enclave, support tickets, payouts, AI captions, bulk upload, broadcast, gallery, feed). |
| **Complexity** | Medium |
| **Estimated Nodes** | 16 |
| **Referenced Modules** | 09-testing-monitoring.md §1-4, 05-user-journeys.md (all 46 journeys), Playwright spec files |
| **Priority** | P2 — Reference |

### K-03 — Monitoring & Observability Gap Diagram

| Property | Value |
|---|---|
| **Status** | 🌀 GENERATED — `docs/flowcharts/049-k03-monitoring-and-observability-gap-diagram.md` |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Show the ideal observability stack vs current reality. Ideal: structured logger (pino) → request logger (morgan) → APM (Sentry) → metrics (Prometheus) → health checks → dashboards (Grafana) → alerts (PagerDuty). Current: console.log (100+), fs.appendFileSync debug.log (27K lines), zero monitoring. Annotate each gap with the recommendation from 09-testing-monitoring.md §7. |
| **Complexity** | Medium |
| **Estimated Nodes** | 14 |
| **Referenced Modules** | 09-testing-monitoring.md §6-7, auth.middleware.ts (debug log), 07-cross-cutting-concerns.md §10 |
| **Priority** | P2 — Reference |

---

## Summary

### Counts

| Status | Count |
|---|---|
| ✅ EXISTING (`docs/diagrams/`) | 10 |
| 🌀 GENERATED (`docs/flowcharts/`) | 55 |
| 🔲 PROPOSED | 0 |
| **Total** | **65** |

### Category Breakdown

| Category | Existing | Generated | Proposed | Total |
|---|---|---|---|---|
| A — System Architecture & Context | 3 | 3 | 0 | 6 |
| B — Authentication & Authorization | 2 | 5 | 0 | 7 |
| C — Payment & Finance | 1 | 10 | 0 | 11 |
| D — Content Lifecycle | 1 | 9 | 0 | 10 |
| E — Real-Time & Messaging | 1 | 4 | 0 | 5 |
| F — Data & State | 1 | 5 | 0 | 6 |
| G — Admin & Operations | 0 | 4 | 0 | 4 |
| H — User Journeys & Business | 1 | 5 | 0 | 6 |
| I — Development & Infrastructure | 1 | 3 | 0 | 4 |
| J — Security & Compliance | 0 | 5 | 0 | 5 |
| K — Testing & Quality | 0 | 3 | 0 | 3 |

> **Note:** Existing count shows 11 index entries but only 10 unique files. A-03 and I-01 both reference `docs/diagrams/09-deployment-cicd.md` (the deployment/CI diagram serves both categories).

### Priority Distribution

| Priority | Count | Meaning |
|---|---|---|
| P0 — Core | 10 | Essential system understanding, existing or must-generate |
| P1 — Important | 20 | High value for development and debugging |
| P2 — Reference | 33 | Valuable for onboarding and architecture review |
| P3 — Nice to have | 10 | Completeness but lower daily utility |

### Diagram Type Distribution

| Diagram Type | Count |
|---|---|
| flowchart / Graph | 27 |
| Sequence | 20 |
| State | 5 |
| Journey | 2 |
| ER | 1 |
| C4 | 2 |
| Class | 1 |
| Gantt | 1 |
