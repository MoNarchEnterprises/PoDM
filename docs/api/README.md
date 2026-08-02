# API Route Reference

**Base URL**: `/api/v1`  
**Route files**: `PoDM_project/server/routes/` (16 files, 102 endpoints + 1 health check)  
**Source**: Extracted from Express route definitions on 2026-07-03

## Auth — `/auth`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| POST | `/auth/signup-and-subscribe` | `signupAndSubscribe` | — |
| POST | `/auth/signup` | `signup` | — |
| POST | `/auth/forgot-password` | `forgotPassword` | — |
| POST | `/auth/login` | `login` | — |
| POST | `/auth/refresh` | `refreshSession` | — |
| POST | `/auth/logout` | `logout` | — |
| GET | `/auth/me` | `getMe` | `protect` |
| PUT | `/auth/change-password` | `changePassword` | `protect` |

**File**: `auth.routes.ts`  
**Controller**: `auth.controller`  
**8 endpoints**

## Users — `/users`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| GET | `/users/me` | `getMe` | `protect` |
| GET | `/users/me/gallery` | `getMyGallery` | `protect` |
| PUT | `/users/me` | `updateMe` | `protect` |
| POST | `/users/me/avatar` | `updateMyAvatar` | `protect`, `uploadAvatar` |
| POST | `/users/me/gallery` | `addToGallery` | `protect` |
| DELETE | `/users/me/gallery/:contentId` | `removeFromGallery` | `protect` |
| GET | `/users/profile/:username` | `getFullPublicProfile` | `optionalProtect` |
| GET | `/users/:username` | `getPublicProfile` | — |
| POST | `/users/me/onboarding` | `completeOnboarding` | `protectAndCreator` |
| POST | `/users/me/verification` | `submitVerification` | `protectAndCreator`, `uploadVerificationDocs` |
| GET | `/users/me/feed` | `getMyFeed` | `protect` |
| GET | `/users/me/settings` | `getMySettings` | `protect` |
| PUT | `/users/me/settings` | `updateMySettings` | `protect` |
**File**: `user.routes.ts`  
**Controller**: `user.controller`  
**13 endpoints**

## Creator — `/creator`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| GET | `/creator/dashboard` | `getCreatorDashboard` | `protectAndCreator` |
| PUT | `/creator/settings` | `updateCreatorSettings` | `protectAndCreator`, `uploadBanner` |
| GET | `/creator/analytics` | `getCreatorAnalytics` | `protectAndCreator` |
| GET | `/creator/metrics/export` | `exportMetrics` | `protectAndCreator` |
| GET | `/creator/metrics/export-fans` | `exportFanEngagement` | `protectAndCreator` |
| GET | `/creator/earnings` | `getCreatorEarnings` | `protectAndCreator` |
| POST | `/creator/payouts` | `requestPayout` | `protectAndCreator` |
| GET | `/creator/activity` | `getCreatorActivity` | `protectAndCreator` |
| GET | `/creator/tiers` | `getTiers` | `protectAndCreator` |
| POST | `/creator/broadcast` | `broadcastMessage` | `protectAndCreator` |

**File**: `creator.routes.ts`  
**Controller**: `creator.controller`  
**10 endpoints**

## Content — `/content`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| POST | `/content` | `createContent` | `protectAndCreator`, `uploadContent` |
| GET | `/content/:id/secure-url` | `getSecureContentUrl` | `protect` |
| GET | `/content/my-content` | `getMyContent` | `protectAndCreator` |
| GET | `/content/creator/:username` | `getContentByCreator` | `optionalProtect` |
| GET | `/content/:id/view` | `getContentView` | `protect` |
| GET | `/content/:id` | `getContentById` | `protect` |
| POST | `/content/:id/report` | `reportContent` | `protect` |
| PUT | `/content/:id` | `updateContent` | `protectAndCreator` |
| DELETE | `/content/:id` | `deleteContent` | `protectAndCreator` |
| GET | `/content/:id/viewer-data` | `getContentViewerData` | `protect` |

**File**: `content.routes.ts`  
**Controller**: `content.controller`  
**10 endpoints**

## Subscriptions — `/subscriptions`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| GET | `/subscriptions` | `getMySubscriptions` | `protect` |
| POST | `/subscriptions` | `createSubscription` | `protect` |
| PUT | `/subscriptions/:id` | `updateSubscription` | `protect` |
| DELETE | `/subscriptions/:id` | `cancelSubscription` | `protect` |

**File**: `subscription.routes.ts`  
**Controller**: `subscription.controller`  
**4 endpoints**

