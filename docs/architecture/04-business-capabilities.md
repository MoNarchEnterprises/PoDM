# Business Capabilities

**Purpose**: Business-oriented analysis of the PoDM creator-fan subscription platform. Identifies every distinct business capability, who uses it, how it works, and what it depends on. Ignores code organization — focuses on business value delivered.

**Date**: 2026-07-02
**Version**: 1.0.0
**Confidence**: High

---

## Capability Inventory

| # | Capability | Primary Users | Revenue Impact |
|---|---|---|---|---|
| 1 | Identity & Access Management | All users, platform | Enabling (prerequisite) |
| 2 | Creator Onboarding & Verification | Creators, Admin | Enabling (trust) |
| 3 | Content Publishing | Creators | Core (product) |
| 4 | Content Access Control (Gating) | Creators, Fans | Core (monetization) |
| 5 | Subscription Commerce | Creators, Fans | Primary revenue |
| 6 | Tipping & Pay-Per-View | Creators, Fans | Secondary revenue |
| 7 | Payment Processing | All users, Platform | Core (revenue capture) |
| 8 | Payout Management | Creators, Platform | Core (creator retention) |
| 9 | Direct Messaging | Creators, Fans | Engagement |
| 10 | Subscriber Broadcast | Creators | Engagement |
| 11 | Notifications | All users | Engagement |
| 12 | Personalized Feed | Fans | Engagement (discovery) |
| 13 | Fan Gallery | Fans | Engagement (curation) |
| 14 | Contests | Creators, Fans | Engagement (growth) |
| 15 | Referral Program | All users, Platform | Growth |
| 16 | Enclave Membership | All users, Platform | Premium tier |
| 17 | Customer Support | All users, Admin | Retention |
| 18 | Platform Administration | Admin | Governance |
| 19 | Business Intelligence | Creators, Admin | Retention (insight) |
| 20 | AI Content Tools | Creators | Productivity |
| 21 | Fiat-to-Crypto On-Ramp | Fans | Enabling (crypto ecosystem) |
| 22 | Recurring Billing & Renewal | Platform, Creators, Fans | Core (revenue continuity) |

---

### 1. Identity & Access Management

**Purpose**: Register, authenticate, and authorize users across three roles (fan, creator, admin). Foundation for all other capabilities.

**Primary users**: All users (unauthenticated visitors, fans, creators, admins).

**Major workflows**:
- User signs up with email, password, username, and role
- User logs in with email/password, receives JWT token
- User changes password or resets forgotten password via email
- Authenticated user retrieves their session/profile via token
- Admin impersonates another user for support/debug purposes
- Middleware validates JWT on every protected request and enforces role-based access
- User role gates access to creator or admin features

**Dependencies**:
- Supabase Auth for password hashing, token generation, email verification
- Backend middleware validates tokens on every protected route
- Frontend stores token in localStorage and attaches to API requests

**Related modules**: Auth routes, controller, service; auth middleware; frontend useAuth hook; frontend apiClient interceptor.

**Database entities**: `profiles` (id, email, username, role, status), Supabase `auth.users` (managed by Supabase).

