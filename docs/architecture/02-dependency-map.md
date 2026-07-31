# Dependency Map

**Purpose**: Complete inter-module dependency graph for the PoDM platform — trace every import, every call, every external API, every database dependency, and every architectural anomaly across all layers.

**Date**: 2026-07-19
**Project Version**: 1.0.0 (backend), 0.0.0 (frontend)
**Confidence**: High — every source file's imports were read and catalogued

## Files Examined

- All 16 controllers, 17 services, 13 models, 16 routes, 4 middleware, 12 utilities, 3 config files
- All 12 shared type definitions

---

## Layer Architecture

```
                 ┌──────────────────────────────────────┐
                 │          HTTP / Socket.IO            │
                 │          Inbound Requests            │
                 └──────────┬───────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │  Middleware   │  (auth, upload, validation, error)
                    │     (4)      │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │  Route Layer  │  (16 route files, 81+ endpoint definitions)
                    │    (16)      │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │  Controllers  │  (request/response handling, asyncHandler)
                    │    (16)      │
                    └───────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
     ┌────────▼───┐  ┌─────▼──────┐  ┌───▼────────┐
     │  Services  │  │   Utils    │  │Direct Model │
     │    (17)    │  │   (12)     │  │Bypass (5x) │
     └────────┬───┘  └─────┬──────┘  └───┬────────┘
              │            │             │
              └────────────┼─────────────┘
                           │
                    ┌──────▼──────┐
                    │   Models    │  (13 model files)
                    │    (13)     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Supabase   │  (PostgreSQL via @supabase/supabase-js)
                    │ PostgreSQL  │
                    └─────────────┘
```

---

## Layer 1: Routes → Controllers Mapping

Each route file imports its controller functions and assigns middleware chains.

| Route File | Controller | Endpoints | Middleware Applied |
|---|---|---|---|
| `auth.routes.ts` | `auth.controller` | 7 | `protect` (on `me`, `change-password` only) |
| `user.routes.ts` | `user.controller` | 13 | `protect`, `optionalProtect`, `protectAndCreator`, `uploadAvatar`, `uploadVerificationDocs` |
| `creator.routes.ts` | `creator.controller` | 10 | `protectAndCreator`, `uploadBanner` |
| `content.routes.ts` | `content.controller` | 10 | `protectAndCreator`, `protect`, `optionalProtect`, `uploadContent` |
| `subscription.routes.ts` | `subscription.controller` | 4 | `protect` |
| `message.routes.ts` | `message.controller` | 7 | `protect`, `protectAndCreator`, `uploadVoiceMessage` |
| `cryptoPayment.routes.ts` | `cryptoPayment.controller` | 4 | `protect` |
| `admin.routes.ts` | `admin.controller` | 16 | `protectAndAdmin` (applied to all via `router.use`) |
| `analytics.routes.ts` | `analytics.controller` | 1 | `optionalProtect` |
| `support.routes.ts` | `support.controller` | 4 | `protect`, `protectAndAdmin` |
| `ai.routes.ts` | `ai.controller` | 1 | `protect`, `uploadAICaptionImage` |
| `notification.routes.ts` | `notification.controller` | 5 | `protect` (applied to all via `router.use`) |
| `contest.routes.ts` | `contest.controller` | 7 | `protect`, `protectAndCreator` |
| `enclave.routes.ts` | `enclave.controller` | 4 | `protectAndAdmin` (on admin routes), none on public |
| `referral.routes.ts` | `referral.controller` | 5 | `protect` (on 3 of 5), **2 unprotected** |
| `onramp.routes.ts` | `onramp.controller` | 2 | `protect` (on `/session`), none on `/webhook` |

### Middleware Chain Patterns

| Pattern | Routes Using It |
|---|---|
| `protect` (single auth guard) | auth, content, cryptoPayment, notification, referral, subscription, onramp, analytics |
| `protectAndCreator` (`[protect, creatorOnly]`) | creator, content (create/update/delete), contest, message (voice/mass), user (onboarding/verification) |
| `protectAndAdmin` (`[protect, adminOnly]`) | admin, enclave (list/update), support (reply/resolve) |
| `optionalProtect` (conditional auth) | content (creator/:username), user (profile/:username), analytics (log) |
| No auth | enclave (spots-remaining, applications POST), referral (check-milestone, validate), onramp (webhook) |

