# Diagram Index

**File:** `docs/architecture/08-diagram-index.md`
**Status:** Complete
**Scope:** Comprehensive catalog of every Mermaid diagram that should exist for the PoDM platform. Covers all 14 architecture documents, 10 existing diagrams, 28 internal workflows, 14 cross-cutting concerns, and 218+ source files.

**Existing diagrams** are in `docs/diagrams/`. Proposed diagrams are not yet generated.

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
| **Referenced Modules** | All 15 services, all 15 controllers, all external integrations, 02-dependency-map.md |
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
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Show how the 28 internal workflows (10-internal-workflows.md) connect to each other and to external boundaries. Which workflows call which others, which share retry logic, which are fire-and-forget vs synchronous. |
| **Complexity** | High |
| **Estimated Nodes** | 35 |
| **Referenced Modules** | 10-internal-workflows.md (all 28 workflows), storage.service.ts, content.service.ts, notification.service.ts, cryptoPayment.service.ts |
| **Priority** | P2 — Reference |

### A-05 — Environment Configuration Map

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
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
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Sequence |
| **Purpose** | Full token lifecycle from Supabase Auth creation through storage (localStorage/sessionStorage), transmission (Bearer header), verification (supabase.auth.getUser), expiry (401 → auto-clear), and logout (clear storage + supabase.auth.signOut). Show the refresh token gap (no rotation implemented). |
| **Complexity** | Medium |
| **Estimated Nodes** | 5 participants, 14 steps |
| **Referenced Modules** | auth.service.ts, auth.middleware.ts, apiClient.ts (response interceptor), useAuth.tsx, 11-data-flow.md §1 |
| **Priority** | P1 — Important |

### B-04 — Route Authentication Matrix

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Graph (classDiagram or flowchart) |
| **Purpose** | Map all 14 route groups to their middleware chains — show which routes use `protect`, `protectAndCreator`, `protectAndAdmin`, `optionalProtect`, or no auth. Highlight the 2 unprotected referral routes and the missing fan route guard as anomalies. |
| **Complexity** | High |
| **Estimated Nodes** | 20 |
| **Referenced Modules** | All 15 route files, auth.middleware.ts, 02-dependency-map.md, 06-frontend-architecture.md |
| **Priority** | P1 — Important |

### B-05 — Auth Orphan Cleanup Flow

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Sequence |
| **Purpose** | Show the fragile signup flow: Supabase auth user created → profile creation attempted → if profile fails, delete auth user via admin API. Highlight the lack of DB transaction and the race window where orphan could persist if cleanup fails. |
| **Complexity** | Low |
| **Estimated Nodes** | 4 participants, 8 steps |
| **Referenced Modules** | auth.service.ts:98-141, 10-internal-workflows.md §23 |
| **Priority** | P2 — Reference |

### B-06 — Password Reset Flow

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Sequence |
| **Purpose** | Forgot password → resetPasswordForEmail → Supabase email → redirect → new password form → admin.updateUserById. Highlight the email-enumeration prevention (always returns success) and the fact that existing sessions are not invalidated. |
| **Complexity** | Low |
| **Estimated Nodes** | 5 participants, 8 steps |
| **Referenced Modules** | auth.service.ts:289, auth.routes.ts, Supabase Auth |
| **Priority** | P3 — Nice to have |

---

## Category C: Payment & Finance

All money-moving flows — Stripe (setup intent + payment method only; frontend payment endpoints dead), crypto (USDC on Base), subscriptions, tipping, PPV, payouts, platform fees, referral bonuses.

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
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Sequence |
| **Purpose** | Detailed 11-step `verifyAndRecordBasePayment` flow: hash format check → dedup → creator wallet fetch → network selection → JSON-RPC eth_getTransactionReceipt → receipt status check → contract address match → topics[2] parse → data field decode → amount match (1¢ tolerance) → fee calc → DB insert. Highlight the `0x0000` sandbox bypass as a critical vulnerability annotation. |
| **Complexity** | High |
| **Estimated Nodes** | 6 participants, 20 steps |
| **Referenced Modules** | cryptoPayment.service.ts:80-267, transaction.model.ts, 08-crypto-deep-dive.md, 10-internal-workflows.md §11, 11-data-flow.md §6 |
| **Priority** | P0 — Core |

