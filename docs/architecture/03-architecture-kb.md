# Architecture Knowledge Base

**Purpose**: Complete reference for every module in the PoDM creator-fan platform — purpose, responsibilities, interfaces, dependencies, failure modes, security, and operational characteristics. A new senior engineer should understand any module without reading source code.

**Date**: 2026-07-02
**Version**: 1.0.0 (backend) / 0.0.0 (frontend)
**Confidence**: High
**Source Files Examined**: 15 controllers, 15 services, 15 routes, 13+ models, 5 middleware, 13 utils, 3 config, Server.ts, frontend apiClient, hooks, context, App.tsx
**Related Documents**: [01-repository-inventory.md](01-repository-inventory.md), [02-dependency-map.md](02-dependency-map.md)

---

# Layer 1: Route Module

## Route Module Overview

All routes use Express `Router`. Each route file defines URL-to-controller bindings with middleware chains. Routes are mounted in `Server.ts:99-113` at prefix `/api/v1/{resource}`. Three middleware patterns exist:

- `protect` — requires valid JWT, attaches `req.user`
- `protectAndCreator` — tuple `[protect, requireRole('creator')]`
- `protectAndAdmin` — tuple `[protect, requireRole('admin')]`
- `optionalProtect` — attaches `req.user` if valid JWT, but does not reject unauthenticated requests

Route-level middleware (applied to `router.use()`) is used by `admin.routes.ts`, `ai.routes.ts`, and `notification.routes.ts` to protect all sub-routes.

---

### 1.1 Auth Routes Module

**Purpose**: Authentication and session management endpoints.

**Responsibilities**: Signup, login, logout, password management, session retrieval, combined signup-and-subscribe flow.

**Public interfaces**: `auth.routes.ts` — 7 endpoints:
- `POST /signup` — register new user (fan or creator)
- `POST /login` — authenticate and return JWT
- `POST /logout` — clear session
- `GET /me` — get current user from token (requires `protect`)
- `PUT /change-password` — change password (requires `protect`)
- `POST /forgot-password` — initiate password reset
- `POST /signup-and-subscribe` — register + subscribe to a creator in one call

**Dependencies**: `auth.controller` (imports all 7 handlers).

**Dependent modules**: Users, frontend auth flows.

**Inputs**: Request body with email, password, username, role; optional referral code; current password + new password for change; subscription details for signup-and-subscribe.

**Outputs**: JSON responses via `ok`/`created` helpers. Tokens returned on login/signup.

**Database interactions**: None directly (routing layer only).

**External APIs**: None.

**Configuration**: None at route level.

**Failure modes**: Route not found (404 if URL mismatched). Middleware rejection (401 if no token on protected routes).

**Recovery behavior**: Stateless — retry with correct credentials.

**Security considerations**: Password change routes require `protect` middleware (authenticated user). Signup/login are public.

**Performance considerations**: Negligible — routing overhead only.

**Logging**: None at route level.

**Testing strategy**: Route tests via supertest or integration tests hitting mounted routes.

**Known assumptions**: Authentication-required routes will have valid tokens; signup-and-subscribe is a specialized flow used during initial creator discovery.

---

### 1.2 User Routes Module

**Purpose**: User profile management, gallery, feed, settings.

**Responsibilities**: Profile CRUD, avatar upload, onboarding, verification, content feed, gallery management, settings CRUD, payment method management.

**Public interfaces**: `user.routes.ts` — 12 endpoints under `/api/v1/users`:
- `GET /me` — current user profile (`protect`)
- `PUT /me` — update profile (`protect`)
- `POST /me/avatar` — upload avatar (`protect`, `uploadAvatar`)
- `GET /me/gallery` — get fan gallery (`protect`)
- `POST /me/gallery` — add content to gallery (`protect`)
- `DELETE /me/gallery/:contentId` — remove from gallery (`protect`)
- `POST /me/onboarding` — complete creator onboarding (`protectAndCreator`)
- `POST /me/verification` — submit verification docs (`protectAndCreator`, `uploadVerificationDocs`)
- `GET /me/feed` — personalized content feed (`protect`)
- `GET /me/settings` — user settings (`protect`)
- `PUT /me/settings` — update settings (`protect`)
- `PUT /me/payment-method` — update payment method (`protect`)
- `POST /me/setup-payment-method` — create Stripe SetupIntent (`protect`)

**Dependencies**: `user.controller` (imports all handlers), `auth.middleware` (`protect`, `protectAndCreator`), `upload.middleware` (`uploadAvatar`, `uploadVerificationDocs`).

**Dependent modules**: Frontend fan/hub pages.

**Inputs**: JSON bodies, multipart files (avatar), route params (contentId).

**Outputs**: JSON responses with user data, gallery data, feed content, settings.

**Database interactions**: None directly.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: Missing auth (401), missing files (400 on upload), user not found (404).

**Recovery behavior**: Retry with correct data.

**Security considerations**: Onboarding and verification require creator role. Avatar uploads are sanitized by multer middleware.

**Performance considerations**: Feed endpoint may be slow for fans subscribed to many creators (N+1 queries in `user.service.generateFanFeed`).

**Logging**: None.

**Testing strategy**: Integration tests for CRUD flows, file upload tests for avatar/verification.

**Known assumptions**: User exists and is active; all profile updates are validated client-side.

---

### 1.3 Creator Routes Module

**Purpose**: Creator-specific operations (dashboard, analytics, earnings, settings, tiers, broadcast, payouts).

**Responsibilities**: Dashboard aggregation, analytics data, earnings history, settings management, tier CRUD, subscriber broadcast, payout requests, activity log, CSV export.

**Public interfaces**: `creator.routes.ts` — 9 endpoints under `/api/v1/creator` (all `protectAndCreator`):
- `GET /dashboard` — aggregated dashboard data
- `PUT /settings` — update creator settings (`uploadBanner`)
- `GET /analytics` — analytics data
- `GET /metrics/export` — export metrics CSV
- `GET /metrics/export-fans` — export fan engagement CSV
- `GET /earnings` — earnings data
- `POST /payouts` — request payout
- `GET /activity` — recent activity (paginated)
- `GET /tiers` — get subscription tiers
- `POST /broadcast` — message all subscribers

**Dependencies**: `creator.controller`, `auth.middleware` (`protectAndCreator`), `upload.middleware` (`uploadBanner`).

**Dependent modules**: Frontend creator hub pages.

**Inputs**: Route params, query params (pagination), body (settings, broadcast message).

**Outputs**: JSON responses with dashboard stats, analytics, earnings, settings, tiers.

**Database interactions**: None directly.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: Creator role required (403 if fan/admin), missing creator profile (404).

**Recovery behavior**: Ensure user has creator role.

**Security considerations**: All routes require creator role — enforced at middleware level.

**Performance considerations**: Dashboard aggregates multiple data sources — may be slow for creators with many subscribers/posts.

**Logging**: None.

**Testing strategy**: Integration tests for each endpoint.

**Known assumptions**: Only creators access these routes; creator profile exists.

---

### 1.4 Content Routes Module

**Purpose**: Content CRUD, secure URL generation, content viewing, reporting.

**Responsibilities**: Create/update/delete content (with file upload), list content by creator, get content by ID, generate secure temporary URLs, serve content viewer data, handle content reports.

**Public interfaces**: `content.routes.ts` — 9 endpoints under `/api/v1/content`:
- `POST /` — create content (`protectAndCreator`, `uploadContent`)
- `GET /my-content` — get creator's own content (`protectAndCreator`)
- `GET /creator/:username` — public content by creator (`optionalProtect`)
- `GET /:id` — get single content by ID (`protect`)
- `GET /:id/secure-url` — get secure temporary URL (`protect`)
- `GET /:id/view` — get full-size content URL (`protect`)
- `GET /:id/viewer-data` — all viewer page data (`protect`)
- `PUT /:id` — update content (`protectAndCreator`)
- `DELETE /:id` — delete content (`protectAndCreator`)
- `POST /:id/report` — report content (`protect`)

**Dependencies**: `content.controller`, `auth.middleware`, `upload.middleware` (`uploadContent`).

**Dependent modules**: Frontend content viewer, creator content manager, public profile.

**Inputs**: JSON bodies, multipart files (images/video/audio), route params (id, username).

**Outputs**: JSON with content data, signed URLs, viewer data.

**Database interactions**: None directly.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: Missing auth (401), missing files (400), content not found (404), unauthorized access (403).

**Recovery behavior**: Verify permissions and retry.

**Security considerations**: Content access is gated by subscription/PPV status. Secure URLs are time-limited. File uploads are validated by multer.

**Performance considerations**: File uploads are large (1100mb body limit in Server.ts). Signed URL generation requires R2 API call.

**Logging**: None.

**Testing strategy**: Upload integration tests, access control tests.

**Known assumptions**: Content ownership is tied to creator role; secure URLs expire.

---

### 1.5 Subscription Routes Module

**Purpose**: Fan subscription management.

**Responsibilities**: Create subscription, update tier, cancel, list fan subscriptions.

**Public interfaces**: `subscription.routes.ts` — 4 endpoints under `/api/v1/subscriptions` (all `protect`):
- `GET /` — get fan's subscriptions
- `POST /` — create new subscription
- `PUT /:id` — update subscription (change tier)
- `DELETE /:id` — cancel subscription

**Dependencies**: `subscription.controller`, `auth.middleware` (`protect`).

**Dependent modules**: Frontend fan subscriptions page.

**Inputs**: JSON body (tierId, creatorId), route params (id).

**Outputs**: JSON with subscription data.

**Database interactions**: None directly.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: Missing auth (401), tier not found (404), subscription conflict (409).

**Recovery behavior**: Retry with valid tier/creator.

**Security considerations**: Only the subscription owner can modify their subscription.

**Performance considerations**: Subscription creation triggers Stripe API call — potential latency.

**Logging**: None.

**Testing strategy**: Integration test (`ppv_subscription.test.ts`).

**Known assumptions**: Stripe integration is required for subscription creation.

---

### 1.6 Message Routes Module

**Purpose**: Direct messaging between users.

**Responsibilities**: Send, delete, list conversations, view messages in conversation, mark as read, send voice messages, mass message subscribers.

**Public interfaces**: `message.routes.ts` — 7 endpoints under `/api/v1/messages`:
- `GET /conversations` — list user's conversations (`protect`)
- `GET /conversations/:conversationId` — get messages in conversation (`protect`)
- `POST /` — send message (`protect`)
- `PUT /conversations/:conversationId/read` — mark as read (`protect`)
- `DELETE /:id` — delete message (`protect`)
- `POST /voice` — send voice message (`protectAndCreator`, `uploadVoiceMessage`)
- `POST /mass-message` — message all subscribers (`protectAndCreator`)

**Dependencies**: `message.controller`, `auth.middleware`, `upload.middleware` (`uploadVoiceMessage`).

**Dependent modules**: Frontend fan/creator message UI.

**Inputs**: JSON bodies, multipart files (voice), route params.

**Outputs**: JSON with messages, conversations.

**Database interactions**: None directly.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: Conversation not found (404), not participant (403), message too large (413).

**Recovery behavior**: Verify conversation participation and retry.

**Security considerations**: Users can only access their own conversations. Voice messages have file upload limits.

**Performance considerations**: Mass message iterates subscriber list synchronously.

**Logging**: None.

**Testing strategy**: Integration tests for send/receive flows.

**Known assumptions**: Conversations are between exactly two users.

---

### 1.7 Crypto Payment Routes Module

**Purpose**: Crypto wallet configuration and payment verification.

**Responsibilities**: Get wallet config, update wallet config, verify on-chain transaction, request fiat withdrawal.

**Public interfaces**: `cryptoPayment.routes.ts` — 4 endpoints under `/api/v1/payments/crypto` (all `protect`):
- `GET /wallet` — get wallet/payout configuration
- `POST /wallet` — update wallet configuration
- `POST /verify` — verify a submitted Base transaction hash
- `POST /withdraw` — request fiat off-ramp withdrawal

**Dependencies**: `cryptoPayment.controller`, `auth.middleware` (`protect`).

**Dependent modules**: Frontend wallet settings, payment flows.

**Inputs**: JSON bodies (wallet address, transaction hash, withdrawal amount).

**Outputs**: JSON with wallet config, verification result, withdrawal status.

**Database interactions**: None directly.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: Wallet not configured (400), transaction not found (404), withdrawal limit exceeded (400).

**Recovery behavior**: Retry with correct wallet/transaction data.

**Security considerations**: Wallet address is sensitive; no private keys stored server-side.

**Performance considerations**: Transaction verification calls external blockchain APIs.

**Logging**: None.

**Testing strategy**: Minimal — crypto flow partially implemented.

**Known assumptions**: Users have external wallet (MetaMask, etc.) on frontend; smart contract is deployed.

---

### 1.8 Admin Routes Module

**Purpose**: Platform administration.

**Responsibilities**: Dashboard stats, user management, content moderation, analytics, reports, support tickets, platform settings, creator commissions, verification docs, user messaging.

**Public interfaces**: `admin.routes.ts` — 14 endpoints under `/api/v1/admin` (all `protectAndAdmin` at router level):
- `GET /dashboard` — key metrics
- `GET /users` — list users
- `PUT /users/:id/status` — update user status (suspend/ban/activate)
- `PUT /users/:id/commission` — set creator commission rate
- `GET /users/:id/verification-docs` — get verification document URLs
- `POST /users/:id/message` — send email to user
- `GET /content/flagged` — flagged content
- `PUT /content/:id/status` — approve/remove content
- `GET /analytics` — platform analytics
- `POST /reports` — generate report
- `GET /reports` — saved reports
- `GET /support-tickets` — list tickets
- `PUT /support-tickets/:id` — update ticket
- `GET /settings/admins` — list admin users
- `GET /settings/platform` — get platform settings
- `PUT /settings/platform` — update platform settings

**Dependencies**: `admin.controller`, `auth.middleware` (`protectAndAdmin`).

**Dependent modules**: Frontend admin panel.

**Inputs**: JSON bodies, route params, query params.

**Outputs**: JSON with admin data.

**Database interactions**: None directly.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: Admin role required (403 on all routes), entity not found (404).

**Recovery behavior**: Verify admin role.

**Security considerations**: All routes enforce admin role. User messaging bypasses normal chat — admins can send emails to any user.

**Performance considerations**: Report generation may be CPU-intensive for large datasets.

**Logging**: None.

**Testing strategy**: Admin E2E test (`admin.spec.ts`).

**Known assumptions**: Only admin users access these routes.

---

### 1.9 Analytics Routes Module