**APIs**: `POST /api/v1/auth/signup`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`, `PUT /api/v1/auth/change-password`, `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/signup-and-subscribe`.

**External services**: Supabase Auth (JWT management, password hashing).

---

### 2. Creator Onboarding & Verification

**Purpose**: Convert a registered user into a fully functional creator with subscription tiers, profile, and verified identity. Establishes trust for fans and enables payout capability.

**Primary users**: Creators, Platform admin.

**Major workflows**:
- Creator completes onboarding form: bio, subscription tiers (prices, benefits), banner image
- Subscription tiers are synced with Stripe (products and prices created)
- Creator submits identity verification: government ID photo, selfie photo, electronic signature
- Verification documents uploaded to private R2 storage
- Admin reviews submitted documents via signed URLs
- Admin approves/rejects verification, updating user status to `active` or `pending verification`
- Creator profile becomes publicly visible only after onboarding is complete

**Dependencies**:
- Stripe Connect for creator payout account (tier sync)
- R2 private bucket for secure storage of verification documents
- Admin review workflow (manual — no automated verification)

**Related modules**: User routes/controller/service (onboardCreator, submitVerificationDocs), admin routes/controller/service (getVerificationDocs, updateUserStatus), tier.utils, storage service.

**Database entities**: `profiles` (creator_data JSONB with subscriptionTiers, verification_data JSONB with document paths, onboarding_complete, status).

**APIs**: `POST /api/v1/users/me/onboarding`, `POST /api/v1/users/me/verification`, `GET /api/v1/admin/users/:id/verification-docs`, `PUT /api/v1/admin/users/:id/status`.

**External services**: Stripe (product/price creation), Cloudflare R2 (document storage).

---

### 3. Content Publishing

**Purpose**: Creators publish media content (photos, videos, text, audio) to their profile, with automated processing, watermarking, and storage.

**Primary users**: Creators.

**Major workflows**:
- Creator uploads media files (single or batch) with title, description, type, visibility
- Files processed server-side: images resized and watermarked via sharp, video processed via fluent-ffmpeg
- Processed files uploaded to private R2 bucket
- Content record created in database with file metadata array
- If visibility is `subscribers_only`, subscribers are notified automatically
- Creator can edit title/description/visibility after publishing
- Creator can delete content (removes DB record + R2 files)
- Creator can schedule content for future publication (enum supports `scheduled`)

**Dependencies**:
- R2 private bucket for content file storage
- sharp + fluent-ffmpeg for media processing (synchronous, in-process)
- Watermarking asset for branding overlay

**Related modules**: Content routes/controller/service, storage service, notification service (subscriber alert), upload middleware.

**Database entities**: `content` (id, creator_id, title, type, status, visibility, files JSONB, view_count, gallery_add_count).

**APIs**: `POST /api/v1/content`, `PUT /api/v1/content/:id`, `DELETE /api/v1/content/:id`, `GET /api/v1/content/my-content`, `GET /api/v1/content/creator/:username`.

**External services**: Cloudflare R2 (file storage).

---

### 4. Content Access Control (Gating)

**Purpose**: Enforce fan access permissions based on subscription status or one-time payment. Delivers content via time-limited secure URLs.

**Primary users**: Creators (set gating rules), Fans (consume content).

**Major workflows**:
- Creator sets content visibility: `subscribers_only` or `pay_per_view`
- Fan views public content preview (blurred/limited)
- Fan requests full content access via secure URL endpoint
- Backend checks: (a) does fan have active subscription to creator? (b) has fan paid PPV for this content?
- If authorized, backend generates time-limited signed URL from R2 private bucket
- Fan receives URL to view full content (expires after configured duration)
- Unauthorized access returns 403 with unlock options (subscribe or pay)
- Content view events logged to analytics

**Dependencies**:
- Subscription model/transaction model for access checks
- R2 signed URL generation (time-limited)
- Analytics event logging for view tracking

**Related modules**: Content service (getSecureUrlForThumbnail, getSecureUrlForViewing, getContentForFan), content.utils (enrichContentWithUnlockStatus), analytics service, subscription service.

**Database entities**: `content` (visibility, status), `subscriptions` (fan_id, creator_id, status), `transactions` (fan_id, content_id, type=PPV, status=Cleared).

**APIs**: `GET /api/v1/content/:id/secure-url`, `GET /api/v1/content/:id/view`, `GET /api/v1/content/:id/viewer-data`, `GET /api/v1/content/:id`.

**External services**: Cloudflare R2 (signed URL signing).

---

### 5. Subscription Commerce

**Purpose**: Creators offer tiered subscription plans; fans subscribe for recurring access to creator content. Primary revenue model.

**Primary users**: Creators (define tiers), Fans (purchase subscriptions).

**Major workflows**:
- Creator defines subscription tiers during onboarding (name, price, benefits, Stripe price ID)
- Fan browses creator profile, selects a tier
- Fan creates subscription: selects tier, provides payment method (Stripe or crypto)
- Backend creates Stripe subscription or verifies crypto payment
- Subscription recorded in database with status `active`
- Fan receives confirmation + DM from creator
- Fan can change tier (upgrade/downgrade) — Stripe price updated
- Fan can cancel subscription — status set to `canceled`, DM sent to creator
- Subscription expiry/billing managed by Stripe (no server-side billing cron)
- Creator can set custom commission rates (admin override)

**Dependencies**:
- Stripe for recurring billing, payment method management, subscription lifecycle
- Crypto payment service for alternative payment method
- Messaging for subscription confirmation/cancellation notifications

**Related modules**: Subscription routes/controller/service, crypto payment service, message service, tier.utils, user service (onboardCreator syncs tiers).

**Database entities**: `subscriptions` (fan_id, creator_id, tier_id, status, stripe_subscription_id), `transactions` (type=Subscription, amount, status), `profiles` -> creator_data -> subscriptionTiers JSONB.

**APIs**: `POST /api/v1/subscriptions`, `PUT /api/v1/subscriptions/:id`, `DELETE /api/v1/subscriptions/:id`, `GET /api/v1/subscriptions`, `POST /api/v1/auth/signup-and-subscribe`.

**External services**: Stripe (products, prices, subscriptions, payment intents, customers), Base (crypto).

---

### 6. Tipping & Pay-Per-View

**Purpose**: Fans make one-time payments to creators via tips or to unlock individual content items (PPV). Secondary revenue model.

**Primary users**: Fans (purchase), Creators (receive).

**Major workflows**:
- Fan views locked PPV content, sees price
- Fan initiates PPV payment via crypto (smart contract) or Stripe
- Payment verified and transaction recorded
- Fan gains access to content (works with content access control)
- Fan sends a tip to a creator (one-time payment, no content association)
- Tip amount processed, fee deducted, recorded as transaction
- Both PPV and tip transactions appear in creator earnings

**Dependencies**:
- Content access control (PPV requires access check after payment)
- Transaction model for record-keeping
- Smart contract (PoDMPaymentProtocol.payPPV, payTip) for crypto payments
- Stripe PaymentIntents for fiat payments

**Related modules**: Content service (getContentForFan checks PPV), crypto payment service, subscription service (verifyAndRecordBasePayment is shared), tip modal (frontend), unlock modal (frontend).

**Database entities**: `transactions` (type=Tip, PPV Message, PPV Post, amount, status, content_id), `content` (visibility=pay_per_view).

**APIs**: `POST /api/v1/payments/crypto/verify`, `POST /api/v1/payments/crypto/wallet` (wallet setup is prerequisite).

**External services**: Stripe, Base blockchain, Ethereum smart contract.

---

### 7. Payment Processing

**Purpose**: Accept and verify payments from fans across multiple payment methods (credit card via Stripe, cryptocurrency via Base/Ethereum). Captures platform commission.

**Primary users**: Fans (pay), Platform (process, take commission).

**Major workflows**:
- Fan selects payment method: credit card (Stripe) or crypto wallet (Base/Ethereum USDC)
- For Stripe: payment intent created, frontend confirms with Stripe Elements, backend verifies
- For crypto: fan submits transaction hash from wallet, backend verifies on BaseScan API
- Platform fee calculated (default 12.5% commission, configurable per-creator)
- Transaction recorded in database with type, amount, fee, status
- On-chain payments go through PoDMPaymentProtocol smart contract (splits payment between creator and platform treasury)
- Payment verification is synchronous — fan waits for confirmation

**Dependencies**:
- Stripe SDK (inline initialized in multiple services)
- BaseScan API for transaction hash verification
- Ethereum RPC for smart contract interaction
- PoDMPaymentProtocol.sol for on-chain payment splitting

**Related modules**: Crypto payment service, subscription service, tier.utils, fee.utils, frontend useStripePayment hook, frontend useCryptoWallet hook.

**Database entities**: `transactions` (type, amount, fee, platform_fee, status, creator_id, fan_id, content_id).

**APIs**: `POST /api/v1/payments/crypto/verify`, `GET /api/v1/payments/crypto/wallet`, `POST /api/v1/payments/crypto/wallet`.

**External services**: Stripe, BaseScan API, Ethereum RPC, Coinbase API (gas estimation).

---

### 8. Payout Management

**Purpose**: Creators withdraw accumulated earnings. Platform manages commission, payout scheduling, and fiat off-ramp.

**Primary users**: Creators (withdraw), Platform (administer).

**Major workflows**:
- Creator views earnings dashboard (total earned, pending, available for payout)
- Creator requests payout for available balance
- For fiat: backend initiates Stripe Connect payout to creator's linked debit card or bank account via debit card off-ramp API
- For crypto: backend processes withdrawal via smart contract or direct transfer
- Transaction recorded with type=Payout
- Admin can override individual creator commission rates
- Platform default commission: 12.5% (configurable via platform settings)

**Dependencies**:
- Stripe Connect for fiat payouts
- Debit card off-ramp API for cash-out
- Smart contract for crypto payouts
- Fee calculation utilities

**Related modules**: Creator service (getEarningsData, createPayout), admin service (updateCreatorCommission, getPlatformAnalytics), crypto payment service (processDebitCardOffRamp), fee.utils.

**Database entities**: `transactions` (type=Subscription/Tip/PPV, amount, fee), `platform_settings` (commissionRate), `profiles` -> creator_data (customCommissionRate).

**APIs**: `POST /api/v1/creator/payouts`, `GET /api/v1/creator/earnings`, `PUT /api/v1/admin/users/:id/commission`, `PUT /api/v1/admin/settings/platform`.

**External services**: Stripe Connect, Debit card API.

---

### 9. Direct Messaging

**Purpose**: Private one-to-one messaging between fans and creators. Core engagement feature that drives fan retention.

**Primary users**: Fans (message creators), Creators (message fans back or initiate).

**Major workflows**:
- Fan opens conversation with creator (auto-created if first message)
- Fan sends text message or voice recording
- Message delivered to creator in real-time via Socket.IO
- Creator replies, continuing the conversation thread
- Fan or creator can delete their own messages (soft-delete)
- Conversations listed with last message preview and unread count
- Participant can mark conversation as read
- Voice messages: recorded in browser, uploaded to R2, sent as message with audio URL

**Dependencies**:
- Socket.IO for real-time delivery (in-memory adapter, single server)
- R2 for voice message storage
- Conversation model for thread management

**Related modules**: Message routes/controller/service, socket config, frontend message UI, frontend useVoiceRecorder hook, frontend socket lib.

**Database entities**: `conversations` (participants), `messages` (conversation_id, sender_id, content JSONB, voice_url, deleted_at).

**APIs**: `GET /api/v1/messages/conversations`, `GET /api/v1/messages/conversations/:conversationId`, `POST /api/v1/messages`, `DELETE /api/v1/messages/:id`, `POST /api/v1/messages/voice`, `PUT /api/v1/messages/conversations/:conversationId/read`.

**External services**: Cloudflare R2 (voice messages), Socket.IO (real-time).

---

### 10. Subscriber Broadcast

**Purpose**: Creators send a single message to all their active subscribers. Used for announcements, promotions, and engagement.

**Primary users**: Creators.

**Major workflows**:
- Creator composes broadcast message (text, optional media/content link)
- Creator optionally filters by minimum subscription tier
- Backend iterates all active subscribers
- For each subscriber: finds or creates conversation, sends individual message
- Messages delivered via Socket.IO in real-time (each is a separate message event)
- No opt-out mechanism for subscribers (all active subscribers receive broadcast)

**Dependencies**:
- Subscription model for subscriber list
- Message service for individual message creation
- Socket.IO for real-time delivery

**Related modules**: Message service (sendMassMessageToSubscribers), creator controller/routes.

**Database entities**: `subscriptions` (status=active, creator_id), `conversations`, `messages`.

**APIs**: `POST /api/v1/messages/mass-message`.

**External services**: None (uses internal messaging).

---

### 11. Notifications

**Purpose**: Alert fans when their subscribed creators publish new content. In-app notification system for user engagement.

**Primary users**: Fans (receive), Creators (trigger via publishing).

**Major workflows**:
- Creator publishes content with visibility `subscribers_only`
- Backend fetches all active subscribers for that creator
- Subscriber preferences checked (can opt out of new-content notifications)
- Notification created for each eligible subscriber (type: `new_content`, with creator name + content title)
- Fan sees notification count in UI (bell icon badge)
- Fan views notification list (enriched with creator avatar + content thumbnail via signed URL)
- Fan marks individual notifications as read or marks all as read
- Fan deletes individual notifications

**Dependencies**:
- Content publishing (triggers notification creation)
- R2 signed URLs for content thumbnails in notification display
- Notification model for CRUD

**Related modules**: Notification service (notifySubscribersOfNewContent, getEnrichedNotifications), notification controller/model, content service (calls notification service on create).

**Database entities**: `notifications` (user_id, type, title, message, related_content_id, related_user_id, is_read), `profiles` -> preferences -> notifications JSONB.

**APIs**: `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `PUT /api/v1/notifications/:id/read`, `PUT /api/v1/notifications/read-all`, `DELETE /api/v1/notifications/:id`.

