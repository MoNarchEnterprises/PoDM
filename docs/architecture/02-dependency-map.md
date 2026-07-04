# Dependency Map

> Phase 2 of documentation plan. Maps all dependencies across layers, modules, and external services for the PoDM backend (~25,600 LOC).

## Layer Dependency Structure

```
Routes (15 files)
  │  define URL paths, attach middleware chains
  ▼
Controllers (15 files)
  │  handle req/res, delegate to services, format responses
  ▼
Services (15 files)
  │  business logic, orchestration, cross-cutting concerns
  ▼
Models (13+ files)
  │  database access, Supabase queries, CRUD
  ▼
Database (Supabase PostgreSQL)
  │  12 core tables + migration tables
```

Arrows crossing layers (controller → model bypass) are **anomalies** flagged below.

---

## 1. Route Groups (14 mounted prefixes)

Each route file is mounted in `Server.ts:99-113`.

| Prefix | Route File | Middleware | # Routes |
|---|---|---|---|
| `/api/v1/auth` | `auth.routes.ts` | `protect` (on me, change-password) | 7 |
| `/api/v1/users` | `user.routes.ts` | `protect`, `protectAndCreator`, `optionalProtect` | 12 |
| `/api/v1/creator` | `creator.routes.ts` | `protectAndCreator` (all) | 9 |
| `/api/v1/content` | `content.routes.ts` | `protect`, `protectAndCreator`, `optionalProtect`, `uploadContent` | 9 |
| `/api/v1/subscriptions` | `subscription.routes.ts` | `protect` | 4 |
| `/api/v1/messages` | `message.routes.ts` | `protect`, `protectAndCreator`, `uploadVoiceMessage` | 7 |
| `/api/v1/payments/crypto` | `cryptoPayment.routes.ts` | `protect` | 4 |
| `/api/v1/admin` | `admin.routes.ts` | `protectAndAdmin` (router-level) | 14 |
| `/api/v1/analytics` | `analytics.routes.ts` | `optionalProtect` | 1 |
| `/api/v1/support` | `support.routes.ts` | `protect`, `protectAndAdmin` | 4 |
| `/api/v1/ai` | `ai.routes.ts` | `protect` (router-level), `uploadAICaptionImage` | 1 |
| `/api/v1/notifications` | `notification.routes.ts` | `protect` (router-level) | 5 |
| `/api/v1/contests` | `contest.routes.ts` | `protect`, `protectAndCreator` | 7 |
| `/api/v1/enclave` | `enclave.routes.ts` | `protectAndAdmin` (on admin routes) | 4 |
| `/api/v1/referrals` | `referral.routes.ts` | `protect` (on 3 routes), none (on 3 routes) | 6 |

**Total: 14 mounted prefixes, 15 route files, ~94 endpoints.**

### Route → Controller Binding

```
auth.routes.ts         → auth.controller      (signup, login, logout, getMe, changePassword, forgotPassword, signupAndSubscribe)
user.routes.ts         → user.controller       (12 handlers, plus getSecureContentUrl exported but UNUSED in routes)
creator.routes.ts      → creator.controller    (9 handlers)
content.routes.ts      → content.controller    (9 handlers)
subscription.routes.ts → subscription.controller (4 handlers)
message.routes.ts      → message.controller    (7 handlers)
cryptoPayment.routes.ts→ cryptoPayment.controller (4 handlers)
admin.routes.ts        → admin.controller      (14 handlers)
analytics.routes.ts    → analytics.controller  (1 handler: logEvent)
support.routes.ts      → support.controller    (4 handlers)
ai.routes.ts           → ai.controller         (1 handler: generateCaption)
notification.routes.ts → notification.controller (5 handlers)
contest.routes.ts      → contest.controller    (7 handlers)
enclave.routes.ts      → enclave.controller    (4 handlers)
referral.routes.ts     → referral.controller   (6 handlers)
```

---

## 2. Controller → Service Mapping

Each controller delegates to exactly one primary service, with noted exceptions.