**Purpose**: Event logging for analytics.

**Responsibilities**: Log profile visits, post views, gallery adds.

**Public interfaces**: `analytics.routes.ts` — 1 endpoint under `/api/v1/analytics`:
- `POST /log` — log analytics event (`optionalProtect`)

**Dependencies**: `analytics.controller`, `auth.middleware` (`optionalProtect`).

**Dependent modules**: Frontend (triggered from profile visits, content views).

**Inputs**: JSON body (eventType, creatorId, contentId).

**Outputs**: JSON success/error.

**Database interactions**: None directly.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: Invalid event type (400), missing creatorId (400).

**Recovery behavior**: Correct event data and retry.

**Security considerations**: Guest users can log events (public routes).

**Performance considerations**: Lightweight insert — minimal overhead.

**Logging**: None.

**Testing strategy**: Integration test for event logging.

**Known assumptions**: Event types are fixed (`profile_visit`, `post_view`, `gallery_add`).

---

### 1.10 AI Routes Module

**Purpose**: AI-powered content caption generation.

**Responsibilities**: Generate image/video captions via AI.

**Public interfaces**: `ai.routes.ts` — 1 endpoint under `/api/v1/ai`:
- `POST /caption` — generate caption from image (`protect`, `uploadAICaptionImage`)

Router-level `protect` applied to all routes.

**Dependencies**: `ai.controller`, `auth.middleware` (`protect`), `upload.middleware` (`uploadAICaptionImage`).

**Dependent modules**: Frontend content upload page.

**Inputs**: Multipart file (image/video).

**Outputs**: JSON with generated caption string.

**Database interactions**: None.

**External APIs**: None (routing layer only; API call happens in service).

**Configuration**: None.

**Failure modes**: No file provided (400), file too large (413).

**Recovery behavior**: Provide valid image file.

**Security considerations**: Authenticated users only. File types restricted by multer.

**Performance considerations**: AI API call may take 1-5 seconds — non-blocking async handler.

**Logging**: None.

**Testing strategy**: Unit test for caption generation (mocked AI).

**Known assumptions**: AI service is available; API key is configured.

---

### 1.11 Notification Routes Module

**Purpose**: User notification management.

**Responsibilities**: List notifications, unread count, mark as read (single + all), delete.

**Public interfaces**: `notification.routes.ts` — 5 endpoints under `/api/v1/notifications` (all `protect` via router-level): 
- `GET /` — get user's notifications
- `GET /unread-count` — unread notification count
- `PUT /:id/read` — mark single notification as read
- `PUT /read-all` — mark all as read
- `DELETE /:id` — delete notification

**Dependencies**: `notification.controller`, `auth.middleware` (`protect`).

**Dependent modules**: Frontend notification UI (bell icon, dropdown).

**Inputs**: Route params (id).

**Outputs**: JSON with notification data, counts.

**Database interactions**: None directly.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: Notification not found (404), not owner (403).

**Recovery behavior**: Verify notification ownership.

**Security considerations**: Users can only read/modify their own notifications.

**Performance considerations**: Lightweight queries.

**Logging**: None.

**Testing strategy**: Integration test.

**Known assumptions**: Notifications are user-scoped; admin broadcast notifications go to all.

---

### 1.12 Contest Routes Module

**Purpose**: Content contest management.

**Responsibilities**: Create, publish, finalize contests; enter contests; list contests for fans and creators.

**Public interfaces**: `contest.routes.ts` — 7 endpoints under `/api/v1/contests`:
- `GET /feed` — active contests for fans (`protect`)
- `GET /:id` — contest details (`protect`)
- `POST /:id/enter` — enter contest (`protect`)
- `POST /` — create contest (`protectAndCreator`)
- `GET /creator/my` — creator's contests (`protectAndCreator`)
- `PUT /:id/publish` — publish draft contest (`protectAndCreator`)
- `POST /:id/finalize` — pick winner and finalize (`protectAndCreator`)

**Dependencies**: `contest.controller`, `auth.middleware`.

**Dependent modules**: Frontend contest pages.

**Inputs**: JSON bodies, route params.

**Outputs**: JSON with contest data, entries.

**Database interactions**: None directly.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: Contest not found (404), not active (400), already entered (409), not creator (403).

**Recovery behavior**: Verify contest state and permissions.

**Security considerations**: Creator actions require creator role. Fan actions require subscription to the creator (enforced in service).

**Performance considerations**: Lightweight CRUD.

**Logging**: None.

**Testing strategy**: Integration test.

**Known assumptions**: Contests have entry requirements (subscription tier) validated in service.

---

### 1.13 Enclave Routes Module

**Purpose**: Enclave membership application system.

**Responsibilities**: Submit applications, check spots remaining, admin review.

**Public interfaces**: `enclave.routes.ts` — 4 endpoints under `/api/v1/enclave`:
- `GET /spots-remaining` — public spots check
- `POST /applications` — submit application (public)
- `GET /applications` — list all applications (`protectAndAdmin`)
- `PATCH /applications/:id` — update application status (`protectAndAdmin`)

**Dependencies**: `enclave.controller`, `auth.middleware` (`protectAndAdmin` for admin routes).

**Dependent modules**: Frontend enclave page.

**Inputs**: JSON body (application data), route params.

**Outputs**: JSON with application data, spots remaining.

**Database interactions**: None directly.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: Enclave full (400), application duplicate (409).

**Recovery behavior**: Retry when spots open.

**Security considerations**: Public submission endpoints have no auth. Admin review requires admin role.

**Performance considerations**: Lightweight.

**Logging**: None.

**Testing strategy**: Minimal.

**Known assumptions**: Enclave is a premium membership tier with limited spots.

---

### 1.14 Referral Routes Module

**Purpose**: Referral code system.

**Responsibilities**: Generate codes, get codes, get stats, validate codes, check milestone bonuses.

**Public interfaces**: `referral.routes.ts` — 6 endpoints under `/api/v1/referrals`:
- `GET /my-codes` — user's referral codes (`protect`)
- `POST /generate` — generate new code (`protect`)
- `GET /stats` — referral statistics (`protect`)
- `POST /check-milestone/:userId` — check milestone bonus (no auth)
- `GET /validate/:code` — validate code exists (no auth)

**Dependencies**: `referral.controller`, `auth.middleware` (`protect` on 3 routes).

**Dependent modules**: Frontend referral UI.

**Inputs**: Route params, optional body.

**Outputs**: JSON with referral data.

**Database interactions**: None directly.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: Code invalid (404), generation limit reached (400).

**Recovery behavior**: Use valid code.

**Security considerations**: **Anomaly**: `/check-milestone/:userId` and `/validate/:code` have no auth middleware — internal service endpoints exposed without protection.

**Performance considerations**: Lightweight.

**Logging**: None.

**Testing strategy**: Minimal.

**Known assumptions**: Referral system is internal; milestone checking is called by payment/earnings system.

---

### 1.15 Support Routes Module

**Purpose**: Support ticket system.

**Responsibilities**: Create tickets, admin reply, view ticket, resolve.

**Public interfaces**: `support.routes.ts` — 4 endpoints under `/api/v1/support`:
- `POST /tickets` — create ticket (`protect`)
- `PUT /tickets/:id/reply` — admin reply (`protectAndAdmin`)
- `GET /tickets/:id` — get ticket details (`protectAndAdmin`)
- `PUT /tickets/:id/resolve` — resolve ticket (`protectAndAdmin`)

**Dependencies**: `support.controller`, `auth.middleware`.

**Dependent modules**: Frontend support UI.

**Inputs**: JSON body (subject, description, reply text), route params.

**Outputs**: JSON with ticket data.

**Database interactions**: None directly.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: Ticket not found (404).

**Recovery behavior**: Verify ticket ID.

**Security considerations**: Users create their own tickets. Admin sees all tickets. Admin reply also sends a DM to the user via `message.service`.

**Performance considerations**: Admin reply triggers DM creation — adds latency.

**Logging**: None.

**Testing strategy**: Integration test.

**Known assumptions**: Tickets have conversation history stored as JSONB array.

---

# Layer 2: Controller Layer

## Controller Pattern Overview

All 15 controllers follow a consistent pattern:
- Each exported function is wrapped with `asyncHandler` from `utils/asyncHandler.ts` — eliminates try/catch blocks
- Response format uses helpers from `utils/response.ts`: `ok(res, data)`, `created(res, data)`, `okMsg(res, msg, data?)`, `createdMsg(res, msg, data?)`
- Request validation via `express-validator` middleware (applied before controller)
- Entity guard functions from `utils/entityGuards.ts` (`requireUser`, `requireContent`) used in service layer
- Request helpers from `utils/requestHelpers.ts` (`requireId`, `requireBody`) extract validated params

Every controller function has the signature: `(req: AuthRequest | Request, res: Response, next: NextFunction) => Promise<void>` where `AuthRequest` extends `Request` with `req.user`.

---

### 2.1 Auth Controller

**File**: `server/controllers/auth.controller.ts`

**Purpose**: Authentication request handling — signup, login, logout, password management, session.

**Public interfaces**:
- `signup` — register new user; validates email/password/username/role; calls `auth.service.signupUser`; returns created user with token
- `signupAndSubscribe` — combined flow; validates + calls `auth.service.signupAndSubscribe`; returns user + subscription
- `login` — authenticate; calls `auth.service.loginUser`; returns token + user
- `logout` — clear session; calls `auth.service.logoutUser`; returns success
- `getMe` — get current user from token; calls `auth.service.loginUser` with stored token; returns user data
- `changePassword` — change authenticated user's password; calls `auth.service.changeUserPassword`
- `forgotPassword` — initiate password reset; calls `auth.service.requestPasswordReset`

**Dependencies**: `auth.service`, `response.ts` helpers, `asyncHandler.ts`, `requestHelpers.ts`.

**Dependent modules**: Auth routes, frontend login/signup pages.

**Inputs**: `req.body` containing email, password, username, role (signup); email + password (login); currentPassword + newPassword (change).

**Outputs**: JSON with user data + token on success; error responses.

**Database interactions**: None directly — delegated to `auth.service`.

**External APIs**: None directly.

**Configuration**: None.

**Failure modes**: Duplicate email (409), invalid credentials (401), missing fields (400).

**Recovery behavior**: Retry with corrected input.

**Security considerations**: Passwords never logged. No password data in response. Tokens handled server-side via Supabase Auth.

**Performance considerations**: Lightweight — Supabase Auth calls may add ~100-300ms.

**Logging**: None explicit per controller.

**Testing strategy**: `auth.controller.test.ts` (unit), `auth.integration.test.ts`.

**Known assumptions**: Supabase Auth manages password hashing and token generation.

---

### 2.2 User Controller

**File**: `server/controllers/user.controller.ts`

**Purpose**: User profile, gallery, settings, feed request handling.

**Public interfaces**:
- `getMe` — get current user profile; calls `user.service.getPublicUserProfile` with user ID
- `updateMe` — update profile; calls `user.service.updateUserProfile`
- `addToGallery` — add content to gallery; calls `user.service.addToUserGallery`
- `removeFromGallery` — remove content; calls `user.service.removeFromUserGallery`
- `updateMyAvatar` — upload avatar; calls `user.service.uploadUserAvatar`
- `completeOnboarding` — creator onboarding; calls `user.service.onboardCreator`
- `submitVerification` — verification docs; calls `user.service.submitVerificationDocs`
- `getFullPublicProfile` — public creator profile; calls `user.service.getFullPublicProfile`
- `getMyFeed` — fan feed; calls `user.service.generateFanFeed`
- `getMyGallery` — fan gallery; calls `user.service.getFanGallery`
- `getMySettings` — settings; calls `user.service.getFanSettings`
- `updateMySettings` — update settings; calls `user.service.updateFanSettings`
- `updateMyPaymentMethod` — payment method; calls `user.service.updateFanPaymentMethod`
- `createSetupIntent` — Stripe SetupIntent; calls `user.service.createSetupIntent`
- `getSecureContentUrl` — **exported but unused in routes** (dead code)

**Architectural Anomaly**: Also imports `ContentModel` directly (bypasses service layer) — used in `getSecureContentUrl`.

**Dependencies**: `user.service`, `ContentModel` (direct bypass), `response.ts`, `asyncHandler.ts`, `auth.middleware`.

**Dependent modules**: User routes, frontend fan/hub pages.

**Inputs**: `req.body` (profile data, settings), `req.files` (avatar, verification docs), `req.params` (contentId, username).

**Outputs**: JSON with user data.

**Database interactions**: Direct `ContentModel` calls in `getSecureContentUrl` (dead code — not routed).

**External APIs**: None directly.

**Configuration**: None.

**Failure modes**: User not found (404), missing file (400), validation error (400).

**Recovery behavior**: Retry with valid data.

**Security considerations**: Onboarding and verification require creator role (enforced by middleware).

**Performance considerations**: Feed generation may be expensive (joins across subscriptions + content).

**Logging**: None.

**Testing strategy**: Integration tests.

**Known assumptions**: User is authenticated on protected routes; avatar uploaded as multipart.

---

### 2.3 Creator Controller

**File**: `server/controllers/creator.controller.ts`

**Purpose**: Creator dashboard, analytics, earnings, settings, tiers, broadcast, payouts, activity, exports.

**Public interfaces**:
- `getCreatorDashboard` — aggregated dashboard data
- `updateCreatorSettings` — update settings + banner image
- `getCreatorAnalytics` — analytics with time range
- `getCreatorEarnings` — earnings with pagination
- `requestPayout` — payout request
- `getCreatorActivity` — paginated activity log
- `getTiers` — subscription tiers
- `broadcastMessage` — message all subscribers
- `exportMetrics` — CSV metrics export
- `exportFanEngagement` — CSV fan engagement export

**Dependencies**: `creator.service`, `response.ts`, `asyncHandler.ts`.

**Dependent modules**: Creator routes, frontend creator hub.

**Inputs**: `req.user`, `req.query` (pagination, time range), `req.body` (settings, broadcast message), `req.file` (banner).

**Outputs**: JSON with dashboard, analytics, earnings, settings data.

**Database interactions**: None directly.

**External APIs**: None directly.

**Configuration**: None.

**Failure modes**: Creator not found (404), invalid data (400).

**Recovery behavior**: Retry with valid data.

**Security considerations**: All routes gated by `protectAndCreator`.

**Performance considerations**: Dashboard aggregates data from 5+ sources — most expensive single endpoint.

**Logging**: None.

**Testing strategy**: Integration tests.

**Known assumptions**: Creator has completed onboarding.

---

### 2.4 Content Controller