**External services**: None.

---

### 12. Personalized Feed

**Purpose**: Fans see a curated feed of content from all creators they subscribe to, in reverse chronological order.

**Primary users**: Fans.

**Major workflows**:
- Fan navigates to their feed page
- Backend fetches fan's active subscriptions → extracts creator IDs
- Content fetched from all subscribed creators (paginated, 20 per page)
- Each content item enriched with unlock status (subscribed = unlocked, not subscribed = locked/PPV)
- Feed displayed with creator attribution, content preview (thumbnail), and unlock status
- Fan scrolls for more (infinite scroll pagination)
- Empty state if fan has no active subscriptions

**Dependencies**:
- Subscription model for active subscription list
- Content model for bulk content fetch by creator IDs
- Content enrichment utilities for unlock status

**Related modules**: User service (generateFanFeed), content.utils (enrichContentWithUnlockStatus, reshapePostForFeed).

**Database entities**: `subscriptions` (status=active), `content` (creator_id, status=published, ordered by created_at).

**APIs**: `GET /api/v1/users/me/feed`.

**External services**: None.

---

### 13. Fan Gallery

**Purpose**: Fans bookmark/save content from creators into a personal gallery for later viewing.

**Primary users**: Fans.

**Major workflows**:
- Fan views content and clicks "Save to Gallery"
- Content ID added to fan's gallery (stored as JSONB array in profiles)
- Gallery add counter incremented on content (analytics signal for creators)
- Fan views their gallery page: content organized by creator, with signed thumbnail URLs
- Fan can remove content from gallery (removes from JSONB array)
- Gallery shows which creators the fan is still subscribed to (subscription status per creator group)
- Empty gallery if fan has saved nothing

