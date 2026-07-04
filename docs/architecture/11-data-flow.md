# Data Flow Analysis

**File:** `docs/architecture/11-data-flow.md`
**Status:** Complete
**Scope:** End-to-end data lifecycle for every major feature — origins, validation, transformation, storage, caching, retrieval, modification, deletion, synchronization, external transmission. Highlights PII, secrets, auth data, payment data, AI prompts/responses.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Profile Management](#2-profile-management)
3. [Content Creation & Upload](#3-content-creation--upload)
4. [Content Consumption & Viewing](#4-content-consumption--viewing)
5. [Subscriptions](#5-subscriptions)
6. [Payments — Crypto (USDC on Base)](#6-payments--crypto-usdc-on-base)
7. [Payouts & Earnings](#7-payouts--earnings)
7.5. [Stripe Setup Intent & Payment Method Management](#75-stripe-setup-intent--payment-method-management)
8. [Messaging (Real-Time)](#8-messaging-real-time)
9. [AI Captions](#9-ai-captions)
10. [Analytics](#10-analytics)
11. [Admin Features](#11-admin-features)
12. [Referrals](#12-referrals)
12.5. [Enclave Application](#125-enclave-application)
13. [Contests](#13-contests)
14. [Support Tickets](#14-support-tickets)
15. [Sensitive Data Inventory](#15-sensitive-data-inventory)

---

## 1. Authentication

### Data Originates

**Login/Signup forms** in `podm-frontend/src/features/auth/AuthModal.tsx:30-34` — user submits `{ email, password }` (plus `username`, `role` for signup). Data is sent as POST body to `/api/v1/auth/login` or `/api/v1/auth/signup`.

Supabase **password reset email link** calls `authSupabase.auth.resetPasswordForEmail()` (`auth.service.ts:289`).

### Validation

- **Controller-level** (`auth.controller.ts:40-42`): Manual `if (!email || !password)` checks. No schema validation library (Joi/Zod) on auth routes.
- **Supabase Auth API**: Validates email format, password strength (Supabase-managed), checks credentials against stored hash.
- **Auth middleware** (`auth.middleware.ts:55`): `supabase.auth.getUser(token)` validates JWT signature + expiry remotely via Supabase Auth API. No local JWT decode.
- **Password change** (`auth.service.ts:259`): Verifies current password via `authSupabase.auth.signInWithPassword()` before allowing update.
- **Rate limiting**: **None** at application level — login/signup routes have no rate limiting.
- **Impersonation** (`auth.middleware.ts:80-96`): Only admin role can impersonate; target user must exist.

### Transformation

- **Signup** (`auth.service.ts:114-217`): Supabase creates `auth.users` entry with hashed password. Application creates `profiles` row linked by `authData.user.id`. Profile shape mapped via `reshapeUserForApp()` (snake_case DB → camelCase frontend).
- **Login** (`auth.service.ts:225-240`): `findUserById()` fetches profile via RPC `get_user_details`; `reshapeUserForApp()` applied.
- **Auth middleware** (`auth.middleware.ts:68-77`): `req.user = reshapeUserForApp(userProfile)` — attaches to request for downstream use.
- **Impersonation**: `req.originalUser = adminUser`; `req.user = targetUser` — swaps user context without re-authentication.

### Storage

| Data | Location | Persistence |
|---|---|---|
| Password hash | Supabase Auth (`auth.users`) | Supabase-managed |
| Profile (email, username, role, status) | `profiles` table (Supabase PostgreSQL) | Persistent |
| JWT (access token) | Frontend `localStorage` or `sessionStorage` | Persistent or session |
| Impersonation target ID | Frontend `localStorage` / `sessionStorage` | Until stopped |
| User object | React state (`useAuth` context) | In-memory (page refresh re-fetches) |

### Caching

**No caching** for auth data. Every protected request:
1. Supabase `getUser()` API call (remote JWT verify)
2. `get_user_details` RPC (DB query)

### Retrieval

- **Page load** (`useAuth.tsx:65-131`): Reads token from storage, calls `GET /api/v1/auth/me` (`protect` middleware) to hydrate user state.
- **Supabase `onAuthStateChange` listener** syncs tokens from Supabase session to local storage.
- **Subsequent requests**: `apiClient.ts:36-61` reads token from storage, attaches `Authorization: Bearer <token>` header.

### Modification

- **Profile update** (`PUT /api/v1/users/me`): `user.service.ts:39-70` — separates email updates (Supabase Auth via `admin.updateUserById`) from profile updates (`profiles` table).
- **Password change** (`PUT /api/v1/auth/change-password`): `auth.service.ts:251-270` — verifies current password, updates via `supabase.auth.admin.updateUserById()`.
- **Avatar** (`POST /api/v1/users/me/avatar`): Uploads to Cloudflare R2 public bucket, updates `profiles.avatar_url`.
- **Admin status change** (`PUT /api/v1/admin/users/:id/status`): Direct `profiles` update — no notification to affected user.

### Deletion

- **Logout** (`useAuth.tsx:173-183`): Clears all tokens from storage, calls `supabase.auth.signOut()`, resets React state. Backend `logout` route is a no-op.
- **401 auto-clear** (`apiClient.ts:108-109`): On 401 response, removes `authToken` from storage.
- **Orphan cleanup** (`auth.service.ts:98-107,141`): If profile creation fails after Supabase auth user created, deletes via `supabase.auth.admin.deleteUser()`.
- **No account deletion endpoint**: No route for permanent user deletion exists.

### Synchronization

- **OAuth future**: `onAuthStateChange` listener syncs Supabase session → `localStorage`.
- **No cross-tab sync**: Active sessions in other tabs are not notified of logout.
- **Impersionation**: Purely client-driven — `X-Impersonating-User-Id` header sent on every request. No server-side session tracking.

### External Transmission

| Destination | Data | Security |
|---|---|---|
| Supabase Auth API | Email, password | HTTPS |
| Supabase Database | Profile data | HTTPS (supabase-js) |
| Stripe API (profile-related) | Customer ID, payment method | HTTPS (Stripe SDK) |
| Cloudflare R2 | Avatar images | HTTPS (S3-compatible) |

### Sensitive Data

- **Secrets**: `SUPABASE_SERVICE_ROLE_KEY` and `JWT_SECRET` committed in `podm-frontend/.env` (exposed to client).
- **PII**: Email, username, full name, avatar URL.
- **Auth data**: JWT stored in `localStorage` (XSS-vulnerable). `impersonating_user_id` in plaintext storage.
- **Auth debug log**: `auth.middleware.ts:20-23` appends user IDs/emails to `server/debug.log` — PII liability if not rotated.

---

## 2. Profile Management

### Data Originates

**Registration form** (`AuthModal.tsx:30-34`) — username, email, password, role (fan/creator). **Profile edit forms** in `podm-frontend/src/features/settings/` — bio, display name, avatar, social links, preferences. **Creator settings** in `CreatorSettings.tsx` — subscription tiers, welcome message, payout preferences.

### Validation

- **Signup**: Controller checks required fields; Supabase validates email uniqueness.
- **Profile update** (`user.service.ts:39-70`): Email changes routed through Supabase Auth admin API (validates not duplicate). Profile fields updated directly.
- **Creator settings** (`PUT /api/v1/creator/settings`): `protectAndCreator` middleware; service-level validation for tier structure.
- **Avatar upload**: Multer middleware with file type filter (`image/jpeg, image/png, image/webp`) and 5MB limit.

### Transformation

- `reshapeUserForApp()` converts DB snake_case to frontend camelCase. Strips `stripe_customer_id`, `stripe_account_id`, `verification_data` from non-admin responses.
- **Avatar**: Uploaded to R2 public bucket → `publicUrl` stored in `profiles`.
- **Creator settings**: `creator_data` JSONB column updated with tier structure, welcome message, free content references.

### Storage

| Data | Table/Store | Column |
|---|---|---|
| Username, email, bio, avatar URL | `profiles` | `username`, `email`, `bio`, `avatar_url` |
| Role, status | `profiles` | `role` (fan/creator/admin), `status` |
| Creator tiers & settings | `profiles` | `creator_data` (JSONB) |
| Crypto wallet | `profiles` | `crypto_wallet_address`, `crypto_wallet_type`, `crypto_wallet_payout_preference` |
| Verification docs | `profiles` | `verification_data` (JSONB with R2 paths) |
| Preferences | `profiles` | `preferences` (JSONB) |

### Caching

**None**. Every profile read queries the `profiles` table.

### Retrieval

- **Own profile**: `GET /api/v1/auth/me` → `protect` middleware fetches via `get_user_details` RPC.
- **Public profile**: `GET /api/v1/users/:username` → fetches via `findByUsername()`.
- **Creator profile**: `GET /api/v1/creator/settings` → fetches `creator_data` JSONB.
- **Admin view**: `GET /api/v1/admin/users` → `UserModel.findAll()` returns all profiles (admin-only).

### Modification

- **Self-update**: `PUT /api/v1/users/me` → `user.service.ts:updateUserProfile()`.
- **Avatar**: `POST /api/v1/users/me/avatar` → upload to R2 + update `avatar_url`.
- **Creator settings**: `PUT /api/v1/creator/settings`.
- **Admin override**: `PUT /api/v1/admin/users/:id/status`, `PUT /api/v1/admin/users/:id/commission`.

### Deletion

**No user deletion endpoint**. No soft-delete or anonymization mechanism for profiles. Account data persists indefinitely.

### Synchronization

- **Profile updates** are not broadcast in real-time. The user must refresh or re-fetch to see changes.
- **No cross-service sync**: When email changes in Supabase Auth, `profiles.email` is updated separately (potential drift).

### External Transmission

- Supabase Auth (email changes), Cloudflare R2 (avatar uploads).
- **No webhook** notifies external services of profile changes.

### Sensitive Data

- **PII**: Email, full name, bio, avatar, verification documents (government ID, selfie).
- **Incomplete data**: `stripe_customer_id`, `stripe_account_id` columns exist but are not actively populated.
- **Creator earnings exposure**: Admin routes expose `total_earnings` and `follower_count`.
- **Verification docs**: 60-second signed URLs returned to admin — temporary but contain sensitive ID/selfie data.

---

## 3. Content Creation & Upload

### Data Originates

**Single upload** (`CreatorContent.tsx:28-278`): Form with `title`, `description`, `files` (via `<input type="file" multiple>`), `visibility`, `price` (PPV), `minTierLevel`, `schedule` data. Packed into `FormData` and sent to `POST /api/v1/content`.

**Bulk upload** (`BulkUploadPage.tsx`): `DropZone` via `react-dropzone` accepts `image/*`, `video/*`. AI captions generated per-draft. Published via `apiClient.createContent(formData)` per draft.

### Validation

- **Frontend** (`CreatorContent.tsx:104-129`): 50MB client-side file limit (single upload only). Title required. Files required for new content. PPV price > 0.
- **Multer middleware** (`upload.middleware.ts:33,69`): 1GB per file limit, 10 files max, MIME filter (`image/jpeg, image/png, image/webp, video/mp4, video/quicktime, audio/mpeg, audio/mp4, audio/wav, audio/webm, audio/ogg`).
- **Controller** (`content.controller.ts:18-20`): Requires `title`, `type`, `visibility`, non-empty `files`.
- **Service** (`content.service.ts:263-269`): PPV price validation, schedule status logic, `min_tier_level` defaulting to 1.
- **No proactive content moderation**: No NSFW detection, copyright check, or age verification during upload. Reactive only (user reporting → auto-flag at 3 reports).

### Transformation

- **Thumbnails** (`content.service.ts`):
  - Images: `sharp` resize to 400×400 WebP quality 80.
  - Videos: `fluent-ffmpeg` screenshot at 1-second mark, 400px width.
- **Watermarking** (on-view, not upload — see Content Consumption).
- **File path convention**: `{creator_id}/{timestamp}-{originalFilename}` in R2 private bucket. Thumbnails: `{creator_id}/thumb-{timestamp}-{originalFilename}.webp`.
- **Metadata**: `files` JSONB array built with `{ url, thumbnailUrl, type, width?, height? }`.

### Storage

| Store | Bucket/Table | Access |
|---|---|---|
| Cloudflare R2 | `podm-private` | Signed URLs only |
| Cloudflare R2 | `podm-public` (avatars/banners only) | Public |
| Supabase | `content` table | Row-level via API |

**Content table columns**: `id`, `creator_id`, `title`, `description` (stores AI captions), `type` (photo/video/text/audio), `files` (JSONB), `visibility` (subscribers_only/pay_per_view/unlisted), `min_tier_level`, `price` (cents), `tags`, `stats` (JSONB: views/galleryAdds/tips/ppvEarnings), `schedule` (JSONB: isScheduled/publishDate), `status` (draft/published/scheduled/flagged).

### Caching

- **Signed URLs**: 1-hour expiry for thumbnails/content; 60-second for viewing. Regenerated per request — no caching.
- **Watermarked files**: `cacheControl: 'max-age=300'` (5 minutes) — short-lived because watermarks are per-user.
- **No CDN layer** explicitly configured beyond R2's default.
- **No Redis/memcached** for content metadata.

### Retrieval

- **Creator's content** (`GET /api/v1/content/my-content`): Filtered by `creator_id`, optional type/search/sort. Signed URLs generated for each item.
- **Public profile feed** (`GET /api/v1/content/creator/:username`): `optionalProtect` — access control per post (subscription check, PPV purchase check). Locked items return placeholder URL `placehold.co/600x400/1F2937/FFFFFF?text=Locked`.
- **Single content** (`GET /api/v1/content/:id/viewer-data`): Returns content + creator + up to 4 related items.
- **View URL** (`GET /api/v1/content/:id/view`): Full access check + watermarking for photos → 60-second signed URL.

### Modification

- **Metadata only** (`PUT /api/v1/content/:id`): `content.service.ts:511-555` — updates title, description, visibility, price, tier, schedule. Protected fields: `creator_id`, `files`, `stats` are stripped.
- **No file replacement**: Content files are immutable after creation.
- **Status changes**: Creators can't change status; admin can via `PUT /api/v1/admin/content/:id/status`.

### Deletion

- **Hard delete** (`DELETE /api/v1/content/:id`): `content.service.ts:562-591` — collects all file paths from `files[]`, calls `StorageService.deleteFromPrivate()`, then deletes DB record. If R2 delete fails, DB delete **still proceeds** (orphaned files possible).

### Synchronization

- **New content notification** (`content.service.ts:298-301`): Async fire-and-forget `NotificationService.notifySubscribersOfNewContent()` — creates `new_content` notification records for active subscribers with `preferences.notifications.newContent = true`.
- **No Socket.IO event** for content updates.
- **No real-time feed update** — subscribers see new content on next page load/refresh.

### External Transmission

- **R2**: File uploads via AWS S3 SDK `PutObjectCommand` with 3 retries (exponential backoff: 500ms, 1000ms, 2000ms).
- **No Stripe webhook**: PPV access checks via `TransactionModel.findSuccessfulTransactionByFanAndContent` — no Stripe webhook to handle payment confirmations.
- **No AI moderation**: Images not sent to any third-party for moderation during upload.

### Sensitive Data

- **Creator media** stored in R2 private bucket — access requires signed URLs.
- **Fan usernames in watermarks**: `@<fan.username>` composited into watermarked images.
- **No age verification**, no copyright protection, no DMCA workflow.
- **Orphaned files risk**: If DB insert fails after R2 upload, cleanup may fail silently.

---

## 4. Content Consumption & Viewing

### Data Originates

**Fan requests**: Navigating to creator profile, clicking content item, or direct URL. Frontend calls `GET /api/v1/content/:id/view` or `GET /api/v1/content/:id/viewer-data`. Optional `GET /api/v1/content/creator/:username` for feed listing.

### Validation

- **Auth**: `protect` middleware for single content viewing; `optionalProtect` for public profile feed.
- **Access control** (`content.service.ts:461-502`):
  1. **Owner bypass**: If `content.creator_id === fanId`, full access.
  2. **Subscriber-only**: Checks active subscription to creator.
  3. **Tier check**: If `min_tier_level > 1`, queries creator's `subscriptionTiers` from `creator_data` JSONB, compares fan's tier level.
  4. **PPV check**: `TransactionModel.findSuccessfulTransactionByFanAndContent()` for `PPV Post` or `PPV Message` type.
  5. **Locked items**: Return placeholder `placehold.co` URL + `isUnlocked: false`.

### Transformation

- **Watermarking** (`content.service.ts:41-99`):
  - Triggered for photo content when viewer is NOT the creator.
  - `sharp` compositing: SVG text `@<fan.username>` tiled at 25% opacity, font size 10.
  - Output: WebP quality 90.
  - Uploaded to R2 `temp/wm-{fanId}-{timestamp}.webp`.
  - **Fallback degrades security**: If watermarking fails, original unwatermarked image served.
- **Signed URLs**: 60-second expiry for view endpoint; 3600 seconds for content listing thumbnails.

### Storage

- **Watermarked temp files**: Accumulate in R2 `temp/` path. No garbage collection — files persist until manually removed.
- **Content stats**: `content.stats.views` incremented via `increment_content_view_count` RPC on view event.

### Caching

- **Watermarked images**: R2 `cacheControl: max-age=300` (5 min).
- **Signed URLs**: No caching — regenerated per request.
- **Frontend**: No React Query / SWR — raw `useEffect` + `fetch` pattern.

### Retrieval

- `content.service.ts:getContentForFan()` — full access check pipeline.
- `getSecureUrlForViewing()` — watermark + signed URL generation.
- `getContentViewerData()` — content + creator + related content enrichment.

### Modification

View events increment `content.stats.views` via `supabase.rpc('increment_content_view_count')`. No other modification during consumption.

### Deletion

No deletion during consumption. Content deletion handled separately (see Content Creation).

### Synchronization

- **Analytics event**: `POST /api/v1/analytics/log` fired from frontend on view (fire-and-forget).
- **No real-time broadcast** of content views.

### External Transmission

- **R2**: `GetObjectCommand` for original files (watermarking), `PutObjectCommand` for watermarked copies.
- **No third-party CDN**: All content served directly via R2 signed URLs.

### Sensitive Data

- **Watermarked images** exposed to fans — `@username` watermark is lightweight, could be cropped/edited out.
- **Subscription status** checked per request — fan's subscription data exposed in server-side logic.
- **PPV purchase history** queried per content view.

---

## 5. Subscriptions

### Data Originates

**Fan initiates subscription** from `CreatorProfile.tsx` or `SubscriptionModal.tsx`. Frontend sends `POST /api/v1/subscriptions` with `{ creator_id, tier_id, txHash }` — the `txHash` is a blockchain transaction hash from the USDC payment on Base blockchain.

### Validation

- **Auth**: `requireAuth` on all subscription routes.
- **Controller** (`subscription.controller.ts:14-24`): Requires `creator_id`, `tier_id`, `txHash`.
- **Service** (`subscription.service.ts:24-98`):
  1. Fetches creator, validates tier exists in `creator_data.subscriptionTiers`.
  2. Delegates to `CryptoPaymentService.verifyAndRecordBasePayment()` — on-chain verification (see Payments section).
  3. Deduplication: `blockchain_tx_hash` unique index prevents replay.
- **Ownership validation** for tier change/cancel: Fan must own the subscription.

### Transformation

- **Amount**: Tier price (cents) → `CryptoPaymentService.verifyAndRecordBasePayment()` validates on-chain amount matches tier price within 1-cent tolerance.
- **Fee split**: Platform fee 12.5% computed at verification time.
- **DB repurposing**: `subscriptions.stripe_subscription_id` column stores the blockchain `txHash`.
- **Next billing**: `next_billing_date = now() + 30 days`.
- **Status**: Set to `'active'` on successful crypto verification.

### Storage

| Table | Key Columns |
|---|---|
| `subscriptions` | `fan_id`, `creator_id`, `tier_id`, `status` (active/canceled), `start_date`, `next_billing_date`, `stripe_subscription_id` (stores txHash) |
| `transactions` | Payment ledger record via crypto verification (see Payments) |

### Caching

**None**. Every subscription query hits Supabase PostgreSQL.

### Retrieval

- **Fan's subscriptions** (`GET /api/v1/subscriptions`): `findSubscriptionsByFanId(fanId)` enriched via `reshapeSubscriptionForApp()` — fetches creator profile, tier info, computes `tierName`, `price`, `availableTiers`.
- **Creator's subscribers** (no dedicated route): Service function `findSubscriptionsByCreator(creatorId)` with status `'active'`.
- **Subscription count queries**: Used by analytics/admin: `countNewSubscribersInPeriod()`, `countTotalActiveSubscribersAtDate()`.

### Modification

- **Tier change** (`PUT /api/v1/subscriptions/:id`): Updates `tier_id` only — no price change recalculated.
- **Cancel** (`DELETE /api/v1/subscriptions/:id`): Soft delete — sets `status: 'canceled'`, `end_date: now()`.

### Deletion

**No hard delete**. Canceled subscriptions remain in the database with `status: 'canceled'`.

### Synchronization

- **Welcome message**: On creation, sends DM via `MessageService.sendDirectMessage()` if creator configured a welcome message with optional free content.
- **No real-time subscription status change broadcast** (subscriber count on creator profile updates on next page load).
- **No Stripe webhook** (subscriptions are crypto-based, not Stripe recurring).

### External Transmission

- **Blockchain RPC**: `CryptoPaymentService.verifyAndRecordBasePayment()` calls `eth_getTransactionReceipt` via JSON-RPC to Base blockchain node.
- **No email notification** for subscription events.

### Sensitive Data

- **Payment**: `txHash` (blockchain transaction hash, public ledger). Tier prices in cents.
- **PII**: Fan and creator IDs linked in subscription records.
- **Column repurposing**: `stripe_subscription_id` stores `txHash` — semantic misuse could cause confusion.

---

## 6. Payments — Crypto (USDC on Base)

### Data Originates

**Wallet transaction**: Fan sends USDC via `PoDMPaymentProtocol.sol` smart contract using their Web3 wallet (MetaMask, WalletConnect, embedded). Contract emits event with `totalAmount`, `platformFee`, `creatorAmount`, fan/creator addresses.

**Client submission**: Frontend captures `txHash` from wallet after confirmation and sends to backend via `POST /api/v1/payments/crypto/verify` with `{ txHash, creatorId, amountInCents, transactionType, relatedId? }`.

**Subscription flow**: `POST /api/v1/subscriptions` calls `verifyAndRecordBasePayment()` internally.

**Sandbox mode**: Any `txHash` starting with `0x0000` prefixes skips all on-chain verification — **any authenticated user can create verified transactions** with sandbox hashes.

### Validation

- **Hash format** (`cryptoPayment.service.ts`): `/^0x([A-Fa-f0-9]{64})$/` regex — rejects malformed hashes with 400.
- **Deduplication**: Checks `transactions.blockchain_tx_hash` unique index — returns 409 if hash already used.
- **On-chain verification** (skipped for `0x0000` sandbox):
  1. `eth_getTransactionReceipt` via JSON-RPC.
  2. `receipt.status === '0x1'` (success).
  3. Contract interaction: `receipt.to` or log `address` must match `PoDMPaymentProtocol` contract address.
  4. Parse `topics[2]` — last 20 bytes = creator's configured wallet address.
  5. Parse `data` field: first 32-byte word = `totalAmount`, convert from USDC 6-decimals to cents (`rawAmount / 10000`), must match `amountInCents` within 1-cent tolerance.
- **Creator wallet required**: Creator must have configured `crypto_wallet_address` and `crypto_wallet_payout_preference`.
- **Frontend-backend mismatch**: Frontend sends `paymentMethodId` (Stripe `pm_...`) but backend expects `txHash` (`0x...`). Regex validation will reject Stripe tokens.

### Transformation

- **Fee calculation** (`lib/constants.ts`): `DEFAULT_COMMISSION_RATE = 12.5%`. `platformFee = Math.round(amount * 12.5 / 100)`, `creatorPayout = amount - platformFee`.
- **Amount normalization**: Blockchain USDC 6-decimal → cents (×10000).
- **Chain ID mapping**: `payoutPreference` determines network: `base` → 8453 (mainnet) or 84532 (sepolia), `monad` → 10143, `megaeth` → 9999.

### Storage

| Table | Key Columns |
|---|---|
| `transactions` | `fan_id`, `creator_id`, `type` (Subscription/Tip/PPV/Payout), `amount` (cents), `platform_fee`, `creator_payout`, `status` (Cleared/Pending/Failed/Refunded), `payment_gateway_id` (Stripe charge ID or txHash), `blockchain_tx_hash`, `payment_method` (crypto/stripe), `payment_currency` (USDC/USD), `chain_id` |
| `profiles` | `crypto_wallet_address`, `crypto_wallet_type`, `crypto_wallet_payout_preference` |

### Caching

**None**. Payment verification queries blockchain on every request. Transaction history queries PostgreSQL directly.

### Retrieval

- **Earnings** (`GET /api/v1/creator/earnings`): Aggregates `creator_payout` by status (`Cleared` = available, `Pending` = pending). Monthly chart: 6 separate DB queries.
- **Transaction history** (`GET /api/v1/creator/payouts`): Returns all payout transactions.
- **Content unlock status**: `TransactionModel.findSuccessfulTransactionByFanAndContent()` for PPV checks.

### Modification

**Transactions are append-only**. No updates after creation except setting `blockchain_tx_hash` and `payment_method` immediately after insert. No refund mechanism — `Refunded` status exists in type but no code path sets it.

### Deletion

**No deletion mechanism**. No `deleteTransaction` or `anonymizeTransaction` functions. GDPR right-to-erasure not implemented for payment records.

### Synchronization

- **Client-initiated**: Verification is triggered by client submitting `txHash`. No blockchain event listener or webhook.
- **No Stripe webhook**: Stripe endpoints dead — no charge.succeeded, payment_intent.succeeded handlers.

### External Transmission

| Destination | Data | Protocol |
|---|---|---|
| Base JSON-RPC | `eth_getTransactionReceipt` | HTTPS |
| BaseScan API | (configured but usage not confirmed) | HTTPS |
| USDC smart contract | (fan calls contract directly from wallet) | Blockchain |
| Stripe API | Dead — endpoints not mounted | HTTPS (Stripe SDK) |

### Sensitive Data

- **Crypto wallet addresses** stored in plaintext in `profiles`.
- **Transaction hashes** (public ledger data) stored in DB.
- **Payment amounts** (cents) accessible to fan (own), creator (own), admin (all).
- **No refund/dispute mechanism** — crypto is final.
- **Sandbox bypass**: Any `0x0000`-prefixed hash skips verification — **critical vulnerability** allowing fake transactions.
- **Platform fee logic** (12.5%) hardcoded — business-sensitive.
- **Frontend calls dead Stripe endpoints**: `/payments/tip`, `/payments/unlock-post`, `/payments/unlock-message`, `/payments/confirm-transaction` will 404. `useStripePayment` hook is dead code.

---

## 7. Payouts & Earnings

### Data Originates

**Creator initiates payout** from Earnings dashboard. Frontend sends `POST /api/v1/creator/payouts` with `{ amount }` (in dollars).

### Validation

- **Auth**: `protectAndCreator`.
- **Controller** (`creator.controller.ts:54-65`): Amount must be positive number; converted to cents via `Math.round(amount * 100)`.
- **Service** (`creator.service.ts:389-424`):
  1. Fetches creator profile — requires configured `crypto_wallet_address`.
  2. Recalculates available balance: sums `creator_payout` for all `Cleared` transactions.
  3. Validates `amountInCents <= availableBalance` (server-authoritative).

### Transformation

- **Negative transaction**: Creates transaction with `type: 'Payout'`, negative `creator_payout` to zero out balance.
- **Off-ramp** (`cryptoPayment.service.ts:272-301`): `processDebitCardOffRamp` — **mocked**. Returns fake `transferId: 'tr_offramp_<random>'`. No actual Stripe/Coinbase off-ramp API call.

### Storage

- `transactions` table with `type: 'Payout'`, negative `creator_payout`.
- `platform_fee` = 0 for withdrawals (no additional fee on payout).

### Caching

**None**. Balance recalculated from transactions table on every request.

### Retrieval

- `GET /api/v1/creator/earnings` — queries transactions for `creator_id`, aggregates by status.
- `GET /api/v1/creator/payouts` — returns payout transaction history.

### Modification

**None** after creation. Payouts are final once recorded.

### Deletion

**None**. Payout records are permanent.

### Synchronization

**None**. No notification sent to creator when payout status changes (all payouts are immediately "Cleared" since off-ramp is mocked).

### External Transmission

**Mocked**. Off-ramp should connect to Stripe/Coinbase API but returns fake IDs.

### Sensitive Data

- **Payout amounts**: Creator earnings data — accessible to creator and admin.
- **Mocked off-ramp**: No real money movement — earnings sit in internal ledger only.
- **Balance race condition**: Available balance read at request time, not locked — concurrent payout requests could over-draft.

---

## 7.5. Stripe Setup Intent & Payment Method Management

**Status:** Active but undocumented in earlier passes. The frontend setup intent endpoints are fully functional — not legacy/dead as previously labeled.

### Data Originates

**Payment method setup**: User (fan or creator) opens settings → "Payment Methods" → enters card details via Stripe Elements → `stripe.confirmSetup()` → client secret from `GET /api/v1/users/setup-intent`. Token saved via `PUT /api/v1/users/payment-method`.

### Validation

- **Auth**: `protect` middleware.
- **Controller** (`user.controller.ts:45`): `createSetupIntent` calls `StripeService.createSetupIntentCustomer(userId)`.
- **Stripe service** (`stripe.service.ts:14-22`): Creates or retrieves Stripe Customer for user (`stripe.customers.create({ email, name })`). Creates SetupIntent via `stripe.setupIntents.create({ customer, payment_method_types: ['card'] })`.
- **Payment method update** (`user.controller.ts:54`): Stores `payment_method` ID in `profiles.crypto_wallet_address` column (column name is misleading — reused for both crypto wallet and Stripe PM).

### Transformation

- **Customer creation**: First call creates Stripe Customer + stores `stripeCustomerId` in `profiles.stripe_customer_id`.
- **SetupIntent**: Returns `client_secret` to frontend for Stripe.js confirmation.
- **Payment method storage**: Stripe `pm_...` token saved to `crypto_wallet_address` field (no dedicated `payment_method_id` column).

### Storage

| Data | Location | Persistence |
|---|---|---|
| Stripe Customer ID | `profiles.stripe_customer_id` | Persistent |
| Stripe Payment Method ID | `profiles.crypto_wallet_address` (shared column) | Persistent |
| Stripe Setup Intent secret | In-memory (client secret, returned once) | Ephemeral |

### Caching

**None**.

### Retrieval

- **No retrieve endpoint**: No GET endpoint for user's saved payment methods.
- **Stripe Dashboard**: Admin can view customer/payment methods via Stripe dashboard.

### Modification

- **Re-setup**: User can create new SetupIntent at any time (overwrites previous `payment_method`).

### Deletion

**No delete endpoint**. Payment methods persist in Stripe and profile column.

### Synchronization

- **Stripe ↔ Profile**: Customer ID synced on creation, token on setup. No webhook to sync Stripe-initiated changes.

### External Transmission

- **Stripe API**: Customer creation, SetupIntent creation.
- **Stripe.js**: Frontend handles card data directly (PCI-compliant — card numbers never reach backend).

### Sensitive Data

- **Stripe Customer ID**: Linked to user profile — exposes payment relationship.
- **Payment Method token**: `pm_...` — Stripe-scoped, useless to attackers alone.
- **Column misuse**: `crypto_wallet_address` stores Stripe PM tokens — naming confusion could cause bugs if crypto wallet integration is added later.

---

## 8. Messaging (Real-Time)

### Data Originates

**Text message**: Chat input in `FanMessages.tsx` / `CreatorMessages.tsx`. `handleSendMessage()` calls `apiClient.sendMessage(receiverId, text, content?)` → `POST /api/v1/messages`.

**Voice message**: `useVoiceRecorder` captures `audio/webm` blob → `FormData` → `POST /api/v1/messages/voice` (creator-only).

**Broadcast**: `BroadcastModal.tsx` → `apiClient.broadcastMessage(text, minTierId?)` → `POST /api/v1/messages/mass-message` (creator-only). Service iterates all active subscribers.

**Auto-send**: URL query params `?userId=X&text=Y&autoSend=true` (from contest winner notifications).

### Validation

- **Auth**: `protect` for send/list/delete; `protectAndCreator` for voice/broadcast.
- **Controller** (`message.controller.ts:27`): Requires `receiver_id` and `text || content`.
- **Service** (`message.service.ts:174`): Sender must have `status === 'active'`.
- **Ownership** (`message.service.ts:107,269`): Must be conversation participant to view; must be `sender_id` to delete.
- **File upload**: Multer filters audio MIME types for voice messages (10MB limit); generic upload middleware for content attachments (1GB limit).
- **No rate limiting** on message endpoints.

### Transformation

- **Conversation lookup/creation** (`message.service.ts:178-184`): `findConversationByParticipants()` → `createConversation()` if none exists. Conversations implicitly created on first message.
- **Content attachment**: If `messageData.content.contentId`, fetches original content, copies thumbnail URL. Auto-unlocks if price === 0.
- **Voice message**: Uploaded to R2 `voice-messages/{sender_id}/voice-{timestamp}.webm` → 7-day signed URL.
- **Shape mapping**: DB snake_case → camelCase. Role-split conversation list: creators see `fan.totalSpent`, `fan.isNewSubscriber`; fans see `creator` profile.
- **Broadcast**: Iterates active subscribers, calling `sendDirectMessage()` per subscriber (N+1 pattern).

### Storage

| Table | Key Columns |
|---|---|
| `messages` | `id`, `conversation_id`, `sender_id`, `receiver_id`, `text`, `content` (JSONB for PPV attachments), `voice_message_url`, `is_read`, `created_at`, `updated_at` |
| `conversations` | `id`, `participants` (UUID array), `last_message_id`, `created_at`, `updated_at` |
| R2 private | `voice-messages/{sender_id}/voice-{timestamp}.webm` |

### Caching

**None**. Conversation list queries DB with N+1 user lookups. No React Query/SWR on frontend — `useState` + `useEffect` re-fetches on mount.

### Retrieval

- **Conversation list** (`GET /api/v1/messages/conversations`): Role-specific enrichment (RPC `get_creator_subscribers_for_messaging` for creators).
- **Conversation history** (`GET /api/v1/messages/conversations/:conversationId`): Ascending by `created_at`. Signed URLs for thumbnails. Gallery check for `inGallery` flag.
- **Real-time**: Socket.IO `join_conversation` → server broadcasts to `conversation:{id}` room.

### Modification

- **Mark read** (`PUT /api/v1/messages/conversations/:conversationId/read`): Updates all `is_read=false, receiver_id=userId` in conversation. Broadcasts `conversation_read` only to the reader's own sockets.
- **Message edit**: **Not implemented**. `message_updated` event is registered on frontend but never emitted from backend.
- **PPV unlock**: Frontend expects `POST /payments/unlock-message` — endpoint does not exist (dead flow).

### Deletion

- **Message** (`DELETE /api/v1/messages/:id`): Verifies `sender_id === userId`, hard-deletes row, broadcasts `message_deleted` to conversation room.
- **Conversation deletion**: **Not implemented**. No endpoint to delete/nuke a conversation.

### Synchronization

| Event | Trigger | Payload | Room |
|---|---|---|---|
| `new_message` | `message.service.ts` send | Full message object | `conversation:{id}` |
| `message_deleted` | `message.service.ts` delete | `{ messageId }` | `conversation:{id}` |
| `conversation_read` | `message.service.ts` markRead | `{ conversation_id }` | Sender's own sockets |
| `message_updated` | **Never emitted** | — | — |

- **No offline message delivery**: If recipient's Socket.IO is disconnected, messages are not queued. They must re-fetch REST API.
- **Typing indicators**: **Not implemented** (no `typing` event).
- **Support ticket sync**: When message receiver is admin, `support.service.ts:240-251` appends to user's active support ticket conversation.

### External Transmission

- **R2**: Voice message uploads and signed URLs.
- **No email/push notification** for new messages.
- **No E2EE**: Messages stored in plaintext in PostgreSQL. Platform can read all messages.

### Sensitive Data

- **Message text**: Stored in plaintext in DB. No E2EE.
- **PII**: User names, avatar URLs, `totalSpent` (exposed to creators).
- **Voice messages**: 7-day signed URLs — extended window for potential URL leakage.
- **PPV content previews**: CSS `blur-md` only — easily bypassed via browser inspector.
- **No rate limiting**: Vulnerable to message spam/abuse.
- **Offline message loss**: No delivery guarantee.

---

## 9. AI Captions

### Data Originates

**Manual trigger**: Creator clicks "AI Caption" button on `DraftCard.tsx`. `BulkUploadPage.tsx:handleGenerateCaption(draft.id, draft.file)` calls `apiClient.generateCaption(image)` → `POST /api/v1/ai/caption`.

**Batch trigger**: "Caption All" button iterates all drafts without captions, calls `handleGenerateCaption()` sequentially with 5-second delay (30-second on 429).

### Validation

- **Auth**: `protect` middleware.
- **File upload**: `uploadAICaptionImage` (multer, memory storage, 1GB limit, image/video MIME filter).
- **Controller** (`ai.controller.ts:16-18`): Requires file or `imageUrl` string.
- **No content moderation** before AI transmission: Images sent without NSFW/safety check.
- **No prompt injection protection**: Prompt is hardcoded but image content is uncontrolled.
- **No output sanitization**: AI response used as-is — no profanity/policy filter.

### Transformation

- **Prompt construction** (`ai.service.ts:39`): Hardcoded string: "Write ONE witty, enticing caption for this image or video in English only... Max 20 words."
- **Image encoding**: File buffer → base64 data URI (`data:image/jpeg;base64,...`).
- **Model selection** (`ai.service.ts:30`): `process.env.AI_MODEL_ID || "google/gemma-3-27b-it:free"`.
- **API routing** (`ai.service.ts:7-16`): If API key starts with `sk-or-v1`, target OpenRouter; else target OpenAI.
- **SDK invocation**: `openai.chat.completions.create()` with `max_tokens: 100`.
- **Response parsing** (`ai.service.ts:61`): `response.choices[0]?.message?.content || "Just posted! ✨ #newcontent"` — no parsing or sanitization.
- **Fallback** (no API key): Returns `"Enjoying the moment! ✨ #vibes (AI Key Missing)"`.
- **Title truncation**: First 50 characters of caption become content `title`.

### Storage

- **No dedicated storage**: Caption stored in `content.description` column. No `is_ai_generated` flag — indistinguishable from manual captions post-creation.
- **No generation log**: No `ai_generations` tracking table.

### Caching

**None**. Every request (even same image) triggers new AI API call. No response caching.

### Retrieval

- Caption returned as `content.description` in all content GET endpoints.
- Displayed in `ContentViewer.tsx:203` as `{content.description}`.

### Modification

- **Pre-publish**: Free text editing in `DraftCard.tsx:108-112` textarea.
- **Post-publish**: `PUT /api/v1/content/:id` accepts `description` updates.
- **No "regenerate" button**: Must delete text and re-trigger AI.

### Deletion

- **Content deletion cascade**: Caption deleted with content.
- **No separate caption deletion** endpoint.

### Synchronization

- **Synchronous HTTP request**: Server awaits AI API response before responding.
- **No background job queue**: Batch captioning is client-side sequential with delays.
- **Client-side rate limiting**: 5-second delay between requests; 30-second delay on 429.

### External Transmission

| Destination | Data | Sensitivity |
|---|---|---|
| OpenAI / OpenRouter API | Full image/video file (base64), hardcoded prompt | **High** — user media content transmitted to third-party |
| (inferred) | AI response | Low — generated text |

### Sensitive Data

- **AI_API_KEY**: `process.env.AI_API_KEY` — critical secret. Key prefix determines provider (OpenAI or OpenRouter).
- **User media**: Full-resolution images/videos transmitted to third-party AI API without user consent dialog.
- **No NSFW moderation** before transmission — potential ToS violation with AI providers.
- **No audit trail**: AI-generated content indistinguishable from manual input.
- **No retry/idempotency**: AI API failure = caption silently lost (fallback placeholder used).

---

## 10. Analytics

### Data Originates

**User actions**: Profile visit, post view, gallery add, tip. Frontend fires `POST /api/v1/analytics/log` with `{ eventType, creatorId, contentId? }`. Uses `optionalProtect` — guests (no JWT) can also log.

### Validation

- **Controller** (`analytics.controller.ts`): Requires `eventType` and `creatorId`.
- **Service** (`analytics.service.ts`): Silently discards admin views and self-views (no-op).

### Transformation

- `viewerId` extracted from JWT or set to `null` for unauthenticated guests.

### Storage

| Table | Key Columns |
|---|---|
| `analytics_events` | `event_type`, `creator_id`, `viewer_id` (nullable), `content_id` (nullable), `created_at` |

### Caching

**None**. Every analytics query scans the `analytics_events` table.

### Retrieval

- **Creator dashboard**: `countEventsForCreator(creatorId, eventType, startDate?, endDate?)` — count queries with optional date range filtering.
- **Admin dashboard**: Platform-wide counts aggregated from same table.

### Modification

**No direct modification**. Append-only.

### Deletion

**No delete mechanism**. Events accumulate indefinitely — potential data bloat and GDPR compliance gap.

### Synchronization

- **Post view events**: Fire RPC `increment_content_view_count` to update `content.stats.views` JSONB. Similarly `increment_tip_count`, `increment_gallery_count` via SQL functions.
- **No real-time broadcast** of analytics.

### External Transmission

**None**.

### Sensitive Data

- **PII**: `viewer_id` (nullable) — links anonymous user behavior to identity when authenticated.
- **Guest tracking**: `viewer_id = null` — no PII for unauthenticated visitors, but IP/device not tracked.
- **No event expiry**: Data grows unbounded with no retention policy.

---

## 11. Admin Features

### Data Originates

**Admin dashboard** (`AdminPanel.tsx` + sub-panels): Dashboard, users, content moderation, analytics, reports, support tickets, settings, verification docs, user messaging.

**15 backend routes** in `admin.routes.ts`, all protected by `protectAndAdmin`.

### Validation

- **Auth**: `protectAndAdmin` — JWT + role check on all routes.
- **Field validation**: Route-specific (e.g., `updateContentStatus` requires `status` in body; `updatePlatformSettings` validates `commissionRate` is number).
- **No CSRF protection**: Admin endpoints rely solely on JWT + role check.

### Transformation

- **Dashboard** (`AdminService.getDashboardStats()`): 5 parallel queries: `countAllUsers`, `countActiveCreators`, `sumPlatformFeeForPeriod(30)`, `countOpenTickets`, `getNewUsersOverTime(6)`.
- **Flagged content**: Enriched with `reportCount`, `reason`, `creator` via `UserModel.findUserById()`.
- **Verification docs**: R2 signed URLs with 60-second expiry for ID/selfie documents.
- **Admin list**: Enriched with Supabase `auth.admin.getUserById()` for email lookup.
- **User messaging**: `EmailService.sendEmail()` with `from: adminUsername@podm.app`.
- **Report generation** (`POST /api/v1/admin/reports`): Accepts date range, metric type, filters. Queries `transactions`, `analytics_events`, `profiles` tables and aggregates into report results. Optional `save: true` persists report config for reuse.
- **Saved reports** (`GET /api/v1/admin/saved-reports` / `GET /api/v1/admin/reports`): Returns previously saved report configurations. Each includes query parameters and last-run timestamp.

### Storage

Reads from and writes to `profiles`, `content`, `reports`, `transactions`, `support_tickets`, `settings` tables.

### Caching

**None**. Admin dashboard aggregates 5+ queries per load — no caching layer.

### Retrieval

- `findAll()` for users, `findAllReports()` for reports, `findAllSupportTickets()` for tickets.
- Platform analytics: `TransactionModel.getTransactionStats()` + `getTopCreatorsByRevenue(5)`.

### Modification

- **User status**: `updateProfile(userId, { status })`.
- **Content status**: `updateContent(contentId, { status })` + auto-dismiss reports.
- **Platform settings**: `SettingsModel.updateSetting('platform_commission_rate', rate)`.
- **Creator commission**: `updateProfile(creatorId, { commission_rate })`.
- **Support ticket**: `updateSupportTicket(ticketId, { status, conversation, ... })`.

### Deletion

**No hard delete**. Content "deletion" via status change to `'removed'`. Users deactivated via status change. Reports dismissed (not deleted).

### Synchronization

- **Support ticket reply**: Creates DM via `MessageService.sendDirectMessage()` — cross-service integration using dynamic `require()`.
- **No real-time dashboard updates**: Page must be refreshed.
- **No admin action audit log**: No tracking of which admin performed what action.

### External Transmission

- **Email**: `EmailService.sendEmail()` for admin-to-user messages (nodemailer, SMTP configured but may be unused — nodemailer wired but no active SMTP provider confirmed).
- **R2**: Signed URLs for verification documents.
- **Supabase Auth Admin API**: `auth.admin.getUserById()` for admin list enrichment.

### Sensitive Data

- **PII exposure**: Full user profiles (names, emails, earnings, follower counts) exposed to admins.
- **Verification docs**: Government ID and selfie images via temporary signed URLs.
- **Financial data**: Platform revenue, per-creator earnings, commission rate configuration.
- **No admin audit trail**: Actions not logged — no accountability mechanism.
- **Dynamic require**: `support.service.ts:71` uses dynamic `require()` — potential security concern.
- **No CSRF protection**: Admin endpoints rely solely on JWT.

---

## 12. Referrals

### Data Originates

**Code generation**: Authenticated user calls `POST /api/v1/referral/generate`. System generates two codes: `{USERNAME}-CASH` ($50 cash bonus) and `{USERNAME}-PERCENT` (1% revenue share).

**Code usage**: Referral code submitted during signup (`AuthModal.tsx`) or Enclave application (`EnclaveApplicationForm.tsx`). Validated via public endpoint `GET /api/v1/referral/validate/:code`.

**Milestone check**: Called by payment/earnings system when creator hits $750 earnings.

### Validation

- **Code generation** (`referral.model.ts`): `requireAuth`; one code set per user (rejects if codes already exist).
- **Code validation**: Public route (no auth) — uppercases code, queries `referrals` with `is_active=true`.
- **Referral use tracking**: During signup/enclave application — validates code exists and is active.
- **Milestone**: Requires `userId`, `totalEarnings`; checks earnings >= $750, within 30 days of application.

### Transformation

- **Code format**: `{USERNAME}-CASH` / `{USERNAME}-PERCENT` — username embedded in code (PII exposure).
- **Bonus award**: `cash` type → `bonus_value` awarded directly. `percent` type → tracking only (no immediate payout).
- **Milestone bonus**: $50 base + $25 speed bonus (if within 14 days).

### Storage

| Table | Key Columns |
|---|---|
| `referrals` | `user_id`, `referral_code`, `bonus_type` (cash/percent), `bonus_value`, `uses_count`, `total_bonus_earned`, `is_active` |
| `referral_applications` | `referral_id`, `application_id`, `applicant_user_id`, `bonus_awarded`, `milestone_750_reached_at`, `speed_bonus_amount` |

### Caching

**None**.

### Retrieval

- **Validate**: Single row lookup by `referral_code`.
- **Stats** (`GET /api/v1/referral/stats`): Join of `referrals` + `referral_applications` for total uses, earnings, breakdown.
- **User's codes**: `getReferralsByUserId(userId)`.

### Modification

- `uses_count` incremented on each referral use.
- `total_bonus_earned` updated when bonuses awarded.
- `is_active` can be toggled (soft deactivation).
- Referral applications updated with award details.

### Deletion

**Soft only** via `is_active = false`. No hard delete.

### Synchronization

- **Award on signup**: Referral bonus awarded during auth signup flow — same transactional context.
- **No real-time notification**: Referrer not notified when code is used or bonus awarded.

### External Transmission

**None**. All referral logic is internal.

### Sensitive Data

- **PII in codes**: Username embedded in referral code — anyone seeing the code knows the referrer's username.
- **Hardcoded amounts**: $50 cash, $25 speed bonus, $750 milestone threshold — business-sensitive incentive structure.
- **RLS enforced**: Users see own referrals; admins see all.
- **Unprotected routes**: Two referral routes have no auth middleware (anomaly flagged in architecture KB).
- **No actual payout mechanism**: Bonuses tracked in DB but no payment integration to disburse.

---

## 12.5. Enclave Application

**Status:** Active. Application flow is fully functional. Membership grants 10% reduced platform fee.

### Data Originates

**User submits**: `EnclaveApplicationForm.tsx` → `POST /api/v1/enclave/applications` with `{ fullName, email, phone, currentPlatform[], followerCount, monthlyEarnings, contentType[], whyJoin, howHeard, referralCode? }`.

**Admin reviews**: `EnclaveApplications.tsx` → `PATCH /api/v1/enclave/applications/:id` with `{ status, notes? }`.

**Capacity check**: Public `GET /api/v1/enclave/spots-remaining` shows remaining capacity (`ENCLAVE_MAX_SPOTS - acceptedCount`).

**Signup integration**: On user registration, `auth.service.ts:145-177` checks if email matches an accepted Enclave application.

### Validation

- **Submit**: No auth required (public form). Validates required fields, email format, array types, max char length (1000 for `whyJoin`). Duplicate email check → 409.
- **Capacity**: Checked at submit time AND at accept time (race window exists between submit and review).
- **Admin update**: `protectAndAdmin`. Status must be `'pending'`, `'accepted'`, or `'rejected'`.
- **Signup link**: Accepted applicants get `/signup?email=X&enclave=true` — email validated against application records.

### Transformation

- **Application record**: Inserted with default `status: 'pending'`. Reference code linked to `ReferralModel.trackReferralUse`.
- **On acceptance**: `status → 'accepted'`, `reviewed_at → now()`, `reviewed_by → adminId`. High-priority support ticket created for white-glove onboarding.
- **On signup match**: `profiles.is_enclave_member → true`, `enclave_joined_at → now()`. Referral bonus awarded to referrer.

### Storage

| Table | Key Columns |
|---|---|
| `enclave_applications` | `id`, `full_name`, `email`, `current_platform[]`, `follower_count`, `status` (pending/accepted/rejected), `reviewed_by`, `reviewed_at`, `referral_code` |
| `profiles` | `is_enclave_member` (boolean), `enclave_joined_at` (timestamp) |

### Caching

**None**. Every `spots-remaining` query counts accepted applications live.

### Retrieval

- **Public**: `GET /api/v1/enclave/spots-remaining` — single count query.
- **Admin**: `GET /api/v1/enclave/applications?status=` — full list, optional status filter.

### Modification

- **Admin status change**: Updates status, reviewer, timestamp. Accept/reject triggers email notification.
- **Signup integration**: Sets `is_enclave_member` on user profile.

### Deletion

**No hard delete**. Applications persist with status changes for audit trail.

### Synchronization

- **Referral tracking**: On submit, code usage recorded in `referral_applications`.
- **Support ticket**: On acceptance, high-priority ticket auto-created for onboarding.
- **Email**: Confirmation on submit; acceptance/rejection on admin action.
- **Fee discount**: `is_enclave_member = true` → `calculatePlatformFeePercentage` returns 10% instead of 12.5%/15%.

### External Transmission

- **Email**: SMTP via `EmailService.sendEmail()` — confirmation, acceptance (with Discord invite link), rejection.
- **Discord**: Acceptance email includes Discord invite URL for private Enclave community (configurable via `DISCORD_ENCLAVE_INVITE_URL`).

### Sensitive Data

- **PII**: Full name, email, phone, follower count, earnings — submitted by applicant, visible to admins.
- **Capacity cap**: Business-sensitive — max 50 Enclave spots.
- **Referral linkage**: Application linked to referrer via `referral_code` — PII cross-reference.
- **No applicant-facing portal**: Applicants cannot check application status after submission.
- **Email fallback**: Non-fatal — application created even if email send fails.

---

## 13. Contests

### Data Originates

**Creator creates**: `CreateContestModal.tsx` → `POST /api/v1/contests` with `{ title, description, start_date, end_date, entry_requirements, prize_description, entry_type, entry_multiplier, spend_threshold, additional_entries }`.

**Fan enters**: `FanContestList.tsx` → `POST /api/v1/contests/:id/enter`.

**Creator finalizes**: Picks winner via `POST /api/v1/contests/:id/finalize` (standard random or weighted by spend).

### Validation

- **Create**: `protectAndCreator`. Requires `title`, `start_date`, `end_date`; `end_date > start_date`.
- **Enter**: `protect`. Checks contest is `active`, `end_date` not passed. If `entry_requirements.tier_id` or `all_subscribers`, checks fan has active subscription via `SubscriptionModel.findActiveSubscriptionsByFan(fanId)`.
- **Finalize**: Ownership check; contest must not be already completed.
- **Unique entry**: `contest_id + fan_id` unique constraint prevents double entry.

### Transformation

- **Status lifecycle**: `draft` (initial) → `active` (publish) → `completed` (finalize). Can be `canceled`.
- **Winner selection**:
  - `standard`: Uniform random selection from entries.
  - `weighted_spend`: Queries `transactions` table for each entrant's spend during contest period. `tickets = 1 + floor(totalSpend / spendThreshold) * additionalEntries`. Weighted random selection.
- **Enrichment**: Winner details enriched with `username`, `avatar_url` from `profiles` on retrieval.
- **Notification**: Winner notified via URL params `?userId=X&text=Y&autoSend=true` → auto-sends DM.

### Storage

| Table | Key Columns |
|---|---|
| `contests` | `creator_id`, `title`, `description`, `start_date`, `end_date`, `prize_description`, `entry_requirements` (JSONB), `entry_type`, `entry_multiplier`, `spend_threshold`, `additional_entries`, `status`, `winner_id` |
| `contest_entries` | `contest_id`, `fan_id`, `created_at` (unique on contest+fan) |

### Caching

**None**.

### Retrieval

- **Creator's contests**: `getContestsByCreator(creatorId)`.
- **Fan feed** (`GET /api/v1/contests/feed`): Filters by `status='active'`, `start_date <= now`, `end_date >= now`. Enriches with `hasEntered` for requesting user.
- **Single contest**: `GET /api/v1/contests/:id`.

### Modification

- **Publish**: `status: draft → active`.
- **Finalize**: `status: active → completed`, sets `winner_id`.
- **Cancel**: Status change (no delete).

### Deletion

**No hard delete**. Cancellation via status change only.

### Synchronization

- **Subscriber check**: Cross-service to `SubscriptionModel` on entry.
- **Winner notification**: Auto-sends DM via URL params (frontend-triggered).
- **No real-time contest updates**: Standings not broadcast; feed refreshed on page load.

### External Transmission

**None**.

### Sensitive Data

- **Payment data in weighted draw**: `transactions` table queried for **real payment amounts** (cents) to compute entry weights.
- **Random draw**: Determines real-world prize outcomes — no audit trail for winner selection randomness.
- **PII**: Fan IDs in `contest_entries`; winner username/avatar exposed.
- **Cross-service coupling**: Subscription check + transaction queries create dependencies.

---

## 14. Support Tickets

### Data Originates

**User creates**: `POST /api/v1/support/tickets` with `{ subject, description }`.

**Admin replies**: `PUT /api/v1/support/tickets/:id/reply` with `{ text }`. Creates DM to user via `MessageService.sendDirectMessage()`.

**Auto-append**: User message to admin role automatically appended to active ticket (from `message.service.ts:240-251`).

### Validation

- **Create**: `requireAuth`. Service fetches user via `requireUser` to get display name.
- **Admin reply**: `protectAndAdmin`. Requires `text`.
- **Auto-append**: Finds tickets with status `Open` or `Pending`. If none, returns null (no-op).

### Transformation

- **Initial message**: `[{ senderId, senderName, text: description, timestamp }]` stored in `conversation` array.
- **Status transitions**: `Open` (new) → `Pending` (admin viewed) → `Open` (user replied) → `Resolved`.
- **Admin reply**: Appends to `conversation` array, sets status to `Pending`, creates DM via `MessageService.sendDirectMessage()`.

### Storage

| Table | Key Columns |
|---|---|
| `support_tickets` | `user_id`, `subject`, `status` (Open/Pending/Resolved), `conversation` (JSONB array), `created_at`, `updated_at` |

### Caching

**None**.

### Retrieval

- **Admin**: `GET /api/v1/admin/support-tickets` → `findAllSupportTickets()`.
- **No user-facing ticket list**: Users cannot view their ticket history via API.

### Modification

- **Reply**: Appends to conversation, updates status.
- **Resolve**: Sets `status: 'Resolved'`.
- **Auto-status**: `Open → Pending` when admin views; `Pending → Open` when user replies.

### Deletion

**No deletion**. Tickets persist indefinitely with status changes.

### Synchronization

- **DM to user**: Admin reply creates message in user's inbox → delivered via Socket.IO.
- **Dynamic require**: `support.service.ts:71` uses `require(MessageService)` — avoids circular dependency but bypasses static imports.

### External Transmission

- **Email**: Not implemented for support tickets — no notification to user when admin replies beyond the DM.
- **No push notification**: User must be online to receive Socket.IO DM.

### Sensitive Data

- **Full conversation history**: User messages with sender names stored in JSONB array.
- **PII**: Sender name, user ID, message text — all in plaintext.
- **No user-side access**: Users cannot view their own ticket history — admin-only visibility.
- **No SLA tracking**: No escalation, reassignment, or priority fields.
- **No email fallback**: Users not notified of replies via email if offline.

---

## 15. Sensitive Data Inventory

### Secrets (must never reach client)

| Secret | Location | Risk |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `.env` files (3 copies, including `podm-frontend/.env`) | **Committed in frontend** — admin-level Supabase access |
| `JWT_SECRET` | `.env` files (3 copies, including `podm-frontend/.env`) | **Committed in frontend** — token forgery |
| `AI_API_KEY` | `server/.env` | AI provider access (OpenAI/OpenRouter billing) |
| `R2_ACCESS_KEY_ID` | `server/.env` | R2 storage access |
| `R2_SECRET_ACCESS_KEY` | `server/.env` | R2 storage access |
| `STRIPE_SECRET_KEY` | `server/.env` (used for setup intent + customer creation; payment endpoints dead) | Stripe API access |
| `SESSION_SECRET` | `server/.env` | Session signing |
| `SUPABASE_ANON_KEY` | `.env` files | Public by design (anon key) |

### PII (Personally Identifiable Information)

| Field | Tables / Stores | Exposure |
|---|---|---|
| Email | `profiles`, Supabase Auth | Admin, user (self) |
| Username | `profiles`, embedded in referral codes | Public profile URLs, referral codes |
| Full name / display name | `profiles` | Public profile, messages, conversations |
| Bio | `profiles` | Public profile |
| Avatar URL | `profiles`, R2 public bucket | Public |
| Verification documents (ID, selfie) | R2 private, `profiles.verification_data` | Admin-only (60s signed URLs) |
| Crypto wallet address | `profiles` | Admin, creator (self) |
| Message text | `messages` | Participants, admin |
| Voice message recordings | R2 private, voice-messages/ | Participants (7-day signed URLs) |

### Authentication Data

| Data | Storage | Risk |
|---|---|---|
| JWT (access token) | `localStorage` / `sessionStorage` | XSS vulnerability |
| Password hash | Supabase Auth only | Not in application scope |
| `impersonating_user_id` | `localStorage` / `sessionStorage` | Plaintext in browser storage |
| Auth debug log | `server/debug.log` | User IDs and emails in plaintext file |

### Payment Data

| Data | Storage | Sensitivity |
|---|---|---|
| Transaction amounts (cents) | `transactions.amount` | Accessible to fan, creator, admin |
| Platform fee (12.5%) | `transactions.platform_fee` | Business-sensitive |
| Crypto wallet addresses | `profiles.crypto_wallet_address` | Public by nature |
| Blockchain tx hashes | `transactions.blockchain_tx_hash` | Public ledger |
| Stripe `pm_...` tokens | `profiles.crypto_wallet_address` (misused column) | Stripe-scoped (useless to attackers) |
| Credit card numbers | **Never stored** | PCI-compliant via Stripe (dead) |

### AI Data

| Data | Storage | Sensitivity |
|---|---|---|
| `AI_API_KEY` | `server/.env` | Critical — API access |
| `AI_MODEL_ID` | `server/.env` | Low — model selection |
| User media (image/video) | Transmitted to AI API | High — creator content sent to third-party |
| AI prompts | Hardcoded in `ai.service.ts:39` | Low — static text |
| AI responses | `content.description` | Medium — published content |

### Cross-Cutting Risks

| Risk | Severity | Affected Features |
|---|---|---|
| Sandbox `0x0000` bypass | **Critical** | Payments, Subscriptions |
| Stripe dead endpoints in frontend | **High** | Payments (frontend 404) |
| No refund/dispute mechanism | **High** | Payments |
| No GDPR deletion | **High** | All features |
| No static data encryption (DB) | **High** | All features |
| No E2EE for messages | **Medium** | Messaging |
| No rate limiting on auth/messages | **Medium** | Auth, Messaging |
| CSS-blur PPV content protection | **Medium** | Content, Messaging |
| No admin audit trail | **Medium** | Admin |
| Offline message loss | **Medium** | Messaging |
| Watermarked images not GC'd | **Low** | Content |
| Orphaned R2 files on DB failure | **Low** | Content |
| No background job queue | **Low** | AI Captions (blocking HTTP), Content (sync thumbnails) |