**File**: `server/controllers/content.controller.ts`

**Purpose**: Content creation, retrieval, secure access, reporting.

**Public interfaces**:
- `createContent` — create with file processing (sharp/ffmpeg), watermarking, R2 upload
- `getContentById` — get single content with access check
- `updateContent` — update metadata
- `deleteContent` — delete from DB + R2
- `getContentByCreator` — list by creator username
- `getMyContent` — list own content (creator)
- `getSecureContentUrl` — time-limited signed URL for thumbnail
- `getContentView` — signed URL for full content view (access-gated)
- `getContentViewerData` — all viewer page data
- `reportContent` — submit report

**Dependencies**: `content.service`, `response.ts`, `asyncHandler.ts`.

**Dependent modules**: Content routes, frontend content viewer, creator content manager.

**Inputs**: `req.body` (content metadata), `req.files` (media files), `req.params` (id, username), `req.query`.

**Outputs**: JSON with content data, signed URLs, viewer data.

**Database interactions**: None directly.

**External APIs**: None directly.

**Configuration**: None.

**Failure modes**: Content not found (404), unauthorized access (403), file processing error (500).

**Recovery behavior**: Verify access permissions.

**Security considerations**: Content access gated by subscription/PPV status. Secure URLs time-limited.

**Performance considerations**: File processing (sharp/ffmpeg) is CPU-intensive and synchronous.

**Logging**: None.

**Testing strategy**: Integration tests for CRUD + access control.

**Known assumptions**: Uploaded files are images, video, or audio. File processing succeeds synchronously.

---

### 2.5 Subscription Controller

**File**: `server/controllers/subscription.controller.ts`

**Purpose**: Subscription lifecycle management.

**Public interfaces**:
- `createSubscription` — create new subscription
- `updateSubscription` — change tier
- `cancelSubscription` — cancel subscription
- `getMySubscriptions` — list fan's subscriptions

**Dependencies**: `subscription.service`, `response.ts`, `asyncHandler.ts`.

**Dependent modules**: Subscription routes, frontend fan subscriptions.

**Inputs**: `req.user`, `req.body` (tierId, creatorId), `req.params` (subscription id).

**Outputs**: JSON with subscription data.

**Database interactions**: None directly.

**External APIs**: None directly.

**Configuration**: None.

**Failure modes**: Creator not found (404), tier invalid (400), already subscribed (409).

**Recovery behavior**: Retry with valid tier.

**Security considerations**: Only subscription owner can modify.

**Performance considerations**: Subscription creation triggers Stripe API call + crypto payment verification + message sending.

**Logging**: None.

**Testing strategy**: `ppv_subscription.test.ts`.

**Known assumptions**: Stripe integration is active; creator has Stripe account.

---

### 2.6 Message Controller

**File**: `server/controllers/message.controller.ts`

**Purpose**: Direct messaging operations.

**Public interfaces**:
- `getConversations` — list user's conversations
- `getMessagesInConversation` — paginated messages
- `sendMessage` — send text message
- `deleteMessage` — delete owned message
- `markConversationAsRead` — mark all as read
- `sendMassMessage` — creator broadcast to subscribers
- `sendVoiceMessage` — send voice recording

**Dependencies**: `message.service`, `response.ts`, `asyncHandler.ts`.

**Dependent modules**: Message routes, frontend message UI.

**Inputs**: `req.user`, `req.body` (receiverId, text, contentId), `req.params` (conversationId, messageId), `req.file` (voice).

**Outputs**: JSON with messages, conversations.

**Database interactions**: None directly.

**External APIs**: None directly.

**Configuration**: None.

**Failure modes**: Conversation not found (404), not participant (403).

**Recovery behavior**: Verify conversation access.

**Security considerations**: Can only access own conversations. Mass message restricted to creators.

**Performance considerations**: Mass message sends individual messages synchronously to each subscriber.

**Logging**: None.

**Testing strategy**: Integration tests.

**Known assumptions**: Socket.IO emits real-time updates.

---

### 2.7 Crypto Payment Controller

**File**: `server/controllers/cryptoPayment.controller.ts`

**Purpose**: Crypto wallet and payment handling.

**Public interfaces**:
- `getWalletConfig` — get wallet settings
- `updateWalletConfig` — update wallet address/preferences
- `verifyCryptoPayment` — verify Base transaction hash
- `requestWithdrawal` — request fiat off-ramp

**Dependencies**: `cryptoPayment.service`, `response.ts`, `asyncHandler.ts`.

**Dependent modules**: Crypto payment routes, frontend wallet UI.

**Inputs**: `req.user`, `req.body` (walletAddress, network, transactionHash, amount).

**Outputs**: JSON with wallet config, verification result.

**Database interactions**: None directly.

**External APIs**: None directly.

**Configuration**: None.

**Failure modes**: Invalid transaction hash (400), network error (502).

**Recovery behavior**: Retry with correct transaction data.

**Security considerations**: No private keys stored server-side. Transaction verification uses public blockchain APIs.

**Performance considerations**: Blockchain API calls may take 2-10 seconds.

**Logging**: None.

**Testing strategy**: Minimal.

**Known assumptions**: Blockchain API (BaseScan) is accessible; smart contract is deployed.

---

### 2.8 Admin Controller

**File**: `server/controllers/admin.controller.ts`

**Purpose**: All administrative operations.

**Public interfaces**:
- `getDashboardStats` — platform metrics
- `getAllUsers` — user list
- `updateUserStatus` — suspend/ban/activate
- `getFlaggedContent` — moderation queue
- `updateContentStatus` — approve/remove
- `getPlatformAnalytics` — analytics data
- `generateReport` — custom report
- `getSavedReports` — report list
- `getSupportTickets` — ticket list
- `updateSupportTicket` — update ticket
- `getAdminUsers` — admin list
- `getSettings` — platform settings
- `updateSettings` — update settings
- `setCreatorCommission` — override commission
- `getCreatorVerificationDocs` — get verification URLs
- `messageUser` — send email to user

**Dependencies**: `admin.service`, `response.ts`, `asyncHandler.ts`.

**Dependent modules**: Admin routes, frontend admin panel.

**Inputs**: `req.user`, `req.body`, `req.params`, `req.query`.

**Outputs**: JSON with admin data.

**Database interactions**: None directly.

**External APIs**: None directly.

**Configuration**: None.

**Failure modes**: User not found (404), invalid status (400).

**Recovery behavior**: Verify entity existence.

**Security considerations**: All routes require admin role. Impersonation available via `X-Impersonating-User-Id` header.

**Performance considerations**: Dashboard aggregates platform-wide data — slow for large datasets.

**Logging**: None.

**Testing strategy**: Admin E2E test.

**Known assumptions**: Admin user exists with valid session.

---

### 2.9 Analytics Controller

**File**: `server/controllers/analytics.controller.ts`

**Purpose**: Analytics event logging endpoint.

**Public interfaces**:
- `logEvent` — log profile visit, post view, or gallery add

**Dependencies**: `analytics.service`, `response.ts`, `asyncHandler.ts`.

**Dependent modules**: Analytics routes.

**Inputs**: `req.body` (eventType, creatorId, contentId), `req.user` (optional — guest users).

**Outputs**: JSON success.

**Database interactions**: None directly.

**External APIs**: None directly.

**Configuration**: None.

**Failure modes**: Invalid event type (400).

**Recovery behavior**: Correct event data.

**Security considerations**: Guest users can log events.

**Performance considerations**: Lightweight insert + optional RPC call.

**Logging**: None.

**Testing strategy**: Minimal.

**Known assumptions**: Event types are `profile_visit`, `post_view`, `gallery_add`.

---

### 2.10 AI Controller

**File**: `server/controllers/ai.controller.ts`

**Purpose**: AI caption generation request handling.

**Public interfaces**:
- `generateCaption` — accepts uploaded image, calls AI service, returns caption

**Dependencies**: `ai.service`, `response.ts`, `asyncHandler.ts`.

**Dependent modules**: AI routes.

**Inputs**: `req.file` (image/video uploaded via `uploadAICaptionImage`).

**Outputs**: JSON with caption string.

**Database interactions**: None.

**External APIs**: None directly.

**Configuration**: None.

**Failure modes**: No file (400), AI service error (502), timeout (504).

**Recovery behavior**: Retry AI call.

**Security considerations**: Authenticated users only. File validated by multer.

**Performance considerations**: AI API call adds 1-5 seconds latency. Non-blocking.

**Logging**: None.

**Testing strategy**: Unit test with mock AI.

**Known assumptions**: AI API key is configured; model supports image/video input.

---

### 2.11 Notification Controller

**File**: `server/controllers/notification.controller.ts`

**Purpose**: Notification retrieval and management.

**Public interfaces**:
- `getNotifications` — list user's notifications
- `getUnreadCount` — unread count
- `markAsRead` — mark one notification read
- `markAllAsRead` — mark all notifications read
- `deleteNotification` — delete notification

**Architectural Anomaly**: Imports `NotificationModel` directly — `markAsRead`, `markAllAsRead`, `deleteNotification` bypass `notification.service` and call model directly.

**Dependencies**: `notification.service` (for getNotifications, getUnreadCount), `NotificationModel` (direct bypass for mark/delete), `response.ts`, `asyncHandler.ts`.

**Dependent modules**: Notification routes, frontend notification UI.

**Inputs**: `req.user`, `req.params` (notification id).

**Outputs**: JSON with notifications, counts.

**Database interactions**: Direct `NotificationModel` calls for mark/delete operations.

**External APIs**: None directly.

**Configuration**: None.

**Failure modes**: Notification not found (404), not owner (403).

**Recovery behavior**: Verify notification ownership.

**Security considerations**: Scoped to authenticated user's notifications.

**Performance considerations**: Lightweight.

**Logging**: None.

**Testing strategy**: Minimal.

**Known assumptions**: Notifications belong to single user.

---

### 2.12 Contest Controller

**File**: `server/controllers/contest.controller.ts`

**Purpose**: Contest lifecycle request handling.

**Public interfaces**:
- `create` — create contest (creator)
- `publish` — publish draft (creator)
- `getMyContests` — creator's contests
- `getFeed` — active contests for fans
- `getDetails` — contest details + hasEntered status
- `enter` — enter contest (fan)
- `finalize` — pick winner (creator)

**Dependencies**: `contest.service`, `response.ts`, `asyncHandler.ts`.

**Dependent modules**: Contest routes, frontend contest pages.

**Inputs**: `req.user`, `req.body` (contest data), `req.params` (contest id).

**Outputs**: JSON with contest data.

**Database interactions**: None directly.

**External APIs**: None directly.

**Configuration**: None.

**Failure modes**: Contest not found (404), not active (400), already entered (409).

**Recovery behavior**: Verify contest state.

**Security considerations**: Creator actions require creator role. Fan entry requires subscription.

**Performance considerations**: Lightweight.

**Logging**: None.

**Testing strategy**: Minimal.

**Known assumptions**: Contests have entry requirements checked in service.

---

### 2.13 Enclave Controller

**File**: `server/controllers/enclave.controller.ts`

**Purpose**: Enclave membership application management.

**Architectural Anomaly**: No dedicated service layer. Executes raw Supabase queries directly and imports `EmailService`, `SupportTicketModel`, `ReferralModel` from `../enclave/` directory (special enclave-specific models).

**Public interfaces**:
- `getSpotsRemaining` — check available spots
- `submitApplication` — create application + create support ticket + assign referral
- `getAllApplications` — admin list
- `updateApplicationStatus` — admin approve/reject

**Dependencies**: `EmailService`, `SupportTicketModel`, `ReferralModel`, `supabase` client directly, `response.ts`, `asyncHandler.ts`.

**Dependent modules**: Enclave routes, frontend enclave page.

**Inputs**: `req.body` (application data), `req.user`, `req.params`.

**Outputs**: JSON with application data.

**Database interactions**: Raw `supabase.from('enclave_applications')`, `supabase.from('platform_settings')`, `SupportTicketModel`, `ReferralModel`.

**External APIs**: Email service directly.

**Configuration**: None.

**Failure modes**: Enclave full (400), already applied (409).

**Recovery behavior**: Retry when spots available.

**Security considerations**: Public submission endpoints. Admin review gated.

**Performance considerations**: Multi-step submission (create ticket + assign referral).

**Logging**: None.

**Testing strategy**: Minimal.

**Known assumptions**: Enclave is invitation-only with limited spots.

---

### 2.14 Referral Controller

**File**: `server/controllers/referral.controller.ts`

**Purpose**: Referral code generation and management.

**Architectural Anomaly**: No dedicated service layer. Imports `ReferralModel` directly.

**Public interfaces**:
- `getMyReferralCodes` — list user's codes
- `generateReferralCodes` — generate new codes
- `getReferralStats` — referral statistics
- `checkMilestoneBonus` — internal milestone check (no auth)
- `validateReferralCode` — validate code (no auth)

**Dependencies**: `ReferralModel`, `response.ts`, `asyncHandler.ts`.

**Dependent modules**: Referral routes, referral UI.

**Inputs**: `req.user`, `req.params` (code, userId).

**Outputs**: JSON with referral data.

**Database interactions**: `ReferralModel` calls (referral_codes, referral_redemptions tables).

**External APIs**: None.

**Configuration**: None.

**Failure modes**: Code not found (404), generation limit (400).

**Recovery behavior**: Use valid code.

**Security considerations**: **Anomaly**: Two routes lack auth middleware. Milestone checking should be internal-only.

**Performance considerations**: Lightweight.

**Logging**: None.

**Testing strategy**: Minimal.

**Known assumptions**: Referral system has codes per user; milestone logic is simple.

---

### 2.15 Support Controller

**File**: `server/controllers/support.controller.ts`

**Purpose**: Support ticket system request handling.

**Public interfaces**:
- `createSupportTicket` — user creates ticket
- `replyToTicket` — admin adds reply
- `getTicketById` — admin views ticket (sets Pending status)
- `resolveTicket` — admin marks resolved

**Dependencies**: `support.service`, `response.ts`, `asyncHandler.ts`.

**Dependent modules**: Support routes, frontend support UI.

**Inputs**: `req.user`, `req.body` (subject, description, text), `req.params` (ticketId).

**Outputs**: JSON with ticket data.

**Database interactions**: None directly.

**External APIs**: None directly.

**Configuration**: None.

**Failure modes**: Ticket not found (404), unauthorized (403).

**Recovery behavior**: Verify ticket access.

**Security considerations**: Users see own tickets; admin sees all. Admin reply triggers DM.

**Performance considerations**: Admin reply adds DM creation latency.