**Dependencies**:
- Content model for bulk content lookups
- R2 signed URLs for thumbnail generation
- Gallery model (JSONB operations on profiles table)

**Related modules**: User service (addToUserGallery, removeFromUserGallery, getFanGallery), user controller/routes, gallery model.

**Database entities**: `profiles` -> gallery JSONB (array of { contentId, addedDate, isAccessible }).

**APIs**: `POST /api/v1/users/me/gallery`, `DELETE /api/v1/users/me/gallery/:contentId`, `GET /api/v1/users/me/gallery`.

**External services**: Cloudflare R2 (thumbnail URLs).

---

### 14. Contests

**Purpose**: Creators host time-limited contests (giveaways) to drive fan engagement and reward loyal subscribers.

**Primary users**: Creators (create/host), Fans (enter).

**Major workflows**:
- Creator creates contest: title, description, start/end dates, prize, optional entry requirements (must be subscriber)
- Contest saved as draft; creator publishes when ready (status changes to `active`)
- Fans browse active contest feed
- Fan enters contest: if entry requirements specify subscription, fan must have active subscription to creator
- Each fan can enter once per contest (duplicate check)
- After contest end date, creator picks a winner (finalize)
- System selects a winner (delegated to model — no visible random selection logic)
- Winner recorded on contest record

