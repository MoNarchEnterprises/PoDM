# Flowchart Prompts — Batch 01 (Categories A–D)

> Self-contained prompts for generating Mermaid diagrams for the PoDM platform.
> Each prompt can be given to an AI system to produce a specific diagram.
>
> File: `docs/flowcharts/flowchart-prompts-01.md`
> Covers: A-04, A-05, B-03–B-06, C-02–C-08, D-02–D-08

---

## A-04: Internal Workflow Dependency Map

**Type:** Graph (flowchart)
**Priority:** P2

Generate a Mermaid flowchart showing how the 28 internal workflows connect to each other and to external boundaries.

Use subgraphs for workflow categories:
- **Content workflows** (upload, thumbnail, watermark, scheduled publish, content deletion)
- **Payment workflows** (crypto verify, fee calc, payout request, referral bonus)
- **Messaging workflows** (send message, mass message, ticket→DM sync, notification broadcast)
- **Auth workflows** (login, signup with orphan cleanup, password reset)
- **Analytics workflows** (event log, content view increment, summary aggregation)
- **Admin workflows** (dashboard stats, content moderation, verification doc access)

Connect workflows with arrows labeled with the triggering mechanism:
- Solid line = synchronous direct call
- Dashed line = fire-and-forget (`.catch()`)
- Dotted line = Socket.IO event

Highlight which workflows share retry logic (only R2 upload has 3-retry exponential backoff) and which have no error handling.

Add a note box: "Only 1 of 28 workflows has retry logic — storage.service.ts"

**Sources:** `docs/architecture/10-internal-workflows.md` (all 28 workflows), `storage.service.ts`, `content.service.ts`, `notification.service.ts`, `cryptoPayment.service.ts`

---

## A-05: Environment Configuration Map

**Type:** Graph (flowchart)
**Priority:** P2

Generate a Mermaid flowchart mapping all 20+ backend environment variables to their configuration files, initialization points, and consuming modules.