**Logging**: None.

**Testing strategy**: Minimal.

**Known assumptions**: Tickets have conversation history as JSONB.

---

# Layer 3: Service Layer

## Service Pattern Overview

All 15 services are functional modules (not classes) exporting async functions. Each service:
- Accepts domain objects (user IDs, content data, etc.)
- Calls model functions for database access
- May call other services for cross-cutting operations
- May call external APIs (Stripe, R2, OpenAI, blockchain)
- Throws `AppError` for business rule violations
- Returns domain objects directly (no response formatting)

Inter-service dependencies are explicit static imports, except `support.service` which uses dynamic `require()`.

---

### 3.1 Auth Service

**File**: `server/services/auth.service.ts`

**Purpose**: Authentication business logic — registration, login, password management, combined signup-and-subscribe.

**Public interfaces**:
- `signupUser(email, password, username, role, referralCode?)` — registers via Supabase Auth, creates profile record, handles referral code
- `signupAndSubscribe(data)` — creates user + creates subscription to specified creator in one transaction
- `loginUser(email, password)` — authenticates via Supabase Auth, returns user + token
- `logoutUser()` — clears Supabase Auth session
- `changeUserPassword(userId, currentPassword, newPassword)` — verifies current, updates via Supabase Auth
- `requestPasswordReset(email)` — sends password reset email via Supabase Auth

**Dependencies**: `UserModel`, `subscription.service` (for `signupAndSubscribe`), `email.service` (for password reset), `supabase` client (for Auth admin API), `user.utils` (`reshapeUserForApp`), `AppError`.

**Dependent modules**: Auth controller.

**Inputs**: Email, password, username, role, optional referral code. For signupAndSubscribe: all user data + creatorId + tierId.

**Outputs**: User object with token, or subscription data for combined flow.

**Database interactions**: `UserModel.findUserByUsername`, `UserModel.updateProfile`, `UserModel.findUserById`. Raw Supabase Auth API for user management.

**External APIs**: Supabase Auth API (admin).

**Configuration**: None (uses Supabase client from config).

**Failure modes**: Duplicate email (AppError 409), invalid credentials (401), user not found (404), Supabase Auth error (500).

**Recovery behavior**: Retry with valid credentials. Referral code error is non-fatal (logs and continues).

**Security considerations**: Passwords never stored or logged. Token handled by Supabase. Referral code validation is best-effort.

**Performance considerations**: Supabase Auth calls ~100-300ms. Combined signup-and-subscribe is sequential.

**Logging**: Console.error for referral code errors.

**Testing strategy**: `auth.controller.test.ts`, `auth.integration.test.ts`.

**Known assumptions**: Supabase Auth is source of truth for passwords. Referral system is optional (errors are swallowed).

---

### 3.2 User Service

**File**: `server/services/user.service.ts`

**Purpose**: User profile, gallery, feed, settings, onboarding, verification business logic.

**Public interfaces** (14 exported functions):
- `getPublicUserProfile(username)` — returns user by username (active only)
- `updateUserProfile(userId, updates)` — separates email (Supabase Auth) from profile (profiles table), reshapes result
- `addToUserGallery(fan_id, contentId)` — adds to gallery JSONB, increments gallery_add_count RPC
- `removeFromUserGallery(fan_id, contentId)` — removes from gallery JSONB
- `uploadUserAvatar(userId, file)` — uploads to R2 public bucket via StorageService, updates profile
- `onboardCreator(userId, onboardingData)` — saves profile + tiers synced with Stripe
- `submitVerificationDocs(userId, files, signature)` — uploads ID + selfie to R2 private bucket, updates profile with verification_data
- `getFullPublicProfile(username, viewerId?)` — creator public profile with content preview + subscription status
- `generateFanFeed(fan_id, page)` — fetches subscriptions → content by creator IDs → enriches with unlock status
- `getFanGallery(fan_id)` — groups gallery content by creator, enriches with signed URLs
- `getFanSettings(fan_id)` — profile + preferences + payment method from profiles table
- `updateFanSettings(fan_id, updates)` — saves profile/preferences, returns full settings
- `updateFanPaymentMethod(fan_id, paymentMethodId)` — saves crypto_wallet_address to profiles
- `createSetupIntent(fanId)` — returns mock Stripe client secret (hardcoded Web3 response)

**Dependencies**: `UserModel`, `GalleryModel`, `ContentModel`, `SubscriptionModel`, `StorageService`, `tier.utils` (`syncTiersWithStripe`), `user.utils` (`reshapeUserForApp`), `content.utils` (`generateSignedUrlsForContent`, `enrichContentWithUnlockStatus`, `reshapePostForFeed`), `AppError`, `requireUser` guard, `supabase` (raw queries for getFanSettings, updateFanPaymentMethod).

**Dependent modules**: User controller.

**Inputs**: User IDs, file buffers, profile data, subscription data, pagination params.

**Outputs**: User profiles, gallery collections, content feeds, settings objects.

**Database interactions**: `UserModel.findUserByUsername`, `UserModel.updateProfile`, `UserModel.findUserById`, `GalleryModel.addItemToGallery`/`removeItemFromGallery`/`findGalleryByFanId`, `ContentModel.findPublicContentByCreator`, `ContentModel.findContentByCreatorIds`, `ContentModel.findContentByIds`, `SubscriptionModel.findActiveSubscriptionsByFan`. Raw `supabase.from('profiles')` for settings/payment.

**External APIs**: R2 via StorageService (avatar upload, verification docs). Stripe via `syncTiersWithStripe`.

**Configuration**: None.

**Failure modes**: User not found (404), missing file (400), R2 upload failure (500), Stripe sync failure (500).

**Recovery behavior**: Retry with valid data. RPC failure for gallery count is non-fatal.

**Security considerations**: Verification docs stored in private R2 bucket. Avatar in public bucket. User status checked for active.

**Performance considerations**: `getFullPublicProfile` fetches subscriptions + content + enrichment — 3+ DB queries. `generateFanFeed` uses Promise.all for parallel content enrichment.

**Logging**: Console.error for RPC errors (non-fatal).

**Testing strategy**: Integration tests for profile CRUD, gallery, feed.

**Known assumptions**: Profile is separate from Supabase Auth users. Email updates go through Supabase Auth admin API. `createSetupIntent` is mocked for Web3-only mode.

---

### 3.3 Creator Service

**File**: `server/services/creator.service.ts`

**Purpose**: Creator dashboard, analytics, earnings, settings, tiers, broadcast, payouts, activity, CSV export.

**Public interfaces** (10 exported functions):
- `getDashboardData(creator_id)` — aggregates subscriber count, content count, views, earnings, recent activity, total PPV revenue
- `getAnalyticsData(creator_id)` — metrics over time ranges, exports to monthly_analytics_summary
- `updateSettings(creator_id, settingsData, file?)` — updates creator_data JSONB, uploads banner to R2
- `getEarningsData(creator_id)` — paginated transactions + tips + PPV, computes fees via fee.utils
- `createPayout(creatorId, amountInCents)` — creates payout via Stripe Connect, records transaction
- `getCreatorActivity(creatorId, page, limit)` — paginated log of content creation, subscriptions, messages
- `broadcastMessage(creatorId, text, minTierId?)` — sends individual messages to all active subscribers (filtered by tier)
- `getCreatorTiers(creatorId)` — returns subscription tiers from profile
- `exportMetricsCSV(creator_id)` — generates CSV string of analytics data
- `exportFanEngagementCSV(creator_id)` — generates CSV string of fan engagement data

**Dependencies**: `UserModel`, `ContentModel`, `SubscriptionModel`, `TierModel`, `TransactionModel`, `analytics.service` (`logAnalyticsEvent`, `countEventsForCreator`), `cryptoPayment.service` (`getUserWalletConfig`, `updateUserWalletConfig`), `StorageService`, `fee.utils`, `AppError`, `requireUser` guard.

**Dependent modules**: Creator controller.

**Inputs**: Creator ID, settings objects, file buffers, pagination params, payout amounts, message text.

**Outputs**: Dashboard aggregates, analytics data, earnings records, settings, activity feed, CSV strings.

**Database interactions**: `UserModel.findUserById`/`updateProfile`, `ContentModel.getContentByCreatorWithCount`/`findContentByCreatorIds`, `SubscriptionModel.getCreatorSubscriberCount`/`findActiveSubscriptionsByCreator`, `TransactionModel.findByCreator`/`createTransaction`. Raw `supabase.rpc` for analytics.

**External APIs**: R2 via StorageService (banner upload), Stripe (payout) via `createPayout`, crypto payment service.

**Configuration**: None.

**Failure modes**: Creator not found (404), payout fails (400), analytics empty (200 with empty data).

**Recovery behavior**: Retry payout with valid Stripe account. Empty data returns gracefully.

**Security considerations**: Only creator can access own data. Payouts require Stripe Connect account.

**Performance considerations**: Dashboard is most expensive query — aggregates 5+ sources. CSV exports build entire dataset in memory.

**Logging**: Console.error for analytics queries.

**Testing strategy**: Integration tests.

**Known assumptions**: Creator has completed onboarding. Stripe Connect account exists for payouts. CSV data fits in memory.

---

### 3.4 Content Service

**File**: `server/services/content.service.ts`

**Purpose**: Content CRUD, file processing, watermarking, storage, access control.

**Public interfaces** (11 exported functions):
- `createNewContent(creator_id, contentData, files)` — validates, processes files (sharp/ffmpeg), uploads to R2 private, creates DB record, notifies subscribers
- `getContentByCreatorId(creator_id, query)` — paginated content with filters (type, status)
- `getContentByCreatorName(creatorName)` — content by username
- `getContentForPublicProfile(username, viewerId?)` — public content preview with unlock status
- `getContentForFan(contentId, fanId)` — single content with access check (subscription/PPV), logs analytics
- `updateCreatorContent(contentId, creator_id, updates)` — update metadata
- `deleteCreatorContent(contentId, creator_id)` — delete DB record + R2 files
- `getSecureUrlForThumbnail(contentId, userId)` — time-limited signed URL (checks access)
- `getSecureUrlForViewing(contentId, userId)` — signed URL for full content (stricter access)
- `getViewData(contentId, viewerId?)` — all viewer page data (content, creator, access status)
- `reportContent(userId, contentId, reason)` — creates report record

**Dependencies**: `ContentModel`, `SubscriptionModel`, `TierModel`, `TransactionModel`, `ReportModel`, `notification.service` (`notifySubscribersOfNewContent`), `StorageService`, `entityGuards` (`requireContent`, `requireContentOwnership`), `content.utils`, `AppError`.

**Dependent modules**: Content controller.

**Inputs**: Content metadata, file buffers (Multer), creator/viewer IDs, pagination/filter params.

**Outputs**: Content records, signed URLs, viewer data, report confirmation.

**Database interactions**: `ContentModel.createContent`/`findContentById`/`updateContent`/`deleteContent`/`findContentByCreatorId`/`findPublicContentByCreator`/`findContentByCreatorIds`, `SubscriptionModel.findActiveSubscriptionsByFan`, `TierModel...`, `TransactionModel.findByContentAndFan`, `ReportModel.createReport`.

**External APIs**: R2 via StorageService (file upload/delete/signed URLs).

**Configuration**: None.

**Failure modes**: Content not found (404), unauthorized (403), file processing error (500), R2 upload failure (500), watermarking error (500).

**Recovery behavior**: On R2 upload failure, created content record is orphaned (no cleanup rollback). File processing errors thrown immediately.

**Security considerations**: Content access gated by subscription/PPV. Thumbnail vs full-view have different permission levels. Signed URLs time-limited.

**Performance considerations**: File processing (resize, watermark) is CPU-intensive synchronous operation. Large uploads (1100mb limit) can cause memory pressure. Subscriber notification uses Promise.all.

**Logging**: Console.error for analytics event logging.

**Testing strategy**: Integration tests for CRUD, access control, file upload.

**Known assumptions**: Files are images (sharp) or video (ffmpeg). Watermarking is always applied. R2 upload always succeeds if no error returned.

---

### 3.5 Subscription Service

**File**: `server/services/subscription.service.ts`

**Purpose**: Subscription lifecycle, Stripe integration.

**Public interfaces** (5 exported functions):
- `createSubscriptionForUser(fan_id, creator_id, tier_id, paymentMethodId?)` — creates Stripe subscription product/price if needed, creates DB record, optionally verifies crypto payment
- `getFanSubscriptions(fan_id)` — list fan's subscriptions with creator data
- `getCreatorSubscribers(creator_id)` — list subscribers with fan data
- `cancelFanSubscription(subscriptionId, fan_id)` — updates status to cancelled, sends DM notification
- `changeSubscriptionTier(subscriptionId, fan_id, newTierId)` — changes Stripe price + updates DB

**Dependencies**: `SubscriptionModel`, `UserModel`, `message.service` (`sendDirectMessage` for cancellation notification), `cryptoPayment.service` (`verifyAndRecordBasePayment` for initial payment), Stripe SDK (initialized inline), `AppError`, `requireUser` guard.

**Dependent modules**: Subscription controller.

**Inputs**: Fan ID, creator ID, tier ID, payment method ID, subscription ID.

**Outputs**: Subscription records with user data.

**Database interactions**: `SubscriptionModel.createSubscription`/`findSubscriptionsByFan`/`findSubscriptionsByCreator`/`updateSubscription`/`findSubscriptionById`, `UserModel.findUserById`.

**External APIs**: Stripe (products, prices, subscriptions, payment intents).

**Configuration**: Stripe initialized inline with `process.env.STRIPE_SECRET_KEY` and `apiVersion: '2025-03-31'`.

**Failure modes**: Stripe error (500), creator not found (404), tier not found (404), duplicate subscription (409).

**Recovery behavior**: Retry Stripe operations. Subscription cancellation always succeeds (DM failure non-fatal).

**Security considerations**: Payment method IDs handled by Stripe (no raw card data). DM sent for cancellation acknowledgement.

**Performance considerations**: Stripe API calls add 200-500ms. Cancellation sends DM synchronously.

**Logging**: None.

**Testing strategy**: `ppv_subscription.test.ts`.

**Known assumptions**: Creator has Stripe product/price configured. Payment method is valid Stripe token.

---

### 3.6 Message Service

**File**: `server/services/message.service.ts`

**Purpose**: Direct messaging, conversation management, voice messages, mass broadcast.