### C-03 — Subscription State Diagram

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | State |
| **Purpose** | Subscription lifecycle: active (initial state after crypto verification) → canceled (fan action). No renewal, no pause, no expired states in current implementation. Highlight the absence of billing renewal logic and the missing `expired` auto-transition. |
| **Complexity** | Low |
| **Estimated Nodes** | 3 states, 2 transitions |
| **Referenced Modules** | subscription.service.ts, subscription.model.ts, 11-data-flow.md §5 |
| **Priority** | P1 — Important |

### C-04 — Tipping & PPV Payment Flow

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Sequence |
| **Purpose** | Fan tips creator or unlocks PPV content: frontend wallet interaction → smart contract payTip/payPPV → event emitted → txHash → POST /api/v1/payments/crypto/verify → on-chain verification → DB record → content unlocked. Highlight that the frontend calls dead Stripe endpoints (`/payments/tip`, `/payments/unlock-post`) that 404. |
| **Complexity** | Medium |
| **Estimated Nodes** | 6 participants, 14 steps |
| **Referenced Modules** | cryptoPayment.service.ts, cryptoPayment.controller.ts, apiClient.ts (dead endpoints), 11-data-flow.md §6, 08-crypto-deep-dive.md |
| **Priority** | P1 — Important |

### C-05 — Payout & Earnings Flow

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Sequence |
| **Purpose** | Creator requests payout: earnings aggregation query → available balance check → cryptoPayment.verifyAndRecordBasePayment delegation → negative transaction creation → off-ramp call (MOCKED → returns fake `tr_offramp_<random>`). Highlight the mocked off-ramp, balance race condition (no lock), and the absence of actual Stripe/Coinbase integration. |
| **Complexity** | Medium |
| **Estimated Nodes** | 5 participants, 12 steps |
| **Referenced Modules** | creator.service.ts:389-424, cryptoPayment.service.ts:272-301, 11-data-flow.md §7, 10-internal-workflows.md §20 |
| **Priority** | P1 — Important |

### C-06 — Platform Fee Calculation Flow

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Flowchart |
| **Purpose** | Show how the 12.5% DEFAULT_COMMISSION_RATE flows from `lib/constants.ts` through `verifyAndRecordBasePayment` to per-transaction `platform_fee` and `creator_payout`. Include the Enclave 10% override (not yet implemented) and per-creator `commission_rate` override (not yet implemented). |
| **Complexity** | Low |
| **Estimated Nodes** | 8 |
| **Referenced Modules** | lib/constants.ts, cryptoPayment.service.ts, transaction.model.ts, 08-crypto-deep-dive.md, 10-internal-workflows.md §14 |
| **Priority** | P2 — Reference |

### C-07 — Referral Bonus Awarding Flow

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Flowchart |
| **Purpose** | Full referral lifecycle: code generation (`{USERNAME}-CASH` / `{USERNAME}-PERCENT`) → signup validation → trackReferralUse (increment uses_count) → awardReferralBonus (cash vs percent) → milestone check ($750 earnings, 30-day window, $25 speed bonus). Highlight that no actual payout mechanism disburses the bonuses. |
| **Complexity** | Medium |
| **Estimated Nodes** | 12 |
| **Referenced Modules** | referral.model.ts, auth.service.ts (signup integration), 11-data-flow.md §12, 10-internal-workflows.md §26 |
| **Priority** | P2 — Reference |

