# Internal Workflows

**Purpose:** Catalog every backend process the end user never sees — background processing, validation, data transformation, fee calculation, notification delivery, retry logic, and system aggregation.

---

## Table of Contents

1. [R2 Upload with Retry](#1-r2-upload-with-retry)
2. [Database Query Wrappers](#2-database-query-wrappers)
3. [AI Caption Generation — Prompt Construction & LLM Call](#3-ai-caption-generation)
4. [Analytics Event Logging](#4-analytics-event-logging)
5. [Subscriber Notification Delivery](#5-subscriber-notification-delivery)
6. [Enriched Notification Retrieval](#6-enriched-notification-retrieval)
7. [Content Creation with Media Processing](#7-content-creation-with-media-processing)
8. [Dynamic Watermarking for Image Viewing](#8-dynamic-watermarking-for-image-viewing)
9. [Content Access Control — Permission Checks](#9-content-access-control)
10. [Content Enrichment with Unlock Status](#10-content-enrichment-with-unlock-status)
11. [Crypto Transaction Verification](#11-crypto-transaction-verification)
12. [Creator Broadcast Message Delivery](#12-creator-broadcast-message-delivery)
13. [Real-Time Socket.IO Event Dispatching](#13-real-time-socketio-event-dispatching)
14. [Platform Fee Calculation](#14-platform-fee-calculation)
15. [User Profile Reshaping](#15-user-profile-reshaping)
16. [Content Signed URL Generation](#16-content-signed-url-generation)
17. [Subscription Tier Synchronization](#17-subscription-tier-synchronization)
18. [Creator Dashboard Aggregation](#18-creator-dashboard-aggregation)
19. [Creator Analytics Aggregation](#19-creator-analytics-aggregation)
20. [Earnings Summary & Payout Processing](#20-earnings-summary--payout-processing)
21. [Admin Dashboard Aggregation](#21-admin-dashboard-aggregation)
22. [Content Reporting & Auto-Flag](#22-content-reporting--auto-flag)
23. [Auth Signup with Orphan Cleanup](#23-auth-signup-with-orphan-cleanup)
24. [PostgreSQL Stored Procedure Calls](#24-postgresql-stored-procedure-calls)
25. [Email Sending](#25-email-sending)
26. [Referral Bonus & Milestone Awarding](#26-referral-bonus--milestone-awarding)
27. [Subscriber Broadcast — Template Personalization](#27-subscriber-broadcast--template-personalization)
28. [Auth Token Validation & Session Management](#28-auth-token-validation--session-management)
29. [Subscription Lifecycle Management](#29-subscription-lifecycle-management)
30. [Admin Content Moderation Pipeline](#30-admin-content-moderation-pipeline)
31. [Enclave Application Lifecycle](#31-enclave-application-lifecycle)

---

## 1. R2 Upload with Retry

**Purpose:** Upload files to Cloudflare R2 private storage with automatic retry and exponential backoff.

**Entry Point:** `storage.service.ts:25` — `uploadToPrivate(path, buffer, contentType, options?)`

**Execution Steps:**
1. Set `MAX_RETRIES = 3`, `lastError = null`
2. For attempt 1 to 3:
   - Build `PutObjectCommand` targeting `R2_PRIVATE` bucket
   - Send via `r2Client.send(command)`
   - On success → return `{ path, error: null }`
   - On error → log warning, store error
3. Between attempts: wait `500ms × 2^(attempt-1)` = 500ms, 1000ms, 2000ms
4. After all retries exhausted → return `{ path: '', error: lastError }`

**Dependencies:** `@aws-sdk/client-s3` (PutObjectCommand), `r2Client` config, `R2_BUCKETS` env

**Exit Conditions:**
- Success: `{ path, error: null }`
- Failure: `{ path: '', error }` — caller must check `error` field

**Failure Handling:** Returns error object instead of throwing; caller decides next action

**Retries:** 3 attempts with exponential backoff (500ms base)

---

## 2. Database Query Wrappers

**Purpose:** Provide consistent error handling for Supabase operations with automatic null/empty fallbacks. Eliminates ~73 repeated try/catch blocks across 13 model files.

**Entry Point:** `database.ts:10` — `handleQuery<T>`, `handleCount`, `handleList<T>`

**Execution Steps (handleQuery):**
1. Execute the query promise
2. If error: log via `logError` (suppress `PGRST116` — "not found")
3. Return `data as T` or `null`

**Parallel wrappers:**
- `handleCount` → returns `0` on error
- `handleList<T>` → returns `[]` on error
- `createRecord<T>` → returns `null` on error
- `updateRecord<T>` → returns `null` on error
- `deleteRecord<T>` → returns `null` on error
- `findRecordById<T>` → returns `null` on error (silently)
- `countRecords` → returns `0` on error

**Dependencies:** Supabase client, `console.error` for logging

**Exit Conditions:** Typed data or safe default (`null` / `0` / `[]`)

**Failure Handling:** All DB errors caught, logged with `[DB]` prefix, converted to safe defaults. `PGRST116` (no rows) silently returns `null`.

---

## 3. AI Caption Generation

**Purpose:** Construct a multimodal LLM prompt and call OpenAI/OpenRouter to generate a witty social-media caption for an uploaded image or video.

**Entry Point:** `ai.service.ts:23` — `generateCaption(imageUrl: string)`

**Execution Steps:**
1. Check `AI_API_KEY` env var — if missing, return mock caption `"Enjoying the moment! ✨ #vibes (AI Key Missing)"`
2. Select model: `AI_MODEL_ID` env var or default `"google/gemma-3-27b-it:free"`
3. Select base URL:
   - Key starts with `sk-or-v1` → `https://openrouter.ai/api/v1` (OpenRouter)
   - Else → default OpenAI endpoint
4. Construct message:
   - `role: 'user'`, content array with:
     - Text prompt (see below)
     - If `data:video` prefix: `video_url` with URL
     - Else: `image_url` with URL
5. Call `openai.chat.completions.create({ model, messages, max_tokens: 100 })`
6. Extract `response.choices[0]?.message?.content`
7. Fallback if empty: `"Just posted! ✨ #newcontent"`

**Prompt Template:**
> Write ONE witty, enticing caption for this image or video in English only. Do not use foreign characters. Do not provide options. Do not include introductory text like 'Here is a caption'. Just output the caption itself. Use wordplay or double meanings. Include 1-2 emojis and hashtags. Max 20 words.

**Dependencies:** OpenAI SDK v6, OpenRouter API key env var, single model `gemma-3-27b-it:free`

**Exit Conditions:**
- Success: caption string
- Missing API key: mock caption (console.warn)
- API error: thrown `AppError` with upstream status code

**Failure Handling:** Catches all errors, extracts status from `err.status`, `err.error.code`, or defaults to 500, re-throws as `AppError`

---

## 4. Analytics Event Logging

**Purpose:** Log user engagement events (profile visits, post views, gallery adds) and atomically increment content stats.

**Entry Point:** `analytics.service.ts:13` — `logAnalyticsEvent(event)`

**Execution Steps:**
1. If `viewerId` present: fetch viewer profile
2. Skip if viewer is admin or self (creator viewing own content)
3. Insert row into `analytics_events` table: `{ event_type, creator_id, viewer_id, content_id }`
4. If `eventType === 'post_view' && contentId`:
   - Call `supabase.rpc('increment_content_view_count', { content_id_to_update })`

**Dependencies:** `UserModel.findUserById`, `supabase.rpc('increment_content_view_count')`, `analytics_events` table

**Exit Conditions:**
- Success: `{ success: true, message: 'Event logged.' }`
- Insert failure: thrown `AppError(500)`
- RPC failure: silently logged (event still recorded)

**Failure Handling:** Admin/self-view silently skipped. RPC errors logged but don't block event logging.

---

## 5. Subscriber Notification Delivery

**Purpose:** Batch-create notifications for all active subscribers when a creator publishes new content.

**Entry Point:** `notification.service.ts:12` — `notifySubscribersOfNewContent(creatorId, contentId)`

**Triggered by:** `content.service.ts:298-300` — after `createNewContent` succeeds for published (non-scheduled) content

**Execution Steps:**
1. Fetch all subscriptions for this creator
2. Filter to `status === 'active'`
3. If none → return
4. Fetch creator profile info
5. Fetch content info
6. For each active subscriber:
   - Query `profiles` table for `preferences.notifications.newContent` (default: true)
   - If enabled: build `createNotification(...)` promise
7. Execute all promises in parallel: `Promise.all(notificationPromises)`

**Notification payload:** `{ user_id, type: 'new_content', title: "@{username} posted new content", message: content.title, related_content_id, related_user_id, is_read: false }`

**Dependencies:** `SubscriptionModel`, `UserModel`, `ContentModel`, `NotificationModel`, supabase profiles

**Exit Conditions:**
- Success: void (notifications created silently)
- No subscribers: silent return
- Missing data: silent return

**Failure Handling:** Fire-and-forget via `.catch(err => console.error(...))` at content.service.ts:300. Individual notification failures caught per-Promise.

---

## 6. Enriched Notification Retrieval

**Purpose:** Fetch a user's notifications and attach creator profile + content thumbnail data.

**Entry Point:** `notification.service.ts:71` — `getEnrichedNotifications(userId, limit = 20)`

**Execution Steps:**
1. Fetch raw notifications via `NotificationModel.getNotificationsForUser`
2. For each notification:
   - If `related_user_id` exists: fetch creator → attach `{ id, username, profile: { name, avatar } }`
   - If `related_content_id` exists: fetch content → generate signed thumbnail URL

**Dependencies:** `NotificationModel`, `UserModel`, `ContentModel`, `generateSignedUrlsForContent`

**Exit Conditions:** Returns enriched array; missing creator/content data simply omitted

**Failure Handling:** Per-notification enrichment failures skip that field silently

---

## 7. Content Creation with Media Processing

**Purpose:** Handle the complete content creation pipeline — file upload, thumbnail generation, watermark preparation, DB insert, and cleanup on failure.

**Entry Point:** `content.service.ts:168` — `createNewContent(creator_id, contentData, files)`

**Execution Steps:**

```
1. FILE UPLOAD LOOP (per file):
   ├── Generate unique path: {creator_id}/{timestamp}-{originalName}
   ├── Upload original to R2 private (via StorageService.uploadToPrivate)
   │   └── On failure → delete any already-uploaded files → throw 500
   ├── If image: sharp(buffer).resize(400,400,{fit:'inside'}).webp({quality:80})
   │            → upload thumbnail to R2
   └── If video: ffmpeg at 00:00:01.000 (400px wide)
                → upload thumbnail to R2

2. STATUS DETERMINATION:
   ├── Scheduled? → status='scheduled', set publishDate
   └── Else → status='published'

3. PPV VALIDATION:
   └── If pay_per_view → require price > 0 (else throw 400)

4. DB INSERT:
   ├── ContentModel.createContent(assembled record)
   └── On failure → delete ALL uploaded files from R2 → throw 500

5. SUBSCRIBER NOTIFICATION:
   └── If published → fire-and-forget notifySubscribersOfNewContent
```

**Dependencies:** `StorageService` (uploadToPrivate, deleteFromPrivate), `sharp` (image resize/thumb), `fluent-ffmpeg` (video thumb), `ContentModel`, `NotificationService`

**Exit Conditions:**
- Success: new `Content` object
- Upload failure: throws AppError(500), cleans up previously uploaded files
- DB failure: throws AppError(500), cleans up ALL uploaded files

**Failure Handling:** Mid-loop failures trigger cleanup of all uploaded paths. DB failures trigger full storage rollback. Video thumbnail failures fall back to original path. Notifications are fire-and-forget.

**Retries:** Inherits `StorageService.uploadToPrivate` internal retry (3 attempts)

---

## 8. Dynamic Watermarking for Image Viewing

**Purpose:** On-the-fly watermark images with the viewer's username before serving.

**Entry Point:** `content.service.ts:41` — `createWatermarkedImage(content, fan)`

**Execution Steps:**
1. Skip if not an image (`!mimeType.startsWith('image/')`)
2. Download original from R2 private via `StorageService.downloadFromPrivate`
3. Build SVG overlay with `@{fan.username}` text (white, 25% opacity, tiled diagonally)
4. Composite: `sharp(fileBuffer).composite([{ input: svgBuffer, tile: true }])`
5. Convert to WebP (quality 90)
6. Upload watermarked buffer to `temp/wm-{fan.id}-{timestamp}.webp` in R2 private
   - Set `cache-control: max-age=300`
7. Return temp file path

**Dependencies:** `StorageService` (downloadFromPrivate, uploadToPrivate), `sharp`

**Exit Conditions:**
- Success: temp file path in R2
- Non-image or any error: return original path (silent)

**Failure Handling:** All errors caught silently — serves original image without watermark

---

## 9. Content Access Control

**Purpose:** Verify a viewer has permission to access specific content based on subscription, PPV purchase, or tier level.

**Entry Point:** `content.service.ts:461` — `getContentForFan(contentId, fanId)`

**Execution Steps:**
1. Fetch content via `requireContent` guard → throws 404 if not found
2. If viewer is the creator → grant access
3. If `visibility === 'subscribers_only'`:
   - Query active subscriptions for viewer
   - Check `min_tier_level` against subscription tier
   - Throw 403 if not subscribed or tier too low
4. If `visibility === 'pay_per_view'`:
   - Query for Cleared transaction of type PPV Post / PPV Message
   - Throw 403 if not purchased

**Dependencies:** `SubscriptionModel`, `TransactionModel`, `UserModel`

**Exit Conditions:**
- Grant: return content object
- Deny: AppError(403) with specific message
- Not found: AppError(404)
- DB error: AppError(500)

**Failure Handling:** All failures throw AppError with appropriate status codes

---

## 10. Content Enrichment with Unlock Status

**Purpose:** Batch-enrich a content list with signed URLs, unlock status, subscription info, and gallery membership. Avoids N+1 queries.

**Entry Point:** `content.utils.ts:113` — `enrichContentWithUnlockStatus(contentList, viewerId)`

**Execution Steps:**
1. Generate signed URLs for all items (one-time batch)
2. If no viewer → mark all as locked, return
3. Fetch viewer's active subscriptions and transactions **once** (N+1 avoidance)
4. Build `subscribedCreatorIds` Set and `subscribedCreatorTierLevels` Map
5. Build `unlockedContentIds` Set from Cleared PPV transactions
6. For each content item:
   - Creator's own → always unlocked
   - PPV → check `unlockedContentIds`
   - Subscribers-only → check subscription + tier level
   - Public → check hidden PPV price, else unlocked
   - Check gallery membership

**Dependencies:** `SubscriptionModel`, `TransactionModel`, `UserModel`, `generateSignedUrlsForContent`, supabase galleries

**Exit Conditions:** Returns enriched array with `isUnlocked`, `isSubscribedToCreator`, `isLockedByTier`, `inGallery` fields

**Failure Handling:** Gallery lookup errors silently default to `inGallery = false`

---

## 11. Crypto Transaction Verification

**Purpose:** Verify an on-chain USDC transaction against the PoDMPaymentProtocol smart contract across 3 networks (Base/Monad/MegaETH) and record payment.

**Entry Point:** `cryptoPayment.service.ts:80` — `verifyAndRecordBasePayment(input)`

**Execution Steps:**
```
1. DEDUP: Check blockchain_tx_hash uniqueness → 409 if duplicate
2. FORMAT: Validate /^0x([A-Fa-f0-9]{64})$/ → 400 if invalid
3. WALLET: Fetch creator's crypto_wallet_address → 400 if none
4. SANDBOX: If hash starts with 0x0000 → SKIP all on-chain checks
5. NETWORK: Select RPC + contract by creator's payout preference
   └── base → mainnet.base.org / sepolia.base.org
   └── monad → monad-mainnet.g.allthatnode.com
   └── megaeth → mainnet.megaeth.systems
6. RPC CALL: eth_getTransactionReceipt via axios.post
   ├── Receipt null? → 404 "still pending"
   ├── Status != 0x1? → 400 "failed on-chain"
   ├── receipt.to != contract AND no log matches → 400 "wrong contract"
   ├── topics[2] last 20 bytes != creator wallet → 400 "recipient mismatch"
   └── data[0:32] totalAmount / 10000 != amountInCents (±1) → 400 "amount mismatch"
7. FINANCIAL: platformFee = round(amount * 0.125), creatorPayout = amount - fee
8. DB: Create transaction with status='Cleared', payment_method='crypto'
9. METADATA: Set chain_id, blockain_tx_hash, payment_currency='USDC'
```

**Dependencies:** axios (RPC calls), `TransactionModel`, supabase profiles, `DEFAULT_COMMISSION_RATE` (12.5%)

**Exit Conditions:**
- Success: `{ transactionId, status: 'Cleared', txHash, amount }`
- Each failure mode throws specific AppError

**Failure Handling:** RPC connection errors → AppError(503). All other failures AppError with appropriate status codes.

---

## 12. Creator Broadcast Message Delivery

**Purpose:** Send a personalized direct message from a creator to all active subscribers, optionally filtered by minimum tier.

**Entry Point:** `creator.service.ts:500` — `broadcastMessage(creatorId, text, minTierId?)`

**Execution Steps:**
1. Fetch all subscriptions for creator
2. If none → return `{ count: 0 }`
3. If `minTierId` provided:
   - Fetch creator tiers
   - Filter subscriptions to those with tier price >= target tier price
4. For each eligible subscription:
   - Personalize: replace `{{username}}` → fan's display name
   - Call `MessageService.sendDirectMessage(creatorId, fan.id, { text })`
   - Increment sentCount on success
5. Return `{ success: true, count: sentCount }`

**Dependencies:** `SubscriptionModel`, `MessageService.sendDirectMessage`, `getCreatorTiers`

**Exit Conditions:**
- Success: summary with count
- No subscribers: early return with count 0

**Failure Handling:** Individual fan failures caught and logged; loop continues

---

## 13. Real-Time Socket.IO Event Dispatching

**Purpose:** Real-time bidirectional messaging with authenticated connections and room-based conversation events.

**Entry Points:**
- `config/socket.ts:23` — Server init + auth middleware
- `message.service.ts:200` — Event emission after DB operations

**Connection Flow:**
1. Socket.IO server created with CORS (podm.app, *.pages.dev, localhost:5173)
2. Auth middleware validates JWT via `supabase.auth.getUser(token)`
3. On success: `socket.data.userId = authUser.id`
4. Available events: `join_conversation`, `leave_conversation`, `disconnect`

**Message Send Flow (message.service.ts:167):**
1. Find or create conversation
2. Create message in DB
3. Process content (generate signed URLs)
4. Emit `new_message` to `conversation:{id}` room
5. If receiver is admin: also append to active support ticket

**Message Delete Flow (message.service.ts:261):**
1. Find message, verify ownership
2. Delete from DB
3. Emit `message_deleted` to conversation room

**Mark Read Flow (message.service.ts:291):**
1. Update messages in DB
2. Emit `conversation_read` to sender's socket only

**Dependencies:** `socket.io`, `ConversationModel`, `MessageModel`, `UserModel`, `StorageService`, `generateSignedUrlsForContent`

---

## 14. Platform Fee Calculation

**Purpose:** Calculate the platform fee percentage based on the creator's monthly earnings tier, with Enclave member discount.

**Entry Point:** `fee.utils.ts:9` — `calculatePlatformFeePercentage(creatorId, isEnclaveMember = false)`

**Execution Steps:**
1. If Enclave member → return 10%
2. Fetch all current-month transactions for creator
3. Sum `(amount_in_cents - platform_fee)` across transactions
4. Convert to dollars: `totalEarnings / 100`
5. Determine tier:
   - ≤ $5,000/month → 15%
   - $5,001–$10,000/month → 12.5%
   - $10,001+/month → 10%
6. Return percentage

**Supporting:** `calculatePlatformFee(amountInCents, feePercentage)` — returns `Math.round(amount * fee / 100)`

**Default:** `DEFAULT_COMMISSION_RATE = 12.5` (from `lib/constants.ts`)

**Dependencies:** supabase (transactions table)

**Exit Conditions:**
- Success: fee percentage (10, 12.5, or 15)
- DB error: default to 15%

**Failure Handling:** DB errors logged, defaults to highest tier (15%)

---

## 15. User Profile Reshaping

**Purpose:** Transform flat database rows into the nested `User`/`Creator` TypeScript interface expected by the frontend.

**Entry Point:** `user.utils.ts:11` — `reshapeUserForApp(flatUser)`

**Execution Steps:**
1. Destructure all fields from flat row (handles both `fullName` and `full_name` snake_case)
2. Build `baseUser` with: `{ id, username, email, created_at, role, status, profile: { name, avatar, bio } }`
3. If `role === 'creator'`:
   - Determine `verificationStatus` from status + verification_data
   - Safely destructure `creator_data` (or fallback to `{}`)
   - Build `Creator` with extended profile + nested `creator_data`
4. If not creator → return `baseUser as User`

**Called from 23 sites:** auth middleware, auth service, user service, creator service, admin service, content service, message service, subscription service, content.utils, subscription.utils

**Exit Conditions:** Returns `User` or `Creator` object; `null` if input is falsy

---

## 16. Content Signed URL Generation

**Purpose:** Convert private R2 storage paths into temporary, secure, public signed URLs for frontend access.

**Entry Point:** `content.utils.ts:19` — `generateSignedUrlsForContent(post)`

**Execution Steps:**
1. Skip if `post.files` is empty/undefined
2. For each file entry:
   - Check `file.url`: if already HTTP → skip signing
   - Else → call `StorageService.getPrivateSignedUrl(path, 3600)`
   - Same for `file.thumbnailUrl`
3. Return updated post with signed URLs

**URL Validity:** 3600 seconds (1 hour)

**Dependencies:** `StorageService.getPrivateSignedUrl`

**Exit Conditions:** Returns post with signed URLs; placeholder URLs for invalid paths

**Failure Handling:** Failed signing returns placeholder (`https://placehold.co/600x400/...Invalid+Path`); errors logged

---

## 17. Subscription Tier Synchronization

**Purpose:** Replace temporary client-side tier IDs with permanent UUIDs during settings save.

**Entry Point:** `tier.utils.ts:12` — `syncTiersWithStripe(tiers)`

**Execution Steps:**
1. Validate each tier has `name` and `price`
2. For each tier:
   - If no `id` or `id` starts with `'new-'` → generate permanent UUID via `uuidv4()`
   - Build `SubscriptionTier` with `stripePriceId: 'web3_tier'` (default)
3. Return processed tiers array

**Dependencies:** `uuid` package

**Exit Conditions:** Returns processed tiers; throws if tier has no name/price

---

## 18. Creator Dashboard Aggregation

**Purpose:** Gather and compute all metrics for the creator dashboard view.

**Entry Point:** `creator.service.ts:23` — `getDashboardData(creator_id)`

**Execution Steps:**
1. Fetch recent 5 transactions (joined with fan username)
2. Parallel fetch:
   - Total subscriber count
   - New subscribers (last 30 days)
   - Current month earnings (Cleared + Pending, sum creator_payout)
   - Last month earnings
   - Recent 5 content items
   - Profile visit count (from analytics_events)
   - Post view count (from content.stats)
3. Merge transactions + content → sort by date → take top 5 for activity feed
4. Loop last 6 months → sum earnings per month for chart data
5. Assemble: `{ keyMetrics, recentActivity, monthlyEarnings }`

**Dependencies:** `SubscriptionModel`, `TransactionModel`, `ContentModel`, `AnalyticsService.countEventsForCreator`, supabase

---

## 19. Creator Analytics Aggregation

**Purpose:** Compute detailed analytics for the creator analytics page (charts, top content, breakdowns).

**Entry Point:** `creator.service.ts:125` — `getAnalyticsData(creator_id)`

**Execution Steps:**
1. Parallel metric fetch:
   - Total subscribers, new subs (30 days)
   - Revenue this month + prior month
   - Total views, views last 30 days, gallery adds last 30 days
2. Subscriber growth: loop last 6 months, count active at month's end
3. Revenue breakdown: group Cleared transactions by type, sum creator_payout
4. Top content: fetch top 10 by tips, merge PPV earnings per content ID

**Dependencies:** `SubscriptionModel`, `TransactionModel`, `AnalyticsService`, supabase

---

## 20. Earnings Summary & Payout Processing

**Purpose:** Compute lifetime/available/pending earnings and process withdrawal requests.

**Entry Points:**
- `creator.service.ts:328` — `getEarningsData(creator_id)`
- `creator.service.ts:389` — `createPayout(creator_id, amountInCents)`

**getEarningsData Steps:**
1. Fetch all Cleared + Pending transactions for creator
2. Calculate: `availableForPayout = sum(Cleared)`, `pending = sum(Pending)`, `lifetimeEarnings = sum(all)`
3. Fetch last 6 months monthly earnings
4. Fetch detailed transactions with fan names (last 100)

**createPayout Steps:**
1. Verify creator has configured payout wallet (via `CryptoPaymentService.getUserWalletConfig`)
2. Validate amount > 0
3. Recalculate available balance from Cleared transactions (prevents race conditions)
4. Verify `amount <= available`
5. Delegate to `CryptoPaymentService.processDebitCardOffRamp` (mock implementation)
6. Return `{ success, transferId, estimatedArrival }`

**Dependencies:** `TransactionModel`, `CryptoPaymentService`

---

## 21. Admin Dashboard Aggregation

**Purpose:** Aggregate platform-wide metrics for the admin dashboard.

**Entry Point:** `admin.service.ts:31` — `getDashboardStats()`

**Execution Steps (all parallel):**
1. `UserModel.countAllUsers()`
2. `UserModel.countActiveCreators()`
3. `TransactionModel.sumPlatformFeeForPeriod(30)` — platform revenue last 30 days
4. `SupportTicketModel.countOpenTickets()`
5. `UserModel.getNewUsersOverTime(6)` — monthly user growth

**Returns:** `{ keyMetrics: { totalUsers, activeCreators, monthlyRevenue, openTickets }, userGrowth }`

---

## 22. Content Reporting & Auto-Flag

**Purpose:** Record user-submitted content reports and auto-flag content that exceeds threshold.

**Entry Point:** `content.service.ts:740` — `reportContent(userId, contentId, reason)`

**Execution Steps:**
1. Create report via `ReportModel.createReport`
2. Fetch all reports for this content
3. If count >= 3 → update content status to `'flagged'`

**Dependencies:** `ReportModel`, `ContentModel`

---

## 23. Auth Signup with Orphan Cleanup

**Purpose:** Handle user registration with guaranteed cleanup on failure to prevent orphan auth accounts without profiles.

**Entry Point:** `auth.service.ts:23` — `signupAndSubscribe(email, password, name, creatorId, tierId, paymentMethodId)`

**Execution Steps:**
1. Create Supabase Auth user via `supabase.auth.admin.createUser`
2. If user already exists → find and return existing
3. Create row in `public.profiles` table
4. Create Stripe subscription
5. Return `{ user, token }`

**Orphan Prevention (auth.service.ts:97):**
- On any failure after auth user creation:
  - Call `supabase.auth.admin.deleteUser(userId)` — removes auth user
  - Log cleanup action
  - Re-throw original error

**Standard Signup (auth.service.ts:113):**
1. Create auth user
2. Create profile (if profile fails → delete auth user)
3. Check Enclave application linking + referral bonus
4. Return user + token

---

## 24. PostgreSQL Stored Procedure Calls

**Purpose:** Atomic counter updates on content stats JSONB field.

**Entry Points:**
- `analytics.service.ts:37` — after `post_view` event
- `user.service.ts:107` — after gallery add

**Procedures (from `fix_analytics.sql`):**
```sql
increment_content_view_count(uuid)   → stats.views += 1
increment_tip_count(uuid, int)       → stats.tips += amount, stats.tipCount += 1
increment_gallery_count(uuid)        → stats.galleryAdds += 1
```

**Dependencies:** `supabase.rpc()`, PostgreSQL 15+

---

## 25. Email Sending

**Purpose:** Send transactional emails via SMTP.

**Entry Point:** `email.service.ts:36` — `sendEmail(to, subject, text, html?, from?, replyTo?)`

**Execution Steps:**
1. Configure nodemailer transporter with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
2. Build `mailOptions` with `from: 'no-reply@podm.app'`, `to`, `subject`, `text`, `html`, `replyTo`
3. Call `transporter.sendMail(mailOptions)`
4. Return info

**Dependencies:** `nodemailer`, SMTP env vars

**Current status:** **Wired but unused** — no callers exist in the codebase

---

## 26. Referral Bonus & Milestone Awarding

**Purpose:** Generate referral codes, track referrals, award bonuses, and check milestone bonuses.

**Entry Points:**
- `referral.model.ts:100` — `awardReferralBonus(applicationId, applicantUserId)`
- `referral.model.ts:183` — `checkAndAwardMilestoneBonus(userId, totalEarnings)`

**Referral Bonus Flow:**
1. On signup: check if email matches accepted Enclave application
2. If found: link user via `awardReferralBonus`
3. Grant Enclave benefits (`is_enclave_member: true`, 10% fee)
4. If referral code provided (non-Enclave): create virtual application, track referral

**Milestone Bonus Flow:**
1. Check if user has earned ≥ $750
2. Check if bonus already awarded (prevents double-payout)
3. Check if application created < 30 days ago (otherwise bonus expires)
4. If within 14 days: $50 base + $25 speed bonus ($75 total)
5. If 15-30 days: $50 base only

**Dependencies:** supabase, `enclave_applications`, `referrals`, `referral_applications` tables

---

## 27. Subscriber Broadcast — Template Personalization

**Purpose:** Replace template variables in broadcast messages with per-subscriber data.

**Entry Point:** `creator.service.ts:500` — inside `broadcastMessage` loop

**Execution Steps:**
1. For each subscriber, build personalized text:
   - `message.replace('{{username}}', subscriber.displayName)`
2. Delegate to `MessageService.sendDirectMessage(creatorId, fan.id, { text: personalizedText })`

**Template variables available:** `{{username}}`

---

## 28. Auth Token Validation & Session Management

**Purpose:** Validate JWT tokens on every authenticated request and manage session state.

**Entry Point:** `auth.middleware.ts:45` — `protect` middleware

**Execution Steps:**
1. Extract `Bearer` token from `Authorization` header
2. Call `supabase.auth.getUser(token)` — validates JWT with Supabase
3. If invalid/expired → throw `AppError(401, "Not authorized")`
4. If valid → fetch full profile via `findUserById(authUser.id)`
5. Transform via `reshapeUserForApp(profile)`
6. Check `X-Impersonating-User-Id` header:
   - If present AND user is admin:
     - Fetch target user profile
     - Set `req.originalUser = admin` (preserved for audit)
     - Set `req.user = reshapedTargetUser`

**Server-side Supabase client config:**
- `autoRefreshToken: false` — no automatic token refresh
- `persistSession: false` — no session persistence
- Tokens validated fresh on each request (2 Supabase API calls per request)

**Socket.IO auth (socket.ts:44):**
- Same JWT validation on WebSocket connection
- Catches expired/malformed tokens, returns auth error
- Attaches `userId` to socket.data

**No token blacklist or revocation mechanism exists.**

---

## 29. Subscription Lifecycle Management

**Purpose:** Create, retrieve, cancel, and change subscription tier for fan-to-creator subscriptions. No renewal logic exists — subscriptions are static after creation.

**Entry Points:**
- `subscription.service.ts:14` — `createSubscriptionForUser(fan_id, creator_id, tier_id, txHash)`
- `subscription.service.ts:95` — `getFanSubscriptions(fan_id)`
- `subscription.service.ts:108` — `getCreatorSubscribers(creator_id)`
- `subscription.service.ts:131` — `cancelFanSubscription(subscriptionId, fan_id)`
- `subscription.service.ts:173` — `changeSubscriptionTier(subscriptionId, fan_id, newTierId)`

**Create Flow (createSubscriptionForUser):**
1. Fetch creator + validate selected tier exists → 404 if not found, 400 if invalid
2. Call `CryptoPaymentService.verifyAndRecordBasePayment` — on-chain USDC verification of `tier.price * 100` cents
   - This performs the full 11-step crypto verification (dedup, format, wallet, sandbox check, RPC call, receipt validation, amount match)
   - Transaction recorded with type `Subscription`
3. Create subscription in `subscriptions` table: `{ stripe_subscription_id: txHash, fan_id, creator_id, tier_id, status: 'active', start_date, next_billing_date: now + 30 days }`
4. Send welcome DM — if creator configured `welcomeMessage.isActive`, send personalized message + optional free content attachment via `MessageService.sendDirectMessage`
   - Failure is caught and logged; subscription creation not rolled back

**Get Fan Subscriptions (getFanSubscriptions):**
1. Query `SubscriptionModel.findSubscriptionsByFanId`
2. Map each through `reshapeSubscriptionForApp`
3. Return filtered array (null results removed)

**Get Creator Subscribers (getCreatorSubscribers):**
1. Query `SubscriptionModel.findSubscriptionsByCreator`
2. For each subscription, fetch fan profile via `UserModel.findUserById`
3. Attach reshaped fan object to each subscription

**Cancel Subscription (cancelFanSubscription):**
1. Parse `subscriptionId` to integer → 400 if NaN
2. Fetch subscription by ID
3. Verify ownership: `subscription.fan_id !== fan_id` → 404
4. Verify active: `status !== 'active'` → 400
5. Update: `{ status: 'canceled', end_date: now }`
6. Return updated subscription

**Change Tier (changeSubscriptionTier):**
1. Validate subscription ID format → 400 if NaN
2. Fetch + verify ownership + verify `status === 'active'` → 404/400
3. Fetch creator tiers, validate new tier exists → 400 if not found
4. Update subscription `tier_id` to new value
5. Return reshaped subscription

**Dependencies:** `SubscriptionModel`, `UserModel`, `CryptoPaymentService`, `MessageService`, `ContentModel`, `reshapeUserForApp`, `reshapeSubscriptionForApp`

**Exit Conditions:**
- Success: subscription object or array
- Each failure mode throws specific AppError

**Failure Handling:** Create failure propagates from crypto verification. Welcome DM failure silently logged (non-fatal). Cancel/change validated before write.

---

## 30. Admin Content Moderation Pipeline

**Purpose:** Report inappropriate content, auto-flag after threshold, admin review and approve/remove.

**Entry Points:**
- `content.service.ts:740` — `reportContent(userId, contentId, reason)` (user-submitted report)
- `admin.service.ts:83` — `getFlaggedContent()` (admin view)
- `admin.service.ts:109` — `updateContentStatus(contentId, status)` (admin action)

**Report Flow (reportContent):**
1. Create report via `ReportModel.createReport` with `{ user_id, content_id, reason, status: 'pending' }`
2. Fetch all reports for content via `ReportModel.getReportsByContentId`
3. If count >= 3 → update content status to `'flagged'`
4. Return `{ success: true }`

**Admin Review Flow (getFlaggedContent):**
1. Query `ContentModel.findContentByStatus('flagged')`
2. For each flagged content:
   - Fetch reports via `ReportModel.getReportsByContentId`
   - Filter to `status === 'pending'`
   - Attach `reportCount`, top `reason`, `creator` profile
3. Return enriched array

**Admin Action Flow (updateContentStatus):**
1. Update content status to target value (`'published'` or `'removed'`)
2. If new status is `'published'` → auto-dismiss all pending reports via `ReportModel.dismissReportsForContent`
3. Return updated content

**Dependencies:** `ReportModel`, `ContentModel`, `UserModel`

**Exit Conditions:**
- Success: updated content object or enriched array
- Content not found: AppError(404)

**Failure Handling:** Report creation failures propagate as AppError. Auto-flag is inline (not fire-and-forget). Admin review failures throw AppError. Dismissal on approve is non-critical (failure logged).

---

## 31. Enclave Application Lifecycle

**Purpose:** Submit, review, accept, or reject premium Enclave membership applications with capacity cap, referral tracking, and email notifications.

**Entry Points:**
- `enclave.controller.ts:32` — `submitApplication(req)` (fan/creator submit)
- `enclave.controller.ts:123` — `getAllApplications(req)` (admin list)
- `enclave.controller.ts:152` — `updateApplicationStatus(req)` (admin approve/reject)
- `auth.service.ts:145-177` — Enclave integration on signup

**Constants:** `ENCLAVE_MAX_SPOTS = 50`

**Submit Application Flow (submitApplication):**
1. Validate required fields: `fullName, email, currentPlatform, followerCount, contentType, whyJoin, howHeard`
   - `currentPlatform` and `contentType` must be non-empty arrays
   - `whyJoin` max 1000 characters
2. Check duplicate: query `enclave_applications` by email → 409 if exists
3. Check capacity: query accepted count → 400 if >= 50
4. Insert application with status `'pending'` (default)
5. Track referral: if `referralCode` provided, call `ReferralModel.trackReferralUse`
6. Send confirmation email via `EmailService.sendEmail` (non-fatal on failure)
7. Return `{ applicationId, submittedAt }`

**Admin Review Flow (getAllApplications):**
1. Query all applications, ordered by `created_at DESC`
2. Optional `status` query parameter filter
3. Return `{ applications, total }`

**Update Status Flow (updateApplicationStatus):**
1. Validate status: must be `'pending'`, `'accepted'`, or `'rejected'` → 400 if invalid
2. If accepting: re-check capacity → 400 if full
3. Update application: `{ status, notes, reviewed_at: now, reviewed_by: adminId }`
4. On acceptance:
   - Send acceptance email with signup link + Discord invite
   - Create high-priority support ticket for white-glove onboarding via `SupportTicketModel.createSupportTicket`
5. On rejection: send polite rejection email
6. Email failures are caught and logged (non-fatal)

**Signup Integration (auth.service.ts):**
1. On user signup, query `enclave_applications` by email + `status='accepted'`
2. If found: award referral bonus to referrer, set `is_enclave_member=true`, `enclave_joined_at=now()`
3. This grants the 10% reduced platform fee (Enclave discount)

**Dependencies:** Supabase (`enclave_applications` table), `EmailService`, `SupportTicketModel`, `ReferralModel`

**Exit Conditions:**
- Submit: `{ message, applicationId, submittedAt }` with 201
- Admin list: `{ applications, total }`
- Admin update: `{ message, application }`
- Duplicate: AppError(409)
- Capacity full: AppError(400)
- Not found: AppError(404)

**Failure Handling:** All email failures caught and logged (non-fatal to the core operation). Capacity check before both submit and accept prevents over-allocation. Referral tracking failure logged but does not block application.

---

| # | Workflow | File | Entry Point | Retries | Async | DB Writes | External Calls |
|---|---|---|---|---|---|---|---|
| 1 | R2 Upload Retry | `storage.service.ts` | `uploadToPrivate` | 3 exp backoff | ✓ | — | Cloudflare R2 |
| 2 | DB Query Wrappers | `database.ts` | `handleQuery/Count/List` | — | ✓ | — | Supabase |
| 3 | AI Caption Gen | `ai.service.ts` | `generateCaption` | — | ✓ | — | OpenRouter/OpenAI |
| 4 | Analytics Logging | `analytics.service.ts` | `logAnalyticsEvent` | — | ✓ | ✓ | Supabase RPC |
| 5 | Notification Delivery | `notification.service.ts` | `notifySubscribersOfNewContent` | — | fire-and-forget | ✓ | Supabase |
| 6 | Enriched Notifications | `notification.service.ts` | `getEnrichedNotifications` | — | ✓ | — | Supabase |
| 7 | Content Creation | `content.service.ts` | `createNewContent` | via storage | ✓ | ✓ | R2 + Supabase |
| 8 | Watermarking | `content.service.ts` | `createWatermarkedImage` | — | ✓ | — | R2 (R/W) |
| 9 | Access Control | `content.service.ts` | `getContentForFan` | — | ✓ | — | Supabase |
| 10 | Content Enrichment | `content.utils.ts` | `enrichContentWithUnlockStatus` | — | ✓ | — | Supabase |
| 11 | Crypto Verify | `cryptoPayment.service.ts` | `verifyAndRecordBasePayment` | — | ✓ | ✓ | RPC + Supabase |
| 12 | Broadcast | `creator.service.ts` | `broadcastMessage` | — | sequential | ✓ | Supabase |
| 13 | Socket.IO Events | `message.service.ts` | `sendDirectMessage` | — | ✓ | ✓ | Socket.IO |
| 14 | Fee Calculation | `fee.utils.ts` | `calculatePlatformFeePercentage` | — | ✓ | — | Supabase |
| 15 | User Reshaping | `user.utils.ts` | `reshapeUserForApp` | — | — | — | None (pure) |
| 16 | Signed URLs | `content.utils.ts` | `generateSignedUrlsForContent` | — | ✓ | — | R2 (pre-sign) |
| 17 | Tier Sync | `tier.utils.ts` | `syncTiersWithStripe` | — | — | — | None (pure) |
| 18 | Dashboard Agg | `creator.service.ts` | `getDashboardData` | — | parallel | — | Supabase |
| 19 | Analytics Agg | `creator.service.ts` | `getAnalyticsData` | — | parallel | — | Supabase |
| 20 | Earnings + Payout | `creator.service.ts` | `createPayout` | — | ✓ | ✓ | Supabase (mock) |
| 21 | Admin Dashboard | `admin.service.ts` | `getDashboardStats` | — | parallel | — | Supabase |
| 22 | Report + Auto-Flag | `content.service.ts` | `reportContent` | — | ✓ | ✓ | Supabase |
| 23 | Auth Orphan Cleanup | `auth.service.ts` | signup catch block | — | ✓ | ✓ | Supabase Auth |
| 24 | Stored Procedures | `fix_analytics.sql` | RPC calls | — | ✓ | ✓ | PostgreSQL |
| 25 | Email Sending | `email.service.ts` | `sendEmail` | — | ✓ | — | SMTP (**unused**) |
| 26 | Referral Bonus | `referral.model.ts` | `awardReferralBonus` | — | ✓ | ✓ | Supabase |
| 27 | Template Personalization | `creator.service.ts` | broadcastMessage loop | — | sequential | — | None (string) |
| 28 | Token Validation | `auth.middleware.ts` | `protect` | — | ✓ | — | Supabase Auth |
| 29 | Subscription Lifecycle | `subscription.service.ts` | `createSubscriptionForUser` | — | ✓ | ✓ | Supabase + RPC + MessageService |
| 30 | Admin Moderation | `admin.service.ts` + `content.service.ts` | `reportContent` / `getFlaggedContent` | — | ✓ | ✓ | Supabase |
| 31 | Enclave Applications | `enclave.controller.ts` | `submitApplication` / `updateApplicationStatus` | — | ✓ | ✓ | Supabase + EmailService |

---

## Key Observations

**31 workflows total** (previously 28 — added subscription lifecycle, admin moderation, enclave applications).

**Only workflow with retries:** R2 Upload (3 attempts, exponential backoff). No other internal workflow has retry logic.

**Fire-and-forget:** Subscriber notification delivery runs asynchronously with `.catch()` — failures silently logged.

**No queue/broker:** All workflows execute synchronously in the request path (or as unawaited promises). No Bull/Redis/RabbitMQ for background processing.

**Mocked workflows:** Crypto payout (`processDebitCardOffRamp`) is a mock. AI caption uses real API but has a mock fallback. Email sending is wired but has zero callers.

**Most-called internal function:** `reshapeUserForApp` at 23 call sites — every user authentication, profile read, and settings update flows through it.

**Only database rollback:** Content creation (workflow 7) deletes previously uploaded R2 files if any step fails. No other workflow implements rollback.