**Public interfaces** (7 exported functions):
- `getConversationsForUser(userId)` — list conversations with last message, unread count, participant data
- `getMessagesForConversation(conversation_id, userId)` — paginated messages with content previews, verifies participation
- `sendDirectMessage(sender_id, receiver_id, messageData)` — finds/creates conversation, inserts message, emits Socket.IO event, optionally attaches content unlock
- `deleteMessage(messageId, userId)` — soft-delete (marks deleted_at), verifies ownership
- `markConversationAsRead(conversation_id, userId)` — sets last_read_at for participant
- `sendMassMessageToSubscribers(creatorId, messageData)` — iterates active subscribers, creates/gets conversations, sends individual messages
- `sendVoiceMessage(sender_id, receiver_id, voiceFile)` — uploads to R2, sends message with voice URL

**Dependencies**: `ConversationModel`, `MessageModel`, `ContentModel`, `UserModel`, `SubscriptionModel`, `StorageService`, Socket.IO instance (emits to rooms), `content.utils`, `AppError`.

**Dependent modules**: Message controller.

**Inputs**: User IDs, message text/objects, file buffers (voice), conversation IDs.

**Outputs**: Conversations, messages, Socket.IO events.

**Database interactions**: `ConversationModel.findConversationsByUser`/`findConversationById`/`findConversationByParticipants`/`createConversation`, `MessageModel.createMessage`/`findMessagesByConversation`/`updateMessage`, `ContentModel.findContentById`, `UserModel.findUserById`, `SubscriptionModel.findActiveSubscriptionsByCreator`.

**External APIs**: R2 via StorageService (voice message upload).

**Configuration**: None (uses socket config).

**Failure modes**: User not found (404), conversation not participant (403), message not found (404), not owner (403).

**Recovery behavior**: Verify participation/ownership.

**Security considerations**: Users can only access own conversations. Mass message restricted to creators. Voice messages stored in R2.

**Performance considerations**: Mass broadcast iterates all subscribers synchronously — O(n) where n = subscriber count. Socket.IO emits for each message.

**Logging**: None.

**Testing strategy**: Integration tests.

**Known assumptions**: Conversations are pairwise. Socket.IO is initialized and available.

---

### 3.7 Crypto Payment Service

**File**: `server/services/cryptoPayment.service.ts`

**Purpose**: Crypto wallet management, on-chain payment verification, fiat off-ramp.

**Public interfaces** (4 exported functions):
- `getUserWalletConfig(userId)` — returns wallet address + preferred network from profiles table
- `updateUserWalletConfig(userId, input)` — saves wallet address + preferences to profiles table
- `verifyAndRecordBasePayment(input)` — verifies transaction hash via BaseScan API, checks amount/confirmations, creates transaction record
- `processDebitCardOffRamp(creatorId, amountInCents, debitCardToken?)` — initiates fiat withdrawal via Stripe + debit card API

**Dependencies**: `TransactionModel`, `supabase` (raw queries for profiles), `axios` (BaseScan API, Coinbase API, debit card API), Stripe SDK (inline init), `AppError`.

**Dependent modules**: Crypto payment controller, subscription service, creator service.

**Inputs**: User IDs, wallet configuration, transaction hash, payment amount, debit card token.

**Outputs**: Wallet config, verification results, transaction records.

**Database interactions**: Raw `supabase.from('profiles').select/update` for wallet config. `TransactionModel.createTransaction`.

**External APIs**: BaseScan API (transaction verification), Coinbase API (gas estimation), Debit card API (fiat off-ramp), Stripe (payouts), Ethereum RPC (smart contract).

**Configuration**: Inline Stripe init. External API URLs from env variables.

**Failure modes**: Invalid transaction hash (400), insufficient confirmations (400), BaseScan API down (502), Stripe error (500), debit card API error (502).

**Recovery behavior**: Transaction verification is idempotent (checks confirmations). Payment creation is one-shot. Retry with correct hash.

**Security considerations**: No private keys stored. Transaction verification uses public blockchain data. Wallet addresses stored in profiles (sensitive PII).

**Performance considerations**: Blockchain API calls 2-10 seconds. Multiple external API calls per verification.

**Logging**: Console.error on API errors.

**Testing strategy**: Minimal — crypto integration partially implemented.

**Known assumptions**: Blockchain API is accessible; smart contract is deployed; users have external wallets.

---

### 3.8 Notification Service

**File**: `server/services/notification.service.ts`

**Purpose**: Notification creation and enrichment.

**Public interfaces** (2 exported functions):
- `notifySubscribersOfNewContent(creatorId, contentId)` — finds active subscribers, filters by notification preferences, batch-creates notifications
- `getEnrichedNotifications(userId, limit)` — fetches notifications, enriches with creator profile + content thumbnail (signed URLs)

**Dependencies**: `NotificationModel`, `SubscriptionModel`, `UserModel`, `ContentModel`, `content.utils` (`generateSignedUrlsForContent`), `supabase` (raw query for preferences).

**Dependent modules**: Content service (calls `notifySubscribersOfNewContent`), Notification controller.

**Inputs**: Creator ID, content ID, user ID, pagination limit.

**Outputs**: Notification records, enriched notification objects.

**Database interactions**: `NotificationModel.createNotification`, `NotificationModel.getNotificationsForUser`, `SubscriptionModel.findSubscriptionsByCreator`, `UserModel.findUserById`, `ContentModel.findContentById`. Raw `supabase.from('profiles').select('preferences')`.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: None significant — returns gracefully if no subscribers.

**Recovery behavior**: Empty subscriber list returns silently. Individual notification failures caught by Promise.all (no rollback).

**Security considerations**: Notifications scoped by user_id. Content thumbnails require signed URLs.

**Performance considerations**: Subscriber notification iterates all subscribers with individual DB reads for preferences. Uses Promise.all for batch creation.

**Logging**: None.

**Testing strategy**: Minimal — covered by notification.test utilities.

**Known assumptions**: Notifications table exists. Preferences column is JSONB.

---

### 3.9 Admin Service

**File**: `server/services/admin.service.ts`

**Purpose**: All administrative business logic — user management, content moderation, analytics, reports, support, settings, commissions, verification.

**Public interfaces** (15 exported functions):
- `getDashboardStats()` — counts: total users/creators/content/transactions, revenue
- `getAllUsers()` — list all users (no filter)
- `updateUserStatus(userId, status)` — update user status in profiles
- `getFlaggedContent()` — content with status=flagged
- `updateContentStatus(contentId, status)` — approve/remove
- `getPlatformAnalytics(startDate, endDate)` — users, revenue, engagement over time
- `generateReport(reportParams)` — builds custom report with filters
- `getSavedReports()` — saved report configurations
- `getSupportTickets()` — all support tickets
- `updateSupportTicket(ticketId, updates)` — status + conversation
- `getAdminUsers()` — users with admin role
- `getPlatformSettings()` — platform settings key-value
- `updatePlatformSettings(settings)` — commission rate
- `updateCreatorCommission(creatorId, commissionRate)` — override per-creator
- `getVerificationDocs(userId)` — signed URLs for verification files
- `messageUser(userId, subject, text)` — sends email via email.service

**Dependencies**: `UserModel`, `ContentModel`, `SubscriptionModel`, `TransactionModel`, `ReportModel`, `SupportTicketModel`, `VerificationModel`, `StorageService`, `email.service`, `AppError`.

**Dependent modules**: Admin controller.

**Inputs**: User IDs, status values, date ranges, report configs, ticket updates, settings, commission rates.

**Outputs**: Dashboard stats, user lists, content lists, analytics data, reports, tickets, settings.

**Database interactions**: `UserModel.findUserById`/`updateProfile`/`findAllUsers`, `ContentModel.getFlaggedContent`/`updateContentStatus`/`findContentById`, `SubscriptionModel.getCreatorSubscriberCount`, `TransactionModel.findByCreator`/`getTotalRevenue`, `ReportModel...`, `SupportTicketModel...`, `VerificationModel...`.

**External APIs**: R2 via StorageService (verification doc signed URLs), email via email.service.

**Configuration**: None.

**Failure modes**: User/content/ticket not found (404), invalid status (400).

**Recovery behavior**: Verify entity existence.

**Security considerations**: All functions gated by admin middleware before reaching service. Verification docs stored in private R2 bucket.

**Performance considerations**: Dashboard aggregates entire platform — most expensive query. Report generation can be slow.

**Logging**: None.

**Testing strategy**: Admin E2E test.

**Known assumptions**: Admin role is correctly enforced by middleware.

---

### 3.10 Analytics Service

**File**: `server/services/analytics.service.ts`

**Purpose**: Event logging and counting for analytics.

**Public interfaces** (2 exported functions):
- `logAnalyticsEvent(event)` — inserts event into analytics_events, skips admin/self-views, optionally increments content view count via RPC
- `countEventsForCreator(creatorId, eventType, startDate?, endDate?)` — count of specific event type for a creator

**Dependencies**: `UserModel`, `supabase` (raw queries for insert + RPC), `AppError`.

**Dependent modules**: Analytics controller, creator service.

**Inputs**: Event objects (eventType, creatorId, viewerId, contentId), date ranges.

**Outputs**: Event log confirmation, numeric counts.

**Database interactions**: Raw `supabase.from('analytics_events').insert()`, `supabase.from('analytics_events').select(..., count)`, `supabase.rpc('increment_content_view_count')`.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: Database error (500) — event logging is critical path in some flows.

**Recovery behavior**: View count increment failure is non-fatal (logged, not thrown).

**Security considerations**: Admin/self views excluded from analytics to prevent inflation.

**Performance considerations**: Lightweight insert. RPC call for view count increment is optional.

**Logging**: Console.error for DB errors.

**Testing strategy**: Minimal.

**Known assumptions**: Event types match the `AnalyticsEvent` interface. RPC function `increment_content_view_count` exists.

---

### 3.11 AI Service

**File**: `server/services/ai.service.ts`

**Purpose**: AI-powered caption generation for images/videos.

**Public interfaces** (1 exported function):
- `generateCaption(imageUrl)` — sends image/video URL to AI model, returns generated caption string

**Dependencies**: OpenAI SDK, `AppError`, `dotenv`.

**Dependent modules**: AI controller.

**Inputs**: Image/video URL (string).

**Outputs**: Caption string (max ~100 tokens, ~20 words).

**Database interactions**: None.

**External APIs**: OpenAI API (or OpenRouter if `sk-or-v1` prefix detected). Configurable model via `AI_MODEL_ID` env, default `google/gemma-3-27b-it:free`.

**Configuration**: `AI_API_KEY` (OpenAI or OpenRouter), `AI_MODEL_ID`.

**Failure modes**: Missing API key (returns mock caption with warning), API error (throws AppError with status code), timeout (AppError 504).

**Recovery behavior**: Missing API key returns mock caption gracefully. API errors propagate status code for client-side handling (e.g., 429 rate limit).

**Security considerations**: API key loaded from env. Image URLs may contain user content — sent to third-party AI API.

**Performance considerations**: AI API call takes 1-5 seconds. Response is non-blocking.

**Logging**: Console.log for model name, Console.warn for missing API key, Console.error for API errors.

**Testing strategy**: Mocked unit test.

**Known assumptions**: AI model supports image/video input. OpenRouter-compatible when using `sk-or-v1` key prefix.

---

### 3.12 Email Service

**File**: `server/services/email.service.ts`

**Purpose**: Email sending via SMTP.

**Public interfaces** (1 exported function):
- `sendEmail(to, subject, text, html?)` — sends email via Nodemailer transporter

**Dependencies**: Nodemailer, SMTP configuration from env, `AppError`.

**Dependent modules**: Admin service, enclave controller.

**Inputs**: Recipient email, subject, plain text body, optional HTML body.

**Outputs**: Nodemailer send result.

**Database interactions**: None.

**External APIs**: SMTP server (configurable via env).

**Configuration**: SMTP host, port, user, password from environment variables.

**Failure modes**: SMTP configuration error (500), recipient rejected (500), connection timeout (504).

**Recovery behavior**: Retry with correct SMTP config. Errors thrown immediately.

**Security considerations**: SMTP credentials stored in env. Email content may contain user data.

**Performance considerations**: SMTP connection + send takes 100-500ms. No queuing — sends synchronously.

**Logging**: None.

**Testing strategy**: Minimal — typically mocked.

**Known assumptions**: SMTP server is configured and accessible. Emails are transactional (not marketing).

---

### 3.13 Storage Service

**File**: `server/services/storage.service.ts`

**Purpose**: Cloudflare R2 file operations — upload, download, delete, signed URLs.

**Public interfaces** (7 exported functions):
- `uploadToPrivate(filePath, buffer, contentType)` — uploads to R2 private bucket
- `uploadToPublic(filePath, buffer, contentType)` — uploads to R2 public bucket
- `getPrivateSignedUrl(filePath, expiresIn?)` — generates time-limited signed URL for private object
- `downloadFromPrivate(filePath)` — downloads object from private bucket
- `deleteFromPrivate(filePath)` — deletes object from private bucket
- `getPublicUrl(path)` — constructs public URL for public bucket object
- `existsInPrivate(path)` — checks if object exists in private bucket

**Dependencies**: R2 S3 client from `config/r2Client.ts`, `AppError`.

**Dependent modules**: Content service, creator service, admin service, user service, message service, content.utils.

**Inputs**: File paths, buffers, content types, expiration durations.

**Outputs**: Upload results, signed URLs, download buffers, existence booleans.

**Database interactions**: None.

**External APIs**: Cloudflare R2 (S3-compatible API).

**Configuration**: R2 credentials from `config/r2Client.ts` (bucket names, region, access key, secret).

**Failure modes**: R2 service unavailable (502), invalid credentials (500), file not found (404 on download), bucket misconfigured (500).

**Recovery behavior**: Retry for transient failures. File not found returns null for existence check, throws for required operations.

**Security considerations**: Private bucket requires signed URLs for access. Public bucket is world-readable (used for avatars, banners).

**Performance considerations**: S3 API calls ~50-200ms. Signed URL generation is fast (local computation).

**Logging**: None explicit.

**Testing strategy**: Mocked unit tests in dependent modules.

**Known assumptions**: R2 is S3-compatible. Bucket names are configured. Private bucket requires presigned URLs.

---

### 3.14 Contest Service

**File**: `server/services/contest.service.ts`

**Purpose**: Contest lifecycle management.

**Public interfaces** (7 exported functions):
- `createContest(creatorId, data)` — validates required fields + dates, delegates to model
- `publishContest(contestId, creatorId)` — sets status to active, verifies ownership
- `getCreatorContests(creatorId)` — list creator's contests
- `enterContest(contestId, fanId)` — checks contest state (active, not ended), checks subscription requirement, creates entry
- `pickWinner(contestId, creatorId)` — finalizes and picks winner (no random selection logic visible — delegates to model)
- `getFanContests()` — active contests for fan feed
- `getContestDetails(contestId, userId?)` — contest + hasEntered status

