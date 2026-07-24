# Phase 4: Cross-Cutting Concerns

**Created:** 2026-07-02
**Phase:** 4 (Cross-Cutting Concerns)
**Deliverable:** Data flow, security architecture, deployment, error handling, internal workflows
**Covers:** Server entry point, middleware chain, auth flows, payment flows, real-time messaging, impersonation, content upload, error handling, CI/CD, Docker, hosting

---

## Table of Contents

1. [Data Flow Architecture](#1-data-flow-architecture)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Payment Processing](#3-payment-processing)
4. [Real-Time Messaging](#4-real-time-messaging)
5. [Content Upload & Storage](#5-content-upload--storage)
6. [Error Handling Strategy](#6-error-handling-strategy)
7. [Impersonation Flow](#7-impersonation-flow)
8. [Deployment & Infrastructure](#8-deployment--infrastructure)
9. [CI/CD Pipeline](#9-cicd-pipeline)
10. [Logging & Observability](#10-logging--observability)
11. [Configuration Management](#11-configuration-management)
12. [Architectural Risk Assessment](#12-architectural-risk-assessment)

---

## 1. Data Flow Architecture

### 1.1 Request Lifecycle

```
                          EXTERNAL
                            |
                      [DNS/CDN/Proxy]
                            |
                      [HTTPS (443)]
                            |
                    ┌───────┴────────┐
                    │                │
            [Render Hosting]    [Netlify/Cloudflare]
            (backend.prod)     (frontend.prod)
                    │                │
                    │                ├─── [Vite Dev Proxy] (dev only)
                    │                │        /api → localhost:5000
                    │                │
                    │                └─── [React SPA]
                    │                        │
                    │                        │ apiClient.ts
                    │                        │ (Axios, auth interceptors)
                    │                        │
                    ▼                        ▼
            ┌───────────────────────────────────────┐
            │           EXPRESS SERVER              │
            │           PoDM_project/Server.ts      │
            │                                       │
            │  Request Pipeline:                    │
            │                                       │
            │  1. CORS                              │
            │  2. JSON body parser (1100mb limit)   │
            │  3. Route matching (/api/v1/*)        │
            │  4. Middleware chain (per-route)       │
            │     ├── auth.middleware (protect)      │
            │     │   ├── supabase.auth.getUser()   │
            │     │   ├── user.model.findById()      │
            │     │   └── impersonation check        │
            │     ├── upload.middleware (multer)     │
            │     │   └── memoryStorage → req.files  │
            │     └── validation.middleware          │
            │         └── express-validator checks   │
            │  5. Controller                         │
            │     ├── asyncHandler catch wrapper     │
            │     ├── response helpers (ok/created)  │
            │     └── entity guards (requireUser)    │
            │  6. Service                            │
            │     ├── business logic                 │
            │     ├── external API calls             │
            │     │   ├── Stripe / R2 / OpenAI       │
            │     │   └── Supabase DB queries        │
            │     └── inter-service calls            │
            │  7. Model                              │
            │     ├── database wrappers              │
            │     │   └── handleQuery / handleList   │
            │     └── raw SQL queries (some)         │
            │  8. Response                           │
            │     ├── { success, data, message }     │
            │     └── error → errorHandler middleware │
            └───────────────────────────────────────┘
                            │
                    [PostgreSQL via Supabase]
                            │
                    ┌───────┴────────┐
                    │                │
            [12+ tables]     [12 enum types]
```

### 1.2 Data Flow for a Typical Authenticated Request

Using `POST /api/v1/content` (Publish New Content) as the canonical example:

```
1. Browser/form submits multipart data
       │
2. Vite dev proxy (dev) or Netlify redirect (prod)
  /api → http://localhost:5000
       │
3. CORS check (origin: localhost:5173 or *.pages.dev or podm.app)
       │
4. Multer middleware (upload.array('contentFiles', 10))
  ├── Validates MIME type (jpeg/png/webp/mp4/mov/mp3/m4a/wav/ogg)
  ├── Validates file size ≤ 1GB
  └── Stores files in memory as Buffer[] on req.files
       │
5. Auth middleware (protect)
  ├── Extracts Bearer token from Authorization header
  ├── Calls supabase.auth.getUser(token) → validates JWT
  ├── Calls findUserById(authUser.id) → fetches full profile
  ├── Checks X-Impersonating-User-Id header (admin bypass)
  └── Attaches req.user (reshaped profile)
       │
6. Content controller (asyncHandler)
  ├── requireContentOwnership guard (checks req.user owns the content)
  ├── Extracts fields from req.body (title, description, visibility, etc.)
  └── Calls content.service.createContent(userId, files, metadata)
       │
7. Content service
  ├── Uploads files to R2 via storage.service → returns URLs
  ├── Creates content record via ContentModel.create()
  ├── Calls notification.service.notifySubscribers(creatorId, contentId)
  └── (Analytics event logged in controller)
       │
8. Response: { success: true, data: { content: {...} } }
```

### 1.3 Inter-Service Data Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│ Content   │────>│ Notification │     │ Storage      │
│ Service   │     │ Service      │     │ Service      │
│           │     │              │     │              │
│ create()  │     │ notifySubs() │     │ uploadFile() │
└────┬──────┘     └──────────────┘     └──────┬───────┘
     │                                        │
     │  POST /api/v1/content                  │ upload to R2
     │  (multipart)                           │ (s3.putObject)
     │                                        │
     ▼                                        │
┌──────────┐                                  │
│ Creator   │                                  │
│ Service   │                                  │
│           │                                  │
│ getData() │────> analytics.service           │
│ getCnt() │────> storage.service ─────────────┘
│ earn()   │────> cryptoPayment.service
└──────────┘

┌──────────┐     ┌──────────────┐
│ Auth      │────>│ Subscription │
│ Service   │     │ Service      │
│           │     │              │
│ signup()  │     │ create()     │
│ +Sub()    │     │              │
└──────────┘     └──────┬───────┘
                        │
                        ├────> message.service (broadcast)
                        └────> cryptoPayment.service (on-chain)

┌──────────┐     ┌──────────────┐     ┌──────────┐
│ Admin     │────>│ Storage      │     │ Email    │
│ Service   │     │ Service      │     │ Service  │
│           │     │              │     │          │
│ manage()  │     │ getUrl()     │     │ send()   │
└──────────┘     └──────────────┘     └──────────┘

┌──────────┐     ┌──────────────┐
│ Support   │────>│ Message      │ (dynamic require())
│ Service   │     │ Service      │
│           │     │              │
│ reply()   │     │ send()       │
└──────────┘     └──────────────┘

┌──────────┐     ┌──────────────┐
│ User      │────>│ Storage      │
│ Service   │     │ Service      │
│           │     │              │
│ update()  │     │ uploadFile() │
└──────────┘     └──────────────┘
```

### 1.4 Frontend Data Flow

```
Component/Page
    │
    │ api(function, args) or apiClient.get/post/put/delete
    ▼
apiClient.ts (Axios)
    │
    ├── Interceptor: attach Bearer token (localStorage/sessionStorage)
    ├── Interceptor: attach X-Impersonating-User-Id (if impersonating)
    ├── Interceptor: remove Content-Type for FormData
    │
    ▼
Vite Proxy → Backend Server → Response
    │
    ▼
Response interceptor: 401 → clear tokens → redirect
    │
    ▼
Component receives response.data (unwrapped by api() helper)
    │
    ├── Sets local state (data, loading, error)
    └── Toast notification on error (via registerErrorHandler)
```

---

## 2. Authentication & Authorization

### 2.1 Auth Mechanisms

| Mechanism | Where | Purpose |
|---|---|---|
| Supabase JWT (Bearer token) | `auth.middleware.ts` | Primary auth — verify token via `supabase.auth.getUser()` |
| Role-based guards | `auth.middleware.ts` | `creatorOnly`, `adminOnly`, `requireRole(...roles)` |
| Composite guards | `auth.middleware.ts` | `protectAndCreator = [protect, creatorOnly]` |
| `protectAndAdmin = [protect, adminOnly]` | Same | Admin auth |
| Optional protect | `auth.middleware.ts` | `optionalProtect` — public routes with optional user context |
| Admin impersonation | `auth.middleware.ts:80-96` | `X-Impersonating-User-Id` header, admin can act as any user |
| Stripe Connect | `creator.service.ts` | OAuth for creator payout onboarding |
| Crypto wallet | `WalletSettings.tsx` + `useCryptoWallet.ts` | Embedded/custom wallet (mocked) |

### 2.2 Auth Flow

```
REQUEST
  │
  ├── Has "Authorization: Bearer <token>"?
  │    YES → continue to protect middleware
  │    NO  → continue ONLY if optionalProtect, else 401
  │
  ▼
protect middleware
  │
  1. supabase.auth.getUser(token)
  │   ├── Valid JWT → returns { user: AuthUser }
  │   └── Invalid/expired → 401 "Not authorized"
  │
  2. findUserById(authUser.id)
  │   ├── Found → complete profile from 'profiles' table
  │   └── Not found → 404 "User profile not found"
  │
  3. reshapeUserForApp(userProfile)
  │   → req.user = { id, username, email, role, status, ... }
  │
  4. Check X-Impersonating-User-Id header
  │   ├── Present AND req.user.role === 'admin'
  │   │   ├── findUserById(impersonatingUserId)
  │   │   ├── req.originalUser = req.user (save admin)
  │   │   └── req.user = reshapedTargetUser
  │   └── Missing or not admin → continue as normal
  │
  ▼
Role guard (if present)
  │   ├── creatorOnly → req.user.role === 'creator'
  │   ├── adminOnly → req.user.role === 'admin'
  │   └── requireRole('creator', 'admin') → roles.includes(req.user.role)
  │
  ▼
Controller → uses req.user for all user identification
```

### 2.3 Auth Middleware Chain per Route Group

| Route Group | Middleware Chain | Auth Required |
|---|---|---|
| `/api/v1/auth` | None | No |
| `/api/v1/users` | `protect` | Yes |
| `/api/v1/creator` | `protectAndCreator` | Yes + Creator |
| `/api/v1/content` | Mixed (`protect`, `optionalProtect`, none) | Per-endpoint |
| `/api/v1/subscriptions` | Mixed (`protect`, `optionalProtect`) | Per-endpoint |
| `/api/v1/messages` | `protect` | Yes |
| `/api/v1/payments/crypto` | `protect` | Yes |
| `/api/v1/admin` | `protectAndAdmin` | Yes + Admin |
| `/api/v1/analytics` | `protect` | Yes |
| `/api/v1/support` | `protect` | Yes |
| `/api/v1/ai` | `protectAndCreator` | Yes + Creator |
| `/api/v1/notifications` | `protect` | Yes |
| `/api/v1/contests` | Mixed (not checked fully) | Varies |
| `/api/v1/enclave` | Mixed (`protect`, none on GET) | Varies |
| `/api/v1/referrals` | Mixed (2 routes unprotected) | **Anomaly** |

### 2.4 Auth Vulnerabilities & Observations

| Issue | Severity | Location | Detail |
|---|---|---|---|
| **Unprotected referral routes** | Critical | `referral.routes.ts` | `/check-milestone/:userId` and `/validate/:code` have no auth middleware |
| **No fan route guard on frontend** | Moderate | `App.tsx:312-319` | `/fan/*` routes have no role check — URL access by any role works |
| **2 Supabase calls per request** | Moderate | `auth.middleware.ts` | Every authed request makes 2 Supabase API calls (JWT verify + user lookup). No caching. |
| **Auth token stored in 2 places** | Low | `useAuth.tsx` | Token stored in both localStorage and sessionStorage depending on "Remember Me" |
| **No refresh token rotation** | Low | Full stack | Supabase handles refresh tokens, but no explicit rotation or invalidation on role change |
| **No MFA/2FA** | Low | Full stack | Fan settings has a 2FA toggle, but no implementation detected |
| **No rate limiting** | Low | Full stack | No rate limiting middleware detected on any route group |

---

## 3. Payment Processing

### 3.1 Payment Methods

| Method | Mechanism | Use Case | Fee |
|---|---|---|---|
| **Stripe PaymentIntents** | Server-side creation, client-side confirmation | Tips, PPV unlocks | Platform commission (12.5% default) |
| **Stripe Subscriptions** | Stripe subscription API | Recurring fan subscriptions | Creator-defined pricing |
| **Stripe Connect (payouts)** | Stripe Express onboarding | Creator fiat withdrawals | Stripe Connect fees |
| **Crypto (USDC)** | Smart contract `transferFrom` | Subscriptions (profile module), tips, PPV | Platform fee BPS (capped 30%) |
| ~~Stripe SetupIntents~~ | ~~Save payment method for reuse~~ | ~~Fan settings payment method update~~ | ~~ABORTED (removed from codebase)~~ |

### 3.2 Stripe Payment Flow (Tips/PPV)

```
FAN                     FRONTEND                    BACKEND                    STRIPE
 │                        │                           │                        │
 │  Click "Unlock"        │                           │                        │
 │───────────────────────>│                           │                        │
 │                        │                           │                        │
 │  Step 1: Card form     │                           │                        │
 │  (or saved card)       │                           │                        │
 │                        │                           │                        │
 │  Submit payment        │                           │                        │
 │───────────────────────>│                           │                        │
 │                        │                           │                        │
 │   if no saved card:    │                           │                        │
 │   stripe.createPayment │                           │                        │
 │   Method(CardElement)  │                           │                        │
 │                        │                           │                        │
 │                        │  POST unlockPost()        │                        │
 │                        │  (contentId, pmId)        │                        │
 │                        │──────────────────────────>│                        │
 │                        │                           │  stripe.paymentIntents │
 │                        │                           │  .create({             │
 │                        │                           │    amount, currency,   │
 │                        │                           │    pmId,               │
 │                        │                           │    confirm: true       │
 │                        │                           │  })                    │
 │                        │                           │───────────────────────>│
 │                        │                           │                        │
 │                        │  return { clientSecret,   │   ← PaymentIntent      │
 │                        │           status, piId }  │                        │
 │                        │<──────────────────────────│                        │
 │                        │                           │                        │
 │  if requires_action:   │                           │                        │
 │  stripe.confirmCard     │                           │                        │
 │  Payment(piId)          │                           │                        │
 │  (3DS/SCA)             │                           │                        │
 │                        │                           │                        │
 │                        │  POST confirmTransaction  │                        │
 │                        │  (piId)                   │                        │
 │                        │──────────────────────────>│                        │
 │                        │                           │  Mark as completed     │
 │                        │  ← success                │                        │
 │                        │<──────────────────────────│                        │
 │  Step 2: Success       │                           │                        │
 │<───────────────────────│                           │                        │
```

### 3.3 Crypto Payment Flow (Subscriptions)

```
FAN                     FRONTEND                    BACKEND                    SMART CONTRACT
 │                        │                           │                        │
 │  Select tier           │                           │                        │
 │───────────────────────>│                           │                        │
 │                        │                           │                        │
 │  Step 1: Connect       │                           │                        │
 │  wallet                │                           │                        │
 │  (embedded/custom)     │                           │                        │
 │                        │                           │                        │
 │  Step 2: Approve       │                           │                        │
 │  subscription          │                           │                        │
 │───────────────────────>│                           │                        │
 │                        │                           │                        │
 │  [N: connectWallet     │                           │                        │
 │   is mocked — returns  │                           │                        │
 │   hardcoded addresses  │                           │                        │
 │   with 800ms delay]    │                           │                        │
 │                        │                           │                        │
 │  "Approve" → simulates │                           │                        │
 │  on-chain tx           │                           │                        │
 │                        │  POST createSubscription  │                        │
 │                        │  (creatorId, tierId)      │                        │
 │                        │──────────────────────────>│                        │
 │                        │                           │  Verify tx on BaseScan │
 │                        │                           │  via cryptoPayment     │
 │                        │                           │  .verifyCryptoPayment  │
 │                        │                           │                        │
 │                        │  ← success + content      │                        │
 │<───────────────────────│                           │                        │
```

### 3.4 Payout Flow (Creator Fiat)

```
CREATOR                  FRONTEND                    BACKEND                    STRIPE
 │                        │                           │                        │
 │  Visit Earnings        │                           │                        │
 │  → sees available      │                           │                        │
 │  balance               │                           │                        │
 │                        │                           │                        │
 │  Click "Withdraw"      │                           │                        │
 │───────────────────────>│                           │                        │
 │                        │                           │                        │
 │  Enter amount          │                           │                        │
 │───────────────────────>│                           │                        │
 │                        │  POST requestPayout       │                        │
 │                        │  (amount)                 │                        │
 │                        │──────────────────────────>│                        │
 │                        │                           │  stripe.transfers      │
 │                        │                           │  .create({             │
 │                        │                           │    amount, currency,   │
 │                        │                           │    destination:         │
 │                        │                           │    creatorStripeId      │
 │                        │                           │  })                    │
 │                        │                           │───────────────────────>│
 │                        │                           │                        │
 │                        │  ← success                │                        │
 │                        │<──────────────────────────│                        │
 │  Step 2: success       │                           │                        │
 │<───────────────────────│                           │                        │
```

### 3.5 Payment Processing Observations

| Observation | Detail |
|---|---|
| **Stripe initialized inline** | 4+ files (subscription.service, cryptoPayment.service, tier.utils, subscription.utils) call `new Stripe(process.env.STRIPE_SECRET_KEY!)` independently — no shared Stripe config |
| **No Stripe webhooks** | No `/webhooks/stripe` endpoint detected. No event-driven payment confirmation, subscription renewal, or failed payment handling |
| **Payout is synchronous** | No queue for payout requests — runs in request path |
| **Crypto wallet is mocked** | `useCryptoWallet.ts` returns hardcoded addresses. Smart contract exists on-chain but frontend integration is simulated |
| **Tip flow gap** | `useStripePayment` hook explicitly throws for tips — `TipModal.tsx` duplicates Stripe handling |
| **Platform commission** | 12.5% default (configurable via admin settings, capped at 30% in smart contract) |

---

## 4. Real-Time Messaging

### 4.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND SERVER                         │
│                                                             │
│  Socket.IO Server (config/socket.ts)                        │
│  ├── JWT auth on connection                                 │
│  ├── Rooms: conversation-{conversationId}                   │
│  └── Events:                                                │
│      ├── join_conversation (fan/creator)                    │
│      ├── leave_conversation (fan/creator)                   │
│      ├── new_message (server → room)                        │
│      ├── message_updated (server → room)                    │
│      └── message_deleted (server → room)                    │
│                                                             │
│  message.service.ts                                         │
│  ├── sendMessage → creates DB record → io.to(room).emit()  │
│  ├── deleteMessage → updates DB → io.to(room).emit()       │
│  └── markAsRead → updates DB                                │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
        (WebSocket w/ Socket.IO)
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                      FRONTEND                               │
│                                                             │
│  socket.ts (lib)                                            │
│  ├── autoConnect: false                                     │
│  └── Auth callback reads token from localStorage            │
│                                                             │
│  CreatorMessages / FanMessages                              │
│  ├── useEffect: socket.connect() on mount                   │
│  ├── socket.emit('join_conversation', id)                   │
│  ├── socket.on('new_message', handleNewMessage)             │
│  ├── socket.on('message_deleted', handleDeleted)            │
│  └── useEffect: socket.disconnect() on unmount              │
│                                                             │
│  MessageBubble (shared component)                           │
│  ├── Renders text, voice, PPV content                       │
│  ├── Unlock/delete actions                                  │
│  └── Creator = pink, Fan = purple                           │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Message Flow Sequence

```
CREATOR                 SOCKET.IO               FAN                  DATABASE
 │                        │                       │                    │
 │  Send message          │                       │                    │
 │───────────────────────>│                       │                    │
 │                        │                       │                    │
 │  POST /api/v1/messages │                       │                    │
 │  (receiverId, text)    │                       │                    │
 │────────────────────────────────────────────────────────────────────>│
 │                        │                       │                    │
 │  Create DB record      │                       │                    │
 │<────────────────────────────────────────────────────────────────────│
 │                        │                       │                    │
 │  Emit 'new_message'    │                       │                    │
 │  to conversation room  │                       │                    │
 │────────────────────────────────────────────────>│                    │
 │                        │                       │                    │
 │  Update UI instantly   │                       │  Update UI         │
 │<───────────────────────│<──────────────────────│                    │
 │                        │                       │                    │
 │  Mark as read          │                       │                    │
 │────────────────────────────────────────────────────────────────────>│
 │                        │                       │                    │
```

### 4.3 Real-Time Observations

| Observation | Detail |
|---|---|
| **Socket.IO server in config** | `config/socket.ts` — initSocketServer(httpServer), JWT auth middleware |
| **No presence tracking** | No typing indicators, online/offline status, or read receipts detected |
| **Voice messages** | Sent via REST (multipart), not through WebSocket |
| **No reconnection handling** | Frontend has no explicit reconnection logic — Socket.IO client defaults apply |
| **No horizontal scaling** | No Redis adapter or socket.io-redis for multi-instance deployments |

---

## 5. Content Upload & Storage

### 5.1 Upload Pipeline

```
Browser/Form
    │
    ├── Multipart POST with content files
    │
    ▼
Multer Middleware (upload.middleware.ts)
    │
    ├── memoryStorage() — files stored in RAM as Buffer[]
    ├── fileSize: 1GB max (1024 * 1024 * 1024 bytes)
    ├── maxCount: 10 files per upload
    ├── Allowed MIME types:
    │   ├── Images: image/jpeg, image/png, image/webp
    │   ├── Videos: video/mp4, video/quicktime
    │   └── Audio: audio/mpeg, audio/mp4, audio/wav, audio/webm, audio/ogg
    └── Voice messages: 10MB limit, audio-only
    │
    ▼
Controller → Service Layer
    │
    ├── Content service:
    │   ├── Iterates req.files[]
    │   ├── For each file:
    │   │   ├── Generate unique filename (uuid + extension)
    │   │   ├── Upload to Cloudflare R2 via s3.putObject()
    │   │   └── Collect public URL
    │   ├── Create content DB record with URLs
    │   ├── Notify subscribers
    │   └── Return content
    │
    └── Storage service (reused by content, creator, admin, user):
        ├── uploadFile(buffer, key, mimetype) → s3.putObject
        ├── getSignedUrl(key, expiresIn) → s3.getSignedUrl (GET)
        └── uploadPublicFile / getPublicUrl → public bucket
```

### 5.2 Storage Architecture

```
Cloudflare R2 (S3-compatible)
│
├── Private Bucket (default)
│   ├── Content files (photos, videos, audio)
│   ├── Accessed via signed URLs (time-limited)
│   └── Used by: content.service, user.service
│
├── Public Bucket
│   ├── Avatars, banners, verification docs
│   └── Accessed via direct public URLs
│
└── R2 Config (config/r2Client.ts):
    ├── S3Client with R2 endpoint, access key, secret key
    ├── read from env: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT
    └── Used by: storage.service
```

### 5.3 Upload Observations

| Observation | Detail |
|---|---|
| **1GB file reads into memory** | Multer memoryStorage keeps entire file in RAM. For a 1GB video upload, the server holds 1GB+ in memory per request |
| **No multipart upload** | No S3 multipart upload API — entire file uploaded as single putObject |
| **No upload progress** | No progress tracking endpoint or WebSocket event for upload status |
| **No virus scanning** | No malware/virus scan on uploaded files |
| **No CDN** | R2 is origin storage only — no Cloudflare CDN cache layer configured |
| **Watermarking** | Applied server-side via `sharp` for images, `fluent-ffmpeg` for videos — consumes CPU/memory per upload |

---

## 6. Error Handling Strategy

### 6.1 Error Handling Layers

```
Layer 1: asyncHandler (utils/asyncHandler.ts)
├── Wraps every controller function
├── Catches any thrown Error → passes to next(err)
└── Eliminates try/catch in all controllers

Layer 2: AppError (utils/apiError.ts + middleware/error.middleware.ts)
├── Custom error class with statusCode + isOperational flag
├── Thrown throughout services and middleware
│   └── new AppError('User not found', 404)
└── Differentiates operational errors vs programming errors

Layer 3: errorHandler middleware (middleware/error.middleware.ts)
├── Last middleware in Express stack
├── Checks instanceof AppError → use its statusCode + message
├── Falls back to 500 + generic message for unhandled errors
├── Tries to extract status from: err.status, err.statusCode, err.code, err.error.code
├── Logs unhandled errors to console (console.log + console.error)
└── Includes stack trace ONLY in non-production mode

Layer 4: Frontend Axios interceptor
├── 401 response → clear tokens → redirect to /
├── Registers global error handler callback
└── ToastContext.connect → shows user-facing toast for any API error

Layer 5: React error boundaries → NOT IMPLEMENTED
└── No ErrorBoundary components wrapping any route tree
```

### 6.2 Response Envelope

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Success with message:**
```json
{
  "success": true,
  "message": "Content created successfully",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "message": "User not found"
}
```

**Validation error:**
```json
{
  "errors": [
    { "msg": "Username must be at least 3 characters long", "param": "username", ... }
  ]
}
```

### 6.3 Error Handling Observations

| Observation | Detail |
|---|---|
| **Duplicate AppError class** | `utils/apiError.ts` and `middleware/error.middleware.ts` both define `AppError` — they're slightly different (apiError has `isOperational`, error.middleware doesn't) |
| **No structured logging** | Error logging uses `console.log`/`console.error` — no structured logger (winston, pino, etc.) |
| **Auth debug logs to file** | `auth.middleware.ts` writes to `debug.log` via `fs.appendFileSync` — synchronous I/O in request path |
| **No error classification** | All errors treated as either AppError (known) or generic 500 (unknown) |
| **Frontend error fallback** | Axios response interceptor clears auth state on 401 — aggressive for expired tokens that could be refreshed |

---

## 7. Impersonation Flow

### 7.1 Purpose

Admin-level feature allowing platform administrators to view the application as any user (fan or creator). Used for debugging, support, and compliance.

### 7.2 Flow

```
ADMIN                       BACKEND                     TARGET USER'S VIEW
 │                           │                           │
 │  Navigate to admin        │                           │
 │  user management          │                           │
 │                           │                           │
 │  Click "Impersonate"      │                           │
 │──────────────────────────>│                           │
 │                           │                           │
 │                           │  Frontend saves           │
 │                           │  targetUserId to          │
 │                           │  localStorage as          │
 │                           │  'impersonating_user_id'  │
 │                           │                           │
 │  Navigate to /hub or      │                           │
 │  /fan/feed                │                           │
 │──────────────────────────>│                           │
 │                           │                           │
 │  Subsequent requests      │                           │
 │  include header:          │                           │
 │  X-Impersonating-         │                           │
 │  User-Id: {targetId}      │                           │
 │──────────────────────────>│                           │
 │                           │                           │
 │  Auth middleware:          │                           │
 │  1. Protect runs normally │                           │
 │     (validates admin JWT) │                           │
 │  2. Detects impersonation │                           │
 │     header                │                           │
 │  3. req.originalUser =    │                           │
 │     admin user            │                           │
 │  4. req.user = targetUser │                           │
 │     (fetched from DB)     │                           │
 │  5. Continues as target   │                           │
 │                           │                           │
 │  All downstream logic     │                           │
 │  sees req.user as target  │                           │
 │<──────────────────────────│                           │
 │                           │                           │
 │  Impersonation banner     │                           │
 │  shows at top of UI:      │                           │
 │  "Impersonating {name}"   │                           │
 │  [Stop Impersonating]     │                           │
 │                           │                           │
 │  Click "Stop"             │                           │
 │──────────────────────────>│                           │
 │                           │                           │
 │  Frontend: clear          │                           │
 │  impersonation_storage    │                           │
 │  Navigate to /admin       │                           │
 │                           │                           │
 │  Subsequent requests:     │                           │
 │  no impersonation header  │                           │
 │──────────────────────────>│  Normal auth flow         │
```

### 7.3 Impersonation Observations

| Observation | Detail |
|---|---|
| **No audit trail** | No database record created when impersonation starts/stops |
| **Stored in localStorage** | Impersonation state survives page refreshes but is not server-enforced |
| **Creator route guard checks** | `CreatorRouteGuard` with `allowAdminBypass: true` — admin can impersonate any creator |
| **Fan routes have no guard** | If admin impersonates a fan, fan routes are accessible but have no explicit check |
| **No expiration** | Impersonation persists until explicitly stopped or token expires |

---

## 8. Deployment & Infrastructure

### 8.1 Hosting Architecture

```
┌─────────────────────────────────────────────────────┐
│                    NETLIFY                           │
│  podm-frontend/                                     │
│  ├── Build: npm run build → dist/                   │
│  ├── Redirects: /* → /index.html (SPA fallback)    │
│  └── Production: https://podm.app                   │
│                                                     │
│  Cloudflare Pages (preview/deploy)                  │
│  └── *.pages.dev                                    │
└─────────────────────────────────────────────────────┘
        │
        │ HTTPS API calls
        │
┌─────────────────────────────────────────────────────┐
│                    RENDER                            │
│  PoDM_project/server                                │
│  ├── Runtime: Node.js 18+                           │
│  ├── Port: 5000                                     │
│  ├── CORS: podm.app, *.pages.dev, localhost:5173    │
│  └── Production: https://podm.onrender.com          │
│                                                     │
│  Environment: .env (server/.env)                    │
└─────────────────────────────────────────────────────┘
        │
        │
┌─────────────────────────────────────────────────────┐
│            EXTERNAL SERVICES                         │
│                                                     │
│  Supabase PostgreSQL (cloud)                        │
│  ├── Database + Auth                                │
│  └── service-role key (server) + anon key (client)  │
│                                                     │
│  Cloudflare R2                                      │
│  ├── S3-compatible object storage                   │
│  └── Public + Private buckets                       │
│                                                     │
│  Stripe                                             │
│  ├── PaymentIntents, Subscriptions                  │
│  └── Connect (Express for creator payouts)          │
│                                                     │
│  Ethereum (Base network)                            │
│  ├── Smart contract (PoDMPaymentProtocol.sol)       │
│  └── USDC payments + BaseScan verification          │
│                                                     │
│  OpenAI / OpenRouter                                │
│  └── AI caption generation (single model)           │
│                                                     │
│  SMTP (Nodemailer)                                  │
│  └── Transactional emails                           │
└─────────────────────────────────────────────────────┘
```

### 8.2 Docker Configuration

| Service | Dockerfile | Base Image | Exposed Port | Notes |
|---|---|---|---|---|
| Backend | `PoDM_project/Dockerfile` | `node:20-alpine` | 5000 | Multi-stage build, production-only deps |
| Frontend | `podm-frontend/Dockerfile` | `node:18-alpine` | 5173 | Dev server mode (not production Nginx) |
| Orchestration | `docker-compose.yml` | — | — | Version 3.8, volume mounts for hot reload |

**Backend Dockerfile details:**
- Build stage: `npm install` → `npm run build` (TypeScript compile)
- Production stage: Install `fontconfig`, `ttf-dejavu`, `ffmpeg` for watermarking
- Production stage: `npm install --production` (no dev deps)
- Copy only `dist/` from build stage
- `CMD ["npm", "start"]`

**Docker Compose notes:**
- Frontend runs in dev mode (`npm run dev -- --host`) — not production-ready
- Both services mount source as volumes with `/app/node_modules` excluded
- Frontend `depends_on: backend` for startup ordering

### 8.3 Deployment Observations

| Observation | Detail |
|---|---|
| **Frontend Dockerfile uses dev server** | `npm run dev -- --host` — not suitable for production. Should use `npm run build` + nginx/static serving |
| **No nginx reverse proxy** | Frontend Docker assumes dev-mode Vite server. Production on Netlify handles this correctly |
| **No health checks** | Docker Compose has no `healthcheck` directives |
| **No production frontend Docker** | Only Netlify deployment path is production-ready for frontend |
| **Secrets scan disabled** | `netlify.toml` has `SECRETS_SCAN_ENABLED = "false"` |
| **Render for backend** | Backend hosted on Render free-tier — potential cold-start latency |

---

## 9. CI/CD Pipeline

### 9.1 GitHub Actions Workflow

Located at `.github/workflows/ci.yml`

```
on: push/PR to main/master

Job 1: backend-build-and-test (ubuntu-latest)
├── Setup Node.js 18.x
├── npm ci (clean install)
├── npm test (Jest)
└── (no build step)
  Running tests for auth.controller, auth.integration, ppv_subscription

Job 2: frontend-build-and-lint (ubuntu-latest)
├── Setup Node.js 18.x
├── npm ci (clean install)
├── npm run lint (ESLint, max-warnings 0)
└── npm run build (Vite build to dist/)
```

### 9.2 CI Observations

| Observation | Detail |
|---|---|
| **Parallel jobs** | Backend and frontend run in parallel, no dependency between them |
| **No deployment step** | CI only runs tests/lint/build — no auto-deploy to Render or Netlify |
| **No E2E tests in CI** | Playwright tests exist but are not executed in CI pipeline |
| **No Docker build** | No `docker build` step in CI — Docker images must be built manually or via external service |
| **Node 18 only** | Both jobs use Node 18.x despite backend Dockerfile using Node 20 |
| **No caching for frontend** | Backend uses `cache: 'npm'`, frontend does not explicitly cache |

---

## 10. Logging & Observability

### 10.1 Current State

| Concern | Implementation | Assessment |
|---|---|---|
| **Structured logging** | `console.log` / `console.error` | **None** — no winston, pino, or similar |
| **Request logging** | None detected | **None** — no morgan, no request IDs |
| **Error logging** | `errorHandler` logs to console | **Basic** — includes stack trace, no grouping |
| **Auth debugging** | `fs.appendFileSync` to `debug.log` | **Poor** — synchronous I/O in auth path, file-based |
| **Performance tracing** | None | **None** |
| **APM** | None | **None** — no DataDog, Sentry, or similar |
| **Metrics** | None | **None** — no Prometheus, no custom metrics |
| **Health checks** | `GET /` returns "PoDM API is running!" | **Basic** |
| **Frontend error tracking** | None | **None** — no Sentry, no error boundary |

### 10.2 Auth Debug Logging Pattern

```typescript
// auth.middleware.ts:20-23
function logAuthDebug(message: string) {
    const logPath = path.resolve(__dirname, '../debug.log');
    fs.appendFileSync(logPath, `[AUTH_DEBUG] ${new Date().toISOString()} - ${message}\n`);
}
```

This pattern runs synchronously for every authenticated request. In production, each request writes 5-10 lines. For 1,000 concurrent users, that's 5,000-10,000 synchronous disk writes per request cycle.

---

## 11. Configuration Management

### 11.1 Environment Variables

**Backend (`PoDM_project/server/.env`):**

| Variable | Category | Required |
|---|---|---|
| `PORT` | Server | No (default 5000) |
| `SUPABASE_URL` | Database | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Database | Yes |
| `SUPABASE_JWT_SECRET` | Auth | Yes |
| `STRIPE_SECRET_KEY` | Payments | Yes |
| `STRIPE_WEBHOOK_SECRET` | Payments | Yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Payments | Yes |
| `R2_ACCESS_KEY_ID` | Storage | Yes |
| `R2_SECRET_ACCESS_KEY` | Storage | Yes |
| `R2_ENDPOINT` | Storage | Yes |
| `R2_PUBLIC_BUCKET_NAME` | Storage | Yes |
| `R2_PRIVATE_BUCKET_NAME` | Storage | Yes |
| `OPENAI_API_KEY` | AI | Yes |
| `OPENROUTER_API_KEY` | AI | No (alternative) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Email | Yes |
| `ETHEREUM_RPC_URL` | Crypto | Yes |
| `CONTRACT_ADDRESS` | Crypto | Yes |
| `PRIVATE_KEY` | Crypto | Yes |
| `PLATFORM_TREASURY_ADDRESS` | Crypto | Yes |
| `PLATFORM_COMMISSION_RATE` | Platform | No (default 12.5) |
| `NODE_ENV` | Environment | No |
| `CLIENT_URL` | CORS | No |

**Frontend (`podm-frontend/.env`):**

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend API base URL |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

### 11.2 Config Files

| File | Purpose |
|---|---|
| `PoDM_project/server/.env` | Backend secrets (git-ignored) |
| `podm-frontend/.env` | Frontend public config (git-ignored) |
| `docker-compose.yml` | Maps .env files to Docker containers |
| `vite.config.ts` | Dev proxy `/api` → `localhost:5000` |
| `netlify.toml` | Production frontend build + SPA redirect |
| `Render Dashboard` | Backend env vars (out of repo) |

### 11.3 Configuration Observations

| Observation | Detail |
|---|---|
| **No validation** | Startup does not validate required env vars (except `supabaseClient.ts` which throws immediately) |
| **No TypeScript schema** | No typed config object — env vars accessed via `process.env.X` throughout codebase |
| **Frontend env in Git** | `.env.example` files exist but no runtime validation of VITE_ variables |
| **Stripe key inline** | `App.tsx:284` reads `import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY` — will fail silently if missing |

---

## 12. Architectural Risk Assessment

### 12.1 Risk Matrix

| Risk | Impact | Likelihood | Severity | Mitigation |
|---|---|---|---|---|
| **Memory exhaustion from file uploads** | Service outage | Medium | Critical | Switch to disk storage or streaming upload |
| **Unprotected referral routes exploited** | Unauthorized access | High | Critical | Add auth middleware |
| **No Stripe webhook handling** | Payment state drift | Medium | Critical | Implement webhook endpoint + idempotency |
| **Synchronous auth debug logging** | Disk I/O bottleneck | High | High | Remove or switch to async logging |
| **No database transactions** | Data inconsistency | Medium | High | Wrap multi-table writes in transactions |
| **No rate limiting** | Abuse/DoS | Medium | High | Add express-rate-limit |
| **Crypto wallet mock unchanged** | False sense of security | Medium | High | Implement real wallet connection |
| **No error boundaries on frontend** | Full UI crash | Low | High | Add React error boundaries |
| **No queue for async work** | Slow response times | Medium | Medium | Add Bull/BullMQ for notifications/analytics |
| **Duplicate Stripe init** | Configuration drift | Low | Medium | Create shared Stripe config |
| **Fan routes unguarded** | Unauthorized page access | Low | Low | Add route guard wrapper |
| **No health check endpoint** | Ops blind spot | Low | Low | Add /healthz endpoint |
| **No SSL enforcement** | Man-in-the-middle | Low | Low | Check in production deployment config |
| **No monitoring/metrics** | Ops blind spot | Medium | Medium | Add structured logging + APM |

### 12.2 Architectural Strengths

| Strength | Detail |
|---|---|
| **Consistent error handling** | asyncHandler + AppError + errorHandler chain covers all request paths |
| **Centralized auth** | Single auth middleware file handles JWT verify, user lookup, role checks, and impersonation |
| **Clean route separation** | 15 route groups with clear `/api/v1/{resource}` prefix convention |
| **Lazy-loaded frontend** | All route-level components code-split via `React.lazy()` |
| **Feature-based organization** | Frontend modules organized by user role (admin/creator/fan) |
| **Shared component library** | 15 domain-shared components reduce duplication |
| **Centralized API client** | Single Axios instance with auth interceptors and error handling |

---

## Appendix: Key Architectural Decisions

| Decision | Rationale | Date |
|---|---|---|
| No queue for async work | Simplicity at current scale — notifications/analytics run in request path | Pre-existing |
| No database transactions | Supabase PostgreSQL supports transactions but codebase doesn't use them | Pre-existing |
| Memory storage for uploads | Simplicity over streaming — works for current file sizes (under 1GB) | Pre-existing |
| Inline Stripe init | Historical — multiple files created before shared config was needed | Pre-existing |
| No React Router loaders | Loader wrappers written before v7 data-loading APIs | Pre-existing |
| Feature-based frontend | Scales well with multiple user roles and feature ownership | Pre-existing |
| Mock crypto wallet | Real contract deployment happened but frontend integration incomplete | Pre-existing |