Group env vars by domain in subgraphs:
- **Supabase**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **R2**: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_PUBLIC_BUCKET_NAME`, `R2_PUBLIC_URL`
- **Crypto**: `RPC_URL`, `CONTRACT_ADDRESS`, `CHAIN_ID`
- **AI**: `OPENAI_API_KEY` or `OPENROUTER_API_KEY` (prefix-determined)
- **Email**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- **App**: `PORT`, `NODE_ENV`, `FRONTEND_URL`, `JWT_SECRET`

For each group, show:
1. Where the env var is loaded (e.g., `process.env.SUPABASE_URL` in `supabaseClient.ts`)
2. Which config/init module uses it
3. Which runtime modules consume the initialized client

Highlight:
- **Critical**: `JWT_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` in frontend `.env` (client-exposed)
- The 3 `.env` file copies (root, `PoDM_project/`, `podm-frontend/`)
- Difference between server-side and client-exposed vars

**Sources:** All config files listed in `07-cross-cutting-concerns.md §11`, `02-dependency-map.md`, `01-repository-inventory.md`

---

## B-03: Auth Token Lifecycle

**Type:** Sequence
**Priority:** P1

Generate a Mermaid sequence diagram showing the full JWT token lifecycle.

Participants:
- `F` — Frontend (React app)
- `SA` — Supabase Auth
- `AM` — Auth Middleware (`auth.middleware.ts`)
- `DB` — Supabase DB (profiles table)
- `AS` — Auth Service (`auth.service.ts`)

Steps:
1. **Creation**: User submits email+password → `supabase.auth.signInWithPassword()` → `{ user, session }` containing access_token + refresh_token
2. **Storage**: Frontend stores token in `localStorage` or `sessionStorage` (via `useAuth.tsx`)
3. **Transmission**: Every API call includes `Authorization: Bearer <token>` header (via `apiClient.ts` interceptor)
4. **Verification**: `auth.middleware.ts` → `supabase.auth.getUser(token)` → verifies with Supabase Auth
5. **Session continuation**: Token reused for subsequent requests until 401
6. **Expiry**: 401 response → `apiClient.ts` response interceptor catches → clears stored token → redirect to login
7. **Logout**: User clicks logout → `supabase.auth.signOut()` → clear storage → redirect

Annotate:
- **⚠️ Refresh token gap**: No token rotation implemented; if token expires mid-session, user is logged out with no silent refresh
- **localStorage XSS risk**: Token stored in plaintext in localStorage

**Sources:** `auth.service.ts`, `auth.middleware.ts`, `apiClient.ts` (response interceptor), `useAuth.tsx`, `11-data-flow.md §1`

---

## B-04: Route Authentication Matrix

**Type:** Graph (classDiagram or flowchart)
**Priority:** P1

Generate a Mermaid class diagram or flowchart mapping all 14 route groups to their middleware chains.

For each route group, show:
- Route prefix (e.g., `/api/v1/auth`)
- Middleware chain in order (e.g., `protect → protectAndCreator → controller`)
- HTTP methods used

Route groups to include:
1. `auth.routes.ts` — `/api/v1/auth` — login, signup, reset password (no protect on login/signup)
2. `users.routes.ts` — `/api/v1/users` — profile CRUD, follow/unfollow (protect)
3. `content.routes.ts` — `/api/v1/content` — create, read, update, delete, report, flag (protect + protectAndCreator for create)
4. `subscription.routes.ts` — `/api/v1/subscriptions` — manage subscriptions (protect)
5. `payments-stripe.routes.ts` — `/api/v1/payments` — Stripe payment intents (protect)
6. `crypto-payment.routes.ts` — `/api/v1/payments/crypto` — crypto verify (protect)
7. `messages.routes.ts` — `/api/v1/messages` — conversations, messages, mass message (protect)
8. `notifications.routes.ts` — `/api/v1/notifications` — list, mark read (protect)
9. `analytics.routes.ts` — `/api/v1/analytics` — log, dashboard stats (optionalProtect for log)
10. `admin.routes.ts` — `/api/v1/admin` — all admin panels (protectAndAdmin)
11. `ai.routes.ts` — `/api/v1/ai` — AI caption generation (protectAndCreator)
12. `referral.routes.ts` — `/api/v1/referrals` — codes, bonuses (protect)
13. `contest.routes.ts` — `/api/v1/contests` — contest CRUD, entry, finalize (protect)
14. `support.routes.ts` — `/api/v1/support` — tickets CRUD (protect, admin for all)

Highlight anomalies:
- 🔴 **2 unprotected referral routes** — no `protect` middleware
- 🔴 **Missing fan route guard** — frontend `/fan/*` routes lack guard (not a backend middleware issue, but a frontend routing gap)
- Frontend route groups with lazy loading annotations

**Sources:** All 15 route files, `auth.middleware.ts`, `02-dependency-map.md`, `06-frontend-architecture.md`

---

## B-05: Auth Orphan Cleanup Flow

**Type:** Sequence
**Priority:** P2

Generate a Mermaid sequence diagram showing the fragile signup flow with orphan cleanup.

Participants:
- `F` — Frontend
- `AS` — Auth Service (`auth.service.ts`)
- `SA` — Supabase Auth
- `DB` — Supabase DB (profiles table)

Flow:
1. `F → AS:` POST `/api/v1/auth/signup` `{ email, password, username, role }`
2. `AS → SA:` `supabase.auth.signUp({ email, password })`
3. `SA → AS:` `{ user, session }` — auth user created
4. `AS → DB:` `INSERT INTO profiles (id, username, role, ...)` — create profile
5. **If profile creation succeeds:** return success
6. **If profile creation fails (any DB error):**
   - `AS → SA:` `supabase.admin.deleteUser(authUser.id)` — delete auth user via admin API
   - If delete succeeds: return error (orphan avoided)
   - **If delete fails:** **ORPHAN CREATED** — auth user exists without profile

Annotate:
- 🔴 **No DB transaction** — profile INSERT is not wrapped in a Supabase transaction
- 🟡 **Race window** — between step 3 and step 5, any partial state is exposed
- 🔴 **If cleanup fails**: orphan auth user exists with no profile — can never log in (login succeeds but profile fetch fails)

**Sources:** `auth.service.ts:98-141`, `10-internal-workflows.md §23`

---

## B-06: Password Reset Flow

**Type:** Sequence
**Priority:** P3

Generate a Mermaid sequence diagram for the forgot password / password reset flow.

Participants:
- `F` — Frontend
- `AS` — Auth Service (`auth.service.ts`)
- `SA` — Supabase Auth
- `E` — SMTP / Supabase email service

Flow:
1. `F → AS:` POST `/api/v1/auth/forgot-password` `{ email }`
2. `AS → SA:` `supabase.auth.resetPasswordForEmail(email)`
3. `SA → E:` Sends password reset email with redirect link
4. `SA → AS:` Returns success (always — even if email doesn't exist in system)
5. `AS → F:` `{ message: "If account exists, reset email sent" }`
6. *(User clicks link)* → `F → SA:` Redirect to reset page with access token in URL
7. `F → AS:` POST `/api/v1/auth/reset-password` `{ password }`
8. `AS → SA:` `supabase.admin.updateUserById(userId, { password })` — admin API required
9. `SA → AS:` Success

Annotate:
- Email-enumeration prevention: always returns success regardless of whether email exists
- 🟡 **Existing sessions not invalidated** — other logged-in devices remain active
- Requires Supabase `service_role` key for password update (admin API)

**Sources:** `auth.service.ts:289`, `auth.routes.ts`, Supabase Auth

---

## C-02: Crypto Verification Sequence (11-Step)

**Type:** Sequence
**Priority:** P0 — Core

Generate a detailed Mermaid sequence diagram of the 11-step `verifyAndRecordBasePayment` flow.

Participants:
- `CPC` — Crypto Payment Controller (`cryptoPayment.controller.ts`)
- `CPS` — Crypto Payment Service (`cryptoPayment.service.ts`)
- `ERC` — Ethereum JSON-RPC Node (Base network)
- `DB` — Supabase DB
- `SC` — PoDMPaymentProtocol Smart Contract (on-chain)

Steps:
1. `CPC → CPS:` `verifyAndRecordBasePayment(paymentInfo)` — receives `{ txHash, fromAddress, expectedAmount, creatorId, paymentType }`
2. `CPS → CPS:` Hash format check — validate `txHash` starts with `0x` followed by 64 hex chars
3. `CPS → CPS:` Dedup check — query `transactions` table for existing `txHash`
4. `CPS → DB:` Fetch creator's wallet address from `profiles.crypto_wallet`
5. `CPS → CPS:` Network selection — choose RPC URL based on `CHAIN_ID` env var
6. `CPS → ERC:` `eth_getTransactionReceipt(txHash)` — JSON-RPC call
7. `ERC → CPS:` Transaction receipt — `{ status, to, logs[], ... }`
8. `CPS → CPS:` **Receipt status check** — `status !== '0x1'` → reject with "Transaction failed or was reverted"
9. `CPS → CPS:` **Contract address match** — `receipt.to.toLowerCase() !== contractAddress.toLowerCase()` → reject
10. `CPS → CPS:` **Event parsing** — check `logs[0].topics[2]` = expected recipient address (padded), decode `logs[0].data` to extract amount
11. `CPS → CPS:` **Amount match** — compare decoded amount with `expectedAmount` (1¢ tolerance for rounding)
12. `CPS → CPS:` **Fee calculation** — `platformFee = amount * DEFAULT_COMMISSION_RATE(12.5%) / 100`, `creatorPayout = amount - platformFee`
13. `CPS → DB:` INSERT into `transactions` — `{ txHash, fromAddress, toAddress, amount, platformFee, creatorPayout, paymentType, creatorId, status: 'completed' }`
14. `CPS → CPC:` Return success with transaction record

Annotate at step 2:
- 🔴 **CRITICAL SANDBOX BYPASS**: If `txHash` starts with `0x0000`, the service **skips all on-chain verification** and directly creates a verified transaction record. Any authenticated user can create fake transactions by submitting `0x0000` + arbitrary data. (Source: `cryptoPayment.service.ts:105-108`)

**Sources:** `cryptoPayment.service.ts:80-267`, `transaction.model.ts`, `08-crypto-deep-dive.md`, `10-internal-workflows.md §11`, `11-data-flow.md §6`

---

## C-03: Subscription State Diagram

**Type:** State
**Priority:** P1

Generate a Mermaid state diagram for the subscription lifecycle.

States:
- `active` — Initial state after crypto payment verification and DB record creation. Fan has access to subscriber-only content.
- `canceled` — Fan requests cancellation via `subscription.service.ts`. `status` set to `canceled`, `canceled_at` timestamped.

Transitions:
- `[initial] → active`: Crypto payment verified → transaction recorded → subscription created with `status: 'active'`
- `active → canceled`: Fan calls cancel subscription endpoint → service updates status

Annotate:
- ⚠️ **No `expired` state** — subscriptions never auto-expire (no renewal/billing cycle)
- ⚠️ **No `paused` state** — no pause/resume functionality
- ⚠️ **No billing renewal** — one-time crypto payment grants permanent access
- The `stripe_subscription_id` column in the subscriptions table is **repurposed** to store the crypto transaction hash

**Sources:** `subscription.service.ts`, `subscription.model.ts`, `11-data-flow.md §5`

---

## C-04: Tipping & PPV Payment Flow

**Type:** Sequence
**Priority:** P1

Generate a Mermaid sequence diagram for tipping and PPV (pay-per-view) unlock flows.

Participants:
- `F` — Frontend (React)
- `W` — Crypto Wallet (browser extension — mocked)
- `SC` — PoDMPaymentProtocol Smart Contract
- `CPC` — Crypto Payment Controller
- `CPS` — Crypto Payment Service
- `DB` — Supabase DB
- `CS` — Content Service (`content.service.ts`)

Tipping flow:
1. `F → W:` Fan clicks "Send Tip" — calls `payTip(creatorWallet, amount, metadata)`
2. `W → SC:` Signs and broadcasts `payTip()` transaction on-chain
3. `SC → W:` Returns `txHash`
4. `F → CPC:` POST `/api/v1/payments/crypto/verify` `{ txHash, fromAddress, expectedAmount, creatorId, paymentType: 'tip' }`
5. `CPC → CPS:` `verifyAndRecordBasePayment(paymentInfo)` — 11-step verification (see C-02)
6. `CPS → DB:` Transaction recorded
7. `CPS → CPC:` Success
8. `CPC → F:` Tip confirmed

PPV flow:
4a. `F → SC:` Fan calls `payPPV(contentId, creatorWallet, amount)`
5a. `F → CPC:` POST `/api/v1/payments/crypto/verify` `{ txHash, paymentType: 'ppv' }`
6a. `CPS → CPS:` After verification — checks `paymentType` → calls content.service to unlock
7a. `CPS → CS:` `contentService.unlockContentForFan(fanId, contentId)`
8a. `CS → DB:` INSERT or update unlock record

Annotate:
- 🟡 Frontend also calls dead Stripe endpoints (`POST /api/v1/payments/tip`, `POST /api/v1/payments/unlock-post`) that return 404
- Wallet interaction is **mocked** in current frontend (`useCryptoWallet.ts` returns fake txHash)

**Sources:** `cryptoPayment.service.ts`, `cryptoPayment.controller.ts`, `apiClient.ts` (dead endpoints), `11-data-flow.md §6`, `08-crypto-deep-dive.md`

---

## C-05: Payout & Earnings Flow

**Type:** Sequence
**Priority:** P1

Generate a Mermaid sequence diagram for creator payout requests.

Participants:
- `F` — Frontend (Creator Dashboard)
- `CC` — Creator Controller (`creator.controller.ts`)
- `CS` — Creator Service (`creator.service.ts`)
- `DB` — Supabase DB (transactions, profiles tables)
- `CPS` — Crypto Payment Service (`cryptoPayment.service.ts`)
- `O` — Off-ramp service (MOCKED)

Flow:
1. `F → CC:` POST `/api/v1/creators/payout` — creator requests withdrawal of available earnings
2. `CC → CS:` `requestPayout(creatorId, amount)`
3. `CS → DB:` Aggregate earnings — `SELECT SUM(creator_payout) FROM transactions WHERE creator_id = ? AND status = 'completed'`
4. `CS → DB:` Subtract previous payouts — `SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE creator_id = ? AND type = 'payout'`
5. `CS → CS:` **Balance check** — `availableBalance = totalEarnings - totalPayouts`; if `amount > availableBalance`, reject
6. `CS → CPS:` `processPayout(creatorWallet, amount)` — delegates to crypto payment service
7. `CPS → O:` Calls off-ramp service to convert platform balance to fiat/crypto and send to creator
8. `O → CPS:` **MOCKED** — always returns `{ success: true, offRampTransferId: 'tr_offramp_<random>' }`
9. `CPS → DB:` Create negative transaction record — `{ type: 'payout', amount: -amount, ... }`
10. `CPS → CS:` Return with offRampTransferId
11. `CS → CC:` Return payout success
12. `CC → F:` Payout confirmed with transfer ID

Annotate:
- 🔴 **Off-ramp is fully mocked** — no real money movement
- 🟡 **Balance race condition** — no DB-level locking between step 3 and step 6; concurrent payout requests could double-spend
- 🟡 **No minimum payout threshold** — any amount can be requested (even $0.01)

**Sources:** `creator.service.ts:389-424`, `cryptoPayment.service.ts:272-301`, `11-data-flow.md §7`, `10-internal-workflows.md §20`

---

## C-06: Platform Fee Calculation Flow

**Type:** Flowchart
**Priority:** P2

Generate a Mermaid flowchart showing how the 12.5% platform fee flows from configuration to per-transaction recording.

Nodes:
1. **Constant**: `DEFAULT_COMMISSION_RATE = 12.5` in `lib/constants.ts`
2. **Transaction entry**: `cryptoPayment.service.ts:verifyAndRecordBasePayment`
3. **Fee calculation**: `platformFee = Math.round(amount * DEFAULT_COMMISSION_RATE / 100)`
4. **Creator payout**: `creatorPayout = amount - platformFee`
5. **DB record**: INSERT into `transactions` with `platform_fee` and `creator_payout` columns
6. **Platform treasury**: Fee accrues in platform treasury (no separate treasury table — fees are implicit in transaction data)
7. **Eventual payout**: When creator requests payout, platform sends `creatorPayout` (aggregated)

Annotate:
- 🟡 **Enclave 10% override**: Not yet implemented — `enclave_applications` table has `status` column but no fee override logic
- 🟡 **Per-creator commission override**: Not yet implemented — `profiles.commission_rate` is nullable and unused
- The 12.5% is hardcoded in `cryptoPayment.service.ts` via import from `constants.ts` — no runtime configurability

**Sources:** `lib/constants.ts`, `cryptoPayment.service.ts`, `transaction.model.ts`, `08-crypto-deep-dive.md`, `10-internal-workflows.md §14`

---

## C-07: Referral Bonus Awarding Flow

**Type:** Flowchart
**Priority:** P2

Generate a Mermaid flowchart showing the full referral bonus lifecycle.

Paths:
1. **Code Generation**: 
   - `referral.model.ts` generates `{USERNAME}-CASH` or `{USERNAME}-PERCENT`
   - Cash type: fixed bonus per referred spender
   - Percent type: % of referred user's spending
   - `uses_count` column tracks redemption count

2. **Signup Validation**:
   - New user submits referral code during signup
   - `auth.service.ts` validates code exists and is active
   - Calls `referral.model.ts:trackReferralUse(code)` — increments `uses_count`

3. **Bonus Awarding** (separate async flow):
   - When referred user makes a payment → check if they used a referral code
   - `awardReferralBonus(referralCode, referredUserId, paymentAmount)`
   - Cash: `bonus = fixedAmount`
   - Percent: `bonus = paymentAmount * percentRate / 100`

4. **Milestone Check**:
   - Did referrer reach $750 total earnings?
   - Is the 30-day window since first referral still open?
   - Is the $25 speed bonus applicable (first referral within 7 days)?

Annotate:
- 🔴 **No actual payout mechanism**: Bonus amounts are calculated and logged but never disbursed
- 🟡 **2 unprotected routes**: `/api/v1/referrals/*` routes lack `protect` middleware
- 🟡 **PII in codes**: Username embedded directly in referral code string

**Sources:** `referral.model.ts`, `auth.service.ts` (signup integration), `11-data-flow.md §12`, `10-internal-workflows.md §26`

---

## C-08: Smart Contract Structure (PoDMPaymentProtocol)

**Type:** Class
**Priority:** P2

Generate a Mermaid class diagram for the Solidity smart contract `PoDMPaymentProtocol.sol`.

Show:
```
class PoDMPaymentProtocol {
  - address owner
  - address platformTreasury
  - uint256 platformFeeBps

  + paySubscription(address creator, uint256 amount) external
  + payTip(address creator, uint256 amount) external  
  + payPPV(bytes32 contentId, address creator, uint256 amount) external
  + updateTreasury(address newTreasury) external onlyOwner
  + updateFee(uint256 newFeeBps) external onlyOwner

  event PaymentSent(address indexed from, address indexed to, uint256 amount, PaymentType paymentType)
  event TipSent(address indexed from, address indexed creator, uint256 amount)
  event PPVUnlocked(address indexed from, bytes32 indexed contentId, uint256 amount)
  event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury)
  event FeeUpdated(uint256 oldFee, uint256 newFee)

  enum PaymentType { Subscription, Tip, PPV }
}
```

Relationships:
- Contract uses ERC-20 `transferFrom` to pull USDC from sender
- Owner can update treasury address and fee
- Contract is **immutable** — no upgrade mechanism

Annotate:
- ⚠️ `PaymentType` enum exists in event definitions but is **not stored on-chain** with each payment
- ⚠️ No `SubscriptionExpired` or `SubscriptionCancelled` events
- The contract lacks a `pause` mechanism for emergency stops

**Sources:** `PoDMPaymentProtocol.sol`, `08-crypto-deep-dive.md`

---

## D-02: Content Access Control Decision Tree

**Type:** Flowchart
**Priority:** P1

Generate a Mermaid flowchart of the content access decision pipeline in `content.service.ts:461-502`.

Decision node sequence:
1. **Is viewer the creator?** → Yes → **FULL ACCESS** (no restrictions)
2. **Is content `subscribers_only`?** → No → Check if PPV → No → **FULL ACCESS** (public content)
3. **Is content `subscribers_only`?** → Yes → **Does fan have active subscription?** → No → **LOCKED — subscribe prompt**
4. **Does fan have active subscription?** → Yes → **Is `min_tier_level` set?** → No → **UNLOCKED — subscriber access granted**
5. **Is `min_tier_level` set?** → Yes → **Does fan's subscription tier meet requirement?** → No → **LOCKED — tier upgrade prompt**
6. **Tier met** → Yes → **Is content PPV?** → No → **UNLOCKED — subscriber access granted**
7. **Is content PPV?** → Yes → **Has fan purchased this content?** → Check transaction table for fan_id + content_id + type='ppv'
8. **Has fan purchased?** → Yes → **UNLOCKED** (with watermark overlay if photo)
9. **Has fan purchased?** → No → **LOCKED — PPV purchase prompt** (show blurred preview/placeholder)

Annotate:
- 🔴 **CSS-blur bypass**: Client-side blur can be removed via browser DevTools; server never serves full content without access check
- 🟡 **Watermark security degradation**: If any watermarking step fails, original file is served (see D-04)

**Sources:** `content.service.ts:461-502`, `subscription.model.ts`, `transaction.model.ts`, `11-data-flow.md §4`, `10-internal-workflows.md §9`

---

## D-03: Content Upload Pipeline (Media Processing)

**Type:** Sequence
**Priority:** P1

Generate a detailed Mermaid sequence diagram of the content upload pipeline.

Participants:
- `F` — Frontend (BulkUploadPage or single upload form)
- `UM` — Upload Middleware (`upload.middleware.ts` — Multer)
- `CS` — Content Service (`content.service.ts`)
- `SS` — Storage Service (`storage.service.ts` — R2)
- `R2` — Cloudflare R2
- `DB` — Supabase DB
- `NS` — Notification Service (`notification.service.ts`)

Flow per file:
1. `F → UM:` POST `/api/v1/content` with `multipart/form-data` (file + metadata)
2. `UM → UM:` Multer parses multipart — stores file in memory buffer (1GB limit)
3. `UM → UM:` MIME type filter — only `image/*` and `video/*` allowed
4. `UM → CS:` Passes `req.file` (buffer) and `req.body` (metadata)
5. `CS → SS:` `uploadToPrivate(originalKey, buffer, mimeType)` — **3 retries with exponential backoff**
6. `SS → R2:` `s3.putObject({ Bucket, Key, Body, ContentType })`
7. `R2 → SS:` Upload result (ETag)
8. `CS → CS:` **If image**: `sharp(buffer).resize(400, 400).webp({ quality: 80 })` → thumbnail buffer
9. `CS → CS:` **If video**: `ffmpeg(buffer).seek(1).frames(1).size('400x?')` → thumbnail buffer via `fluent-ffmpeg`
10. `CS → SS:` `uploadToPrivate(thumbnailKey, thumbnailBuffer, 'image/webp')`
11. `SS → R2:` Upload thumbnail
12. `CS → CS:` Assemble file URLs: `{ originalUrl, thumbnailUrl, contentType }`
13. `CS → DB:` INSERT into `content` table with URLs, metadata, and `status: 'published'`
14. **If DB insert fails**: `CS → SS:` **Cleanup** — delete both original and thumbnail from R2
15. `CS → NS:` `notifySubscribersOfNewContent(creatorId, contentId)` — fire-and-forget
16. `CS → F:` Return created content record

Annotate:
- 🔴 **1GB memory buffer**: Entire file loaded into RAM before upload; risk of OOM for large files
- 🟡 **Synchronous thumbnail generation**: Blocks the request until both upload and thumbnail are complete
- 🟡 **No CDN cache layer**: Signed URLs generated per-request; no Cloudflare cache integration

**Sources:** `content.service.ts:168-311`, `storage.service.ts`, `sharp`, `fluent-ffmpeg`, `ContentModel`, `10-internal-workflows.md §7`, `11-data-flow.md §3`

---

## D-04: Dynamic Watermarking Sequence

**Type:** Sequence
**Priority:** P1

Generate a Mermaid sequence diagram for the on-the-fly watermarking of photo content.

Participants:
- `F` — Frontend
- `CS` — Content Service (`content.service.ts`)
- `SS` — Storage Service (`storage.service.ts`)
- `R2` — Cloudflare R2

Flow:
1. `F → CS:` GET `/api/v1/content/:id/watermarked` — fan requests to view a photo
2. `CS → CS:` Access control check (see D-02) — is fan the creator? → skip watermark. Is content public/subscriber/PPV?
3. **If photo + not creator**: proceed to watermark
4. `CS → SS:` `downloadFromPrivate(originalKey)` — download full-resolution original from private R2 bucket
5. `SS → R2:` `s3.getObject({ Bucket, Key })`
6. `R2 → SS:` Returns file buffer
7. `CS → CS:` `sharp(buffer)` — composite SVG text `@{username}` tiled across image, 25% opacity, diagonal
8. `CS → CS:` Convert to WebP format
9. `CS → SS:` `uploadToPrivate(tempKey, watermarkedBuffer, 'image/webp')` — upload to `temp/wm-{fanId}-{timestamp}`
10. `SS → R2:` Upload
11. `CS → SS:` `getPrivateSignedUrl(tempKey, 60)` — get 60-second signed URL
12. `SS → R2:` `s3.getSignedUrl('getObject', { Key, Expires: 60 })`
13. `R2 → SS:` Returns signed URL
14. `SS → CS:` Signed URL
15. `CS → F:` 302 redirect or return signed URL to watermarked image

Annotate:
- 🔴 **Security degradation fallback**: If any watermarking step fails (sharp error, R2 download failure, etc.), the **original unwatermarked file is served** instead
- 🟡 Temp files are never cleaned up (no TTL on `temp/` prefix)

**Sources:** `content.service.ts:41-99`, `storage.service.ts` (downloadFromPrivate, uploadToPrivate), `sharp`, `10-internal-workflows.md §8`, `11-data-flow.md §4`

---

## D-05: AI Caption Generation Flow

**Type:** Sequence
**Priority:** P1

Generate a Mermaid sequence diagram for AI-powered caption generation.

Participants:
- `F` — Frontend (BulkUploadPage.tsx / DraftCard.tsx)
- `AC` — AI Controller (`ai.controller.ts`)
- `AS` — AI Service (`ai.service.ts`)
- `AI` — OpenRouter / OpenAI API (model: gemma-3-27b-it:free)
- `DB` — Supabase DB

Flow:
1. `F → AC:` POST `/api/v1/ai/caption` — sends image file (multipart) + optional context
2. `AC → AC:` Multer middleware — stores image in memory buffer
3. `AC → AS:` `generateCaption(imageBuffer, context?)`
4. `AS → AS:` Base64 encode the image buffer — `imageBuffer.toString('base64')`
5. `AS → AI:` OpenAI SDK call with model `gemma-3-27b-it:free`
   - Content includes: `{ type: 'image_url', image_url: { url: \`data:image/jpeg;base64,${base64}\` } }`
   - System prompt: "Generate a short engaging caption for this image"
6. `AI → AS:` Returns generated caption text (synchronous HTTP wait)
7. `AS → AC:` Caption text
8. `AC → F:` `{ caption: "Generated caption text..." }`
9. `F → F:` Caption appears in textarea — creator can edit, accept, or regenerate
10. *(Later)* `F → AC:` POST `/api/v1/content` — caption saved as `content.description`

Annotate:
- 🔴 **No NSFW pre-check**: Image sent to third-party API without any content moderation pre-scan
- 🔴 **No audit trail**: No record of what was sent to the AI API or what was generated
- 🟡 **No retry / idempotency**: If AI API fails (429, 5xx), error propagates to user; no automatic retry
- 🟡 **Synchronous**: Frontend shows loading spinner until API responds; no streaming or background processing

**Sources:** `ai.service.ts`, `ai.controller.ts`, `ai.routes.ts`, `BulkUploadPage.tsx`, `DraftCard.tsx`, `10-internal-workflows.md §3`, `11-data-flow.md §9`

---

## D-06: Content Lifecycle State Diagram

**Type:** State
**Priority:** P1

Generate a Mermaid state diagram for the content lifecycle.

States:
- `draft` — Creator creates content but doesn't publish. Content visible only to creator in dashboard.
- `published` — Content is visible to audience based on access control rules. Set via `status: 'published'`.
- `flagged` — Auto-flagged status after 3 user reports. Content hidden pending admin review.
- `removed` — Admin action. Content permanently inaccessible to all users.

Transitions:
- `[initial] → draft`: Creator POSTs content with `status: 'draft'`
- `draft → published`: Creator publishes (immediate) or scheduled date reached
- `published → flagged`: 3 user reports received (auto-flag in `content.service.ts:reportContent`)
- `flagged → published`: Admin approves content (reports auto-dismissed)
- `flagged → removed`: Admin removes content
- `published → removed`: Admin directly removes content (bypasses flagging)
- `removed → published`: Admin restores content

Annotate:
- ⚠️ **No `deleted` state** — hard delete only (DELETE endpoint removes permanently)
- ⚠️ **No `scheduled` state** — scheduling uses `scheduled_date` column but content stays in `draft` until cron/publish
- ⚠️ **No `archived` state** — no soft-delete mechanism

**Sources:** `content.service.ts`, `ContentModel`, `10-internal-workflows.md §22`, `11-data-flow.md §3`

---

## D-07: Bulk Upload Pipeline

**Type:** Sequence
**Priority:** P2

Generate a Mermaid sequence diagram of the reusable bulk upload flow.

Participants:
- `U` — User (Creator)
- `BUP` — BulkUploadPage.tsx
- `DZ` — DropZone.tsx
- `DC` — DraftCard.tsx
- `API` — apiClient.ts (generateCaption, createContent)
- `BE` — Backend API

Flow:
1. `U → BUP:` Opens BulkUploadPage — empty state with DropZone
2. `BUP → DZ:` Renders Drag & Drop zone (react-dropzone, accepts `image/*` + `video/*`)
3. `U → DZ:` Drops files (or clicks to select)
4. `DZ → BUP:` `onDrop(acceptedFiles[])` — multiple files
5. `BUP → BUP:` For each file: generate local UUID → `URL.createObjectURL(file)` for preview
6. `BUP → DC:` Creates DraftCard per file — shows thumbnail/preview + caption input + AI button
7. `U → DC:` Clicks "AI Caption" on a draft
8. `DC → API:` `generateCaption(file)` → POST `/api/v1/ai/caption` (see D-05)
9. `API → BE:` Forward request
10. `BE → API:` Caption response
11. `API → DC:` Caption displayed in textarea
12. *(5s delay between AI caption requests, 30s delay on 429)*
13. `U → BUP:` Clicks "Publish All"
14. `BUP → DC:` Iterates all DraftCards
15. For each draft: `DC → API:` `createContent(FormData)` → POST `/api/v1/content`
16. `API → BE:` Forward multipart upload (see D-03)
17. `BE → API:` Content record
18. `API → DC:` Content created — update status to "Published"
19. `BUP → U:` Shows final status per draft (success/failure)

Annotate:
- 🟡 Sequential per-draft upload means long wait times for many files
- 🟡 No background queue — all processing happens in browser
- 🟡 No retry on individual draft failure — "Publish All" fails at first error unless error-handled

**Sources:** `BulkUploadPage.tsx`, `DropZone.tsx`, `DraftCard.tsx`, `apiClient.ts` (generateCaption, createContent), `11-data-flow.md §3`

---

## D-08: Content Signed URL Generation Flow

**Type:** Sequence
**Priority:** P3

Generate a Mermaid sequence diagram for signed URL generation for content files.

Participants:
- `CU` — Content Utils (`content.utils.ts`)
- `SS` — Storage Service (`storage.service.ts`)
- `R2` — Cloudflare R2

Flow:
1. *(Caller)* → `CU:` `generateSignedUrlsForContent(content)` — takes a content record with file array
2. `CU → CU:` Iterate over `content.files[]` array
3. For each file:
   - `CU → CU:` Check if URL already starts with `http` (already public) → skip, return as-is
   - `CU → SS:` `getPrivateSignedUrl(path, 3600)` — for non-public files
4. `SS → R2:` `s3.getSignedUrl('getObject', { Bucket, Key, Expires: 3600 })` — AWS SDK v3
5. `R2 → SS:` Returns signed URL (valid for 3600 seconds = 1 hour)
6. `SS → CU:` `{ signedUrl, contentType }`
7. `CU → CU:` Collect all URLs into array
8. `CU → *(Caller)*:` `{ files: [{ signedUrl, contentType }, ...] }`

Annotate:
- 🟡 **60-second vs 3600-second discrepancy**: Watermarked images use 60s expiry (see D-04), content files use 3600s. No documented reason for difference.
- ⚠️ Signed URLs are generated per-request — no caching layer; every page load triggers `n` S3 calls for `n` files

**Sources:** `content.utils.ts`, `storage.service.ts`, `10-internal-workflows.md §16`