| Controller | Primary Service | Additional Dependencies |
|---|---|---|
| `auth.controller` | `auth.service` | — |
| `user.controller` | `user.service` | **Direct model**: `ContentModel` (bypass) |
| `creator.controller` | `creator.service` | — |
| `content.controller` | `content.service` | — |
| `subscription.controller` | `subscription.service` | — |
| `message.controller` | `message.service` | — |
| `cryptoPayment.controller` | `cryptoPayment.service` | — |
| `admin.controller` | `admin.service` | — |
| `analytics.controller` | `analytics.service` | — |
| `ai.controller` | `ai.service` | — |
| `notification.controller` | `notification.service` | **Direct model**: `NotificationModel` (markAsRead, markAllAsRead, deleteNotification) |
| `contest.controller` | `contest.service` | — |
| `support.controller` | `support.service` | — |
| `enclave.controller` | **None** | Raw `supabase` queries + `EmailService`, `SupportTicketModel`, `ReferralModel` |
| `referral.controller` | **None** | `ReferralModel` directly |

**Anomaly**: 3 controllers bypass the service layer (`user`, `notification`, `enclave`, `referral`). Enclave and referral have no dedicated service at all.

---

## 3. Service → Service Dependencies (Inter-Service Coupling)

```
auth.service
  └── subscription.service     (signupAndSubscribe → createSubscriptionForUser)
  
subscription.service
  ├── message.service          (cancelFanSubscription → sendDirectMessage)
  └── cryptoPayment.service    (createSubscriptionForUser → verifyAndRecordBasePayment)

content.service
  ├── notification.service     (createNewContent → notifySubscribersOfNewContent)
  └── storage.service          (createNewContent → uploadToPrivate; deleteCreatorContent → deleteFromPrivate)

creator.service
  ├── analytics.service        (getDashboardData → logAnalyticsEvent + countEventsForCreator)
  ├── cryptoPayment.service    (getEarningsData → getUserWalletConfig/updateUserWalletConfig)
  └── storage.service          (updateSettings → uploadToPublic; getDashboardData → getPublicUrl)

admin.service
  ├── storage.service          (getVerificationDocs → getPrivateSignedUrl)
  └── email.service            (messageUser → sendEmail)

support.service
  └── message.service          (addReplyToTicket → sendDirectMessage, via dynamic require())

user.service
  └── storage.service          (uploadUserAvatar → uploadToPublic; submitVerificationDocs → uploadToPrivate)
```

**Shared service count** (most depended-on services):
- `storage.service` — 4 consumers (content, creator, admin, user)
- `message.service` — 2 consumers (subscription, support)
- `cryptoPayment.service` — 2 consumers (subscription, creator)
- `analytics.service` — 1 consumer (creator)
- `notification.service` — 1 consumer (content)
- `email.service` — 1 consumer (admin)
- `subscription.service` — 1 consumer (auth)

**Isolated services** (no inbound deps): `ai.service`, `analytics.service`, `notification.service`, `email.service`, `contest.service`

**Circular dependency risk**: Chain `auth.service → subscription.service → message.service` has no return edge, so currently safe. However, adding return edges would create cycles.

---

## 4. Service → Model Dependencies

| Service | Models Imported |
|---|---|
| `auth.service` | `UserModel` |
| `user.service` | `UserModel`, `GalleryModel`, `ContentModel`, `SubscriptionModel` |
| `creator.service` | `UserModel`, `ContentModel`, `SubscriptionModel`, `TierModel`, `TransactionModel` |
| `content.service` | `ContentModel`, `SubscriptionModel`, `TierModel`, `TransactionModel`, `ReportModel` |
| `admin.service` | `UserModel`, `ContentModel`, `SubscriptionModel`, `TransactionModel`, `ReportModel`, `SupportTicketModel`, `VerificationModel` |
| `subscription.service` | `SubscriptionModel`, `UserModel` |
| `notification.service` | `NotificationModel`, `SubscriptionModel`, `UserModel`, `ContentModel` |
| `message.service` | `ConversationModel`, `MessageModel`, `ContentModel`, `UserModel`, `SubscriptionModel` |
| `analytics.service` | `UserModel` |
| `contest.service` | `ContestModel`, `SubscriptionModel` |
| `support.service` | `SupportTicketModel`, `UserModel` |
| `cryptoPayment.service` | `TransactionModel`, plus raw `supabase.from('profiles')` |
| `ai.service` | none |
| `email.service` | none |
| `storage.service` | none |