### Unprotected Routes

| Route File | Path | Risk |
|---|---|---|
| `referral.routes.ts` | `POST /check-milestone/:userId` | Anyone can trigger milestone checks on any user |
| `referral.routes.ts` | `GET /validate/:code` | Anyone can enumerate referral codes |
| `enclave.routes.ts` | `GET /spots-remaining` | Public — intentional (marketing) |
| `enclave.routes.ts` | `POST /applications` | Public — intentional (application submission) |
| `onramp.routes.ts` | `POST /webhook` | Public — intentional (Coinbase callback) |

---

## Layer 2: Controllers → Services Mapping

Each controller delegates business logic to one primary service. Some also call additional services or models directly (bypasses flagged).

| Controller | Primary Service | Additional Services | Direct Model Bypasses | Reason |
|---|---|---|---|---|
| `admin.controller` | `AdminService` | `EmailService` | `UserModel` | Re-used for admin user lookups in messageUser |
| `ai.controller` | `AiService` | — | — | Clean |
| `analytics.controller` | `AnalyticsService` | — | — | Clean |
| `auth.controller` | `AuthService` | — | — | Clean |
| `content.controller` | `ContentService` | — | — | Clean |
| `contest.controller` | `ContestService` | — | — | Clean |
| `creator.controller` | `CreatorService` | — | — | Clean |
| `cryptoPayment.controller` | `CryptoPaymentService` | — | — | Clean |
| `enclave.controller` | **None** | `EmailService` | `SupportTicketModel`, `ReferralModel` + raw `supabase.from('enclave_applications')` **8 times** | No service layer exists for enclave |
| `message.controller` | `MessageService` | — | — | Clean |
| `notification.controller` | `NotificationService` | — | `NotificationModel` | getUnreadCount, markAsRead, markAllAsRead called directly |
| `onramp.controller` | `OnrampService` | — | — | Clean |
| `referral.controller` | **None** | — | `ReferralModel` directly | No service layer exists for referrals |
| `subscription.controller` | `SubscriptionService` | — | — | Clean |
| `support.controller` | `SupportService` | — | — | Clean |
| `user.controller` | `UserService` | `AnalyticsService` | `ContentModel` | Analytics logging after gallery add |

### Controller Dependency Tree

```
admin.controller
├── AdminService
├── EmailService
└── UserModel (direct)

ai.controller ── AiService

analytics.controller ── AnalyticsService

auth.controller ── AuthService

content.controller ── ContentService

contest.controller ── ContestService

creator.controller ── CreatorService

cryptoPayment.controller ── CryptoPaymentService

enclave.controller ★ (NO SERVICE LAYER)
├── supabase.from('enclave_applications') (x8)
├── EmailService
├── SupportTicketModel (direct)
└── ReferralModel (direct)

message.controller ── MessageService

notification.controller
├── NotificationService
└── NotificationModel (direct) ★ bypass

onramp.controller ── OnrampService

referral.controller ★ (NO SERVICE LAYER)
└── ReferralModel (direct)

subscription.controller ── SubscriptionService

support.controller ── SupportService

user.controller
├── UserService
├── AnalyticsService
└── ContentModel (direct) ★ bypass
```

---

## Layer 3: Inter-Service Dependency Graph

17 services with 8 directed edges between them:

