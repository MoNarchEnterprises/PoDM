# User Journeys

**Purpose**: Complete catalog of every end-to-end user journey in the PoDM creator-fan platform. Each journey traces a user's goal from trigger through completion, including what can go wrong.

**Date**: 2026-07-02
**Version**: 1.0.0
**Confidence**: High

**Users**: Unauthenticated Visitor (U), Fan (F), Creator (C), Admin (A)

---

## Auth Journeys

### 1. Create Account

**Actor**: Unauthenticated Visitor
**Trigger**: User clicks "Sign Up" on splash page or auth page.
**Preconditions**: User has valid email and password. Username is not taken.
**Happy Path**:
1. User selects role (fan or creator), enters email, password, username
2. Optionally enters referral code
3. Frontend sends POST to `/api/v1/auth/signup`
4. Backend creates Supabase Auth user, creates profile record, handles referral
5. Returns user object + JWT token
6. Frontend stores token, redirects to appropriate landing page
7. For creator: redirects to onboarding flow
8. For fan: redirects to explore/profile page
**Alternative Paths**:
- User has referral code: code validated and applied during signup (non-fatal if invalid)
- Combined signup-and-subscribe: user signs up and subscribes to a creator in one step (POST `/api/v1/auth/signup-and-subscribe`)
**Failure Paths**:
- Email already registered: 409, show "Email already in use"
- Username taken: 409, suggest alternatives
- Weak password: 400, show password requirements
- Network error: Show retry prompt, token never stored
**Completion State**: User authenticated, JWT stored, redirected to role-appropriate home.
**Referenced modules**: Auth routes/controller/service, User model, auth middleware (unprotected), referral model, frontend AuthProvider.

---

### 2. Log In

**Actor**: Unauthenticated Visitor
**Trigger**: User clicks "Log In" on auth page.
**Preconditions**: User has existing account. Account is not suspended/banned.
**Happy Path**:
1. User enters email + password
2. Frontend sends POST to `/api/v1/auth/login`
3. Backend authenticates via Supabase Auth, returns user + token
4. Frontend stores token in localStorage, updates AuthProvider state
5. Redirects to role-appropriate landing page (fan feed, creator dashboard, admin panel)
**Alternative Paths**:
- Admin user: redirected to admin panel
- Creator with incomplete onboarding: redirected to onboarding flow
**Failure Paths**:
- Invalid credentials: 401, show "Invalid email or password"
- Account suspended/banned: 403, show "Account suspended — contact support"
- Supabase Auth unavailable: 500, show "Service unavailable — try again later"
**Completion State**: User authenticated, JWT stored, redirected.
**Referenced modules**: Auth routes/controller/service, frontend AuthProvider, frontend apiClient interceptor.

---

### 3. Reset Password