**Dependencies**: `ContestModel`, `SubscriptionModel`, `AppError`.

**Dependent modules**: Contest controller.

**Inputs**: Creator/fan IDs, contest data, contest ID.

**Outputs**: Contest records, entry confirmations, winner selection.

**Database interactions**: `ContestModel.createContest`/`getContestById`/`updateContest`/`getContestsByCreator`/`createEntry`/`pickWinner`/`getActiveContestsForFan`/`hasUserEntered`, `SubscriptionModel.findActiveSubscriptionsByFan`.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: Contest not found (404), not owner (403), invalid dates (400), contest ended (400), not subscribed (403), already entered (409).

**Recovery behavior**: Verify contest state and permissions.

**Security considerations**: Ownership verified before publish/finalize. Subscription checked before entry.

**Performance considerations**: Lightweight CRUD.

**Logging**: None.

**Testing strategy**: Minimal.

**Known assumptions**: Entry requirements are subscription-based (no additional criteria).

---

### 3.15 Support Service

**File**: `server/services/support.service.ts`

**Purpose**: Support ticket handling — creation, admin reply, status management.

**Public interfaces** (5 exported functions):
- `createSupportTicket(userId, subject, description)` — validates user, creates ticket with initial conversation message
- `addReplyToTicket(ticketId, adminUser, text)` — appends reply to conversation, updates status to Pending, sends DM to user via message.service
- `appendUserMessageToActiveTicket(userId, text, senderName)` — finds user's open/pending ticket, appends message, optionally resets status to Open
- `getTicketDetails(ticketId)` — fetches ticket, auto-sets status from Open to Pending (admin viewed)
- `resolveTicket(ticketId)` — sets status to Resolved

**Architectural Anomaly**: Uses dynamic `require('./message.service')` instead of static import at line 71 — works around module resolution issues in production build.

**Dependencies**: `SupportTicketModel`, `UserModel`, `message.service` (via dynamic require), `entityGuards` (`requireUser`), `AppError`.

**Dependent modules**: Support controller.

**Inputs**: User/admin IDs, ticket subject/description, reply text, sender name.

**Outputs**: Ticket records with conversation array.

**Database interactions**: `SupportTicketModel.create`/`findById`/`findByUser`/`update`.

**External APIs**: None directly (DM sent via message.service).

**Configuration**: None.

**Failure modes**: Ticket not found (404), user not found (404), DM send failure handled gracefully (logged, not thrown).

**Recovery behavior**: DM failure is non-fatal — ticket update succeeds regardless. Graceful fallback for missing active ticket (returns null).

**Security considerations**: Users see own tickets only (enforced at controller level by user ID check). Admin sees all tickets.

**Performance considerations**: Admin reply adds synchronous DM creation. Lightweight otherwise.

**Logging**: Console.error for DM failures.

**Testing strategy**: Minimal.

**Known assumptions**: Tickets store conversation as JSONB array of `TicketMessage` objects. `require()` workaround is for build compatibility.

---

# Layer 4: Model Layer

## Model Pattern Overview

All models are functional modules exporting named async functions. Each function:
- Uses supabase client from `config/supabaseClient.ts`
- Wraps queries with `database.ts` helpers: `handleQuery<T>`, `handleCount`, `handleList<T>`, `createRecord`, `updateRecord`, `deleteRecord`, `findRecordById`, `countRecords`
- Returns typed data or throws AppError
- Functions follow naming: `find*`, `get*`, `create*`, `update*`, `delete*`

---

### 4.1 User Model

**File**: `server/models/user.model.ts`

**Purpose**: Database access for profiles table.

**Public interfaces**:
- `findUserById(id)` — single user by ID
- `findUserByUsername(username)` — single user by username
- `findAllUsers()` — all users (unfiltered)
- `updateProfile(id, updates)` — update profile columns + JSONB fields
- Additional CRUD wrappers via database.ts helpers

**Dependencies**: `supabaseClient`, `database.ts` helpers.

**Dependent modules**: 9 services (auth, user, creator, content, admin, notification, message, analytics, subscription), auth middleware, entityGuards.

**Inputs**: User IDs, usernames, partial profile objects.

**Outputs**: User records or null.

**Database interactions**: `supabase.from('profiles')` — select, insert, update with JSONB support.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: Database error (logged, returns null). User not found (returns null — caller throws AppError).

**Recovery behavior**: Retry on DB error.

**Security considerations**: Returns full profile including sensitive fields (crypto_wallet_address, verification_data, preferences).

**Performance considerations**: Individual lookups by ID/username are fast (indexed). `findAllUsers` could be slow for large datasets.

**Logging**: None.

**Testing strategy**: Mocked in service tests.

**Known assumptions**: Profiles table has id (UUID FK to auth.users), username (unique), role, status, profile JSONB, creator_data JSONB, verification_data JSONB, preferences JSONB, crypto_wallet_address.

---

### 4.2 Content Model

**File**: `server/models/content.model.ts`

**Purpose**: Database access for content table.

**Public interfaces**:
- `createContent(data)` — insert
- `findContentById(id)` — single lookup
- `updateContent(id, updates)` — update
- `deleteContent(id)` — delete
- `findContentByCreatorId(creatorId, options)` — paginated + filtered
- `findPublicContentByCreator(creatorId, limit)` — public preview
- `findContentByCreatorIds(ids, options)` — feed query
- `findContentByIds(ids)` — bulk lookup (gallery)
- `getFlaggedContent()` — moderation queue
- `updateContentStatus(id, status)` — approve/remove
- `getContentByCreatorWithCount(creatorId, ...)` — paginated with total

**Dependencies**: `supabaseClient`, `database.ts` helpers.

**Dependent modules**: 6 services (user, creator, content, admin, notification, message).

**Inputs**: Content data objects, creator IDs, pagination options, content IDs.

**Outputs**: Content records or arrays.

**Database interactions**: `supabase.from('content')` — select with joins to profiles for creator data.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: Content not found (returns null). Database error (returns null or empty array).

**Recovery behavior**: Retry.

**Security considerations**: Returns all content fields including `files` metadata array (contains R2 paths).

**Performance considerations**: Bulk lookups by IDs use IN clause. Paginated queries use LIMIT/OFFSET.

**Logging**: None.

**Testing strategy**: Mocked in service tests.

**Known assumptions**: Content table has id (bigint), creator_id (UUID FK), title, type, status, visibility, files JSONB, view_count, gallery_add_count, created_at, updated_at.

---

### 4.3 Subscription Model

**File**: `server/models/subscription.model.ts`

**Purpose**: Database access for subscriptions table.

**Public interfaces**:
- `createSubscription(data)` — insert
- `findSubscriptionById(id)` — single lookup
- `updateSubscription(id, updates)` — update status/tier
- `findSubscriptionsByFan(fanId)` — fan's subscriptions (not filtering by active)
- `findSubscriptionsByCreator(creatorId)` — all subscriptions for a creator
- `findActiveSubscriptionsByFan(fanId)` — status=active
- `findActiveSubscriptionsByCreator(creatorId)` — active subscribers
- `getCreatorSubscriberCount(creatorId)` — count of active

**Dependencies**: `supabaseClient`, `database.ts` helpers.

**Dependent modules**: 6 services (user, creator, content, admin, subscription, notification, message, contest).

**Inputs**: Subscription data, user IDs, creator IDs.

**Outputs**: Subscription records or counts.

**Database interactions**: `supabase.from('subscriptions')` — select with joins to profiles for user data.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: Not found (returns null). DB error (returns null/0).

**Recovery behavior**: Retry.

**Security considerations**: Contains fan_id + creator_id + tier_id.

**Performance considerations**: Count queries are fast (aggregate).

**Logging**: None.

**Testing strategy**: Mocked.

**Known assumptions**: Subscriptions table has id (bigint), fan_id, creator_id, tier_id, status (enum), created_at, updated_at, stripe_subscription_id.

---

### 4.4 Transaction Model

**File**: `server/models/transaction.model.ts`

**Purpose**: Database access for transactions table.

**Public interfaces**:
- `createTransaction(data)` — insert
- `findByCreator(creatorId, options)` — paginated creator transactions
- `findByContentAndFan(contentId, fanId)` — check PPV purchase
- `getTotalRevenue()` — platform-wide sum
- Additional query wrappers

**Dependencies**: `supabaseClient`, `database.ts` helpers.

**Dependent modules**: Creator service, admin service, content service, cryptoPayment service.

**Inputs**: Transaction data, creator/fan IDs, content IDs.

**Outputs**: Transaction records, aggregates.

**Database interactions**: `supabase.from('transactions')` — select with aggregates.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: DB error (returns null).

**Recovery behavior**: Retry.

**Security considerations**: Contains financial data (amount, type, status).

**Performance considerations**: Revenue aggregation scans all transactions.

**Logging**: None.

**Testing strategy**: Mocked.

**Known assumptions**: Transactions table has id, creator_id, fan_id, content_id, type (enum), status (enum), amount, fee, platform_fee, created_at.

---

### 4.5 Message Model

**File**: `server/models/message.model.ts`

**Purpose**: Database access for messages table.

**Public interfaces**:
- `createMessage(data)` — insert
- `findMessagesByConversation(conversationId, options)` — paginated
- `updateMessage(id, updates)` — soft delete
- Additional wrappers

**Dependencies**: `supabaseClient`, `database.ts` helpers.

**Dependent modules**: Message service.

**Inputs**: Message data, conversation IDs.

**Outputs**: Message records.

**Database interactions**: `supabase.from('messages')`.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: DB error (returns null).

**Recovery behavior**: Retry.

**Security considerations**: Messages may contain sensitive content. Soft-delete preserves data.

**Performance considerations**: Paginated queries by conversation.

**Logging**: None.

**Testing strategy**: Mocked.

**Known assumptions**: Messages table has id, conversation_id, sender_id, content JSONB, voice_url, deleted_at, created_at.

---

### 4.6 Conversation Model

**File**: `server/models/conversation.model.ts`

**Purpose**: Database access for conversations table + participants.

**Public interfaces**:
- `findConversationsByUser(userId)` — with last message + unread count
- `findConversationById(id)` — single lookup
- `findConversationByParticipants(user1Id, user2Id)` — find existing
- `createConversation(data)` — insert with participants

**Dependencies**: `supabaseClient`, `database.ts` helpers.

**Dependent modules**: Message service.

**Inputs**: User IDs, conversation data.

**Outputs**: Conversation records.

**Database interactions**: `supabase.from('conversations')` with join to participants junction.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: DB error (returns null).

**Recovery behavior**: Retry.

**Security considerations**: Participants verified in service layer.

**Performance considerations**: Last message + unread count requires subquery or join.

**Logging**: None.

**Testing strategy**: Mocked.

**Known assumptions**: Conversations have two participants (no group chat).

---

### 4.7 Notification Model

**File**: `server/models/notification.model.ts`

**Purpose**: Database access for notifications table.

**Public interfaces**:
- `createNotification(data)` — insert
- `getNotificationsForUser(userId, limit)` — paginated list
- `getUnreadNotificationCount(userId)` — count
- `markAsRead(notificationId)` — single
- `markAllAsRead(userId)` — bulk
- `deleteNotification(notificationId)` — permanent delete

**Dependencies**: `supabaseClient`, `database.ts` helpers.

**Dependent modules**: Notification service, notification controller (direct bypass).

**Inputs**: User IDs, notification data, notification IDs.

**Outputs**: Notification records, counts.

**Database interactions**: `supabase.from('notifications')`.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: DB error (returns null/0).

**Recovery behavior**: Retry.

**Security considerations**: User-scoped queries.

**Performance considerations**: Lightweight. Mark-all-as-read uses bulk update.

**Logging**: None.

**Testing strategy**: Mocked.

**Known assumptions**: Notifications table exists (not in root DDL — may be migration-managed). Has user_id, type, title, message, related_content_id, related_user_id, is_read, created_at.

---

### 4.8 Contest Model

**File**: `server/models/contest.model.ts`

**Purpose**: Database access for contests + contest_entries tables.

**Public interfaces**:
- `createContest(data)` — insert
- `getContestById(id)` — single lookup
- `updateContest(id, updates)` — update status
- `getContestsByCreator(creatorId)` — creator's contests
- `getActiveContestsForFan()` — currently active
- `createEntry(contestId, fanId)` — insert entry
- `pickWinner(contestId)` — finalize + select winner
- `hasUserEntered(contestId, userId)` — check duplicate

**Dependencies**: `supabaseClient`, `database.ts` helpers.

**Dependent modules**: Contest service.

**Inputs**: Contest data, creator/fan IDs.

**Outputs**: Contest records, entry records.

**Database interactions**: `supabase.from('contests')`, `supabase.from('contest_entries')`.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: DB error (returns null). Duplicate entry (constraint violation).

**Recovery behavior**: Retry.

**Security considerations**: Creator ownership verified in service.

**Performance considerations**: Lightweight CRUD.

**Logging**: None.

**Testing strategy**: Mocked.

**Known assumptions**: Contests table has title, description, start_date, end_date, status, creator_id, prize, entry_requirements JSONB, winner_id. Contest entries has contest_id + fan_id.

---

# Layer 5: Middleware Layer

---

### 5.1 Auth Middleware

**File**: `server/middleware/auth.middleware.ts`

**Purpose**: JWT verification, user attachment, role-based authorization, admin impersonation.

**Public interfaces**:
- `protect` — extracts Bearer token from Authorization header, verifies via `supabase.auth.getUser(token)`, attaches `req.user`, sets `req.isAdminImpersonating = false`
- `optionalProtect` — same as protect but does not reject unauthenticated requests (sets `req.user = null`)
- `requireRole(...roles)` — factory returning middleware that checks `req.user.role` against allowed roles
- `adminOnly` — `requireRole('admin')`
- `creatorOnly` — `requireRole('creator')`
- `protectAndCreator` — composite `[protect, creatorOnly]`
- `protectAndAdmin` — composite `[protect, adminOnly]`
- Admin impersonation: if `req.isAdminImpersonating` is true, `req.originalUser` contains the original admin user

**Dependencies**: `supabaseClient` (for JWT verification), `UserModel` (for user lookup), `AppError`.

**Dependent modules**: All route files, every protected endpoint.

**Inputs**: `req.headers.authorization` (Bearer token), `req.headers['x-impersonating-user-id']` (admin only).