```
                    ┌──────────────┐
                    │ AuthService  │
                    └──────┬───────┘
                           │ calls
                           ▼
              ┌────────────────────────┐
              │ SubscriptionService    │
              └──┬──────────────┬──────┘
          calls │              │ calls
                ▼              ▼
    ┌─────────────────┐  ┌──────────────────────┐
    │ MessageService  │  │ CryptoPaymentService │
    └──┬──────────┬───┘  └──────────────────────┘
       │          │
  calls│    calls │ (dynamic require)
       ▼          ▼
  ┌──────────┐  ┌───────────┐
  │ Support  │  │ Storage   │
  │ Service  │  │ Service   │
  └──────────┘  └───────────┘
       │ (dynamic require)
       │
       ▼
  ┌──────────┐
  │ Message  │ (circular!)
  │ Service  │
  └──────────┘

                    ┌────────────────┐
                    │ ContentService │
                    └───┬───────┬────┘
              calls │       │ calls
                    ▼       ▼
          ┌────────────┐  ┌──────────────────┐
          │ Storage    │  │ Notification     │
          │ Service    │  │ Service          │
          └────────────┘  └──────────────────┘

                    ┌────────────────┐
                    │ CreatorService │
                    └───┬───────┬────┴───┐
              calls │       │ calls │ calls
                    ▼       ▼       ▼
          ┌────────────┐  ┌──────────────────┐  ┌────────────┐
          │ Analytics  │  │ CryptoPayment    │  │ Storage    │
          │ Service    │  │ Service          │  │ Service    │
          └────────────┘  └──────────────────┘  └────────────┘

                    ┌──────────────┐
                    │ AdminService │
                    └───┬───────┬──┘
              calls │       │ calls
                    ▼       ▼
          ┌────────────┐  ┌───────────┐
          │ Storage    │  │ Email     │
          │ Service    │  │ Service   │
          └────────────┘  └───────────┘

┌──────────────┐
│ UserService  │
└──────┬───────┘
       │ calls
       ▼
┌────────────┐
│ Storage    │
│ Service    │
└────────────┘
```

### Edge Count: 8 direct inter-service dependencies

| Caller | Callee | Mechanism |
|---|---|---|
| `auth.service` | `subscription.service` | Static ES import |
| `subscription.service` | `message.service` | Static ES import |
| `subscription.service` | `cryptoPayment.service` | Static ES import |
| `content.service` | `storage.service` | Static ES import |
| `content.service` | `notification.service` | Static ES import |
| `creator.service` | `analytics.service` | Static ES import |
| `creator.service` | `cryptoPayment.service` | Static ES import |
| `creator.service` | `storage.service` | Static ES import |
| `admin.service` | `storage.service` | Static ES import |
| `user.service` | `storage.service` | Static ES import |
| `message.service` | `support.service` | Dynamic `require()` |
| `message.service` | `storage.service` | Dynamic `require()` |
| `support.service` | `message.service` | Dynamic `require()` |

### Most-Coupled Service: `StorageService`
- Consumed by: `content.service`, `creator.service`, `admin.service`, `user.service`, `message.service`
- 5 consumers — the shared utility of the platform

### Dynamic `require()` Calls (Circular Dependency Workarounds)

| File | Line | Code | Why |
|---|---|---|---|
| `support.service.ts` | 71 | `const messageService = require('./message.service');` | Avoids circular import (support → message → support) |
| `message.service.ts` | 244 | `const supportService = require('./support.service');` | Avoids circular import (message → support → message) |
| `message.service.ts` | 365 | `const storageService = require('./storage.service');` | Lazy import within voice message handler |

### Services with Zero Inter-Service Dependencies (Leaf Nodes)

| Service | Only depends on models/utils/config |
|---|---|
| `ai.service` | OpenAI SDK only |
| `email.service` | Nodemailer only |
| `storage.service` | AWS S3 SDK + R2 config |
| `analytics.service` | Supabase only |
| `cryptoPayment.service` | ethers + axios + TransactionModel + supabase |
| `payout.service` | ethers + TransactionModel + supabase |
| `onramp.service` | axios + supabase |
| `notification.service` | NotificationModel + SubscriptionModel + UserModel + ContentModel |
| `contest.service` | ContestModel + SubscriptionModel |

---

## Layer 4: Service → Model Dependency Matrix