### C-08 — Smart Contract Structure (PoDMPaymentProtocol)

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Class |
| **Purpose** | Solidity contract structure: state variables (owner, platformTreasury, platformFeeBps), 3 payment functions (paySubscription/payTip/payPPV), 2 admin functions (updateTreasury/updateFee), 5 events, ERC-20 transferFrom flow. Show the relationship between on-chain events and backend parsing. |
| **Complexity** | Low |
| **Estimated Nodes** | 8 |
| **Referenced Modules** | PoDMPaymentProtocol.sol, 08-crypto-deep-dive.md |
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
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Flowchart |
| **Purpose** | Decision tree for content access: Is viewer the creator? (bypass all) → Is content subscribers_only? → Has active subscription? → Is min_tier_level set? → Does fan's tier meet requirement? → Is content PPV? → Has fan purchased? → Unlocked or placeholder. Show the 4 exit conditions (full access, locked-by-tier, locked-by-subscription, locked-by-ppv). |
| **Complexity** | Medium |
| **Estimated Nodes** | 15 |
| **Referenced Modules** | content.service.ts:461-502, subscription.model.ts, transaction.model.ts, 11-data-flow.md §4, 10-internal-workflows.md §9 |
| **Priority** | P1 — Important |

### D-03 — Content Upload Pipeline (Media Processing)

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Sequence |
| **Purpose** | Detailed upload pipeline per file: Multer memory buffer → R2 original upload (3 retry, exp backoff) → image? sharp thumbnail (400×400 WebP) → video? ffmpeg thumbnail (1s, 400px) → R2 thumbnail upload → file URL assembly → DB insert → on DB failure: R2 cleanup of all uploaded files. |
| **Complexity** | High |
| **Estimated Nodes** | 6 participants, 16 steps |
| **Referenced Modules** | content.service.ts:168-311, storage.service.ts, sharp, fluent-ffmpeg, ContentModel, 10-internal-workflows.md §7, 11-data-flow.md §3 |
| **Priority** | P1 — Important |

### D-04 — Dynamic Watermarking Sequence

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Sequence |
| **Purpose** | On-view watermarking: fan requests view → access check → is photo + not owner? → download original from R2 → sharp composite SVG `@username` (tiled, 25% opacity) → convert to WebP → upload to `temp/wm-{fanId}-{timestamp}` → 60s signed URL → response. Show the security degradation fallback (original file served if any step fails). |
| **Complexity** | Medium |
| **Estimated Nodes** | 4 participants, 12 steps |
| **Referenced Modules** | content.service.ts:41-99, storage.service.ts (downloadFromPrivate, uploadToPrivate), sharp, 10-internal-workflows.md §8, 11-data-flow.md §4 |
| **Priority** | P1 — Important |

### D-05 — AI Caption Generation Flow

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Sequence |
| **Purpose** | Creator clicks "AI Caption" → frontend sends image to POST /api/v1/ai/caption → multer memory storage → base64 encode → OpenAI SDK call (OpenRouter or OpenAI based on key prefix) → model `gemma-3-27b-it:free` → caption response → frontend textarea → edit → publish → caption stored as `content.description`. Show the synchronous HTTP wait, missing NSFW pre-check, and no audit trail. |
| **Complexity** | Medium |
| **Estimated Nodes** | 6 participants, 14 steps |
| **Referenced Modules** | ai.service.ts, ai.controller.ts, ai.routes.ts, BulkUploadPage.tsx, DraftCard.tsx, 10-internal-workflows.md §3, 11-data-flow.md §9 |
| **Priority** | P1 — Important |

### D-06 — Content Lifecycle State Diagram

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | State |
| **Purpose** | Content status states: draft → published (immediate or scheduled) → flagged (auto after 3 reports) → removed (admin action). Show transitions: publish, schedule, report threshold reached, admin flag/remove, admin restore. Highlight the absence of a `deleted` state (hard delete only). |
| **Complexity** | Medium |
| **Estimated Nodes** | 5 states, 8 transitions |
| **Referenced Modules** | content.service.ts, ContentModel, 10-internal-workflows.md §22, 11-data-flow.md §3 |
| **Priority** | P1 — Important |