**Dependencies**:
- Subscription model for entry requirement checks
- Contest model for lifecycle management

**Related modules**: Contest routes/controller/service, contest model.

**Database entities**: `contests` (creator_id, title, description, start_date, end_date, status, prize, entry_requirements JSONB, winner_id), `contest_entries` (contest_id, fan_id).

**APIs**: `POST /api/v1/contests`, `PUT /api/v1/contests/:id/publish`, `POST /api/v1/contests/:id/finalize`, `POST /api/v1/contests/:id/enter`, `GET /api/v1/contests/feed`, `GET /api/v1/contests/creator/my`, `GET /api/v1/contests/:id`.

**External services**: None.

---

### 15. Referral Program

**Purpose**: Users earn rewards by referring new users to the platform. Growth engine for user acquisition.

**Primary users**: All users (refer), Platform (administers).

**Major workflows**:
- User generates unique referral code(s)
- User shares referral code (via link, social media)
- New user signs up with referral code in signup form
- Referral code validated (exists, active)
- Referral linked to new user on signup
- Referrer's stats updated (number of referrals, rewards earned)
- Milestone bonus system checks if referrer has hit reward thresholds (called by payment/earnings system)
- Referral redemptions tracked in database

**Dependencies**:
- Auth service for referral code application during signup
- Referral model for code generation, validation, stats

**Related modules**: Referral controller/routes, referral model, auth.service (signupUser reads referralCode).

**Database entities**: `referral_codes` (user_id, code, is_active), `referral_redemptions` (referrer_id, referred_id, code, created_at).

**APIs**: `GET /api/v1/referrals/my-codes`, `POST /api/v1/referrals/generate`, `GET /api/v1/referrals/stats`, `GET /api/v1/referrals/validate/:code`, `POST /api/v1/referrals/check-milestone/:userId`.

**External services**: None.

---

### 16. Enclave Membership

**Purpose**: Exclusive, invite-only premium membership tier with limited spots. Creates scarcity and exclusivity. Separate from standard creator subscriptions.

**Primary users**: All users (apply), Admin (approve), Platform (manage).

**Major workflows**:
- User visits enclave page, checks available spots
- User submits enclave application (name, platforms, reason)
- Simultaneously: application stored, support ticket created (for follow-up), referral assigned
- Admin reviews applications in dedicated admin panel
- Admin approves or rejects application (updates status)
- Approved users get enclave membership flag on profile
- Number of remaining spots public (drives urgency)

**Dependencies**:
- Support ticket creation (application automatically generates ticket for follow-up)
- Referral model (applicants assigned referral codes)
- Email service for application notifications

**Related modules**: Enclave controller/routes, support ticket model, referral model, email service.

**Database entities**: `enclave_applications` (user data, platforms, status, created_at), `platform_settings` (enclave spots config).

**APIs**: `GET /api/v1/enclave/spots-remaining`, `POST /api/v1/enclave/applications`, `GET /api/v1/enclave/applications`, `PATCH /api/v1/enclave/applications/:id`.

**External services**: Email (SMTP via nodemailer).

---

### 17. Customer Support

**Purpose**: Users submit support requests; admins respond. Ticket-based system with conversation history and DM notification.

**Primary users**: All users (submit), Admin (respond).

**Major workflows**:
- User creates support ticket: subject, description
- Ticket created with status `Open`, initial message in conversation array
- Admin views ticket in admin panel; viewing auto-changes status to `Pending` (admin has seen it)
- Admin replies to ticket: text added to conversation, status set to `Pending` (waiting for user)
- Admin's reply also sent as a direct message to user (they see it in their message inbox)
- User can append to their open/pending ticket (sends additional context)
- If user replies to a pending ticket, status resets to `Open` (needs admin attention)
- Admin marks ticket as `Resolved` when issue is closed

**Dependencies**:
- Message service for DM notification on admin replies
- Support ticket model for conversation storage

**Related modules**: Support routes/controller/service, support ticket model, message service (dynamic require).