## Messages — `/messages`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| GET | `/messages/conversations` | `getConversations` | `protect` |
| GET | `/messages/conversations/:conversationId` | `getMessagesInConversation` | `protect` |
| POST | `/messages` | `sendMessage` | `protect` |
| PUT | `/messages/conversations/:conversationId/read` | `markConversationAsRead` | `protect` |
| DELETE | `/messages/:id` | `deleteMessage` | `protect` |
| POST | `/messages/voice` | `sendVoiceMessage` | `protectAndCreator`, `uploadVoiceMessage` |
| POST | `/messages/mass-message` | `sendMassMessage` | `protectAndCreator` |

**File**: `message.routes.ts`  
**Controller**: `message.controller`  
**7 endpoints**

## Crypto Payments — `/payments/crypto`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| GET | `/payments/crypto/wallet` | `getWalletConfig` | `protect` |
| POST | `/payments/crypto/wallet` | `updateWalletConfig` | `protect` |
| POST | `/payments/crypto/verify` | `verifyCryptoPayment` | `protect` |

**File**: `cryptoPayment.routes.ts`  
**Controller**: `cryptoPayment.controller`  
**4 endpoints**

## Admin — `/admin` *(all routes require `protectAndAdmin`)*

| Method | Path | Handler |
|---|---|---|
| GET | `/admin/dashboard` | `getDashboardStats` |
| GET | `/admin/users` | `getAllUsers` |
| PUT | `/admin/users/:id/status` | `updateUserStatus` |
| GET | `/admin/content/flagged` | `getFlaggedContent` |
| PUT | `/admin/content/:id/status` | `updateContentStatus` |
| GET | `/admin/analytics` | `getPlatformAnalytics` |
| POST | `/admin/reports` | `generateReport` |
| GET | `/admin/reports` | `getSavedReports` |
| GET | `/admin/support-tickets` | `getSupportTickets` |
| PUT | `/admin/support-tickets/:id` | `updateSupportTicket` |
| GET | `/admin/settings/admins` | `getAdminUsers` |
| GET | `/admin/settings/platform` | `getSettings` |
| PUT | `/admin/settings/platform` | `updateSettings` |
| PUT | `/admin/users/:id/commission` | `setCreatorCommission` |
| GET | `/admin/users/:id/verification-docs` | `getCreatorVerificationDocs` |
| POST | `/admin/users/:id/message` | `messageUser` |

**File**: `admin.routes.ts`  
**Controller**: `admin.controller`  
**16 endpoints**

## Analytics — `/analytics`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| POST | `/analytics/log` | `logEvent` | `optionalProtect` |

**File**: `analytics.routes.ts`  
**Controller**: `analytics.controller`  
**1 endpoint**

## Support — `/support`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| POST | `/support/tickets` | `createSupportTicket` | `protect` |
| PUT | `/support/tickets/:id/reply` | `replyToTicket` | `protectAndAdmin` |
| GET | `/support/tickets/:id` | `getTicketById` | `protectAndAdmin` |
| PUT | `/support/tickets/:id/resolve` | `resolveTicket` | `protectAndAdmin` |

**File**: `support.routes.ts`  
**Controller**: `support.controller`  
**4 endpoints**

## AI — `/ai` *(all routes require `protect`)*

| Method | Path | Handler | Middleware |
|---|---|---|---|
| POST | `/ai/caption` | `generateCaption` | `uploadAICaptionImage` |

**File**: `ai.routes.ts`  
**Controller**: `ai.controller`  
**1 endpoint**

## Notifications — `/notifications` *(all routes require `protect`)*

| Method | Path | Handler |
|---|---|---|
| GET | `/notifications` | `getNotifications` |
| GET | `/notifications/unread-count` | `getUnreadCount` |
| PUT | `/notifications/:id/read` | `markAsRead` |
| PUT | `/notifications/read-all` | `markAllAsRead` |
| DELETE | `/notifications/:id` | `deleteNotification` |

**File**: `notification.routes.ts`  
**Controller**: `notification.controller`  
**5 endpoints**

## Contests — `/contests`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| GET | `/contests/feed` | `getFeed` | `protect` |
| GET | `/contests/:id` | `getDetails` | `protect` |
| POST | `/contests/:id/enter` | `enter` | `protect` |
| POST | `/contests` | `create` | `protectAndCreator` |
| GET | `/contests/creator/my` | `getMyContests` | `protectAndCreator` |
| PUT | `/contests/:id/publish` | `publish` | `protectAndCreator` |
| POST | `/contests/:id/finalize` | `finalize` | `protectAndCreator` |

**File**: `contest.routes.ts`  
**Controller**: `contest.controller`  
**7 endpoints**