| Service | Models Imported |
|---|---|
| `admin.service` | **7** — SettingsModel, UserModel, TransactionModel, SubscriptionModel, SupportTicketModel, ContentModel, ReportModel |
| `analytics.service` | UserModel |
| `auth.service` | UserModel, ReferralModel |
| `content.service` | **6** — ContentModel, ReportModel, SubscriptionModel, UserModel, TransactionModel, *(NotificationService wraps)* |
| `contest.service` | ContestModel, SubscriptionModel |
| `creator.service` | **5** — SubscriptionModel, TransactionModel, ContentModel, UserModel |
| `cryptoPayment.service` | TransactionModel |
| `message.service` | **5** — ConversationModel, MessageModel, SubscriptionModel, UserModel, ContentModel |
| `notification.service` | **4** — NotificationModel, SubscriptionModel, UserModel, ContentModel |
| `payout.service` | TransactionModel |
| `subscription.service` | **5** — SubscriptionModel, UserModel, TransactionModel, ContentModel |
| `support.service` | SupportTicketModel, UserModel |
| `user.service` | **5** — UserModel, GalleryModel, ContentModel, SubscriptionModel |
| `ai.service` | 0 — no model dependencies |
| `email.service` | 0 — no model dependencies |
| `storage.service` | 0 — no model dependencies |
| `onramp.service` | 0 — no model dependencies |

### Model Load Heatmap

| Model | Services Importing It | Total |
|---|---|---|
| `UserModel` | admin, analytics, auth, content, creator, message, notification, subscription, support, user | **10** |
| `ContentModel` | admin, content, creator, message, notification, subscription, user | **7** |
| `TransactionModel` | admin, content, creator, cryptoPayment, payout, subscription | **6** |
| `SubscriptionModel` | admin, content, contest, creator, message, notification, subscription | **7** |
| `ReportModel` | admin, content | **2** |
| `SettingsModel` | admin | **1** |
| `SupportTicketModel` | admin, support | **2** |
| `ConversationModel` | message | **1** |
| `MessageModel` | message | **1** |
| `NotificationModel` | notification | **1** |
| `GalleryModel` | user | **1** |
| `ContestModel` | contest | **1** |
| `ReferralModel` | auth | **1** |

---

## Layer 5: Model → Database Table Mapping

| Model File | Table(s) | RPCs | Notes |
|---|---|---|---|
| `user.model.ts` | `profiles` | `get_user_details` | Also calls `supabase.auth.admin.listUsers()` for analytics; `findAll` selects `profiles` directly (service-role client) to include all columns (e.g. `is_enclave_member`) |
| `content.model.ts` | `content` | — | |
| `subscription.model.ts` | `subscriptions` | — | |
| `transaction.model.ts` | `transactions`, `saved_reports` | — | Cross-table: reads from both |
| `message.model.ts` | `messages`, `conversations` | — | Updates `conversations.last_message_id` on send |
| `conversation.model.ts` | `conversations` | — | |
| `notification.model.ts` | `notifications` | — | |
| `contest.model.ts` | `contests`, `contest_entries`, `profiles`, `transactions` | — | Cross-table: reads from 4 tables |
| `referral.model.ts` | `referrals`, `referral_applications` | — | |
| `report.model.ts` | `reports` | — | |
| `gallery.model.ts` | `galleries` | — | |
| `supportTicket.model.ts` | `support_tickets` | — | |
| `settings.model.ts` | `platform_settings` | — | |

### Complete Table Reference

| # | Table | Models Using It | Services Using It (via models) |
|---|---|---|---|
| 1 | `profiles` | user, contest | 10+ services |
| 2 | `content` | content | 7+ services |
| 3 | `subscriptions` | subscription | 7+ services |
| 4 | `transactions` | transaction, contest | 6+ services |
| 5 | `messages` | message | message service |
| 6 | `conversations` | conversation, message | message service |
| 7 | `notifications` | notification | notification service |
| 8 | `contests` | contest | contest service |
| 9 | `contest_entries` | contest | contest service |
| 10 | `galleries` | gallery | user service |
| 11 | `support_tickets` | supportTicket | admin, support services |
| 12 | `reports` | report | admin, content services |
| 13 | `platform_settings` | settings | admin service |
| 14 | `referrals` | referral | auth service |
| 15 | `referral_applications` | referral | auth service |
| 16 | `saved_reports` | transaction | admin service |
| 17 | `enclave_applications` | (controller bypass) | enclave controller (raw) |
| 18 | `analytics_events` | (analytics service bypass) | analytics service (raw) |