**Database entities**: `support_tickets` (user_id, subject, conversation JSONB array, status, priority, created_at, updated_at).

**APIs**: `POST /api/v1/support/tickets`, `PUT /api/v1/support/tickets/:id/reply`, `GET /api/v1/support/tickets/:id`, `PUT /api/v1/support/tickets/:id/resolve`.

**External services**: None.

---

### 18. Platform Administration

**Purpose**: Platform operators manage users, moderate content, configure platform settings, and oversee operations. Governance and control hub.

**Primary users**: Admin.

**Major workflows**:
- **User management**: List all users, suspend/ban/activate accounts, set custom creator commission rates
- **Content moderation**: View flagged content, approve or remove content
- **Support oversight**: View all support tickets, update ticket status
- **Platform settings**: Configure global commission rate, manage other platform-wide settings
- **Admin management**: List admin users, manage admin accounts
- **Admin messaging**: Send direct emails to any user (bypasses standard messaging)
- **Analytics review**: View platform-wide analytics (users, revenue, engagement)
- **Report management**: Generate custom reports, view saved reports
- **Verification review**: View creator verification documents (signed URLs to ID/selfie)

**Dependencies**:
- Storage service for verification document signed URLs
- Email service for admin-to-user messaging
- All models (users, content, subscriptions, transactions, reports, tickets, settings)

**Related modules**: Admin routes/controller/service, auth middleware (protectAndAdmin), admin frontend panel.

**Database entities**: `profiles`, `content`, `subscriptions`, `transactions`, `reports`, `support_tickets`, `platform_settings`.

**APIs**: All `/api/v1/admin/*` endpoints (14 endpoints covering dashboard, users, content, analytics, reports, support, settings).

**External services**: Cloudflare R2 (verification doc access), SMTP (email messaging).

---

### 19. Business Intelligence

**Purpose**: Provide actionable metrics and insights to creators and platform administrators for data-driven decisions.

**Primary users**: Creators (own performance), Admin (platform-wide).

**Major workflows**:
- **Creator analytics**: View follower count, content views, engagement trends over time (daily/weekly/monthly)
- **Creator earnings**: View revenue breakdown by subscription/tips/PPV, net after fees, payout history
- **Creator dashboard**: Aggregated view with subscriber count, new content count, recent views, recent earnings, recent activity log
- **CSV exports**: Download metrics as CSV, download fan engagement data as CSV
- **Admin analytics**: Platform-wide user growth, revenue totals, engagement metrics with date range filtering
- **Admin reports**: Generate custom reports with filters (user type, status), save report configurations for reuse
- **Event-based analytics**: Profile visits, post views, gallery adds logged with admin/self-view filtering

**Dependencies**:
- Analytics event logging (profile visits, post views, gallery adds)
- Monthly analytics summary (aggregated pre-computed data)
- Fee calculation utilities for earnings breakdown

**Related modules**: Creator service (getDashboardData, getAnalyticsData, getEarningsData, exportMetricsCSV, exportFanEngagementCSV), admin service (getDashboardStats, getPlatformAnalytics, generateReport, getSavedReports), analytics service, fee.utils.

**Database entities**: `analytics_events` (event_type, creator_id, viewer_id, content_id, created_at), `monthly_analytics_summary` (pre-aggregated), `transactions` (revenue data), `reports` (saved report configs).

**APIs**: `GET /api/v1/creator/dashboard`, `GET /api/v1/creator/analytics`, `GET /api/v1/creator/earnings`, `GET /api/v1/creator/metrics/export`, `GET /api/v1/creator/metrics/export-fans`, `POST /api/v1/analytics/log`, `GET /api/v1/admin/dashboard`, `GET /api/v1/admin/analytics`, `POST /api/v1/admin/reports`, `GET /api/v1/admin/reports`.

**External services**: None.

---

### 20. AI Content Tools

**Purpose**: AI-powered caption generation to help creators write engaging post descriptions. Single tool — not a suite.

**Primary users**: Creators.

**Major workflows**:
- Creator uploads or selects an image during content creation
- Creator clicks "Generate Caption" button
- Image sent to backend (multipart upload)
- Backend sends image URL to AI model with prompt: "Write ONE witty, enticing caption... Max 20 words"
- AI returns generated caption string
- Creator can accept, edit, or regenerate the caption
- If AI API key is missing or AI errors, returns fallback mock caption

**Dependencies**:
- OpenAI SDK (or OpenRouter-compatible)
- Image upload middleware

**Related modules**: AI routes/controller/service, frontend content upload UI.

**Database entities**: None (AI service is stateless).

**APIs**: `POST /api/v1/ai/caption`.

**External services**: OpenAI API (or OpenRouter).

---

### 21. Fiat-to-Crypto On-Ramp

**Purpose**: Enable fans to purchase USDC on the Base blockchain using a credit card. Bridges fiat currency to the crypto payment ecosystem, making crypto payments accessible to users without pre-existing crypto wallets or balances.