**Outputs**: Mutates `req.user` (User object or null), `req.originalUser` (only during impersonation), `req.isAdminImpersonating` (boolean).

**Database interactions**: `supabase.auth.getUser(token)` — verifies JWT. `UserModel.findUserById` — loads full profile.

**External APIs**: Supabase Auth (JWT verification).

**Configuration**: Supabase service role key (from supabaseClient).

**Failure modes**: Missing/invalid token (401 — AppError). User not found (401). Expired token (401). Supabase API error (500).

**Recovery behavior**: Client re-authenticates.

**Security considerations**: Service role key can verify any JWT. Impersonation logs original admin. Tokens NOT cached — each request verifies via Supabase.

**Performance considerations**: Each protected request makes 2 Supabase API calls (JWT verify + user lookup). No caching layer.

**Logging**: None.

**Testing strategy**: Unit test (`auth.middleware.test.ts` not found — tested via integration).

**Known assumptions**: JWT contains user `sub` (UUID). Supabase Auth is the sole identity provider.

---

### 5.2 Error Middleware

**File**: `server/middleware/error.middleware.ts`

**Purpose**: Custom error class and centralized Express error handler.

**Public interfaces**:
- `AppError` class — extends Error with `statusCode` (number), `isOperational` (boolean)
- `errorHandler` — Express error-handling middleware (4 params): catches all unhandled errors, returns consistent JSON envelope

**Dependencies**: None.

**Dependent modules**: Every service, every controller, every middleware.

**Inputs**: Express error-handling signature `(err, req, res, next)`.

**Outputs**: JSON response with `{ error: { message, statusCode, ...details? } }`. In development, includes stack trace.

**Database interactions**: None.

**External APIs**: None.

**Configuration**: None.

**Failure modes**: Non-Error throws (handled gracefully). Unknown errors default to 500.

**Recovery behavior**: Server continues running. Unhandled errors logged, response sent.

**Security considerations**: Stack traces hidden in production. Error messages may leak internal details.

**Performance considerations**: Minimal overhead.

**Logging**: Console.error for all caught errors. Stack trace in development mode.

**Testing strategy**: Tested by every error-path integration test.

**Known assumptions**: All errors extend AppError with statusCode.

---

### 5.3 Upload Middleware

**File**: `server/middleware/upload.middleware.ts`

**Purpose**: Multer configuration for file uploads — content files, avatars, banners, voice messages, AI caption images, verification docs.

**Public interfaces**:
- `uploadContent` — handles multiple files (up to 10), any type, max 1GB per file. Field name: `files`
- `uploadAvatar` — single file, images only, max 5MB. Field name: `avatar`
- `uploadBanner` — single file, images only, max 10MB. Field name: `banner`
- `uploadVoiceMessage` — single file, audio only, max 25MB. Field name: `voice`
- `uploadVerificationDocs` — two files (idFile, selfieFile), images only, max 10MB each
- `uploadAICaptionImage` — single file, images/video, max 25MB. Field name: `image`

**Dependencies**: `multer`, `sharp` (for image validation/processing).

**Dependent modules**: Content routes, user routes, creator routes, message routes, ai routes.

**Inputs**: Multipart form data via `req.files` or `req.file`.

**Outputs**: Mutates `req.files` (array) or `req.file` (single). Errors sent as MulterError.

**Database interactions**: None.

**External APIs**: None.

**Configuration**: Multer memory storage (files in buffer, not disk). File size limits per upload type.

**Failure modes**: File too large (413 — MulterError.LIMIT_FILE_SIZE). Wrong type (400). Too many files (413 — LIMIT_FILE_COUNT).

**Recovery behavior**: Client resubmits with correct file.

**Security considerations**: File types validated by mimetype. Sharp validates image integrity. Sharp-based image processing may be bypassed with crafted files.

**Performance considerations**: Files stored in memory (not disk) — large uploads consume RAM. 1GB file uses 1GB+ RAM. Memory storage limits scalability under concurrent large uploads.

**Logging**: None.

**Testing strategy**: Integration tests with actual file uploads.

**Known assumptions**: Clients send multipart/form-data. File buffers fit in available memory. Sharp can process all uploaded images.

---

# Layer 6: Infrastructure & Configuration

---

### 6.1 Server Entry Point

**File**: `server/Server.ts`

**Purpose**: Application bootstrap — Express app, HTTP server, Socket.IO, CORS, route mounting, global error handler.

**Public interfaces**: Creates Express app, starts HTTP server on port 5000 (default).

**Dependencies**: All route modules (15), `cors`, `body-parser`, `http`, Socket.IO config, error middleware.

**Dependent modules**: All — this is the composition root.

**Inputs**: Environment variables (PORT, CLIENT_URL). Command line arguments.

**Outputs**: HTTP server listening.

**Database interactions**: None directly.

**External APIs**: None.

**Configuration**: 
- CORS: allows `localhost:5173`, `https://podm.app`, `CLIENT_URL` env, all `*.pages.dev` (Cloudflare preview)
- JSON body limit: 1100mb
- URL-encoded body limit: 1100mb
- Port: `PORT` env or 5000

**Failure modes**: Port conflict (EADDRINUSE). Missing .env (warning logged, continues). CORS misconfiguration (blocks valid origins).

**Recovery behavior**: Server restart on port conflict. CORS errors return 403 to client.

**Security considerations**: CORS allows all `*.pages.dev` — broad wildcard for preview deployments. Body limit is very high (1100mb) — potential DoS vector.

**Performance considerations**: Body parsers load entire request into memory. 1100mb limit means concurrent large uploads consume significant RAM.

**Logging**: Console.log for startup. Log file (`debug.log`) written to `__dirname`.

**Testing strategy**: Not tested directly — tested via integration tests.

**Known assumptions**: Environment is correctly configured. Production runs behind reverse proxy (Render).

---

### 6.2 Supabase Client

**File**: `server/config/supabaseClient.ts`

**Purpose**: Supabase admin client initialization.

**Public interfaces**: Exports initialized Supabase client with service role key.

**Dependencies**: `@supabase/supabase-js`.

**Dependent modules**: All models, analytics service, crypto payment service, user service, notification service, auth service, enclave controller.

**Inputs**: Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

**Outputs**: Supabase client instance with full admin privileges.

**Database interactions**: Direct — the client connects to Supabase PostgreSQL.

**External APIs**: Supabase API.

**Configuration**: URL + service role key from env.

**Failure modes**: Missing env vars (process exits or errors on first query). Network error (query timeout).

**Recovery behavior**: Restart with correct env vars.

**Security considerations**: Service role key has full database access — must never be exposed client-side. Key stored in server `.env` only.

**Performance considerations**: Connection pool managed by Supabase client. Individual queries are fast.

**Logging**: None.

**Testing strategy**: Mocked in all unit tests.

**Known assumptions**: Supabase project is active. Service role key has not been rotated. Database migrations are up to date.

---

### 6.3 R2 Client

**File**: `server/config/r2Client.ts`

**Purpose**: Cloudflare R2 S3 client initialization.

**Public interfaces**: Exports initialized S3 client and bucket configuration.

**Dependencies**: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`.

**Dependent modules**: Storage service.

**Inputs**: Environment variables: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PRIVATE_BUCKET`, `R2_PUBLIC_BUCKET`, `R2_ENDPOINT`, `R2_REGION`.

**Outputs**: S3 client instance, bucket name strings.

**Database interactions**: None.

**External APIs**: Cloudflare R2 API.

**Configuration**: Access key, secret key, endpoint URL, region, bucket names.

**Failure modes**: Missing env vars (crashes on import). Invalid credentials (API errors). R2 service unavailable (timeout).

**Recovery behavior**: Restart with correct env vars.

**Security considerations**: Access key + secret have full R2 access — must not be exposed.

**Performance considerations**: S3 client manages its own connection pool.

**Logging**: None.

**Testing strategy**: Mocked.

**Known assumptions**: R2 buckets exist. R2 endpoint is accessible. Region is configured correctly.

---

### 6.4 Socket.IO Config

**File**: `server/config/socket.ts`

**Purpose**: Socket.IO server initialization with JWT authentication.

**Public interfaces**:
- `initSocketServer(httpServer)` — creates Socket.IO server, configures CORS, sets up auth middleware, returns `io` instance
- Exported `io` instance (for use by services)

**Dependencies**: `socket.io`, `@supabase/supabase-js` (JWT verification), `UserModel` (user lookup).

**Dependent modules**: Server.ts (initialization), Message service (emit events).

**Inputs**: HTTP server instance. Client connections with `auth.token` in handshake.

**Outputs**: Socket.IO server. Events: `join_conversation`, `leave_conversation`, `send_message`, `new_message`.

**Database interactions**: Supabase Auth for JWT verification on connection.

**External APIs**: None (Socket.IO is direct WebSocket/HTTP long-polling).

**Configuration**: CORS origin same as Express CORS. No Redis adapter (single server, no horizontal scaling).

**Failure modes**: JWT verification failure (connection rejected). Missing token (connection rejected).

**Recovery behavior**: Client reconnects with valid token.

**Security considerations**: JWT verified on every connection. Room names are conversation IDs — users can only join rooms verified by message service.

**Performance considerations**: In-memory adapter — all connections and rooms stored in process memory. No horizontal scaling without Redis adapter.

**Logging**: None.

**Testing strategy**: Tested via message integration tests.

**Known assumptions**: Single server instance. No Redis/Socket.IO cluster. Client sends JWT in `auth.token`.

---

# Layer 7: External Integrations

---

### 7.1 Supabase Integration

**Purpose**: Database + Authentication provider.

**Type**: PostgreSQL database + Auth API.

**SDK**: `@supabase/supabase-js`.

**Usage**: 
- Server: Admin client (service role key) — full read/write access to all tables. Used by all models, several services directly.
- Frontend: Anon client — limited to auth operations (signup, login, password reset via Supabase Auth).

**Interfaces**:
- `supabase.from('table').select/insert/update/delete` — standard CRUD
- `supabase.auth.getUser(token)` — JWT verification (middleware)
- `supabase.auth.admin.updateUserById` — email updates (auth service)
- `supabase.rpc('function_name', params)` — stored procedures (increment view count, gallery add count)

**Configuration**: URL + service role key (server). URL + anon key (frontend).

**Failure modes**: Network error, rate limiting, service outage, schema mismatch.

**Recovery behavior**: Retry queries. Auth failures require re-authentication.

**Security considerations**: Service role key has full access — server-side only. RLS policies on tables (if configured) are bypassed by service role (admin client).

**Performance considerations**: Supabase connection pool managed by client library. No connection pooling wrapper.

---

### 7.2 Stripe Integration

**Purpose**: Payment processing — subscriptions, one-time payments, payouts.

**Type**: External Payment API.

**SDK**: `stripe` (v18 backend), `@stripe/stripe-js` + `@stripe/react-stripe-js` (frontend).

**Usage**:
- `subscription.service.ts` — creates products/prices, manages subscriptions, payment intents
- `cryptoPayment.service.ts` — debit card off-ramp (Stripe payouts)
- `tier.utils.ts` — syncs subscription tiers with Stripe products
- `user.service.ts` — onboardCreator uses `syncTiersWithStripe`

**Configuration**: Stripe secret key initialized inline in each consuming file — no shared config.

**Failure modes**: Invalid API key (401), card declined (402), insufficient funds (402), Stripe API error (500).

**Recovery behavior**: Retry with correct payment method. Declined payments handled by Stripe webhooks (not implemented).

**Security considerations**: No raw card data handled server-side — Stripe Elements/PaymentIntents on frontend. Stripe secret key must not be exposed.

**Performance considerations**: Stripe API calls add 200-500ms latency.

**Architectural note**: 4+ files create their own `new Stripe()` instance — risk of version/option drift.

---

### 7.3 Cloudflare R2 Integration

**Purpose**: Object storage for media files.

**Type**: S3-compatible object storage.