**Actor**: Unauthenticated Visitor
**Trigger**: User clicks "Forgot Password" on login page.
**Preconditions**: User knows email address on the account.
**Happy Path**:
1. User enters email address
2. Frontend sends POST to `/api/v1/auth/forgot-password`
3. Backend triggers Supabase Auth password reset email
4. User receives email with reset link
5. User clicks link, lands on `/reset-password` page
6. User enters new password + confirmation
7. Frontend calls Supabase Auth directly (anon client) to update password
8. User redirected to login page
**Alternative Paths**: None.
**Failure Paths**:
- Email not found: API returns success anyway (security — don't reveal existence)
- Email delivery failure: User checks spam, retries, or contacts support
- Reset link expired: User repeats forgot-password flow
- Weak new password: Show password requirements
**Completion State**: Password updated, user redirected to login.
**Referenced modules**: Auth controller/service, Supabase Auth (anon client on frontend), frontend `supabaseClient.ts`, email service (via Supabase, not custom).

---

### 4. Log Out

**Actor**: Fan, Creator, Admin
**Trigger**: User clicks "Log Out" in navigation.
**Preconditions**: User is authenticated with valid JWT.
**Happy Path**:
1. Frontend sends POST to `/api/v1/auth/logout`
2. Backend calls Supabase Auth logout (optional — token invalidation)
3. Frontend removes token from localStorage
4. AuthProvider state set to unauthenticated
5. Redirected to splash page
**Alternative Paths**: None.
**Failure Paths**:
- API unreachable: Token still cleared locally, user logs out offline
**Completion State**: User unauthenticated, token cleared, redirected to public page.
**Referenced modules**: Auth controller, frontend AuthProvider.

---

## Fan Journeys

### 5. Browse Creator Profile

**Actor**: Unauthenticated Visitor, Fan
**Trigger**: User navigates to `/creator/:username` or clicks on creator link.
**Preconditions**: Creator exists, has completed onboarding, status is active.
**Happy Path**:
1. Frontend requests `GET /api/v1/users/profile/:username` with `optionalProtect`
2. Backend returns: creator profile (bio, avatar, banner, tiers), content preview (last 12 posts), subscription status for authenticated viewers
3. Content shown with lock/unlock status (blurred for locked, visible for subscribed)
4. Fan sees subscription tiers with prices
5. Fan can subscribe, view content, or message creator from this page
**Alternative Paths**:
- Viewing own profile: shows own content management options
- No content: shows "No content yet" state
**Failure Paths**:
- Creator not found: 404, show "Creator not found"
- Creator suspended: 404, profile hidden
**Completion State**: Creator profile rendered with content preview and subscription options.
**Referenced modules**: User controller/service, content service (getContentForPublicProfile), subscription service, user.routes, frontend CreatorProfile component.

---

### 6. Subscribe to Creator

**Actor**: Fan
**Trigger**: Fan clicks "Subscribe" on creator profile, selects a tier.
**Preconditions**: Fan is authenticated. Creator has active tiers configured. Fan is not already subscribed (or has cancelled subscription).
**Happy Path**:
1. Fan selects subscription tier on creator profile
2. Fan clicks "Subscribe"
3. For crypto: fan approves transaction in wallet; for Stripe: fan enters card details
4. Frontend sends POST to `/api/v1/subscriptions` with tierId + creatorId
5. Backend creates Stripe subscription or verifies crypto payment
6. Subscription record created with status `active`
7. Fan redirected to creator content (now unlocked)
8. Creator receives DM notification of new subscriber (optional — via subscription.service)
**Alternative Paths**:
- Combined signup+subscribe: unauthenticated user signs up and subscribes in one flow
- Existing cancelled subscription: reactivates or creates new
**Failure Paths**:
- Payment declined: 402, show "Payment declined — try another card"
- Insufficient crypto balance: show "Insufficient funds in wallet"
- Tier no longer available: 404, show "Tier no longer available"
- Stripe API error: 500, show "Payment processing error — try again"
**Completion State**: Subscription active, fan has access to subscriber content.
**Referenced modules**: Subscription routes/controller/service, crypto payment service, message service (DM notification), Stripe SDK, frontend FanSubscriptions page.

---

### 7. View Gated Content

**Actor**: Fan
**Trigger**: Fan clicks on a content item in feed, creator profile, or direct link `/content/:contentId`.
**Preconditions**: Content exists. Fan is authenticated (for protected content).
**Happy Path**:
1. Fan clicks locked content
2. Content viewer checks access: is fan subscribed to creator? has fan paid PPV?
3. If subscribed, generate signed URL via `GET /api/v1/content/:id/secure-url`
4. Content rendered in viewer (image displayed, video player loaded, audio player shown)
5. View event logged to analytics
**Alternative Paths**:
- Content is public (unlocked): shown without access check
- Content is PPV: fan prompted to pay before viewing
- Content is fan's own content: always accessible
**Failure Paths**:
- Not subscribed, not PPV paid: 403, show locked overlay with "Subscribe to view" or "Unlock for $X"
- Content deleted: 404, show "Content no longer available"
- Signed URL expired: regenerate and retry
- R2 unavailable: 502, show "Content temporarily unavailable"
**Completion State**: Content displayed to authorized fan.
**Referenced modules**: Content controller/service (getSecureUrlForViewing, getContentForFan, getViewData), content.utils (enrichContentWithUnlockStatus), subscription/transaction models, frontend ContentViewer component, frontend UnlockModal.

---

### 8. Purchase PPV Content

**Actor**: Fan
**Trigger**: Fan clicks "Unlock" on PPV-gated content in viewer.
**Preconditions**: Fan is authenticated. Content visibility is `pay_per_view`. Fan has not already purchased this content.
**Happy Path**:
1. Fan sees "Unlock for $X" overlay on content
2. Fan clicks "Unlock", selects payment method (crypto wallet or Stripe)
3. For crypto: fan submits transaction hash from wallet
4. Frontend sends POST to `/api/v1/payments/crypto/verify` with transaction hash
5. Backend verifies transaction on BaseScan, creates transaction record (type = PPV Post/Message)
6. Content unlocked — signed URL generated, content displayed
7. Analytics logged
**Alternative Paths**:
- Fan is already subscribed: PPV content may be included in subscription (depends on creator's tier design — not explicitly implemented)
**Failure Paths**:
- Insufficient payment: transaction hash has wrong amount, 400
- Transaction unconfirmed: too few block confirmations, 400 "Wait for confirmation"
- Already purchased: content unlocked immediately, no second charge
- Network error (BaseScan down): 502, "Payment verification unavailable — try later"
**Completion State**: Content unlocked and displayed, transaction recorded.
**Referenced modules**: Crypto payment service, content service (getContentForFan checks purchase), transaction model, frontend ContentViewer + UnlockModal.

---

### 9. Send a Tip

**Actor**: Fan
**Trigger**: Fan clicks "Tip" on creator profile or content viewer.
**Preconditions**: Fan is authenticated. Creator has configured wallet (for crypto tips) or Stripe account.
**Happy Path**:
1. Fan selects tip amount (preset or custom)
2. Fan confirms, approves transaction in wallet
3. Transaction hash submitted to `POST /api/v1/payments/crypto/verify`
4. Backend verifies, creates transaction record (type = Tip)
5. Creator notified (in-app — via notifications or messages)
6. Fan sees confirmation
**Alternative Paths**:
- Stripe tip: fan enters card details via Stripe Elements
- No wallet configured: fan prompted to connect wallet first
**Failure Paths**:
- Payment declined: retry with different method
- Creator has no payment setup: 400, "Creator not accepting tips yet"
**Completion State**: Tip processed, transaction recorded, creator notified.
**Referenced modules**: Crypto payment service, frontend TipModal, frontend useCryptoWallet/useStripePayment hooks.

---

### 10. Browse Personalized Feed

**Actor**: Fan
**Trigger**: Fan navigates to `/fan/feed`.
**Preconditions**: Fan is authenticated. Fan has at least one active subscription (feed may be empty otherwise).
**Happy Path**:
1. Frontend requests `GET /api/v1/users/me/feed?page=1`
2. Backend fetches fan's active subscriptions → extracts creator IDs → fetches content by those creators (paginated, 20 per page) → enriches with unlock status
3. Frontend renders feed: content cards with thumbnail, title, creator name
4. Fan scrolls down, next page loaded (infinite scroll)
5. Each content item shows lock/unlock status based on subscription
**Alternative Paths**:
- No subscriptions: empty state with "Subscribe to creators to see your feed"
- All content viewed: pagination ends, "No more content"
**Failure Paths**:
- Feed load fails: show retry button
- Content signed URLs expired: thumbnail broken, refresh
**Completion State**: Feed displayed with paginated content from subscribed creators.
**Referenced modules**: User service (generateFanFeed), content model, subscription model, content.utils, frontend FanFeed component.

---

### 11. Manage Gallery

**Actor**: Fan
**Trigger**: Fan saves content while viewing, or visits `/fan/gallery` to manage saved items.
**Preconditions**: Fan is authenticated. Content exists and is accessible to fan.
**Happy Path (Save)**:
1. Fan clicks "Save to Gallery" on a content item
2. Frontend sends POST to `/api/v1/users/me/gallery` with contentId
3. Backend adds content ID to fan's gallery JSONB, increments gallery_add_count on content
4. UI shows "Saved" confirmation
**Happy Path (View/Manage)**:
1. Fan navigates to `/fan/gallery`
2. Frontend requests `GET /api/v1/users/me/gallery`
3. Backend returns content grouped by creator, with signed thumbnail URLs + subscription status per creator
4. Fan can remove items via DELETE `/api/v1/users/me/gallery/:contentId`
**Alternative Paths**: None.
**Failure Paths**:
- Content deleted by creator: removed from gallery automatically (or shows "Content unavailable")
- Already saved: no duplicate added
- RPC failure for counter: non-fatal, content still saved
**Completion State**: Content saved to gallery or gallery displayed with saved items.
**Referenced modules**: User service/controller (addToUserGallery, getFanGallery, removeFromUserGallery), gallery model, supabase RPC, frontend FanGallery component.

---

### 12. Send Direct Message

**Actor**: Fan
**Trigger**: Fan clicks "Message" on creator profile or opens `/fan/messages`.
**Preconditions**: Fan is authenticated. Receiver (creator) exists.
**Happy Path**:
1. Fan opens existing conversation or starts new one with creator
2. Fan types message, clicks send
3. Frontend sends POST to `/api/v1/messages` with receiverId + text
4. Backend finds or creates conversation, inserts message, emits Socket.IO `new_message` event to conversation room
5. Message appears in real-time for both parties
6. Fan can also send voice message via POST `/api/v1/messages/voice` with audio file
**Alternative Paths**:
- Sending to new contact: conversation auto-created
- Sending voice message: recorded in browser via MediaRecorder, uploaded as file
- Sending with content attachment: message includes contentId
**Failure Paths**:
- Receiver not found: 404, "User not found"
- Message too long: 400 (if backend enforces limit — currently unenforced)
- Voice file too large: 413, Multer error
- Socket.IO disconnected: message delivered on reconnect
**Completion State**: Message sent, appears in conversation for both users in real-time.
**Referenced modules**: Message service/controller/routes, conversation model, message model, Socket.IO config, frontend useVoiceRecorder hook, frontend message components (FanMessages, CreatorMessages).

---

### 13. Participate in Contest

**Actor**: Fan
**Trigger**: Fan browses contest feed and clicks "Enter" on an active contest.
**Preconditions**: Fan is authenticated. Contest exists, is active, and end date has not passed.
**Happy Path**:
1. Fan navigates to contest feed (`GET /api/v1/contests/feed`)
2. Fan selects a contest, views details (`GET /api/v1/contests/:id`)
3. Fan clicks "Enter Contest"
4. Frontend sends POST to `/api/v1/contests/:id/enter`
5. Backend checks: contest is active, not ended, fan hasn't entered, fan meets requirements
6. If entry requires subscription: backend verifies fan has active subscription to contest creator
7. Entry created
8. Fan sees "Successfully entered" confirmation
**Alternative Paths**:
- Contest requires subscription: fan must subscribe first (entry may fail with 403)
- Contest has no requirements: any fan can enter
**Failure Paths**:
- Contest ended: 400, "Contest has ended"
- Already entered: 409, "You have already entered this contest"
- Not subscribed (if required): 403, "You must be a subscriber to enter"
- Contest not active: 400, "Contest is not active"
**Completion State**: Fan entered contest, awaiting winner selection.
**Referenced modules**: Contest service/controller, contest model, subscription model, frontend contest components.

---

### 14. Manage Subscriptions

**Actor**: Fan
**Trigger**: Fan visits `/fan/subscriptions` to view or change their subscriptions.
**Preconditions**: Fan is authenticated. Fan has existing subscriptions (or empty list).
**Happy Path (View)**:
1. Frontend requests `GET /api/v1/subscriptions`
2. Backend returns fan's subscriptions with creator info, tier details, status
3. Fan sees list of subscribed creators, current tier, renewal date
**Happy Path (Change Tier)**:
1. Fan selects a subscription, clicks "Change Tier"
2. Fan selects new tier
3. Frontend sends PUT `/api/v1/subscriptions/:id` with new tierId
4. Backend updates Stripe subscription price, updates DB record
5. Confirmation shown
**Happy Path (Cancel)**:
1. Fan clicks "Cancel Subscription" on a subscription
2. Frontend sends DELETE `/api/v1/subscriptions/:id`
3. Backend sets status to `canceled`, sends DM to creator
4. Confirmation shown, access to creator's content revoked
**Failure Paths**:
- Stripe update fails: 500, "Billing update failed — try again"
- Already cancelled: 400, "Subscription is already cancelled"
**Completion State**: Subscriptions displayed, updated, or cancelled.
**Referenced modules**: Subscription service/controller/routes, message service (DM on cancel), Stripe SDK, frontend FanSubscriptions page.

---

### 15. Manage Account Settings

**Actor**: Fan
**Trigger**: Fan visits `/fan/settings`.
**Preconditions**: Fan is authenticated.
**Happy Path (Profile)**:
1. Fan views settings: profile info, notification preferences, privacy settings, payment method
2. Fan edits profile name/bio: sends PUT `/api/v1/users/me`
3. Backend updates profile (email changes go through Supabase Auth admin)
**Happy Path (Avatar)**:
1. Fan uploads new avatar file via POST `/api/v1/users/me/avatar`
2. Backend uploads to R2 public bucket, updates profile
3. New avatar displayed immediately
**Happy Path (Payment Method)**:
1. Fan links crypto wallet address via PUT `/api/v1/users/me/payment-method`
2. Wallet address stored in profile
**Alternative Paths**:
- Fan changes email: handled via Supabase Auth admin API (separate path from profile updates)
- Notification preferences: saved as JSONB in profiles.preferences
**Failure Paths**:
- Avatar too large: 413, "File too large (max 5MB)"
- Invalid email format: 400, "Invalid email"
- Wallet address invalid: 400, "Invalid wallet address"
**Completion State**: Settings saved and reflected immediately.
**Referenced modules**: User service/controller (updateMe, uploadUserAvatar, updateFanSettings, updateFanPaymentMethod), storage service (R2 upload), frontend FanSettings page.

---

### 16. Submit Support Ticket

**Actor**: Fan, Creator
**Trigger**: User clicks "Contact Support" from settings, help page, or encounters an error.
**Preconditions**: User is authenticated.
**Happy Path**:
1. User fills in subject + description
2. Frontend sends POST to `/api/v1/support/tickets`
3. Backend creates support ticket with initial message in conversation array, status `Open`
4. User sees confirmation with ticket ID
5. Admin reviews and replies (user receives DM notification of reply)
6. User can reply to ticket (appends to conversation, status resets to `Open`)
7. User can view ticket status (via admin panel or direct)
**Alternative Paths**:
- User has existing open ticket: new message appended to existing ticket (auto-detected)
**Failure Paths**:
- Empty subject/description: 400, "Subject and description required"
- User not found: 404 (unlikely if authenticated)
**Completion State**: Ticket created, awaiting admin response.
**Referenced modules**: Support service/controller, support ticket model, message service (DM on admin reply), frontend support components.

---

### 17. Generate & Share Referral Code

**Actor**: Fan, Creator
**Trigger**: User visits referral section in settings.
**Preconditions**: User is authenticated.
**Happy Path**:
1. User views current referral codes via `GET /api/v1/referrals/my-codes`
2. User clicks "Generate New Code" via `POST /api/v1/referrals/generate`
3. New code generated and displayed
4. User copies link or shares via social media
5. New users sign up with referral code
6. User views stats via `GET /api/v1/referrals/stats`
**Alternative Paths**:
- Existing codes: user can reuse existing codes
**Failure Paths**:
- Generation limit reached: 400, "Referral code limit reached"
**Completion State**: Referral code generated and shareable, stats visible.
**Referenced modules**: Referral controller/routes, referral model, auth service (applies code on signup), frontend referral UI.

---

### 18. Apply for Enclave Membership

**Actor**: Unauthenticated Visitor, Fan
**Trigger**: User visits `/enclave` page, sees "Limited spots available", clicks "Apply".
**Preconditions**: Enclave has open spots.
**Happy Path**:
1. User views enclave page, sees spots remaining (`GET /api/v1/enclave/spots-remaining`)
2. User fills out application: name, social media platforms/links, reason for applying
3. User submits via POST `/api/v1/enclave/applications`
4. Backend: stores application, creates support ticket (for follow-up), assigns referral code
5. User sees "Application submitted — we'll be in touch"
6. Admin reviews application in admin panel
7. Admin approves or rejects (PATCH `/api/v1/enclave/applications/:id`)
8. If approved, user receives enclave membership
**Alternative Paths**:
- User is already member: show "You're already a member"
- No spots: show "No spots available — join waitlist" (waitlist not implemented)
**Failure Paths**:
- No spots remaining: 400, "No spots available at this time"
- Duplicate application: 409, "You have already applied"
- Invalid data: 400, validation error
**Completion State**: Application submitted, pending admin review.
**Referenced modules**: Enclave controller/routes, support ticket model, referral model, email service, frontend Enclave component.

---

### 19. Manage Notifications

**Actor**: Fan
**Trigger**: Fan clicks bell icon in navigation.
**Preconditions**: Fan is authenticated. Fan may have unread notifications.
**Happy Path**:
1. Bell icon shows unread count (`GET /api/v1/notifications/unread-count`)
2. Fan clicks bell, dropdown shows recent notifications
3. Each notification shows: type (new_content), creator name + avatar, content title + thumbnail, timestamp
4. Fan clicks notification: redirects to content, marks as read
5. Fan can mark all read via PUT `/api/v1/notifications/read-all`
6. Fan can delete individual notifications via DELETE `/api/v1/notifications/:id`
**Alternative Paths**:
- No notifications: empty state, "No notifications yet"
- Full page view: dedicated notifications page with full list
**Failure Paths**:
- Notification not found: 404 (already deleted)
- Content referenced in notification deleted: thumbnail broken, link leads to 404
**Completion State**: Notifications viewed and managed.
**Referenced modules**: Notification service/controller/routes, notification model, content.utils (thumbnail), frontend notification components.

---

## Creator Journeys

### 20. Complete Onboarding

**Actor**: Creator
**Trigger**: Creator signs up, is redirected to `/onboarding`. Or creator with incomplete onboarding navigates there.
**Preconditions**: Creator has signed up (role = creator). Onboarding not yet completed.
**Happy Path**:
1. Creator fills in: bio, profile details, banner image
2. Creator defines subscription tiers (name, price per month, benefits)
3. Creator submits via POST `/api/v1/users/me/onboarding`
4. Backend saves profile, syncs tiers with Stripe (creates products + prices), sets `onboarding_complete = true`
5. Creator redirected to `/hub/dashboard`
6. Creator profile now visible to public
**Alternative Paths**:
- Updating tiers later: available via creator settings
- Skipping tiers (not allowed — tiers required)
**Failure Paths**:
- Stripe sync fails: 500, "Failed to create subscription tiers — try again"
- Missing required fields: 400, validation error
- Banner upload fails: non-fatal, banner can be added later
**Completion State**: Creator onboarded, tiers live in Stripe, profile visible.
**Referenced modules**: User service (onboardCreator), tier.utils (syncTiersWithStripe), storage service, frontend CreatorOnboarding component.

---

### 21. Submit Identity Verification

**Actor**: Creator
**Trigger**: Creator navigates to `/verification` from onboarding prompt or settings.
**Preconditions**: Creator is authenticated. Creator has not already submitted verification (or was rejected).
**Happy Path**:
1. Creator uploads: government ID photo, selfie photo, enters electronic signature
2. Frontend sends POST `/api/v1/users/me/verification` with files + signature
3. Backend uploads files to R2 private bucket, updates profile with verification_data, sets status = `pending verification`
4. Creator sees "Verification submitted — awaiting review"
5. Admin reviews documents, approves/rejects
6. If approved: status set to `active`
7. If rejected: status set back to previous, creator resubmits
**Alternative Paths**:
- Already verified: show "You are verified", no re-submission needed
**Failure Paths**:
- Missing files: 400, "ID and selfie are required"
- Files too large: 413, Multer error
- Upload to R2 fails: 500, "Document upload failed — try again"
**Completion State**: Verification submitted, pending admin review.
**Referenced modules**: User service (submitVerificationDocs), storage service (uploadToPrivate), admin service (getVerificationDocs, updateUserStatus), frontend CreatorVerification component.

---

### 22. Publish New Content

**Actor**: Creator
**Trigger**: Creator clicks "New Post" on creator hub.
**Preconditions**: Creator is authenticated, onboarded, status is active.
**Happy Path**:
1. Creator selects media files (images, video, audio, or text), up to 10 files
2. Creator adds title, selects type, sets visibility (subscribers_only or pay_per_view), optionally uses AI caption
3. Creator clicks "Publish"
4. Frontend sends POST `/api/v1/content` with multipart files + metadata (`protectAndCreator` + `uploadContent`)
5. Backend processes each file (sharp resize + watermark for images, ffmpeg for video), uploads to R2 private bucket, creates content record
6. If visibility is subscribers_only: subscribers notified (notification service)
7. Creator redirected to content list, new post appears
8. Subscribers receive real-time notification of new content
**Alternative Paths**:
- Save as draft: set status = `draft`, content saved but not visible
- AI caption: click "Generate Caption" before publishing (separate API call to AI endpoint)
- PPV content: set visibility = `pay_per_view`, add price
**Failure Paths**:
- File processing fails (sharp/ffmpeg error): 500, "File processing failed — unsupported format"
- R2 upload fails: content record created but files missing (orphaned — no rollback)
- File too large: 413, Multer error (1GB per file limit)
- Too many files: 413, Multer error (10 file limit)
- Notification to subscribers fails: non-fatal, content still published
**Completion State**: Content published, visible to authorized users, subscribers notified.
**Referenced modules**: Content service/controller/routes (createNewContent), storage service, notification service (notifySubscribersOfNewContent), upload middleware, frontend CreatorContent component.

---

### 23. Generate AI Caption

**Actor**: Creator
**Trigger**: Creator clicks "Generate Caption" on content upload form.
**Preconditions**: Creator is authenticated. Image/video file is selected.
**Happy Path**:
1. Creator selects a media file in the upload UI
2. Creator clicks "AI Caption" button
3. Frontend sends POST `/api/v1/ai/caption` with file (multipart)
4. Backend uploads file temporarily, sends to AI model (OpenAI/OpenRouter) with prompt for witty caption
5. AI returns generated caption string
6. Caption inserted into title/description field
7. Creator can edit, accept, or regenerate
**Alternative Paths**:
- API key missing: returns mock caption "Enjoying the moment! #vibes (AI Key Missing)"
- AI model unavailable: status code propagated (e.g., 429 rate limit), user retries
**Failure Paths**:
- No file provided: 400, "No image provided"
- AI API error: propagated status code, user retries
- Timeout: 504, "AI service timed out — try again"
**Completion State**: Caption populated in content form, ready to edit or publish.
**Referenced modules**: AI service/controller/routes, upload middleware, OpenAI SDK, frontend CreatorContent component.

---

### 24. Review Dashboard & Analytics

**Actor**: Creator
**Trigger**: Creator navigates to `/hub/dashboard` or `/hub/analytics`.
**Preconditions**: Creator is authenticated, onboarded.
**Happy Path (Dashboard)**:
1. Creator visits `/hub/dashboard`
2. Frontend requests `GET /api/v1/creator/dashboard`
3. Backend aggregates: subscriber count, new content count, total views, recent earnings, recent activity (paginated), total PPV revenue
4. Dashboard rendered with stat cards, activity feed
**Happy Path (Analytics)**:
1. Creator visits `/hub/analytics`
2. Frontend requests `GET /api/v1/creator/analytics`
3. Backend returns: event counts (profile_visit, post_view, gallery_add) over time ranges, monthly summary
4. Charts rendered (recharts) showing trends
**Alternative Paths**:
- Export CSVs: creator downloads metrics CSV or fan engagement CSV via dedicated endpoints
- New creator with no data: zero states shown for all metrics
**Failure Paths**:
- Analytics DB query slow: may timeout for large datasets
- No data: counts return 0, empty charts
**Completion State**: Dashboard/analytics displayed with current metrics.
**Referenced modules**: Creator service (getDashboardData, getAnalyticsData, exportMetricsCSV, exportFanEngagementCSV), analytics service, frontend CreatorDashboard/CreatorAnalytics components, recharts library.

---

### 25. Manage Content

**Actor**: Creator
**Trigger**: Creator navigates to `/hub/content`.
**Preconditions**: Creator is authenticated, has existing content (or empty).
**Happy Path (List)**:
1. Creator views their content with pagination via `GET /api/v1/content/my-content`
2. Each item shows: thumbnail, title, visibility, view count, status
**Happy Path (Edit)**:
1. Creator selects content item, edits title/description/visibility
2. Frontend sends PUT `/api/v1/content/:id`
3. Changes saved
**Happy Path (Delete)**:
1. Creator clicks "Delete" on content
2. Confirmation dialog
3. Frontend sends DELETE `/api/v1/content/:id`
4. Backend deletes DB record + R2 files
5. Content removed from list, all fan access revoked
**Alternative Paths**:
- Bulk upload: creator uses `/hub/bulk-upload` for multiple files
- Draft management: drafts saved but not visible to fans
**Failure Paths**:
- Content not found: 404, "Content no longer exists"
- R2 delete fails: non-fatal, DB record deleted but files may persist in storage
- Edit conflict: last-writer-wins (no versioning)
**Completion State**: Content listed, edited, or deleted as requested.
**Referenced modules**: Content service/controller, storage service (deleteFromPrivate), frontend CreatorContent page.

---

### 26. Withdraw Earnings

**Actor**: Creator
**Trigger**: Creator navigates to `/hub/earnings` and clicks "Withdraw".
**Preconditions**: Creator is authenticated. Creator has available balance (earnings minus fees, minus any pending payouts).
**Happy Path**:
1. Creator views earnings breakdown: total earned, platform fees deducted, available for payout, payout history
2. Creator clicks "Request Payout", enters amount
3. Frontend sends POST `/api/v1/creator/payouts` with amountInCents
4. Backend processes payout via Stripe Connect or debit card off-ramp
5. Transaction recorded (type = Payout)
6. Confirmation shown
**Alternative Paths**:
- Crypto withdrawal: uses crypto payment service instead of Stripe
- No payout method configured: creator prompted to set up wallet
**Failure Paths**:
- Insufficient balance: 400, "Insufficient available balance"
- Stripe Connect not set up: 400, "Payout account not configured"
- Debit card off-ramp fails: 502, "Withdrawal service error — contact support"
- Amount below minimum: 400, "Minimum withdrawal is $X"
**Completion State**: Payout initiated, pending processing.
**Referenced modules**: Creator service (getEarningsData, createPayout), crypto payment service (processDebitCardOffRamp), fee.utils, frontend CreatorEarnings component.

---

### 27. Broadcast to Subscribers

**Actor**: Creator
**Trigger**: Creator navigates to `/hub/messages`, clicks "Broadcast to Subscribers".
**Preconditions**: Creator is authenticated. Creator has at least one active subscriber.
**Happy Path**:
1. Creator composes broadcast message (text, optional minimum tier filter)
2. Creator clicks "Send Broadcast"
3. Frontend sends POST `/api/v1/messages/mass-message`
4. Backend iterates all active subscribers, creates/finds conversations, sends individual message to each
5. Confirmation shown: "Message sent to X subscribers"
6. Each subscriber receives message in their inbox (real-time via Socket.IO)
**Alternative Paths**:
- Tier filter: only subscribers of specified minimum tier receive the broadcast
**Failure Paths**:
- No subscribers: 400, "No active subscribers to message" (or graceful success with 0 recipients)
- Individual message failures: non-fatal (iteration continues), partial delivery logged
- Very large subscriber base: synchronous iteration may timeout (no queue system)
**Completion State**: Broadcast sent to all eligible subscribers.
**Referenced modules**: Message service (sendMassMessageToSubscribers), conversation/message/subscription models, frontend CreatorMessages component.

---

### 28. Host a Contest

**Actor**: Creator
**Trigger**: Creator navigates to contest management in creator hub.
**Preconditions**: Creator is authenticated, onboarded.
**Happy Path (Create)**:
1. Creator fills in contest details: title, description, start date, end date, prize, entry requirements (optional: subscription required)
2. Creator clicks "Create" via POST `/api/v1/contests`
3. Contest created as `draft`
**Happy Path (Publish)**:
1. Creator views draft contest, clicks "Publish"
2. PUT `/api/v1/contests/:id/publish` sets status to `active`
3. Contest visible in fan contest feed
**Happy Path (Finalize)**:
1. After contest end date, creator clicks "Pick Winner"
2. POST `/api/v1/contests/:id/finalize`
3. Contest status set to `completed`, winner recorded
4. (Winner selection logic delegated to model — random or first-entry is unclear from source)
**Alternative Paths**:
- Contest with subscription requirement: only subscribers can enter
- Edit contest (not implemented): must be done before publishing
**Failure Paths**:
- End date before start date: 400, "End date must be after start date"
- Not contest owner: 403, "Unauthorized"
- Contest already completed: 400, "Contest already completed"
- Contest not active (enter): 400, "Contest is not active"
**Completion State**: Contest created, published, or finalized with winner.
**Referenced modules**: Contest service/controller, contest model, subscription model, frontend contest components.

---

### 29. Manage Subscription Tiers

**Actor**: Creator
**Trigger**: Creator navigates to `/hub/settings`, views "Subscription Tiers" section.
**Preconditions**: Creator is authenticated, onboarded.
**Happy Path**:
1. Creator views current tiers via `GET /api/v1/creator/tiers`
2. Creator can edit tier name, price, benefits
3. Changes saved via creator settings update
4. Stripe products/prices updated to match
**Alternative Paths**: None.
**Failure Paths**:
- Stripe sync fails: 500, "Failed to sync with payment processor"
- Existing subscribers on modified tier: price change applies to new subscribers only (Stripe behavior)
**Completion State**: Tiers updated, reflected on creator profile and Stripe.
**Referenced modules**: Creator service (getCreatorTiers, updateSettings), tier.utils, User service (onboardCreator), frontend CreatorSettings component.

---

### 30. Reply to Fan Messages

**Actor**: Creator
**Trigger**: Creator opens `/hub/messages`, sees conversation list with unread badges.
**Preconditions**: Creator is authenticated. Creator has existing conversations.
**Happy Path**:
1. Creator views conversations, sorted by most recent
2. Creator selects a conversation, sees message history via `GET /api/v1/messages/conversations/:id`
3. Creator types reply, sends via POST `/api/v1/messages`
4. Message delivered in real-time via Socket.IO
5. Creator can also send voice messages via POST `/api/v1/messages/voice`
6. Messages can be deleted via DELETE `/api/v1/messages/:id`
**Alternative Paths**:
- Fan initiates conversation: creator sees new conversation appear
- No conversations: empty state
**Failure Paths**:
- Fan deleted account: conversation still visible but send fails
- Voice upload fails: 413 if file too large
**Completion State**: Message sent, visible in conversation in real-time.
**Referenced modules**: Message service/controller/routes, frontend CreatorMessages component, Socket.IO.

---

### 31. Export Business Data

**Actor**: Creator
**Trigger**: Creator clicks "Export CSV" on analytics or earnings page.
**Preconditions**: Creator is authenticated. Creator has data to export.
**Happy Path**:
1. Creator clicks "Export Metrics" on analytics page
2. Frontend requests `GET /api/v1/creator/metrics/export`
3. Backend generates CSV string of all analytics data
4. File downloaded as CSV
**Alternative Paths**:
- Export fan engagement: separate endpoint for subscriber/fan data CSV
**Failure Paths**:
- No data: returns CSV with headers only
- Large dataset: generated in memory (no streaming), may be slow
**Completion State**: CSV file downloaded.
**Referenced modules**: Creator service (exportMetricsCSV, exportFanEngagementCSV), analytics service, frontend CreatorAnalytics component.

---

## Admin Journeys

### 32. View Admin Dashboard

**Actor**: Admin
**Trigger**: Admin navigates to `/admin/dashboard`.
**Preconditions**: Admin is authenticated with admin role.
**Happy Path**:
1. Frontend requests `GET /api/v1/admin/dashboard`
2. Backend aggregates: total users, total creators, total content, total revenue, recent transactions
3. Dashboard rendered with stat cards and charts
**Alternative Paths**: None.
**Failure Paths**:
- Large dataset: aggregation may be slow
**Completion State**: Dashboard displayed with platform metrics.
**Referenced modules**: Admin service (getDashboardStats), all models (count queries), frontend AdminPanel/DashboardPanel.

---

### 33. Manage User Accounts

**Actor**: Admin
**Trigger**: Admin navigates to `/admin/users`.
**Preconditions**: Admin is authenticated.
**Happy Path (List)**:
1. Admin views all users via `GET /api/v1/admin/users`
2. Each user shows: email, username, role, status, created date
**Happy Path (Status Change)**:
1. Admin selects user, changes status (active/suspended/banned)
2. PUT `/api/v1/admin/users/:id/status`
3. User's access updated immediately
**Happy Path (Commission Override)**:
1. Admin selects creator, sets custom commission rate
2. PUT `/api/v1/admin/users/:id/commission`
3. Commission applied to future transactions
**Alternative Paths**:
- Admin messaging: admin can send email to any user via POST `/api/v1/admin/users/:id/message`
**Failure Paths**:
- User not found: 404
- Invalid status: 400
- Cannot suspend self: (not explicitly prevented — admin could suspend own account)
**Completion State**: User list displayed, status updated, or commission set.
**Referenced modules**: Admin service (getAllUsers, updateUserStatus, updateCreatorCommission, messageUser), user model, email service, frontend UserManagementPanel.

---

### 34. Moderate Platform Content

**Actor**: Admin
**Trigger**: Admin navigates to `/admin/content`.
**Preconditions**: Admin is authenticated. Flagged content exists (or empty).
**Happy Path**:
1. Admin views flagged content via `GET /api/v1/admin/content/flagged`
2. Each item shows: content preview, creator, report reason, report count
3. Admin can approve (remove flag) via PUT `/api/v1/admin/content/:id/status`
4. Admin can remove content (set status to removed) — hides from all users
**Alternative Paths**:
- No flagged content: empty state
- Bulk actions: per-item only (no bulk select)
**Failure Paths**:
- Content already removed: 404
- Invalid status transition: 400
**Completion State**: Content moderated — approved or removed.
**Referenced modules**: Admin service (getFlaggedContent, updateContentStatus), content model, report model, frontend ContentModerationPanel.

---

### 35. Review Verification Documents

**Actor**: Admin
**Trigger**: Admin navigates to user detail in admin panel, views verification section.
**Preconditions**: Admin is authenticated. Creator has submitted verification documents.
**Happy Path**:
1. Admin views user with status `pending verification`
2. Admin requests verification docs via `GET /api/v1/admin/users/:id/verification-docs`
3. Backend generates signed URLs from R2 private bucket for ID + selfie photos
4. Admin reviews documents in browser
5. Admin approves (sets status to `active`) or rejects (leaves as `pending` for resubmission)
**Alternative Paths**:
- No documents submitted: empty state, "No verification documents"
- Expired signed URLs: admin refreshes to regenerate
**Failure Paths**:
- R2 unavailable: 502, "Document retrieval unavailable"
- User not found: 404
**Completion State**: Documents reviewed, user status updated.
**Referenced modules**: Admin service (getVerificationDocs, updateUserStatus), storage service (getPrivateSignedUrl), frontend admin components.

---

### 36. Administer Support Tickets

**Actor**: Admin
**Trigger**: Admin navigates to `/admin/support`.
**Preconditions**: Admin is authenticated. Support tickets exist.
**Happy Path (List)**:
1. Admin views all tickets via `GET /api/v1/admin/support-tickets`
2. Each ticket shows: user, subject, status, priority, last updated
**Happy Path (Reply)**:
1. Admin clicks ticket, views conversation history
2. Ticket status auto-changes from Open to Pending (admin has seen it)
3. Admin types reply, clicks "Send"
4. PUT `/api/v1/admin/support-tickets/:id/reply` or via PUT `/api/v1/support/tickets/:id/reply`
5. Reply appended to conversation, status set to Pending
6. User receives DM notification of reply (via message.service)
**Happy Path (Resolve)**:
1. Admin clicks "Resolve" on ticket
2. PUT `/api/v1/support/tickets/:id/resolve`
3. Status set to Resolved
**Alternative Paths**:
- User replies to ticket: status resets to Open (admin attention needed)
**Failure Paths**:
- Ticket not found: 404
- DM send fails: non-fatal, ticket updated but user not notified via DM
**Completion State**: Ticket replied to or resolved.
**Referenced modules**: Admin service (getSupportTickets, updateSupportTicket), support service (addReplyToTicket, resolveTicket), message service (dynamic require), frontend SupportTicketsPanel.

---

### 37. Configure Platform Settings

**Actor**: Admin
**Trigger**: Admin navigates to `/admin/settings`.
**Preconditions**: Admin is authenticated.
**Happy Path**:
1. Admin views current platform settings via `GET /api/v1/admin/settings/platform`
2. Admin edits commission rate
3. PUT `/api/v1/admin/settings/platform` with new rate
4. Settings saved, future transactions use new commission
**Alternative Paths**:
- View admin users list via `GET /api/v1/admin/settings/admins`
**Failure Paths**:
- Invalid commission rate: 400, if out of valid range
**Completion State**: Platform settings updated.
**Referenced modules**: Admin service (getPlatformSettings, updatePlatformSettings), platform settings model, frontend SettingsPanel.

---

### 38. Generate Platform Reports

**Actor**: Admin
**Trigger**: Admin navigates to `/admin/reports`.
**Preconditions**: Admin is authenticated.
**Happy Path (Generate)**:
1. Admin selects report parameters (date range, metric type, filters)
2. POST `/api/v1/admin/reports` with report config
3. Backend generates report data
4. Report displayed in admin panel
5. Report configuration optionally saved for reuse
**Happy Path (View Saved)**:
1. Admin views saved reports via `GET /api/v1/admin/reports`
2. Admin clicks saved report to re-run
**Alternative Paths**: None.
**Failure Paths**:
- Large date range: may timeout on large datasets
- Invalid filter combination: 400
**Completion State**: Report generated and displayed.
**Referenced modules**: Admin service (generateReport, getSavedReports), report model, frontend ReportsPanel.

---

### 39. Oversee Enclave Applications

**Actor**: Admin
**Trigger**: Admin navigates to `/admin/enclave` or `/admin/enclave-applications`.
**Preconditions**: Admin is authenticated. Enclave applications exist.
**Happy Path**:
1. Admin views all enclave applications via `GET /api/v1/enclave/applications`
2. Each application shows: applicant name, social platforms, reason, status
3. Admin approves application: PATCH `/api/v1/enclave/applications/:id` with approved status
4. Admin rejects with or without reason
5. Applicant notified (via email or status change)
**Alternative Paths**: None.
**Failure Paths**:
- Application not found: 404
- Already processed: 400, "Application already reviewed"
**Completion State**: Application approved or rejected.
**Referenced modules**: Enclave controller/routes, enclave application model, email service, frontend EnclaveApplications component.

---

### 40. Browse Enclave & Apply for Membership

**Actor**: Fan (or potential creator)
**Trigger**: User clicks "Join Enclave" from splash page, creator dashboard promotion, or direct link.
**Preconditions**: User is not yet an Enclave member. Enclave has capacity (≤ 50 members).
**Happy Path (Browse)**:
1. User navigates to Enclave landing page (public or authenticated)
2. Frontend calls `GET /api/v1/enclave/spots-remaining` via `EnclaveHero.tsx`
3. Spots remaining displayed as progress indicator (e.g., "Only 12 of 50 spots left")
4. User reads Enclave benefits: reduced fee (10%), exclusive Discord, early access, networking
**Happy Path (Apply)**:
1. User clicks "Apply Now"
2. Enclave application form loaded (`EnclaveApplicationForm.tsx`)
3. User fills in: full name, email, phone (optional), platforms (checkbox list), follower count, monthly earnings, content types, why join, how heard, optional referral code
4. Frontend sends POST to `/api/v1/enclave/applications`
5. Backend validates required fields, checks duplicates (409 if email already applied), checks capacity
6. Application created with status `pending`
7. Referral code tracked if provided (non-fatal on failure)
8. Confirmation email sent to applicant's email
9. Frontend shows success message: "Application submitted! Check your email for confirmation."
**Alternative Paths**:
- User returns to check status: No status endpoint for applicants — must wait for email notification
- Referral code: Optional field, linked during submission
**Failure Paths**:
- Enclave full: 400, "The Enclave is now full"
- Duplicate email: 409, "An application with this email already exists"
- Missing required fields: 400, specific field validation errors
- Email send fails: non-fatal, application still created
**Completion State**: Application submitted and pending admin review. User notified via email.
**Referenced modules**: Enclave controller/routes, enclave_applications table, EmailService, referral model, frontend EnclaveHero, EnclaveApplicationForm, ui/Button, ui/Input.

---

### 41. Impersonate a User

**Actor**: Admin
**Trigger**: Admin needs to debug a user's issue and wants to see the platform as that user.
**Preconditions**: Admin is authenticated. Target user exists.
**Happy Path**:
1. Admin navigates to user detail in admin panel
2. Admin clicks "Impersonate User"
3. Frontend adds `X-Impersonating-User-Id` header to all subsequent requests
4. Backend auth middleware detects impersonation header, loads target user instead of admin
5. Original admin stored in `req.originalUser` for audit trail
6. Admin sees the platform exactly as the target user
7. Impersonation banner displayed in UI ("Impersonating @username — Stop")
8. Admin clicks "Stop Impersonation" — header removed, normal session restored
**Alternative Paths**: None.
**Failure Paths**:
- User not found: 404
- Admin attempts to impersonate another admin: (not explicitly blocked)
**Completion State**: Admin viewing platform as target user, or returned to normal session.
**Referenced modules**: Auth middleware (impersonation logic), frontend useAuth hook (impersonation state management), frontend ImpersonationBanner component, frontend apiClient (header injection).

---

## Journey Dependency Map

```
Auth Journeys (prerequisite for all others)
  │
  ├── Fan Journeys ──────────────────────────────────────┐
  │   ├── Browse Creator Profile                          │
  │   ├── Subscribe to Creator ────────────────────────┐  │
  │   ├── View Gated Content ◄─────────────────────────┼──┤
  │   ├── Purchase PPV Content ◄───────────────────────┘  │
  │   ├── Send a Tip                                      │
  │   ├── Browse Personalized Feed ◄────────────────────┐  │
  │   ├── Manage Gallery (save content from feed) ───────┤  │
  │   ├── Send Direct Message                             │
  │   ├── Participate in Contest                          │
  │   ├── Manage Subscriptions (view, change, cancel)     │
  │   ├── Manage Account Settings                         │
  │   ├── Submit Support Ticket                           │
  │   ├── Generate & Share Referral Code                  │
  │   ├── Apply for Enclave Membership                    │
  │   └── Manage Notifications (receive alerts) ──────────┘  │
  │                                                         │
  ├── Creator Journeys                                      │
  │   ├── Complete Onboarding ──────────────────────────┐   │
  │   ├── Submit Identity Verification                    │   │
  │   ├── Publish New Content ─────────────────────────┐ │   │
  │   │   └── Generate AI Caption (during publish)      │ │   │
  │   ├── Manage Content (edit, delete) ◄───────────────┘ │   │
  │   ├── Review Dashboard & Analytics ◄───────────────────┘   │
  │   ├── Withdraw Earnings ◄───────────────────────────────────┘
  │   ├── Broadcast to Subscribers
  │   ├── Host a Contest
  │   ├── Manage Subscription Tiers ──────────────────────┐
  │   ├── Reply to Fan Messages                            │
  │   └── Export Business Data                             │
  │                                                        │
  └── Admin Journeys                                      │
      ├── View Admin Dashboard                             │
      ├── Manage User Accounts ◄───────────────────────────┘
      ├── Moderate Platform Content ◄───────────────────────── Subscription content
      ├── Review Verification Documents ◄──────────────────── Creator verification
      ├── Administer Support Tickets ◄─────────────────────── User support
      ├── Configure Platform Settings
      ├── Generate Platform Reports
      ├── Oversee Enclave Applications ◄───────────────────── Enclave applications
      └── Impersonate a User ◄─────────────────────────────── Any user
```

**Key observations**:
- 41 journeys across 4 user types (U=1, F=16, C=12, A=8 + shared auth=4)
- Auth journeys are prerequisite for every other journey
- "Publish New Content" triggers "Manage Notifications" (fan receives alert)
- "Subscribe to Creator" gates "View Gated Content"
- "Purchase PPV Content" gates "View Gated Content" (alternative path)
- "Complete Onboarding" is prerequisite for all creator journeys
- Admin journeys span every entity — admins touch every part of the system
- "Impersonate a User" is a meta-journey — it lets admin experience any other journey as another user

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-02 | AI Architect | Initial user journeys analysis |