**Primary users**: Fans (buy USDC), Platform (facilitates, earns on subsequent crypto spend).

**Major workflows**:
- Fan initiates purchase from wallet settings or payment flow
- Fan specifies fiat amount (USD) to convert
- Backend creates Coinbase On-Ramp session with destination wallet and Base network configuration
- Fan is redirected to Coinbase-hosted purchase page (or embedded iframe)
- Fan completes card payment with Coinbase (PCI-compliant, off-platform)
- Coinbase sends webhook event (`charge_completed`) to backend
- Backend verifies webhook HMAC-SHA256 signature
- Backend updates pending transaction record status from `Pending` to `Cleared`
- USDC arrives in fan's wallet on Base network
- Subsequent crypto payments (subscriptions, tips, PPV) can use the purchased USDC

**Dependencies**:
- Payment Processing (the crypto payment capability that spends the purchased USDC)
- Fan must have a configured crypto wallet address to receive the purchased USDC

**Related modules**: Onramp routes/controller/service, crypto payment service (wallet config), frontend OnRampButton component, frontend WalletSettings page.

**Database entities**: `transactions` (type=OnRamp, amount in cents USD, status=Pending→Cleared, blockchain_tx_hash=onramp session ID, payment_method=card_onramp, payment_currency=USD).

**APIs**: `POST /api/v1/payments/onramp/session`, `POST /api/v1/payments/onramp/webhook`.

**External services**: Coinbase On-Ramp API (session creation), Coinbase-hosted purchase page (card processing), HMAC-SHA256 shared secret.

---

### 22. Recurring Billing & Renewal

**Purpose**: Automate the renewal of active subscriptions at the end of each billing period. Ensures revenue continuity without manual fan intervention by processing recurring on-chain payments.

**Primary users**: Platform (operations), Creators (receive recurring revenue), Fans (maintain continuous access).

**Major workflows**:
- Scheduled job (or manual trigger) queries all active subscriptions where `next_billing_date <= now()`
- For each due subscription:
  1. Fetch creator's crypto wallet address and fan's wallet address
  2. Compute renewal amount (same subscription price)
  3. Send on-chain renewal transaction via smart contract `processRenewal` function
  4. Smart contract validates: fan has active recurring allowance, amount within limit, renewal period elapsed
  5. On success: USDC transferred from fan to platform treasury (fee) + creator (payout)
  6. Create `SubscriptionRenewal` transaction record with 12.5% platform fee
  7. Update subscription `next_billing_date` to current date + 30 days
- If renewal fails (no allowance, insufficient funds, network error): subscription marked `expired`
- If wallets missing or keeper key not configured: subscription marked `expired` with logged warning
- Each subscription processed independently — failures do not cascade

**Dependencies**:
- Payment Processing (on-chain transaction execution)
- Blockchain smart contract (`processRenewal` function + RecurringAllowance)
- Subscription Commerce (tier pricing, billing amounts)
- Fan must have pre-approved recurring allowance on smart contract

**Related modules**: `jobs/renewSubscriptions.ts`, subscription model (`findSubscriptionsDueForRenewal`, `updateSubscription`), transaction model (`createTransaction`), `ethers` (dynamic import for on-chain interaction), smart contract `PoDMPaymentProtocol.processRenewal`.

**Database entities**: `subscriptions` (status=active, next_billing_date, price, fan_wallet_address), `transactions` (type=SubscriptionRenewal, amount, platform_fee, blockchain_tx_hash, status=Cleared), `profiles` (crypto_wallet_address for creator/fan).

**APIs**: None (internal job — not exposed as REST endpoint). Triggered via `node dist/jobs/renewSubscriptions.js` or scheduled cron.

**External services**: Base blockchain JSON-RPC (ethers.JsonRpcProvider), smart contract processRenewal function.

---

## Capability Dependency Graph