---

## Layer 6: External API Dependencies

### Per-Service External Integrations

| Service | External API | SDK/Library | Purpose |
|---|---|---|---|
| `ai.service` | OpenAI / OpenRouter | `openai` v6 | Caption generation |
| `auth.service` | Supabase Auth | `@supabase/supabase-js` (2nd client) | User signup/login (anon key) |
| `content.service` | (local) | `sharp` | Image watermarking, thumbnail generation |
| `content.service` | (local) | `fluent-ffmpeg` | Video thumbnail generation |
| `cryptoPayment.service` | Base Blockchain (JSON-RPC) | `ethers` (keccak256) | Event topic computation |
| `cryptoPayment.service` | BaseScan / Coinbase | `axios` | On-chain transaction verification |
| `email.service` | SMTP Server | `nodemailer` | Email delivery |
| `onramp.service` | Coinbase On-Ramp API | `axios` | Card-to-USDC purchase sessions |
| `payout.service` | Base Blockchain (JSON-RPC) | `ethers` (dynamic import) | Smart contract payout calls |
| `storage.service` | Cloudflare R2 | `@aws-sdk/client-s3` | File upload, download, signed URLs |
| `storage.service` | Cloudflare R2 | `@aws-sdk/s3-request-presigner` | Signed URL generation |

### Stripe

Stripe SDK is imported in-line in multiple files (not via a shared config). The following files create their own `new Stripe()` instance:

| File | How Detected |
|---|---|
| `services/subscription.service.ts` | Likely (no shared config) |
| `services/cryptoPayment.service.ts` | Reference in imports |
| `utils/subscription.utils.ts` | Likely (no shared config) |
| `utils/tier.utils.ts` | Likely (no shared config) |

Confirmed: **No shared Stripe config module exists**. Each file initializes its own Stripe client, leading to 4+ independent instances.

---

## Layer 7: Config & Infrastructure Dependencies

### Config Files

| Config File | Consumed By |
|---|---|
| `config/supabaseClient.ts` | 12 services + 1 controller + models + middleware |
| `config/r2Client.ts` | `storage.service` |
| `config/socket.ts` | `Server.ts` (init), `message.service` (broadcast) |

### Shared Utilities

| Utility | Consumed By |
|---|---|
| `utils/database.ts` (handleQuery, handleCount, etc.) | All 13 models |
| `utils/asyncHandler.ts` | All 16 controllers |
| `utils/response.ts` (ok, created, okMsg, createdMsg) | 15 of 16 controllers |
| `utils/requestHelpers.ts` (requireAuth, requireId, requireBody) | 10 of 16 controllers |
| `utils/entityGuards.ts` | `content.service`, `creator.service`, `user.service`, `support.service`, `message.service` |
| `utils/user.utils.ts` (reshapeUserForApp) | `auth.service`, `creator.service`, `message.service`, `user.service`, `subscription.service`, `admin.service` |
| `utils/content.utils.ts` (generateSignedUrlsForContent) | `content.service`, `message.service`, `notification.service`, `user.service` |
| `utils/fee.utils.ts` | `payout.service` |
| `utils/tier.utils.ts` | `creator.service`, `user.service` |
| `utils/subscription.utils.ts` | `subscription.service` |
| `utils/formatters.ts` | (cross-cutting) |
| `utils/apiError.ts` | (dead? — duplicate of error.middleware AppError) |
| `lib/constants.ts` (DEFAULT_COMMISSION_RATE) | `cryptoPayment.service`, `subscription.service`, `admin.service` |

---

## Layer 8: Frontend → Backend API Dependencies

Frontend API client (`src/lib/apiClient.ts`) maps to backend routes:

| Frontend Function | Backend Endpoint | HTTP Method |
|---|---|---|
| `signup` | `/auth/signup` | POST |
| `login` | `/auth/login` | POST |
| `forgotPassword` | `/auth/forgot-password` | POST |
| `getMe` | `/auth/me` | GET |
| `changePassword` | `/auth/change-password` | PUT |
| `signupAndSubscribe` | `/auth/signup-and-subscribe` | POST |
| `updateMe` | `/users/me` | PUT |
| `uploadAvatar` | `/users/me/avatar` | POST |
| `completeCreatorOnboarding` | `/users/me/onboarding` | POST |
| `submitVerification` | `/users/me/verification` | POST |
| `getFanFeed` | `/users/me/feed` | GET |
| `getFanGallery` | `/users/me/gallery` | GET |
| `getFanSettings` | `/users/me/settings` | GET |
| `updateFanSettings` | `/users/me/settings` | PUT |
| `addContentToGallery` | `/users/me/gallery` | POST |
| `removeContentFromGallery` | `/users/me/gallery/:contentId` | DELETE |
| `getPublicCreatorProfile` | `/users/profile/:username` | GET |
| `getUserById` | `/users/:id` | GET |
| `getCreatorDashboardData` | `/creator/dashboard` | GET |
| `getCreatorAnalyticsData` | `/creator/analytics` | GET |
| `getCreatorEarningsData` | `/creator/earnings` | GET |
| `exportCreatorMetricsCSV` | `/creator/metrics/export?format=csv` | GET |
| `exportCreatorFanEngagementCSV` | `/creator/metrics/export-fans?format=csv` | GET |
| `getCreatorActivity` | `/creator/activity` | GET |
| `getCreatorTiers` | `/creator/tiers` | GET |
| `broadcastMessage` | `/creator/broadcast` | POST |
| `requestCreatorPayout` | `/creator/payouts` | POST |
| `updateCreatorSettings` | `/creator/settings` | PUT |
| `getMyCreatorContent` | `/content/my-content` | GET |
| `createContent` | `/content` | POST |
| `deleteContent` | `/content/:id` | DELETE |
| `updateContent` | `/content/:id` | PUT |
| `getSecureContentUrl` | `/content/:id/secure-url` | GET |
| `getSecureContentViewUrl` | `/content/:id/view` | GET |
| `getContentViewerData` | `/content/:id/viewer-data` | GET |
| `reportContent` | `/content/:id/report` | POST |
| `getFanSubscriptions` | `/subscriptions` | GET |
| `updateFanSubscription` | `/subscriptions/:id` | PUT |
| `getMyConversations` | `/messages/conversations` | GET |
| `getMessagesInConversation` | `/messages/conversations/:id` | GET |
| `markConversationAsRead` | `/messages/conversations/:id/read` | PUT |
| `sendMessage` | `/messages` | POST |
| `deleteMessage` | `/messages/:id` | DELETE |
| `sendVoiceMessage` | `/messages/voice` | POST |
| `getPlatformSettings` | `/admin/settings/platform` | GET |
| `updatePlatformSettings` | `/admin/settings/platform` | PUT |
| `updateUserStatus` | `/admin/users/:id/status` | PUT |
| `updateCreatorCommission` | `/admin/users/:id/commission` | PUT |
| `getVerificationDocs` | `/admin/users/:id/verification-docs` | GET |
| `getPlatformAnalytics` | `/admin/analytics` | GET |
| `getSavedReports` | `/admin/reports` | GET |
| `generateReport` | `/admin/reports` | POST |
| `updateContentStatus` | `/admin/content/:id/status` | PUT |
| `messageUser` | `/admin/users/:id/message` | POST |
| `getNotifications` | `/notifications` | GET |
| `getUnreadNotificationCount` | `/notifications/unread-count` | GET |
| `markNotificationAsRead` | `/notifications/:id/read` | PUT |
| `deleteNotification` | `/notifications/:id` | DELETE |
| `createContest` | `/contests` | POST |
| `getMyContests` | `/contests/creator/my` | GET |
| `publishContest` | `/contests/:id/publish` | PUT |
| `finalizeContest` | `/contests/:id/finalize` | POST |
| `getFanContests` | `/contests/feed` | GET |
| `enterContest` | `/contests/:id/enter` | POST |
| `submitSupportTicket` | `/support/tickets` | POST |
| `replyToSupportTicket` | `/support/tickets/:id/reply` | PUT |
| `generateCaption` | `/ai/caption` | POST |
| `logAnalyticsEvent` | `/analytics/log` | POST |
| `linkWallet` | `/users/me/settings` | PUT |