**Most model consumers**: `ContentModel` (6 services: user, creator, content, admin, notification, message), `UserModel` (9 services), `SubscriptionModel` (6 services), `TransactionModel` (3 services).

---

## 5. Shared Middleware Dependencies

### Auth Middleware (`auth.middleware.ts`)
- Dependencies: `supabaseClient`, `UserModel`, `AppError`
- Exports: `protect`, `optionalProtect`, `protectAndCreator`, `protectAndAdmin`, `adminOnly`, `creatorOnly`, `requireRole`
- `protectAndCreator` and `protectAndAdmin` are **composite tuples** `[protect, requireRole('creator')]` / `[protect, requireRole('admin')]`

### Error Middleware (`error.middleware.ts`)
- Exports: `AppError` class, `errorHandler` function
- No internal dependencies — used by every service/controller

### Upload Middleware (`upload.middleware.ts`)
- Dependencies: `multer`, `sharp` (image processing)
- Exports: `uploadContent`, `uploadAvatar`, `uploadBanner`, `uploadVoiceMessage`, `uploadVerificationDocs`, `uploadAICaptionImage`
- Used by: content, user, creator, message, ai routes

---

## 6. Shared Utility Dependencies

| Utility | Used By | Dependency |
|---|---|---|
| `response.ts` (ok, created, okMsg, createdMsg) | All 15 controllers | none |
| `asyncHandler.ts` | All 15 controllers | none |
| `entityGuards.ts` (requireUser, requireContent, requireContentOwnership) | `content.service`, `support.service`, `user.service`, `creator.service`, `admin.service`, `subscription.service`, `message.service` | `UserModel`, `ContentModel` |
| `database.ts` (handleQuery, handleCount, createRecord, updateRecord, findRecordById, countRecords) | All 13 models | `supabaseClient` |
| `requestHelpers.ts` (requireAuth, requireId, requireBody) | `auth.controller`, `content.controller` | `AppError` |
| `user.utils.ts` (reshapeUserForApp) | `auth.service`, `user.service`, `creator.service` | `UserProfile` type |
| `content.utils.ts` (generateSignedUrlsForContent, enrichContentWithUnlockStatus, reshapePostForFeed) | `content.service`, `user.service`, `notification.service`, `message.service` | `storage.service` (generateSignedUrlsForContent calls getPrivateSignedUrl) |
| `tier.utils.ts` (syncTiersWithStripe) | `user.service` | Stripe SDK |
| `subscription.utils.ts` | — | (check if used anywhere) Actually this likely imports Stripe directly |
| `fee.utils.ts` | `creator.service` (getEarningsData) | — |
| `formatters.ts` | — | — |

---

## 7. External Service Dependencies

### Database
- **Supabase PostgreSQL** (`config/supabaseClient.ts`) — Every model, several services, 2 controllers
- SDK: `@supabase/supabase-js`

### Payments
- **Stripe** — Used directly in `subscription.service.ts`, `tier.utils.ts`, `subscription.utils.ts`, `cryptoPayment.service.ts`
- SDK: `stripe` v18 — **No shared config file**; each file initializes its own `new Stripe(SECRET_KEY)`
- Features: PaymentIntents, SetupIntents, Connect, customers, products/prices

### Crypto / Web3
- **BaseScan API** (Etherscan fork) — Transaction hash verification in `cryptoPayment.service.ts`
- **Coinbase API** — Gas estimation proxy in `cryptoPayment.service.ts`
- **Ethereum RPC** — Contract interaction for PoDMPaymentProtocol
- **Debit card API** — Fiat off-ramp in `cryptoPayment.service.ts`
- SDK: `axios` for all HTTP calls; `ethers` for contract calls

### Storage
- **Cloudflare R2** (S3-compatible) via `config/r2Client.ts`
- SDK: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
- Used by: `storage.service.ts` → consumed by content, creator, admin, user services

### Real-time
- **Socket.IO** via `config/socket.ts` (server) and `lib/socket.ts` (frontend)
- Auth middleware decodes JWT from handshake
- Used by: `message.service.ts` (emit to rooms)