```
Identity & Access Management ──────────────────────────────────────────────────────┐
    │                                                                               │
    ├── Creator Onboarding & Verification ──────────────────┐                       │
    │       │                                                │                       │
    │       ├── Content Publishing ───────────────────────┐  │                       │
    │       │       │                                     │  │                       │
    │       │       ├── Content Access Control             │  │                       │
    │       │       │       │                             │  │                       │
    │       │       │       ├── Tipping & PPV ──────────┐  │  │                      │
    │       │       │       │                            │  │  │                      │
    │       │       │       ├── Subscription Commerce ──┐│  │  │                      │
    │       │       │       │       │        ┌──────────┘│  │  │                      │
    │       │       │       │       │        ▼           │  │  │                      │
    │       │       │       │       ├── Recurring Billing│  │  │                      │
    │       │       │       │       │   & Renewal        │  │  │                      │
    │       │       │       │       │        │           │  │  │                      │
    │       │       │       │       └── Payment Proc. ──┼┼──┼──┼──────────────────── │
    │       │       │       │                            │  │  │                      │
    │       │       │       └── Subscriber Broadcast     │  │  │                      │
    │       │       │                                    │  │  │                      │
    │       │       └── Notifications                    │  │  │                      │
    │       │                                            │  │  │                      │
    │       ├── Direct Messaging                         │  │  │                      │
    │       │                                            │  │  │                      │
    │       └── Payout Management ◄──────────────────────┼──┼──┼──────────────────────┘
    │                                                    │  │  │
    ├── Personalized Feed ───────────────────────────────┘  │  │
    │                                                        │  │
    ├── Fan Gallery                                          │  │
    │                                                        │  │
    ├── Contests ────────────────────────────────────────────┘  │
    │                                                            │
    ├── Referral Program                                        │
    │                                                            │
    ├── Enclave Membership                                       │
    │                                                            │
    ├── Customer Support                                         │
    │                                                            │
    ├── Fiat-to-Crypto On-Ramp ──────────────────────────────────┘
    │                  │
    │                  └── Payment Processing (spends purchased USDC)
    │
    ├── Platform Administration ◄────────────────────────────────┘
    │
    ├── Business Intelligence
    │
    └── AI Content Tools
```

**Key observations**:
- **Payment Processing** is the most depended-on capability (subscriptions, PPV, tips, payouts, renewals all depend on it)
- **Identity & Access Management** is prerequisite for every other capability
- **Subscription Commerce** and **Content Publishing** are the two primary value-generating capabilities
- **Recurring Billing & Renewal** is a downstream automation of Subscription Commerce — ensures revenue continuity
- **Fiat-to-Crypto On-Ramp** enables the crypto ecosystem by allowing fans to convert fiat to USDC
- **Platform Administration** depends on every data-creating capability (needs to manage all entities)
- **AI Content Tools** is fully independent (no database, no other capabilities)
- **Enclave Membership** is a standalone premium tier that integrates with support + referral

---

## Revenue Mapping

| Capability | Revenue Type | Impact |
|---|---|---|
| Subscription Commerce | Recurring (primary) | Core revenue — monthly subscriptions |
| Tipping & PPV | One-time (secondary) | Incremental revenue per transaction |
| Payment Processing | Fee capture (12.5% commission) | All revenue flows through this |
| Recurring Billing & Renewal | Recurring (automation) | Ensures subscription revenue continuity |
| Fiat-to-Crypto On-Ramp | Enabling (transaction fee) | Facilitates crypto payment volume |
| Enclave Membership | Premium tier (potential) | Future revenue opportunity |

All other capabilities are **engagement** or **enabling** — they drive retention, acquisition, or operational efficiency.

---

## Capability Maturity Assessment

| Capability | Maturity | Gaps |
|---|---|---|
| Identity & Access Management | Mature | No MFA, no social login, no OAuth |
| Creator Onboarding & Verification | Functional | No automated verification, no Stripe Connect onboarding |
| Content Publishing | Mature | No bulk upload improvements, no video transcoding pipeline |
| Content Access Control | Mature | Signed URLs expire correctly |
| Subscription Commerce | Mature | Stripe handles billing lifecycle |
| Tipping & Pay-Per-View | Functional | No fiat PPV/tip (crypto only) |
| Payment Processing | Functional | No Stripe webhooks, no refund flow, no failed payment retry |
| Payout Management | Basic | Crypto only, minimal Stripe Connect integration |
| Direct Messaging | Mature | Real-time via Socket.IO, voice messages |
| Subscriber Broadcast | Functional | No opt-out per subscriber, synchronous iteration |
| Notifications | Mature | In-app only (no push/email — email service wired but unused) |
| Personalized Feed | Functional | No recommendation algorithm, no sorting options |
| Fan Gallery | Functional | JSONB storage limits queryability |
| Contests | Functional | No automated winner selection (random) |
| Referral Program | Basic | No reward payouts, no tracking dashboard for users |
| Enclave Membership | Functional | Manual review process |
| Customer Support | Functional | Basic ticket system, DM integration |
| Platform Administration | Mature | Full CRUD for all entities |
| Business Intelligence | Functional | Basic aggregation, no real-time dashboards |
| AI Content Tools | Basic | Single caption use case, no image generation or other AI tools |
| Fiat-to-Crypto On-Ramp | Functional | Single provider (Coinbase), no alternative on-ramp options |
| Recurring Billing & Renewal | Basic | Not scheduled (manual trigger only), no fallback for failed renewals, no grace period |

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-02 | AI Architect | Initial business capabilities analysis |
| 2026-07-19 | AI Architect | Added capability 21 (Fiat-to-Crypto On-Ramp) and 22 (Recurring Billing & Renewal). Updated dependency graph, revenue mapping, and maturity assessment. All 22 capabilities now include all 8 required sections. |