### D-07 — Bulk Upload Pipeline

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Sequence |
| **Purpose** | Creator opens BulkUploadPage → DropZone (react-dropzone, accepts image/* + video/*) → DraftCard creation (local UUID, URL.createObjectURL preview) → per-draft AI caption generation (5s delay between, 30s on 429) → "Publish All" → sequential FormData POST /api/v1/content per draft → status tracking. |
| **Complexity** | Medium |
| **Estimated Nodes** | 5 participants, 14 steps |
| **Referenced Modules** | BulkUploadPage.tsx, DropZone.tsx, DraftCard.tsx, apiClient.ts (generateCaption, createContent), 11-data-flow.md §3 |
| **Priority** | P2 — Reference |

### D-08 — Content Signed URL Generation Flow

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Sequence |
| **Purpose** | How signed URLs are generated for content thumbnails and full files: `generateSignedUrlsForContent` iterates content files → checks if already HTTP URL → calls `StorageService.getPrivateSignedUrl(path, 3600)` → R2 `getSignedUrl` via AWS SDK → returns `{ signedUrl, contentType }`. Show the 60-second vs 3600-second expiry difference. |
| **Complexity** | Low |
| **Estimated Nodes** | 3 participants, 8 steps |
| **Referenced Modules** | content.utils.ts, storage.service.ts, 10-internal-workflows.md §16 |
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
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Complete catalog of all Socket.IO events: server-emitted (new_message, message_deleted, conversation_read), client-emitted (join_conversation, leave_conversation), and the dead `message_updated` event (registered on frontend, never emitted). Show which events flow to which rooms and which are broken. |
| **Complexity** | Medium |
| **Estimated Nodes** | 12 |
| **Referenced Modules** | socket.ts, message.service.ts, FanMessages.tsx, CreatorMessages.tsx, 11-data-flow.md §8, 07-cross-cutting-concerns.md §4 |
| **Priority** | P1 — Important |

### E-03 — Support Ticket ↔ DM Sync Sequence

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Sequence |
| **Purpose** | Cross-service synchronization: admin replies to ticket → `support.service.ts` appends to ticket conversation + calls `MessageService.sendDirectMessage()` via dynamic require → DM delivered via Socket.IO to user's inbox → user replies → `message.service.ts` detects admin receiver → `supportService.appendUserMessageToActiveTicket()` → ticket status changes `Pending → Open`. |
| **Complexity** | Medium |
| **Estimated Nodes** | 6 participants, 14 steps |
| **Referenced Modules** | support.service.ts, message.service.ts, SupportTicketsPanel.tsx, FanMessages.tsx, 10-internal-workflows.md §13, 11-data-flow.md §14 |
| **Priority** | P1 — Important |

### E-04 — Creator Broadcast Message Delivery

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Sequence |
| **Purpose** | Creator sends broadcast → POST /api/v1/messages/mass-message → service iterates all active subscribers → per-subscriber: check preferences → call sendDirectMessage → Socket.IO broadcast → message created in each conversation. Show the N+1 pattern and fire-and-forget nature. |
| **Complexity** | Medium |
| **Estimated Nodes** | 5 participants, 10 steps |
| **Referenced Modules** | message.service.ts (sendMassMessage), BroadcastModal.tsx, SubscriptionModel, 10-internal-workflows.md §12 |
| **Priority** | P2 — Reference |

### E-05 — Subscriber Notification Delivery Flow

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
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
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Flowchart |
| **Purpose** | Cross-cutting data flow showing how all 14 features (11-data-flow.md) share the same 10-step lifecycle (Origin → Validation → Transformation → Storage → Caching → Retrieval → Modification → Deletion → Synchronization → External Transmission). Show the common patterns and where each feature deviates. |
| **Complexity** | High |
| **Estimated Nodes** | 16 |
| **Referenced Modules** | 11-data-flow.md (all 14 features), 07-cross-cutting-concerns.md §1, 03-architecture-kb.md |
| **Priority** | P0 — Core |

### F-03 — Analytics Pipeline

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Flowchart |
| **Purpose** | Event lifecycle: user action (view, visit, gallery add, tip) → POST /api/v1/analytics/log → optionalProtect → controller → service (skip admin/self) → INSERT analytics_events → (if post_view) RPC increment_content_view_count → content.stats.views updated → creator dashboard reads count via `countEventsForCreator`. Highlight the absence of aggregation/caching and unbounded table growth. |
| **Complexity** | Medium |
| **Estimated Nodes** | 10 |
| **Referenced Modules** | analytics.service.ts, analytics.controller.ts, analytics.routes.ts, ContentModel (stats JSONB), 10-internal-workflows.md §4, 11-data-flow.md §10 |
| **Priority** | P2 — Reference |

### F-04 — Support Ticket State Diagram

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | State |
| **Purpose** | Support ticket states: Open (user created or user replied) → Pending (admin viewed) → Open (user replied again) → Resolved (admin closed). Show the auto-transition when admin views ticket (Open → Pending) and when user replies to active ticket (Pending → Open). |
| **Complexity** | Low |
| **Estimated Nodes** | 3 states, 4 transitions |
| **Referenced Modules** | support.service.ts, supportTicket.model.ts, 11-data-flow.md §14, 05-user-journeys.md §M-07 |
| **Priority** | P2 — Reference |

### F-05 — Contest Lifecycle State Diagram

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | State |
| **Purpose** | Contest states: draft (creator creates) → active (creator publishes) → completed (creator finalizes with winner). Support for `canceled` transition from draft or active. Show the entry period window (`start_date` → `end_date`). |
| **Complexity** | Low |
| **Estimated Nodes** | 4 states, 5 transitions |
| **Referenced Modules** | contest.service.ts, contest.model.ts, 11-data-flow.md §13, 05-user-journeys.md §C-10 |
| **Priority** | P2 — Reference |

### F-06 — Contest Winner Selection Flow

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Flowchart |
| **Purpose** | Two winner selection algorithms: `standard` (uniform random from entries) and `weighted_spend` (fetch transaction amounts per entrant → compute `1 + floor(totalSpend / spendThreshold) * additionalEntries` tickets → weighted random). Show the cross-service query to transactions table and the absence of randomness audit trail. |
| **Complexity** | Medium |
| **Estimated Nodes** | 10 |
| **Referenced Modules** | contest.service.ts (finalize), TransactionModel, 11-data-flow.md §13 |
| **Priority** | P3 — Nice to have |

---

## Category G: Admin & Operations

Admin dashboard, platform settings management, user and content moderation, verification document access, email to users.

### G-01 — Admin Dashboard Data Flow

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Flowchart |
| **Purpose** | Admin dashboard `getDashboardStats()` → 5 parallel Promise.all queries: countAllUsers, countActiveCreators, sumPlatformFeeForPeriod(30), countOpenTickets, getNewUsersOverTime(6). Show the data sources (profiles, transactions, support_tickets), the aggregation logic, and the absence of caching (runs 5 queries per page load). |
| **Complexity** | Medium |
| **Estimated Nodes** | 10 |
| **Referenced Modules** | admin.service.ts (getDashboardStats), admin.controller.ts, UserModel, TransactionModel, SupportTicketModel, 11-data-flow.md §11 |
| **Priority** | P1 — Important |

### G-02 — Admin Moderation Workflow

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Sequence |
| **Purpose** | Content reporting → user reports content with reason → analytics_events tracked → after 3 reports auto-flag (status: flagged) → admin views flagged content (GET /admin/content/flagged, enriched with reportCount + creator) → admin approves (→ published, reports auto-dismissed) or removes (→ status: removed). |
| **Complexity** | Medium |
| **Estimated Nodes** | 5 participants, 12 steps |
| **Referenced Modules** | admin.service.ts, content.service.ts (reportContent, auto-flag), ReportModel, ContentModerationPanel.tsx, 10-internal-workflows.md §22, 05-user-journeys.md §M-03 |
| **Priority** | P2 — Reference |

### G-03 — Admin Panel Structure & Data Sources

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Map all 8 admin panels to their backend routes, services, models, and DB tables: Dashboard (5 queries), Users, Analytics (transactions), Content Moderation (content + reports), Support Tickets, Reports (custom reporting), Settings, Verification Docs (R2 signed URLs). Show which ones read-only vs read-write. |
| **Complexity** | High |
| **Estimated Nodes** | 18 |
| **Referenced Modules** | admin.routes.ts, admin.controller.ts, admin.service.ts, all admin panel components (AdminPanel.tsx, DashboardPanel.tsx, etc.), 11-data-flow.md §11 |
| **Priority** | P2 — Reference |

### G-04 — Verification Document Access Flow

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Sequence |
| **Purpose** | Admin requests verification docs for a creator → GET /admin/users/:id/verification-docs → checks `verification_data` JSONB has idFilePath + selfieFilePath → StorageService.getPrivateSignedUrl(filePath, 60) → 60-second signed URLs returned → admin views ID/selfie images. Highlight the temporary URL window and PII sensitivity. |
| **Complexity** | Low |
| **Estimated Nodes** | 4 participants, 8 steps |
| **Referenced Modules** | admin.service.ts, storage.service.ts, VerificationDetailPanel.tsx, 11-data-flow.md §11 |
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
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Show dependencies among all 20 business capabilities (04-business-capabilities.md). IAM at root → Payment Processing as most-depended-on hub → Subscription Commerce/Tipping/PPV as revenue leaves → Notifications/Feed/Gallery as engagement spokes. Distinguish enabling, core, and growth capabilities by visual grouping. |
| **Complexity** | High |
| **Estimated Nodes** | 22 |
| **Referenced Modules** | 04-business-capabilities.md (all 20 capabilities), 03-architecture-kb.md |
| **Priority** | P1 — Important |

### H-03 — User Journey Map (Fan)

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Journey |
| **Purpose** | Mermaid Journey diagram showing a fan's emotional journey through signup → browse creator → subscribe → view content → tip → message → enter contest → refer friend. Highlight friction points: Stripe 404 errors on payment, mocked crypto wallet, no email notifications. |
| **Complexity** | Medium |
| **Estimated Nodes** | 7 milestones |
| **Referenced Modules** | 05-user-journeys.md (F-01 through F-15), 06-frontend-architecture.md |
| **Priority** | P2 — Reference |

### H-04 — User Journey Map (Creator)

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Journey |
| **Purpose** | Mermaid Journey diagram showing a creator's journey through signup → verification → first content → subscriber notification → earnings dashboard → payout request. Highlight friction: mocked off-ramp (no real payouts), synchronous thumbnail generation (slow uploads), no content scheduling flexibility. |
| **Complexity** | Medium |
| **Estimated Nodes** | 7 milestones |
| **Referenced Modules** | 05-user-journeys.md (C-01 through C-12), 06-frontend-architecture.md |
| **Priority** | P2 — Reference |

### H-05 — Role-Based Access Boundaries

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Show the three role boundaries (unauthenticated, fan, creator, admin) and what each role can access in terms of route groups, UI features, and data. Overlay the access control gaps: missing fan route guard (`/fan/*`), 2 unprotected referral routes, and the impersonation boundary bypass. |
| **Complexity** | Medium |
| **Estimated Nodes** | 15 |
| **Referenced Modules** | auth.middleware.ts, all route files, App.tsx (routing), withAuthGuard.tsx, 07-cross-cutting-concerns.md §2, 06-frontend-architecture.md §3 |
| **Priority** | P1 — Important |

### H-06 — Feature Maturity Radar

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Visual classification of all 20 business capabilities into Mature/Functional/Basic tiers (from 04-business-capabilities.md maturity assessment). Group by domain (Core Commerce, Engagement, Growth, Governance, Productivity). Use subgraphs to show which need investment. |
| **Complexity** | Medium |
| **Estimated Nodes** | 22 |
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
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Local `docker-compose up` architecture: frontend service (Vite dev server on :5173) + backend service (Express on :5000, with ts-node-dev). Show the Vite proxy (`/api → localhost:5000`), the absence of Nginx or PostgreSQL containers (relies on remote Supabase), and the frontend Dockerfile running dev server (not production build). |
| **Complexity** | Low |
| **Estimated Nodes** | 6 |
| **Referenced Modules** | docker-compose.yml, Dockerfile (frontend), Dockerfile (backend), Server.ts, 07-cross-cutting-concerns.md §8 |
| **Priority** | P2 — Reference |

### I-03 — Database Migration Timeline

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Gantt |
| **Purpose** | Show the 9 SQL migrations (+ 3 utility scripts) in chronological order, grouped by feature area (auth, profiles, content, payments, subscriptions, messaging, analytics, contests, referrals, enclave). Use Gantt to visualize when each table was added and which migrations are post-launch patches (e.g., `update_contests_schema.sql`). |
| **Complexity** | Medium |
| **Estimated Nodes** | 15 tasks |
| **Referenced Modules** | All migration files in migrations/ and scripts/migrations/, 01-repository-inventory.md §6 |
| **Priority** | P2 — Reference |

### I-04 — Build & Deploy Pipeline (Frontend)

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
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
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Flowchart |
| **Purpose** | Show the 5-layer error handling pipeline: asyncHandler (catch wrapper) → AppError (typed error class, 2 variants exist — highlight duplication) → errorHandler middleware (global catch-all, stack trace pruning) → Axios response interceptor (401 auto-clear, toast display) → [missing] React ErrorBoundary. Show how errors propagate through the stack and where they get lost. |
| **Complexity** | Medium |
| **Estimated Nodes** | 12 |
| **Referenced Modules** | asyncHandler.ts, utils/apiError.ts, middleware/error.middleware.ts, apiClient.ts (response interceptor), 07-cross-cutting-concerns.md §6, 10-internal-workflows.md §2 (DB wrappers) |
| **Priority** | P1 — Important |

### J-02 — Security Boundary & Trust Diagram

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Graph (C4 or flowchart) |
| **Purpose** | Define trust boundaries: Browser (untrusted client) ↔ HTTPS → Express server (trusted) ↔ Supabase PostgreSQL (trusted) ↔ External APIs (Stripe, R2, OpenAI, Ethereum RPC — partially trusted). Highlight the sandbox 0x0000 bypass (any authenticated user can create verified transactions without on-chain proof — weakened boundary). Show localStorage JWT as XSS attack surface. |
| **Complexity** | High |
| **Estimated Nodes** | 14 |
| **Referenced Modules** | auth.middleware.ts, cryptoPayment.service.ts, apiClient.ts, 08-crypto-deep-dive.md, 07-cross-cutting-concerns.md §2, 11-data-flow.md §15 |
| **Priority** | P1 — Important |

### J-03 — Sensitive Data Flow Map

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Trace where sensitive data categories (PII, secrets, payment data, AI prompts/responses, auth tokens) enter, flow through, and leave the system. Use color-coded subgraphs for each category. Highlight the critical leaks: JWT_SECRET in frontend .env, verification docs via 60s signed URLs, media sent to AI API without consent, auth debug log writing PII to disk. |
| **Complexity** | High |
| **Estimated Nodes** | 20 |
| **Referenced Modules** | 11-data-flow.md §15 (sensitive data inventory), 07-cross-cutting-concerns.md §2, auth.middleware.ts, podm-frontend/.env, cryptoPayment.service.ts |
| **Priority** | P1 — Important |

### J-04 — Architectural Risk Matrix

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Visualize the 14-item risk matrix from 07-cross-cutting-concerns.md §12 on a 3×3 impact×likelihood grid. Use color coding (red=critical, yellow=high, blue=medium, gray=low). Show mitigation status (mitigated, partial, none) for each. Risks: memory exhaustion, unprotected routes, no Stripe webhooks, duplicate AppError, sync fs logging, no DB transactions, etc. |
| **Complexity** | Medium |
| **Estimated Nodes** | 18 |
| **Referenced Modules** | 07-cross-cutting-concerns.md §12, 11-data-flow.md §15 (cross-cutting risks), 08-crypto-deep-dive.md §9 |
| **Priority** | P2 — Reference |

### J-05 — Crypto Security Gap Heatmap

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
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
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Visual coverage matrix: 15 controllers (1 tested), 15 services (1 tested), 13 models (0 tested), 4 middleware (0 tested), 28 components (0 tested), 9 hooks (0 tested), 6 lib files (0 tested), 5 E2E specs (not in CI). Use percentage fill bars for each module category. Show the 22 recommendations from 09-testing-monitoring.md as overlay annotations. |
| **Complexity** | High |
| **Estimated Nodes** | 20 |
| **Referenced Modules** | 09-testing-monitoring.md (all sections), all test files in tests/ directories |
| **Priority** | P1 — Important |

### K-02 — End-to-End Test Journey Coverage

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
| **Diagram Type** | Graph (flowchart) |
| **Purpose** | Map the 5 Playwright E2E specs against the 40 user journeys from 05-user-journeys.md. Show which journeys are covered (auth login, fan subscribe+unlock, tipping, creator dashboard+content, admin reports+moderation) and which are not (password reset, impersonation, messaging, contests, referrals, enclave, support tickets, payouts, AI captions, bulk upload, broadcast, gallery, feed). |
| **Complexity** | Medium |
| **Estimated Nodes** | 16 |
| **Referenced Modules** | 09-testing-monitoring.md §1-4, 05-user-journeys.md (all 40 journeys), Playwright spec files |
| **Priority** | P2 — Reference |

### K-03 — Monitoring & Observability Gap Diagram

| Property | Value |
|---|---|
| **Status** | 🔲 PROPOSED |
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
|---|---|---|
| ✅ EXISTING (`docs/diagrams/`) | 10 |
| ✅ GENERATED (`docs/flowcharts/`) | 49 |
| **Total** | **59** |

### Category Breakdown

| Category | Existing | Generated | Total |
|---|---|---|---|
| A — System Architecture & Context | 3 | 2 | 5 |
| B — Authentication & Authorization | 2 | 4 | 6 |
| C — Payment & Finance | 1 | 7 | 8 |
| D — Content Lifecycle | 1 | 7 | 8 |
| E — Real-Time & Messaging | 1 | 4 | 5 |
| F — Data & State | 1 | 5 | 6 |
| G — Admin & Operations | 0 | 4 | 4 |
| H — User Journeys & Business | 1 | 5 | 6 |
| I — Development & Infrastructure | 1 | 3 | 4 |
| J — Security & Compliance | 0 | 5 | 5 |
| K — Testing & Quality | 0 | 3 | 3 |

> **Note:** Existing count shows 11 index entries but only 10 unique files. A-03 and I-01 both reference `docs/diagrams/09-deployment-cicd.md` (the deployment/CI diagram serves both categories).

### Priority Distribution

| Priority | Count | Meaning |
|---|---|---|
| P0 — Core | 10 | Essential system understanding, existing or must-generate |
| P1 — Important | 14 | High value for development and debugging |
| P2 — Reference | 16 | Valuable for onboarding and architecture review |
| P3 — Nice to have | 8 | Completeness but lower daily utility |

### Diagram Type Distribution

| Diagram Type | Count |
|---|---|
| flowchart / Graph | 21 |
| Sequence | 16 |
| State | 4 |
| Journey | 2 |
| ER | 1 |
| C4 | 1 |
| Class | 1 |
| Gantt | 1 |
| (mixed / hybrid) | 1 |