### Frontend Bypass Sites (raw `fetch()` or path-string calls)

| File | API Call | Problem |
|---|---|---|
| `shared/hooks/useCryptoWallet.ts` | `fetch('/api/v1/payments/crypto/...')` | No auth interceptor, no error handling, no response unwrapping |
| `features/creator/WalletSettings.tsx` | `fetch('/api/v1/...')` | Same as above |
| `features/creator/ReferralCodes.tsx` | `apiClient.get('/referrals/...')` | Raw path strings instead of typed wrappers |
| `features/admin/EnclaveApplications.tsx` | `apiClient.get('/admin/enclave-applications')` | Raw path strings |
| `features/enclave/EnclaveApplicationForm.tsx` | `apiClient.post('/enclave/applications')` | Raw path strings |

---

## Architectural Smells

### Smell 1: Circular Dependency (Message ↔ Support)

```
message.service.ts
    → imports support.service dynamically (require)
support.service.ts
    → imports message.service dynamically (require)
```

**Severity**: High. Dynamic `require()` bypasses TypeScript type checking. Both services share a bidirectional coupling for DM-to-ticket synchronization.

**Fix**: Extract the shared DM-ticket sync logic into a third utility or service that both can import statically.

### Smell 2: Missing Service Layer (2 Controllers)

```
enclave.controller.ts  — 254 lines, no service, raw supabase, 2 direct model imports
referral.controller.ts — 51 lines, no service, direct model import
```

**Severity**: High. Business logic leaks into controllers. `enclave.controller.ts` has 8 raw `supabase.from('enclave_applications')` calls, making it untestable and tightly coupled to the database schema.

### Smell 3: Controller-to-Model Bypasses (4 Instances)

| Controller | Direct Model | Bypasses Service |
|---|---|---|
| `admin.controller.ts` | `UserModel` | Yes — `AdminService` exists |
| `user.controller.ts` | `ContentModel` | Yes — `UserService` exists |
| `notification.controller.ts` | `NotificationModel` | Yes — `NotificationService` exists |
| `enclave.controller.ts` | `SupportTicketModel`, `ReferralModel` | No service exists |

**Severity**: Medium. Inconsistent layering — some operations go through services, others skip them.

### Smell 4: Inline Stripe Initialization (4+ Locations)

Files that create their own `new Stripe()`:
- `services/subscription.service.ts`
- `services/cryptoPayment.service.ts`
- `utils/subscription.utils.ts`
- `utils/tier.utils.ts`

**Severity**: Medium. No shared Stripe config means version/option drift, duplicated secret key reads, and harder maintenance.

### Smell 5: Duplicate `AppError` Class

| File | Details |
|---|---|
| `utils/apiError.ts` | Has `isOperational` property, uses `Error.captureStackTrace` |
| `middleware/error.middleware.ts` | No `isOperational`, no `captureStackTrace` |

**Severity**: Medium. The `utils/apiError.ts` version appears unused (all controllers import from `middleware/error.middleware`). Dead code.

### Smell 6: StorageService — Most-Coupled Service

```
Consumed by: content.service, creator.service, admin.service, user.service, message.service
(5 of 17 services depend on it)
```

**Severity**: Medium. StorageService is a critical path dependency. If R2 is unreachable, 5 feature services degrade simultaneously. No caching or circuit breaker.

### Smell 7: `AdminService` — Highest Model Coupling

```
Imports 7 of 13 models directly (SettingsModel, UserModel, TransactionModel, 
SubscriptionModel, SupportTicketModel, ContentModel, ReportModel)
```

**Severity**: Low (expected for admin). Monitors high-risk surface area — any schema change to any of these 7 tables requires an admin.service update.

### Smell 8: No Shared Utility for 3 Duplicated Patterns

| Pattern | Files Duplicating | Count |
|---|---|---|
| Stripe client init | subscription.service, cryptoPayment.service, subscription.utils, tier.utils | 4 |
| Commission rate calculation | cryptoPayment.service, fee.utils | 2 |
| Event topic computation | cryptoPayment.service (duplicated inline logic) | 1 |