## Enclave — `/enclave`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| GET | `/enclave/spots-remaining` | `getSpotsRemaining` | — |
| POST | `/enclave/applications` | `submitApplication` | — |
| GET | `/enclave/applications` | `getAllApplications` | `protectAndAdmin` |
| PATCH | `/enclave/applications/:id` | `updateApplicationStatus` | `protectAndAdmin` |

**File**: `enclave.routes.ts`  
**Controller**: `enclave.controller`  
**4 endpoints**

## Referrals — `/referrals`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| GET | `/referrals/my-codes` | `getMyReferralCodes` | `protect` |
| POST | `/referrals/generate` | `generateReferralCodes` | `protect` |
| GET | `/referrals/stats` | `getReferralStats` | `protect` |
| POST | `/referrals/check-milestone/:userId` | `checkMilestoneBonus` | — |
| GET | `/referrals/validate/:code` | `validateReferralCode` | — |

**File**: `referral.routes.ts`  
**Controller**: `referral.controller`  
**5 endpoints**

## Payments (On-Ramp) — `/payments/onramp`

| Method | Path | Handler | Middleware |
|---|---|---|---|
| POST | `/payments/onramp/session` | `createOnRampSession` | `protect` |
| POST | `/payments/onramp/webhook` | `handleOnRampWebhook` | — |

**File**: `onramp.routes.ts`  
**Controller**: `onramp.controller`  
**2 endpoints**

## Health Check

| Method | Path | Handler |
|---|---|---|
| GET | `/` | `res.send('PoDM API is running!')` |

**File**: `Server.ts:116`

## Route Summary

| Domain | Endpoints | Auth Required | Files |
|---|---|---|---|
| Auth | 7 | 2 protected | `auth.routes.ts` |
| Users | 13 | 12 protected | `user.routes.ts` |
| Creator | 10 | 10 (creator) | `creator.routes.ts` |
| Content | 10 | 10 protected | `content.routes.ts` |
| Subscriptions | 4 | 4 protected | `subscription.routes.ts` |
| Messages | 7 | 7 protected | `message.routes.ts` |
| Crypto | 4 | 4 protected | `cryptoPayment.routes.ts` |
| Admin | 16 | 16 (admin) | `admin.routes.ts` |
| Analytics | 1 | optional | `analytics.routes.ts` |
| Support | 4 | 4 protected | `support.routes.ts` |
| AI | 1 | 1 protected | `ai.routes.ts` |
| Notifications | 5 | 5 protected | `notification.routes.ts` |
| Contests | 7 | 7 protected | `contest.routes.ts` |
| Enclave | 4 | 2 protected | `enclave.routes.ts` |
| Referrals | 5 | 3 protected | `referral.routes.ts` |
| Onramp | 2 | 1 protected | `onramp.routes.ts` |
| Health | 1 | none | `Server.ts` |
| **Total** | **102** | | |

*Note: Admin routes use `router.use(protectAndAdmin)` at the top of the file. Creator routes spread `...protectAndCreator` per-route. All middleware functions are defined in `server/middleware/`.*

## Middleware Legend

| Middleware | Purpose |
|---|---|
| `protect` | JWT authentication required |
| `optionalProtect` | JWT auth if available, no error if missing |
| `protectAndCreator` | Auth + creator role check |
| `protectAndAdmin` | Auth + admin role check (applied via `router.use`) |
| `uploadAvatar` | Multer — single avatar file |
| `uploadBanner` | Multer — single banner file |
| `uploadContent` | Multer — single content file |
| `uploadVerificationDocs` | Multer — multiple verification docs |
| `uploadVoiceMessage` | Multer — single voice message audio |
| `uploadAICaptionImage` | Multer — single image for AI caption |

## Controller Mapping

| Route File | Controller |
|---|---|
| `auth.routes.ts` | `../controllers/auth.controller` |
| `user.routes.ts` | `../controllers/user.controller` |
| `creator.routes.ts` | `../controllers/creator.controller` |
| `content.routes.ts` | `../controllers/content.controller` |
| `subscription.routes.ts` | `../controllers/subscription.controller` |
| `message.routes.ts` | `../controllers/message.controller` |
| `cryptoPayment.routes.ts` | `../controllers/cryptoPayment.controller` |
| `admin.routes.ts` | `../controllers/admin.controller` |
| `analytics.routes.ts` | `../controllers/analytics.controller` |
| `support.routes.ts` | `../controllers/support.controller` |
| `ai.routes.ts` | `../controllers/ai.controller` |
| `notification.routes.ts` | `../controllers/notification.controller` |
| `contest.routes.ts` | `../controllers/contest.controller` |
| `enclave.routes.ts` | `../controllers/enclave.controller` |
| `referral.routes.ts` | `../controllers/referral.controller` |
| `onramp.routes.ts` | `../controllers/onramp.controller` |