### AI
- **OpenAI SDK** (or OpenRouter-compatible) via `ai.service.ts`
- Single model: configurable via `AI_MODEL_ID` env var, default `google/gemma-3-27b-it:free`
- Single endpoint: AI caption generation

### Email
- **SMTP** via `email.service.ts` (nodemailer)
- Used by: `admin.service.ts` (messageUser) and `enclave.controller.ts` (direct)

---

## 8. Config File Dependencies

| Config File | SDK/Module | Used By |
|---|---|---|
| `supabaseClient.ts` | `@supabase/supabase-js` | All models, analytics.service, cryptoPayment.service, user.service (raw queries), enclave.controller (raw queries) |
| `r2Client.ts` | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` | `storage.service.ts` |
| `socket.ts` | `socket.io`, `@supabase/supabase-js` | `Server.ts`, `message.service.ts` |

**Config gaps**: No shared Stripe config, no shared Redis/queue config, no shared logging config.

---

## 9. Raw Supabase Queries (Bypassing Models)

Several files execute `supabase.from('table')` directly instead of using model functions:

| File | Tables Queried Directly |
|---|---|
| `analytics.service.ts` | `analytics_events` (insert + rpc), `profiles` (select) |
| `user.service.ts` | `profiles` (select for getFanSettings), `profiles` (update for updateFanPaymentMethod) |
| `cryptoPayment.service.ts` | `profiles` (select/update for wallet config) |
| `notification.service.ts` | `profiles` (select for preferences check) |
| `auth.service.ts` | Supabase Auth admin API |
| `enclave.controller.ts` | `enclave_application` + `platform_settings` (raw queries) |

---

## 10. Architectural Smells

### Critical
1. **No service layer for enclave + referral** — Business logic in controllers with raw DB queries
2. **Controller → Model bypass** — `user.controller` imports `ContentModel`; `notification.controller` imports `NotificationModel`
3. **Dynamic `require()`** — `support.service.ts:71` uses `require('./message.service')` instead of static import
4. **Inline Stripe init** — 4+ files create their own Stripe instances, risking version drift and duplicated config

### Moderate
5. **No DB transactions** — Multi-step operations (subscribe → notify → message) run sequentially with no rollback
6. **Raw Supabase in services** — 6 services use `supabase.from()` directly, mixing data-access style
7. **Missing auth on internal routes** — `referral.routes.ts` has `/check-milestone/:userId` and `/validate/:code` without `protect`
8. **Dead controller export** — `user.controller` exports `getSecureContentUrl` but no route maps to it

### Minor
9. **No async job queue** — Notifications and broadcast messages block the request cycle
10. **Inconsistent error returns** — Some model functions return `null` on error, others throw `AppError`
11. **Model function naming inconsistency** — Some use `find*`, others `get*`, others `fetch*`
12. **Hardcoded table strings** — Model functions hardcode `'profiles'`, `'content'`, etc., making refactoring risky

---

## 11. Dependency Graph (Text)

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│ 15 Routes   │────▶│ 15 Controllers│────▶│ 15 Services      │────▶│ 13 Models    │
│ (middleware) │     │ (req/res)     │     │ (business logic) │     │ (DB queries) │
└─────────────┘     └──────┬───────┘     └────────┬─────────┘     └──────┬───────┘
                           │                       │                      │
                           │ (3 bypasses)          │ (6 services use      │ (use database.ts
                           │ user.controller───▶ContentModel              │  wrappers + supabase
                           │ notif.controller──▶NotificationModel         │  client)
                           │ enclave.controller──▶raw supabase + models   │
                           │ referral.controller──▶ReferralModel          │
                           │                       │                      │
                           │                       ▼ (inter-service)      │
                           │               auth → subscription           │
                           │               subscription → message+crypto │
                           │               content → notification+storage│
                           │               creator → analytics+crypto+st │
                           │               admin → storage+email         │
                           │               support → message (dynamic)   │
                           │               user → storage                │
                           │                                              │
                           ▼                      ▼                       ▼
                    ┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
                    │ Middleware   │     │ External APIs    │     │ Config       │
                    │ auth.mw (JWT)│     │ Stripe, R2, AI,  │     │ supabase, r2 │
                    │ error.mw     │     │ SMTP, BaseScan,  │     │ socket (+env)│
                    │ upload.mw    │     │ Coinbase, Ether  │     │              │
                    └──────────────┘     └──────────────────┘     └──────────────┘
```