### Smell 9: Dead Controller Export

```
user.controller.ts exports getSecureContentUrl but no route maps to it
```

**Severity**: Low. Unused code adds maintenance burden.

### Smell 10: Frontend API Bypass Sites

```
5 files bypass the typed apiClient wrappers (useCryptoWallet.ts, WalletSettings.tsx,
ReferralCodes.tsx, EnclaveApplications.tsx, EnclaveApplicationForm.tsx)
```

**Severity**: High. Raw `fetch()` calls miss auth interceptors, error handling, and impersonation headers. Raw path strings bypass centralized route management.

---

## Coupling Metrics

### Service Layer Edge Density

- Total possible directed edges among 17 services: 17 × 16 = 272
- Actual inter-service edges: 8
- Edge density: 2.9%
- **Verdict**: Low coupling (good)

### Controller Layer Bypass Rate

- Total controllers: 16
- Controllers with clean delegation: 11 (69%)
- Controllers with direct model bypass: 4 (25%)
- Controllers with no service at all: 2 (12.5%)
- **Verdict**: Moderate layering violation

### Shared Service Hit Rate (StorageService)

- Total services consuming StorageService: 5
- Percentage of services: 29%
- **Verdict**: Moderate fan-out (acceptable for infrastructure service)

### Model Import Heat

- Models imported by 5+ services: `UserModel` (10), `ContentModel` (7), `SubscriptionModel` (7), `TransactionModel` (6)
- **Verdict**: These 4 models are the core data entities — any schema change cascades broadly

---

## Dependency Trees (Per Request Type)

### Subscription Request Lifecycle

```
POST /api/v1/subscriptions
    → protect (auth.middleware)
    → subscription.controller.createSubscription
        → SubscriptionService.createSubscriptionForUser
            → UserModel.findUserById (creator validation)
            → CryptoPaymentService.verifyAndRecordBasePayment
                → TransactionModel.createTransaction
                → supabase.from('transactions')
                → ethers (keccak256 event topic)
                → axios (BaseScan RPC call)
            → SubscriptionModel.createSubscription
                → supabase.from('subscriptions')
            → MessageService (welcome DM)
                → ConversationModel.findOrCreate
                → MessageModel.createMessage
                → io.to(`conversation:${id}`).emit (Socket.IO)
            → ContentModel (free welcome content)
    → ok(res, subscription)
```

### Content Upload Lifecycle

```
POST /api/v1/content
    → protect (auth.middleware)
    → creatorOnly (auth.middleware)
    → uploadContent (multer middleware — memory storage, 1GB limit)
    → content.controller.createContent
        → ContentService.createContent
            → sharp (thumbnail generation)
            → ffmpeg (video thumbnail)
            → StorageService.uploadToPrivate (R2, with retry)
            → ContentModel.createContent
                → supabase.from('content')
            → NotificationService.createNotification (subscriber broadcast)
                → NotificationModel.createNotification
            → StorageService.uploadToPublic (watermarked preview)
    → created(res, content)
```

### Admin Dashboard Lifecycle

```
GET /api/v1/admin/dashboard
    → protect (auth.middleware)
    → adminOnly (auth.middleware)
    → admin.controller.getDashboardStats
        → AdminService.getDashboardStats
            → UserModel.countAllUsers
            → UserModel.countActiveCreators
            → ContentModel (total + recent + flagged counts)
            → TransactionModel (revenue aggregation)
            → SubscriptionModel (active/canceled counts)
            → SupportTicketModel (open counts)
            → ReportModel (pending counts)
    → ok(res, stats)
```

---

## Related Documents

- `docs/architecture/01-repository-inventory.md` — Full file inventory
- `docs/architecture/03-architecture-kb.md` — Architecture knowledge base
- `docs/architecture/07-cross-cutting-concerns.md` — Cross-cutting analysis
- `docs/architecture/07-data-flow.md` — Data flow documentation
- `docs/diagrams/10-service-dependency-matrix.md` — Service dependency Mermaid diagram

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-19 | AI Architect | Complete dependency map with all layers, inter-service edges, model mapping, and architectural smells |