**SDK**: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`.

**Usage**:
- Private bucket: content files (images, video, audio), verification documents, voice messages
- Public bucket: avatars, banners
- Operations: `PutObjectCommand`, `GetObjectCommand`, `DeleteObjectCommand`, `GetObjectCommand` (signed URLs)

**Configuration**: `config/r2Client.ts` — access key, secret key, endpoint, region, bucket names.

**Failure modes**: Invalid credentials, bucket not found, network error, rate limiting.

**Recovery behavior**: Retry on transient errors. Permanent errors log and throw.

**Security considerations**: Private bucket requires signed URLs (time-limited). Public bucket is world-readable.

**Performance considerations**: S3 API calls ~50-200ms. Signed URL generation is local computation.

---

### 7.4 OpenAI / AI Integration

**Purpose**: AI-powered image/video caption generation.

**Type**: External AI API.

**SDK**: `openai`.

**Usage**: Single endpoint — `ai.service.generateCaption(imageUrl)`.

**Configuration**: `AI_API_KEY`, `AI_MODEL_ID` (default `google/gemma-3-27b-it:free`). Supports OpenRouter via `sk-or-v1` key prefix.

**Failure modes**: Missing key (returns mock caption), API error (propagates status), rate limit (429), timeout.

**Recovery behavior**: Missing key returns graceful fallback. API errors propagate to client for handling.

**Security considerations**: User image URLs sent to third-party AI API. No sensitive data in captions.

**Performance considerations**: 1-5 seconds per request.

---

### 7.5 Socket.IO Integration

**Purpose**: Real-time message delivery.

**Type**: WebSocket / HTTP long-polling.

**SDK**: `socket.io` (backend), `socket.io-client` (frontend).

**Usage**:
- Backend: `config/socket.ts` — JWT auth on connection. `message.service.ts` — emit `new_message` to conversation rooms after send.
- Frontend: `lib/socket.ts` — connects with JWT, joins conversation rooms.

**Events**:
- Client → Server: `join_conversation`, `leave_conversation`
- Server → Client: `new_message`

**Configuration**: CORS, auth middleware, in-memory adapter.

**Failure modes**: Connection lost (reconnect with backoff), JWT expired (reconnect after re-auth).

**Recovery behavior**: Socket.IO auto-reconnect with exponential backoff.

**Security considerations**: JWT verified on connection. Room access controlled by server (client requests join, server validates participation).

**Performance considerations**: In-memory adapter — all state in process. Does not scale horizontally without Redis adapter.

---

### 7.6 Nodemailer Integration

**Purpose**: Transactional email sending.

**Type**: SMTP email client.

**SDK**: `nodemailer`.

**Usage**: `email.service.sendEmail(to, subject, text, html?)`. Called by admin.service (messageUser) and enclave.controller.

**Configuration**: SMTP host, port, user, password from env.

**Failure modes**: SMTP connection failure, recipient rejected, authentication error.

**Recovery behavior**: Errors thrown immediately. No retry or queue.

**Security considerations**: SMTP credentials stored in env. Email content may contain user data.

**Performance considerations**: SMTP connection + send ~100-500ms. Synchronous — no queue.

---

### 7.7 Ethereum Smart Contract

**File**: `contracts/PoDMPaymentProtocol.sol`

**Purpose**: On-chain USDC payment splitting between creators and platform.

**Type**: Solidity smart contract (ERC-20).

**Functions**:
- `paySubscription(creator, amount)` — subscription payment with platform fee split
- `payTip(creator, amount)` — direct tip
- `payPPV(creator, contentId, amount)` — pay-per-view content unlock
- `setPlatformTreasury(address)` — admin: update fee recipient
- `setPlatformFeeBps(uint256)` — admin: update fee (capped at 30%)

**Events**: `SubscriptionPaid`, `TipPaid`, `PPVPaid`, `TreasuryUpdated`, `FeeUpdated`.

**Configuration**: Deployed contract address (not found in codebase — deployment-specific).

**Usage**: Frontend `useCryptoWallet` hook connects wallet, calls contract functions directly. Backend `cryptoPayment.service` verifies on-chain transactions.

**Security considerations**: Standard ERC-20 transfer pattern. Fee capped at 30% (3000 BPS). Owner/admin can update treasury and fee.

---

# Layer 8: Shared Utilities

---

### 8.1 Response Helpers

**File**: `server/utils/response.ts`

**Purpose**: Consistent JSON response format across all controllers.

**Public interfaces**:
- `ok(res, data)` — 200 with `{ success: true, data }`
- `created(res, data)` — 201 with `{ success: true, data }`
- `okMsg(res, msg, data?)` — 200 with `{ success: true, message, data? }`
- `createdMsg(res, msg, data?)` — 201 with `{ success: true, message, data? }`

**Dependencies**: None.

**Dependent modules**: All 15 controllers.

**Inputs**: Express response object, data, optional message.

**Outputs**: JSON response.

---

### 8.2 Async Handler

**File**: `server/utils/asyncHandler.ts`

**Purpose**: Wraps async controller functions to catch rejected promises and forward to error middleware.

**Public interfaces**: `asyncHandler(fn)` — returns middleware function that catches `fn` errors via `.catch(next)`.

**Dependencies**: None.

**Dependent modules**: All 15 controllers.

---

### 8.3 Entity Guards

**File**: `server/utils/entityGuards.ts`

**Purpose**: Guard functions for entity existence and ownership.

**Public interfaces**:
- `requireUser(userId)` — fetches user via UserModel, throws AppError(404) if not found
- `requireContent(contentId)` — fetches content via ContentModel, throws AppError(404) if not found
- `requireContentOwnership(content, userId)` — throws AppError(403) if not owner

**Dependencies**: `UserModel`, `ContentModel`, `AppError`.

**Dependent modules**: 7 services (content, support, user, creator, admin, subscription, message).

---

### 8.4 Database Utils

**File**: `server/utils/database.ts`

**Purpose**: Standardized Supabase query wrappers eliminating repetitive error handling.

**Public interfaces**:
- `handleQuery<T>(promise)` — executes query, returns data or throws AppError(500) on error
- `handleCount(promise)` — executes count query, returns number
- `handleList<T>(promise)` — returns data array or []
- `createRecord<T>(table, data)` — insert + return single
- `updateRecord<T>(table, id, updates, idColumn?)` — update by ID
- `deleteRecord(table, id, idColumn?)` — delete by ID
- `findRecordById<T>(table, id, idColumn?)` — single by ID
- `countRecords(table, column, value)` — count by filter

**Dependencies**: `supabaseClient`, `AppError`.

**Dependent modules**: All 13+ models.

---

### 8.5 Request Helpers

**File**: `server/utils/requestHelpers.ts`

**Purpose**: Extracts and validates request parameters.

**Public interfaces**:
- `requireAuth(req)` — returns `req.user` or throws 401
- `requireId(req, paramName?)` — returns route param or throws 400
- `requireBody(req, ...keys)` — returns destructured body fields or throws 400

**Dependencies**: `AppError`.

**Dependent modules**: Auth controller, content controller.

---

### 8.6 Content Utils

**File**: `server/utils/content.utils.ts`

**Purpose**: Content enrichment, signed URL generation, feed reshaping.

**Public interfaces**:
- `generateSignedUrlsForContent(content)` — generates signed thumbnail URLs for each file
- `enrichContentWithUnlockStatus(contentItems, userId)` — marks content as locked/unlocked for viewer
- `reshapePostForFeed(post)` — transforms post for feed display

**Dependencies**: `StorageService` (`getPrivateSignedUrl`), `SubscriptionModel`, `TransactionModel`.

**Dependent modules**: Content service, user service, notification service, message service.

---

### 8.7 User Utils

**File**: `server/utils/user.utils.ts`

**Purpose**: User profile reshaping for frontend consumption.

**Public interfaces**:
- `reshapeUserForApp(rawUser)` — normalizes profile structure to `UserProfile` type, handles nested profile/creator_data

**Dependencies**: `UserProfile` type.

**Dependent modules**: Auth service, user service, creator service.

---

### 8.8 Tier Utils

**File**: `server/utils/tier.utils.ts`

**Purpose**: Subscription tier synchronization with Stripe.

**Public interfaces**:
- `syncTiersWithStripe(tiers)` — creates/updates Stripe products/prices for each tier, returns synced tier data

**Dependencies**: Stripe SDK (inline init).

**Dependent modules**: User service (onboardCreator).

---

### 8.9 Fee Utils

**File**: `server/utils/fee.utils.ts`

**Purpose**: Commission/fee calculation.

**Public interfaces**:
- `calculateFee(amount, commissionRate?)` — computes platform fee based on amount
- (Additional fee calculation functions)

**Dependencies**: None.

**Dependent modules**: Creator service (getEarningsData).

---

# Layer 9: Frontend Core Modules

---

### 9.1 API Client

**File**: `podm-frontend/src/lib/apiClient.ts`

**Purpose**: Centralized HTTP client for all backend API calls.

**Public interfaces**: 45+ exported functions organized by domain:
- Auth: `login`, `signup`, `logout`, `getMe`, `changePassword`, `forgotPassword`
- Content: `createContent`, `getContent`, `updateContent`, `deleteContent`, `reportContent`, `getContentForFeed`
- Subscriptions: `createSubscription`, `cancelSubscription`, `getMySubscriptions`
- Messages: `getConversations`, `getMessages`, `sendMessage`, `deleteMessage`
- Payments: `verifyPayment`, `getWalletConfig`, `updateWalletConfig`, `requestWithdrawal`
- Creator: `getDashboard`, `getAnalytics`, `getEarnings`, `updateSettings`, `broadcastMessage`
- Admin: `getUsers`, `updateUserStatus`, `getFlaggedContent`, `updateContentStatus`, `getSupportTickets`
- AI: `generateCaption`
- Notifications: `getNotifications`, `markAsRead`, `markAllAsRead`
- Contests: `getContestFeed`, `enterContest`, `createContest`, `finalizeContest`
- Referral: `getMyCodes`, `generateCode`, `getStats`
- Enclave: `getSpotsRemaining`, `submitApplication`
- Support: `createTicket`, `replyToTicket`

**Dependencies**: `axios`, `constants` (BASE_URL).

**Dependent modules**: All frontend pages, features, hooks.

**Inputs**: Function parameters (IDs, data objects, files as FormData).

**Outputs**: Typed responses via Axios (wrapped in try/catch — errors forwarded to ToastContext).

**Database interactions**: None — all calls go to backend API.

**External APIs**: Backend REST API at `process.env.VITE_API_URL || 'http://localhost:5000'`.

**Configuration**: `BASE_URL` from env. Auth interceptor reads token from localStorage/sessionStorage. Admin impersonation adds `X-Impersonating-User-Id` header.

**Failure modes**: Network error, 4xx/5xx responses, timeout.

**Recovery behavior**: Error handler registered with ToastContext for global error display. Individual call sites handle domain errors.

**Security considerations**: JWT token attached to every request via interceptor. Impersonation header for admin flows. Token stored in localStorage (vulnerable to XSS).

**Performance considerations**: No request caching. No request deduplication. No retry logic.

**Logging**: None (errors displayed via Toast).

**Testing strategy**: Mocked in unit tests. E2E tests use real API.

**Known assumptions**: Backend API is at `VITE_API_URL`. Auth token is always available for protected routes.

---

### 9.2 Auth System (useAuth)

**File**: `podm-frontend/src/hooks/useAuth.tsx`

**Purpose**: Authentication state management — user object, tokens, login, logout, signup, impersonation.

**Public interfaces**: 
- `AuthProvider` — React context provider wrapping entire app
- `useAuth()` — hook returning: `{ user, loading, error, login, logout, signup, updateUser, isImpersonating, stopImpersonation }`

**Dependencies**: `apiClient`, React context, localStorage/sessionStorage for token persistence.

**Dependent modules**: All frontend routes, protected route guards, navigation components.

**Inputs**: Login credentials, signup data, impersonation user ID.

**Outputs**: Auth state to entire component tree.

**Database interactions**: None — delegates to apiClient → backend.

**External APIs**: None directly.

**Configuration**: Token storage key.

**Failure modes**: Token expiry (redirects to login), network error (auth state invalidated), invalid credentials.

**Recovery behavior**: Token refresh via re-login. Auth state clears on 401 responses.

**Security considerations**: Token stored in localStorage — XSS vulnerability if compromised. No HTTP-only cookies. No refresh token rotation.

**Performance considerations**: Auth state loaded on app mount. No redundant re-fetches.

**Logging**: None.

**Testing strategy**: Unit test with mocked apiClient.

**Known assumptions**: Token is always a JWT string. Backend verifies tokens independently.

---

### 9.3 Socket Client

**File**: `podm-frontend/src/lib/socket.ts`

**Purpose**: Socket.IO client for real-time messaging.

**Public interfaces**:
- Exported socket instance (initialized with auth token)
- `connectSocket(token)` — connect with auth
- `disconnectSocket()` — disconnect

**Dependencies**: `socket.io-client`, auth context (for token).

**Dependent modules**: Message UI components.

**Inputs**: JWT token for auth handshake.

**Outputs**: Socket.IO events: `new_message` (real-time message delivery).

**Database interactions**: None.

**External APIs**: Backend Socket.IO server at `VITE_API_URL`.

**Configuration**: Server URL, auth token, auto-connect.

**Failure modes**: Connection drop, token expiry.

**Recovery behavior**: Socket.IO auto-reconnect with exponential backoff. Re-auth on reconnect.

**Security considerations**: JWT sent in handshake `auth.token`.

**Performance considerations**: In-memory adapter (no horizontal scaling).

**Testing strategy**: Mocked in unit tests.

**Known assumptions**: Backend Socket.IO server is running.

---

### 9.4 Shared Hooks

**Files**: `podm-frontend/src/shared/hooks/`

**Purpose**: Cross-feature reusable hooks.

**Modules**:
- `useAsyncData(fetchFn, deps)` — generic async data fetching: returns `{ data, loading, error, refetch }`. Used by multiple pages.
- `useCryptoWallet()` — Ethereum wallet connection via browser wallet (MetaMask): returns `{ account, connect, disconnect, isConnected, chainId }`.
- `useFormSubmission(submitFn)` — form submission with loading state: returns `{ submit, isLoading, error }`.
- `useStripePayment()` — Stripe Elements payment flow: returns `{ confirmPayment, createPaymentIntent, isLoading }`.

**Dependencies**: React, `@stripe/react-stripe-js` (useStripePayment), ethers (useCryptoWallet), `apiClient`.

**Dependent modules**: Feature pages (fan, creator, admin, contests, enclave).

---

### 9.5 Toast Context

**File**: `podm-frontend/src/context/ToastContext.tsx`

**Purpose**: Global toast notification system.

**Public interfaces**:
- `ToastProvider` — wraps app
- `useToast()` — returns `{ showToast(message, type), success(msg), error(msg), info(msg) }`
- Registers as global error handler for apiClient errors

**Dependencies**: React context.

**Dependent modules**: All frontend components.

---

# Layer 10: Deployment & Infrastructure

---

### 10.1 Docker Compose

**File**: `docker-compose.yml`

**Purpose**: Local multi-service orchestration.

**Services**:
- Backend: builds from `PoDM_project/`, port 5000, env from `.env`
- Frontend: builds from `podm-frontend/`, port 5173, env from `.env`, depends on backend

---

### 10.2 CI/CD

**File**: `.github/workflows/ci.yml`

**Purpose**: Continuous integration — test and build on push/PR.

**Jobs**:
1. Backend: `npm ci` → `npm test` (Node 18, `./PoDM_project`)
2. Frontend: `npm ci` → `npm run lint` → `npm run build` (Node 18, `./podm-frontend`)

---

### 10.3 Netlify Deployment

**File**: `netlify.toml`

**Purpose**: Frontend hosting configuration.

**Configuration**: Build command `npm run build`, publish directory `dist/`, SPA redirect rule for all paths to `index.html`.

---

### 10.4 Production Hosting

**Backend**: Render (`https://podm.onrender.com`) — process.env accessed, config external.
**Frontend**: Netlify + Cloudflare Pages preview (`*.pages.dev`).

---

# Appendix: Key Metrics Summary

| Layer | Files | Key Modules |
|---|---|---|
| Routes | 15 | 14 mount prefixes, ~94 endpoints |
| Controllers | 15 | All use asyncHandler + response helpers |
| Services | 15 | 10+ with inter-service dependencies |
| Models | 13+ | All use database.ts wrappers |
| Middleware | 5 | Auth, error, upload, validation |
| Config | 3 | supabase, r2, socket |
| Utils | ~13 | Shared across all layers |
| Frontend pages | 23 | Route-level, lazy-loaded |
| Frontend components | 28 | Reusable + feature-specific |
| Frontend hooks | 9 | 5 app-level + 4 shared |
| Frontend lib | 6 | apiClient, socket, constants |

**Inter-service edges**: 7 (3.1% density)
**Controller→model bypasses**: 4 instances in 3 controllers
**No-service modules**: 2 (enclave, referral)
**External integrations**: 8
**Circular dependencies**: 0
**Architectural smells**: 12 identified (4 critical)

---

# Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-02 | AI Architect | Initial architecture knowledge base (Phase 2) |