---

## 12. [Diagram Candidate] Module Dependency Matrix

A 15×15 matrix of service → service imports would visualize coupling density. Currently:
- 7 inter-service edges among 15 services = **3.1% edge density** (sparse, healthy)
- No circular dependencies detected
- `storage.service` is the most reused (4 consumers) — clean shared utility
- `message.service` is the most coupled for a non-utility (2 consumers + 1 dynamic)

---

## 13. Data Flow: Request Lifecycle

```
Client Request
  │
  ▼
CORS + JSON body parsers (express middleware, global)
  │
  ▼
Route Match (e.g. POST /api/v1/content)
  │
  ▼
Middleware Chain (e.g. [protect, requireCreator, uploadContent])
  │  ├── protect: decode JWT → supabase.auth.getUser → attach req.user
  │  ├── requireCreator: check req.user.role === 'creator'
  │  └── uploadContent: multer → parse multipart → req.files
  │
  ▼
Controller Handler (e.g. createContent)
  │  ├── validate params (express-validator)
  │  ├── call service function
  │  └── format response (ok/created helpers)
  │
  ▼
Service Function (e.g. content.service.createNewContent)
  │  ├── call models for DB operations
  │  ├── call other services (notification, storage)
  │  └── call external APIs via config (R2 upload)
  │
  ▼
Model Function (e.g. ContentModel.createContent)
  │  └── handleQuery(supabase.from('content').insert(...))
  │
  ▼
Supabase PostgreSQL
  │
  ▼
Response ← errorHandler (if AppError thrown)
  │
  └── JSON envelope to client
```

---

## 14. Model → Table Mapping

| Model File | Primary Table | Secondary Tables |
|---|---|---|
| `user.model.ts` | `profiles` | Supabase Auth users |
| `content.model.ts` | `content` | — |
| `subscription.model.ts` | `subscriptions` | — |
| `transaction.model.ts` | `transactions` | — |
| `message.model.ts` | `messages` | — |
| `conversation.model.ts` | `conversations` | — |
| `notification.model.ts` | `notifications` | — |
| `gallery.model.ts` | `galleries` | `findGalleryByFanId`, `createGallery`, `addItemToGallery`, `removeItemFromGallery`, `getGalleryDetails` — standalone model managing fan content collections |
| `tier.model.ts` | (jsonb column in profiles.creator_data) | — |
| `contest.model.ts` | `contests` | `contest_entries` |
| `supportTicket.model.ts` | `support_tickets` | — |
| `report.model.ts` | `reports` | `createReport`, `getReportsByContentId`, `dismissReportsForContent` — tracks user-submitted content reports for moderation auto-flag workflow |
| `platformSettings.model.ts` | `platform_settings` | — |
| `verification.model.ts` | (jsonb in profiles.verification_data) | — |
| `referral.model.ts` | `referral_codes` | `referral_redemptions` |
| `enclave_application.model.ts` | `enclave_applications` | — |

**Note**: Gallery, Tier, Verification, and Referral redemptions are stored as JSONB columns within the `profiles` table, making them schema-flexible but unqueryable by standard SQL.

---

## 15. Key Metrics

| Metric | Value |
|---|---|
| Route groups | 14 |
| Total endpoints (est.) | ~94 |
| Controllers | 15 |
| Services | 15 |
| Models | 13 (core) + 3 (enclave/referral) |
| Middleware files | 5 (auth, error, upload, validation, rate-limit?) |
| Utility files | ~13 |
| Config files | 3 (supabase, r2, socket) |
| Inter-service edges | 7 |
| Controller→model bypasses | 4 instances in 3 controllers |
| Raw supabase query sites | 7 files |
| No-service modules | 2 (enclave, referral) |
| Circular deps | 0 |
| External API integrations | 8 (Supabase, Stripe, R2, OpenAI, SMTP, BaseScan, Coinbase, Ethereum RPC) |
