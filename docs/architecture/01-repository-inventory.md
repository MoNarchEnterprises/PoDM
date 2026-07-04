# Repository Inventory

**Purpose**: Complete catalog of every file, module, service, controller, model, route, component, configuration, and integration in the PoDM application.

**Date**: 2026-07-02
**Version**: 1.0.0 (backend) / 0.0.0 (frontend)
**Confidence**: High

---

## Repository Overview

| Attribute | Value |
|---|---|
| **Purpose** | Creator-fan subscription platform (OnlyFans-like) — creators publish content, fans subscribe, tip, and message |
| **Monorepo Structure** | Two top-level modules: `PoDM_project/` (backend) and `podm-frontend/` (frontend) |
| **Total Source Files** | ~218 (109 TS backend + 109 TS/TSX frontend) |
| **Total Source Lines** | ~25,600 (10,263 TS backend + 15,301 TS/TSX frontend) |
| **Root Orchestration** | `docker-compose.yml`, `netlify.toml`, `.github/workflows/ci.yml` |

### Languages

| Language | Usage |
|---|---|
| TypeScript | Backend (Express 5) + Frontend (React 18) |
| Solidity | Smart contract (`PoDMPaymentProtocol.sol`) |
| SQL | Database migrations, seed data, stored procedures |
| JavaScript | Build configs, automation scripts (Instagram scraper) |
| CSS | Tailwind CSS (frontend) |
| YAML | CI/CD pipeline |
| TOML | Netlify deployment config |
| Nix | Google Project IDX workspace |

### Frameworks

| Framework | Module | Version |
|---|---|---|
| Express | Backend | 5.x |
| React | Frontend | 18.x |
| Vite | Frontend (bundler) | 7.x |
| Tailwind CSS | Frontend (styling) | 3.4 |
| React Router | Frontend (routing) | 7.x |
| Socket.IO | Backend + Frontend (real-time) | 4.x |

### Key Libraries

| Library | Module | Purpose |
|---|---|---|
| `@supabase/supabase-js` | Both | Database client + auth |
| `@stripe/stripe-js` / `@stripe/react-stripe-js` | Both | Payment processing |
| `jsonwebtoken` | Backend | JWT verification (legacy, Supabase primary) |
| `openai` | Backend | AI caption generation |
| `@aws-sdk/client-s3` | Backend | Cloudflare R2 storage access |
| `sharp` | Backend | Image processing |
| `fluent-ffmpeg` | Backend | Video processing |
| `multer` | Backend | File upload handling |
| `nodemailer` | Backend | Email sending |
| `axios` | Both | HTTP client |
| `recharts` | Frontend | Charts and analytics |
| `lucide-react` | Frontend | Icons |
| `react-dropzone` | Frontend | File drag-and-drop |
| `qrcode.react` | Frontend | QR code generation |
| `uuid` | Both | Unique ID generation |
| `express-validator` | Backend | Request validation |
| `jsdom` | Frontend (test) | DOM environment |

### Build System

| Module | System | Key Commands |
|---|---|---|
| Backend | TypeScript (`tsc`) + `ts-node-dev` (dev) | `npm run build`, `npm run dev:server`, `npm start` |
| Frontend | Vite 7 | `npm run dev`, `npm run build` |

### Package Managers

- npm (workspace-level lock files in each module)

### Runtime Environments

| Environment | Backend | Frontend |
|---|---|---|
| **Development** | `ts-node-dev --respawn --transpile-only` | Vite dev server (port 5173) |
| **Production** | Node.js with compiled `dist/` | Static files via Netlify/Cloudflare Pages |
| **Docker** | Dockerfile in `PoDM_project/` | Dockerfile in `podm-frontend/` |
| **CI** | Node 18, `npm ci`, `npm test` | Node 18, `npm ci`, `npm run lint`, `npm run build` |

### Estimated Total Lines of Code

| Layer | Files | Lines (TS/TSX only) |
|---|---|---|
| Backend source (`.ts`) | 109 | ~10,263 |
| Frontend source (`.ts/.tsx`) | 100 (in `src/`) | ~15,301 |
| Frontend E2E tests (`.ts`) | 5 | ~17,985 |
| Shared type definitions | 12 | ~700 |
| SQL migrations | 18 (root) + 6 (scripts) | ~509 |
| Solidity contract | 1 | ~147 |
| Configuration files | ~20 | ~500 |
| **Meaningful Source Total** | **~218** | **~25,600** |
| Compiled JS (`dist/`) | ~113 | ~12,347 |
| Log files | ~8 | ~31,977 (debug artifacts) |
| Root data files | ~6 | ~3,242 (CSV, text) |

---

## Directory Structure

### Root (`PoDM/`)

| Path | Purpose | Key Files |
|---|---|---|
| `.github/workflows/` | CI/CD pipeline | `ci.yml` — two jobs: backend test + frontend lint/build |
| `.agent/workflows/` | AI agent workflow specs | `implement-new-content-notifications.md`, `stripe-webhooks.md`, `test-notification-api.md` |
| `.idx/` | Google Project IDX config | `dev.nix` |
| `docs/` | Project documentation | Architecture KB, future-features specs, marketing, maintenance |
| `node_modules/` | Root-level npm packages | `puppeteer`, `csv-parser`, `lucide-react` |
| `.gitignore` | Git exclusion rules | node_modules, .env, dist/, *.log, *.csv, etc. |
| `AGENTS.md` | DOX framework root contract | Hierarchy rules, child index, closeout |
| `docker-compose.yml` | Multi-container orchestration | Backend (port 5000) + Frontend (port 5173) |
| `netlify.toml` | Netlify deployment | Frontend: build to `dist/`, SPA redirects |
| `GEMINI.md` | AI project context | Overview, build/run, conventions |
| `MVP_Checklist.md` | Feature completion tracker | All major MVP items checked |
| `PoDM Planning Document.txt` | Full design spec | 1744-line comprehensive specification |
| `implementation_details.txt` | Implementation audit | Backend/frontend/database completion status |
| `PlatformPromptTemplate.md` | Reusable AI prompt | Template for generating similar platform |
| `TYPESCRIPT_ERRORS_SOLUTION.md` | Troubleshooting guide | Resolving TS dependency errors |
| `db enum types.txt` | DB enum reference | All PostgreSQL enum type definitions |
| `db functions.txt` | DB function reference | Aggregation and query functions |
| `db schema visualization.txt` | DB schema reference | Full DDL for all 12 tables |
| `podm_db.png` / `.svg` | DB diagram | Entity relationship visualization |
| `debug-login.ps1` / `get-token.ps1` / `test-notifications.ps1` | Debug scripts | Production API testing |
| `instagram_liker.ts` / `scrape_ig.js` | Automation scripts | Instagram scraping/liking |
| `cookies.json` / `IG_*.csv` | Instagram data | Session cookies, extracted links |
| `stripe_output*.txt` | Debug output | Stripe API debug data |
| `package.json` | Root deps | `csv-parser`, `puppeteer`, `lucide-react`, `@types/node`, `@types/react` |

### Backend (`PoDM_project/`)

```
PoDM_project/
├── AGENTS.md                    — Backend DOX contract
├── package.json                 — Dependencies + scripts (version 1.0.0)
├── tsconfig.json                — TypeScript compiler config
├── jest.config.js               — Jest test config
├── jest.setup.js                — Jest setup
├── babel.config.js              — Babel config
├── Dockerfile                   — Backend Docker image
├── .dockerignore                — Docker exclusion
├── check_env.ts                 — Environment validation script
├── debug_transactions.ts        — Transaction debugging script
│
├── common/types/                — Shared TypeScript type definitions (12 files)
│   ├── Content.ts
│   ├── Contest.ts
│   ├── Conversation.ts
│   ├── Creator.ts
│   ├── Gallery.ts
│   ├── Message.ts
│   ├── Notification.ts
│   ├── Report.ts
│   ├── Subscription.ts
│   ├── SupportTicket.ts
│   ├── Transaction.ts
│   ├── User.ts
│
├── lib/
│   └── constants.ts             — Single constant: DEFAULT_COMMISSION_RATE = 12.5
│
├── contracts/
│   └── PoDMPaymentProtocol.sol  — Solidity smart contract (Ethereum/USDC)
│
├── migrations/                  — Root-level SQL migrations (9 files)
│   ├── add_crypto_fields.sql
│   ├── add_enclave_membership_to_profiles.sql
│   ├── add_rls_application_referral_tables.sql
│   ├── add_speed_bonus_tracking.sql
│   ├── create_enclave_applications.sql
│   ├── create_referrals_table.sql
│   ├── fix_function_search_paths.sql
│   ├── update_crypto_constraints.sql
│   ├── update_enclave_platforms_to_array.sql
│
├── scripts/
│   └── migrate-to-r2.ts         — R2 migration script
│
├── server/                      — Core backend application
│   ├── Server.ts                — Entry point: Express + HTTP + Socket.IO
│   ├── .env                     — Environment variables
│   ├── config/
│   │   ├── supabaseClient.ts    — Supabase admin client (service role key)
│   │   ├── r2Client.ts          — Cloudflare R2 (S3-compatible) client
│   │   └── socket.ts            — Socket.IO server initialization
│   ├── controllers/             — 15 controllers (request/response handling)
│   ├── middleware/               — 4 middleware modules
│   ├── models/                  — 13 database model modules
│   ├── routes/                  — 15 route definition files
│   ├── services/                — 16 business logic services
│   ├── utils/                   — 13 utility modules
│   ├── migrations/              — 9 SQL migrations + 3 utility scripts (data fixes)
│   └── tests/                   — 3 test files (1 unit + 2 integration)
│
├── dist/                        — Compiled JavaScript output (mirrors server/)
└── src/                         — Empty directory
```

### Frontend (`podm-frontend/`)

```
podm-frontend/
├── AGENTS.md                    — Frontend DOX contract
├── package.json                 — Dependencies + scripts (version 0.0.0)
├── tsconfig.json                — TypeScript compiler config
├── tsconfig.jest.json           — Jest-specific TS config
├── vite.config.ts               — Vite bundler config
├── tailwind.config.js           — Tailwind CSS theme config
├── postcss.config.js            — PostCSS config
├── eslint.config.js             — ESLint flat config
├── babel.config.cjs             — Babel config for Jest
├── jest.config.ts               — Jest test config
├── playwright.config.ts         — Playwright E2E test config
├── index.html                   — Vite HTML entry point
├── Dockerfile                   — Frontend Docker image
├── .env                         — Environment variables
├── .gitignore
├── setupTests.ts                — Jest setup
│
├── assets/                      — Static images (2 files)
├── public/                      — Public assets + favicon + Netlify _redirects
│
├── src/
│   ├── main.tsx                 — React DOM entry
│   ├── App.tsx                  — Root component: routing, providers, lazy loads
│   ├── App.test.tsx             — App-level unit test
│   ├── styles/
│   │   └── globals.css          — Tailwind directives + global styles
│   │
│   ├── components/
│   │   ├── auth/                — 3 auth guard components
│   │   ├── layout/              — 5 layout shell components
│   │   ├── shared/              — 15 reusable domain components
│   │   └── ui/                  — 5 primitive UI components
│   │
│   ├── features/                — 9 feature modules
│   │   ├── admin/               — Admin panel (2 pages + 8 sub-components)
│   │   ├── auth/                — Auth flows (3 components)
│   │   ├── contests/            — Contest features (3 components)
│   │   ├── creator/             — Creator hub (8 pages + 5 components)
│   │   ├── enclave/             — Enclave membership (6 components)
│   │   ├── fan/                 — Fan dashboard (5 pages + 1 component)
│   │   ├── messages/            — Message UI (1 component)
│   │   ├── profile/             — Creator profile (3 components)
│   │   └── viewer/              — Content viewer (1 component)
│   │
│   ├── pages/                   — 6 top-level page components
│   ├── hooks/                   — 5 custom React hooks
│   ├── context/                 — 1 context provider (Toast)
│   ├── lib/                     — 6 library modules
│   └── shared/hooks/            — 4 cross-feature shared hooks
│
└── tests/                       — 5 Playwright E2E test specs
```

---

## Frontend

### Pages (Route-Level Components)

| Page | File | Route(s) | Auth |
|---|---|---|---|
| SplashPage | `src/pages/SplashPage.tsx` | `/` | Public |
| Enclave | `src/pages/Enclave.tsx` | `/enclave` | Public |
| TermsOfService | `src/pages/TermsOfService.tsx` | `/terms-of-service` | Public |
| PrivacyPolicy | `src/pages/PrivacyPolicy.tsx` | `/privacy-policy` | Public |
| CreatorProfile | `src/features/profile/CreatorProfile.tsx` | `/creator/:username` | Public |
| ContentViewer | `src/features/viewer/ContentViewer.tsx` | `/content/:contentId` | Public |
| ResetPasswordPage | `src/pages/ResetPasswordPage.tsx` | `/reset-password` | Public |
| CreatorOnboarding | `src/features/auth/CreatorOnboarding.tsx` | `/onboarding` | Private |
| CreatorVerification | `src/features/auth/CreatorVerification.tsx` | `/verification` | Private |
| AdminLoginPage | `src/pages/AdminLoginPage.tsx` | `/admin/login` | Public |
| FanFeed | `src/features/fan/FanFeed.tsx` | `/fan/feed` | Private (fan) |
| FanGallery | `src/features/fan/FanGallery.tsx` | `/fan/gallery` | Private (fan) |
| FanSubscriptions | `src/features/fan/FanSubscriptions.tsx` | `/fan/subscriptions` | Private (fan) |
| FanMessages | `src/features/fan/FanMessages.tsx` | `/fan/messages` | Private (fan) |
| FanSettings | `src/features/fan/FanSettings.tsx` | `/fan/settings` | Private (fan) |
| CreatorDashboard | `src/features/creator/CreatorDashboard.tsx` | `/hub/dashboard` | Private (creator) |
| CreatorContent | `src/features/creator/CreatorContent.tsx` | `/hub/content` | Private (creator) |
| CreatorMessages | `src/features/creator/CreatorMessages.tsx` | `/hub/messages` | Private (creator) |
| CreatorAnalytics | `src/features/creator/CreatorAnalytics.tsx` | `/hub/analytics` | Private (creator) |
| CreatorEarnings | `src/features/creator/CreatorEarnings.tsx` | `/hub/earnings` | Private (creator) |
| CreatorSettings | `src/features/creator/CreatorSettings.tsx` | `/hub/settings` | Private (creator) |
| BulkUploadPage | `src/features/creator/pages/BulkUploadPage.tsx` | `/hub/bulk-upload` | Private (creator) |
| AdminPanel | `src/features/admin/AdminPanel.tsx` | `/admin/*` (layout) | Private (admin) |

### Routes

**Route Architecture**: React Router v7 with `BrowserRouter`. Routes defined in `src/App.tsx`.

```
/                              → SplashPage (public)
/enclave                       → Enclave (public)
/terms-of-service              → TermsOfService (public)
/privacy-policy                → PrivacyPolicy (public)
/creator/:username             → CreatorProfile (public)
/content/:contentId            → ContentViewer (public)
/reset-password                → ResetPasswordPage (public)
/onboarding                    → CreatorOnboarding (private)
/verification                  → CreatorVerification (private)
/admin/login                   → AdminLoginPage (public)

/fan/*                         → FanLayout (MainLayout + FAN_NAV_ITEMS)
  /fan                         → FanFeed
  /fan/feed                    → FanFeed
  /fan/gallery                 → FanGalleryLoader
  /fan/subscriptions           → FanSubscriptions
  /fan/messages                → FanMessages
  /fan/settings                → FanSettingsLoader

/hub/*                         → CreatorRouteGuard → CreatorLayout (MainLayout + CREATOR_NAV_ITEMS)
  /hub                         → CreatorDashboardLoader
  /hub/dashboard               → CreatorDashboardLoader
  /hub/content                 → CreatorContent
  /hub/messages                → CreatorMessages
  /hub/analytics               → CreatorAnalyticsLoader
  /hub/earnings                → CreatorEarningsLoader
  /hub/settings                → CreatorSettingsLoader
  /hub/bulk-upload             → BulkUploadPage

/admin/*                       → ProtectedRoute(admin) → AdminLayout (MainLayout + ADMIN_NAV_ITEMS)
  /admin/enclave               → EnclaveApplications
  /admin/enclave-applications  → EnclaveApplications
  /admin/*                     → AdminPanel (data loader + outlet)
    /admin/dashboard           → DashboardPanel
    /admin/users               → UserManagementPanel
    /admin/content             → ContentModerationPanel
    /admin/analytics           → AnalyticsPanel
    /admin/reports             → ReportsPanel
    /admin/support             → SupportTicketsPanel
    /admin/settings            → SettingsPanel
```

### Layouts

| Component | File | Purpose |
|---|---|---|
| MainLayout | `src/components/layout/MainLayout.tsx` | Shell with sidebar nav (adapts to role-based nav items) |
| AuthLayout | `src/components/layout/AuthLayout.tsx` | Auth page wrapper |
| Container | `src/components/layout/Container.tsx` | Width-constrained content wrapper |
| Header | `src/components/layout/Header.tsx` | Top navigation bar |
| Footer | `src/components/layout/Footer.tsx` | Site footer |

### Reusable Components

**Primitive UI** (`src/components/ui/`):

| Component | Purpose |
|---|---|
| Button | Styled button with variants |
| Card | Content card container |
| Input | Form input field |
| Modal | Overlay modal dialog |
| AudioPlayer | Audio playback component |

**Auth Guards** (`src/components/auth/`):

| Component | Purpose |
|---|---|
| ProtectedRoute | Route guard requiring specific role (`requiredRole` prop) |
| CreatorRouteGuard | Route guard that validates creator role + loads creator data |
| withAuthGuard | HOC that wraps components with auth/role checks |

**Shared Domain** (`src/components/shared/`):

| Component | Purpose |
|---|---|
| ConfirmModal | Confirmation dialog |
| ContentCard | Content display card |
| ContentLockManager | Content gating/lock management |
| ContentLockOverlay | Overlay for locked content |
| ConversationListItem | Message conversation list item |
| ImpersonationBanner | Banner shown during admin impersonation |
| ReportModal | Content reporting dialog |
| SettingsCard | Settings section card |
| StatCard | Metric display card |
| StatusBadge | Status indicator badge |
| TierCard | Subscription tier display card |
| TipModal | Tip payment dialog |
| ToggleSwitch | Toggle switch control |
| UnlockModal | Content unlock (PPV) dialog |
| VerificationBanner | Verification status banner |

### Contexts

| Context | File | Purpose |
|---|---|---|
| ToastContext | `src/context/ToastContext.tsx` | Global toast notification system (success/error/info messages) + error handler registration |

### Hooks

| Hook | File | Purpose |
|---|---|---|
| useAuth | `src/hooks/useAuth.tsx` | Authentication state (user, login, logout, signup, impersonation) + AuthProvider |
| useCreatorData | `src/hooks/useCreatorData.ts` | Creator dashboard data fetching |
| useModal | `src/hooks/useModal.ts` | Modal open/close state management |
| useOnClickOutside | `src/hooks/useOnClickOutside.ts` | Detect clicks outside an element |
| useVoiceRecorder | `src/hooks/useVoiceRecorder.ts` | Voice message recording |
| useAsyncData | `src/shared/hooks/useAsyncData.ts` | Generic async data fetching with loading/error states |
| useCryptoWallet | `src/shared/hooks/useCryptoWallet.ts` | Crypto wallet connection (Ethereum) |
| useFormSubmission | `src/shared/hooks/useFormSubmission.ts` | Form submission with loading state |
| useStripePayment | `src/shared/hooks/useStripePayment.ts` | Stripe payment flow integration |

### State Stores

- **React Context**: `ToastContext` for global notifications
- **Custom Hooks**: `useAuth` provides authentication state to entire component tree
- **No Redux/Zustand**: State management is via React Context + hooks only
- **No server-state library**: API calls made directly in components via `apiClient` functions

### Utilities

| Utility | File | Purpose |
|---|---|---|
| apiClient | `src/lib/apiClient.ts` | Axios-based API client (800 lines) — all API functions, interceptors, error handling |
| constants | `src/lib/constants.ts` | Navigation items, Stripe card options, report reasons |
| formatters | `src/lib/formatters.ts` | Date, currency, and display formatters |
| socket | `src/lib/socket.ts` | Socket.IO client connection |
| statusBadgeMap | `src/lib/statusBadgeMap.ts` | User/content status → badge color/style mapping |
| supabaseClient | `src/lib/supabaseClient.ts` | Supabase client for auth flows (password reset) |

---

## Backend

### Entry Point

| File | Role |
|---|---|
| `server/Server.ts` | Creates Express app, HTTP server, initializes Socket.IO, registers CORS, mounts all 14 route groups, global error handler, listens on port 5000 |

### Controllers (15 files)

Controllers handle HTTP request/response. They use `asyncHandler` wrapper, response helpers (`ok`, `created`, `okMsg`, `createdMsg`), and entity guards (`requireUser`, `requireContent`, etc.).

| Controller | File | Responsibilities |
|---|---|---|
| Auth | `server/controllers/auth.controller.ts` | signup, login, logout, getMe, changePassword, forgotPassword, signupAndSubscribe |
| User | `server/controllers/user.controller.ts` | getProfile, updateMe, uploadAvatar, completeOnboarding, submitVerification, feed, gallery CRUD, settings CRUD, payment-method |
| Creator | `server/controllers/creator.controller.ts` | dashboard, analytics, earnings, settings, tiers, broadcast, payouts, activity, metrics export |
| Content | `server/controllers/content.controller.ts` | create (with file upload), update, delete, list, myContent, secure-url, view, viewer-data, report |
| Subscription | `server/controllers/subscription.controller.ts` | create, update, cancel, list (fan), listSubscribers (creator) |
| Message | `server/controllers/message.controller.ts` | send, delete, conversations, conversation detail, markRead, voice messages |
| Crypto Payment | `server/controllers/cryptoPayment.controller.ts` | crypto payment processing |
| Admin | `server/controllers/admin.controller.ts` | user management (status, commission), content moderation, settings, analytics, reports, enclave applications, user messaging |
| Analytics | `server/controllers/analytics.controller.ts` | event logging, platform analytics |
| AI | `server/controllers/ai.controller.ts` | caption generation |
| Notification | `server/controllers/notification.controller.ts` | list, unreadCount, markRead, delete |
| Contest | `server/controllers/contest.controller.ts` | create, publish, finalize, my contests, feed, enter |
| Enclave | `server/controllers/enclave.controller.ts` | application management |
| Referral | `server/controllers/referral.controller.ts` | referral code management |
| Support | `server/controllers/support.controller.ts` | ticket CRUD, admin reply |

### Services (16 files)

All business logic lives in services. Controllers delegate to services.

| Service | File | Responsibilities |
|---|---|---|
| Auth | `server/services/auth.service.ts` | User registration, authentication, token management, password management |
| User | `server/services/user.service.ts` | User profile management, onboarding, verification, feed, gallery |
| Creator | `server/services/creator.service.ts` | Dashboard aggregation, analytics, earnings, settings, tiers, broadcast, payouts |
| Content | `server/services/content.service.ts` | Content CRUD, file processing (sharp/ffmpeg), watermarking, R2 upload, signed URLs |
| Subscription | `server/services/subscription.service.ts` | Subscription lifecycle, Stripe integration, tier management |
| Message | `server/services/message.service.ts` | Direct messaging, conversation management, voice messages |
| Crypto Payment | `server/services/cryptoPayment.service.ts` | Crypto transaction processing via smart contract |
| Admin | `server/services/admin.service.ts` | Admin operations, user management, reports |
| Analytics | `server/services/analytics.service.ts` | Event tracking, aggregation, reporting |
| AI | `server/services/ai.service.ts` | OpenAI integration for caption generation |
| Notification | `server/services/notification.service.ts` | Notification CRUD, delivery |
| Contest | `server/services/contest.service.ts` | Contest lifecycle management |
| Support | `server/services/support.service.ts` | Support ticket handling |
| Email | `server/services/email.service.ts` | Email sending via Nodemailer |
| Storage | `server/services/storage.service.ts` | R2 file operations (upload, delete, signed URLs) |
| Enclave | *Embedded in controller* | Application handling |

### Middleware (5 files)

| Middleware | File | Purpose |
|---|---|---|
| Auth | `server/middleware/auth.middleware.ts` | JWT verification via Supabase, user attachment to `req.user`, impersonation support, role guards (`creatorOnly`, `adminOnly`, `requireRole`, `optionalProtect`) |
| Error | `server/middleware/error.middleware.ts` | Custom `AppError` class + centralized error handler (catches all errors, returns consistent JSON envelope) |
| Upload | `server/middleware/upload.middleware.ts` | Multer configuration for file uploads |
| Validation | `server/middleware/validation.middleware.ts` | `express-validator` middleware factories |

### Models (13 files)

Data access layer using Supabase queries. Each model maps to a database table/entity.

| Model | File | Table |
|---|---|---|
| User | `server/models/user.model.ts` | `profiles` |
| Content | `server/models/content.model.ts` | `content` |
| Subscription | `server/models/subscription.model.ts` | `subscriptions` |
| Transaction | `server/models/transaction.model.ts` | `transactions` |
| Message | `server/models/message.model.ts` | `messages` |
| Conversation | `server/models/conversation.model.ts` | `conversations` |
| Notification | `server/models/notification.model.ts` | Notifications (table not in schema DDL) |
| Contest | `server/models/contest.model.ts` | `contests` |
| Gallery | `server/models/gallery.model.ts` | `galleries` — 5 exported functions: `findGalleryByFanId`, `createGallery`, `addItemToGallery`, `removeItemFromGallery`, `getGalleryDetails` |
| Referral | `server/models/referral.model.ts` | `referrals` |
| Report | `server/models/report.model.ts` | `reports` |
| Settings | `server/models/settings.model.ts` | `platform_settings` |
| Support Ticket | `server/models/supportTicket.model.ts` | `support_tickets` |

### Route Files (15)

Each file defines Express `Router` with endpoints and middleware chains.

| Routes | File | Base Path |
|---|---|---|
| Auth | `server/routes/auth.routes.ts` | `/api/v1/auth` |
| User | `server/routes/user.routes.ts` | `/api/v1/users` |
| Creator | `server/routes/creator.routes.ts` | `/api/v1/creator` |
| Content | `server/routes/content.routes.ts` | `/api/v1/content` |
| Subscription | `server/routes/subscription.routes.ts` | `/api/v1/subscriptions` |
| Message | `server/routes/message.routes.ts` | `/api/v1/messages` |
| Crypto Payment | `server/routes/cryptoPayment.routes.ts` | `/api/v1/payments/crypto` |
| Admin | `server/routes/admin.routes.ts` | `/api/v1/admin` |
| Analytics | `server/routes/analytics.routes.ts` | `/api/v1/analytics` |
| AI | `server/routes/ai.routes.ts` | `/api/v1/ai` |
| Notification | `server/routes/notification.routes.ts` | `/api/v1/notifications` |
| Contest | `server/routes/contest.routes.ts` | `/api/v1/contests` |
| Enclave | `server/routes/enclave.routes.ts` | `/api/v1/enclave` |
| Referral | `server/routes/referral.routes.ts` | `/api/v1/referrals` |
| Support | `server/routes/support.routes.ts` | `/api/v1/support` |

### Utilities (13 files)

| Utility | File | Purpose |
|---|---|---|
| apiError | `server/utils/apiError.ts` | Custom error class |
| asyncHandler | `server/utils/asyncHandler.ts` | Async route handler wrapper (eliminates try/catch in controllers) |
| response | `server/utils/response.ts` | Response helpers: `ok()`, `created()`, `okMsg()`, `createdMsg()` |
| database | `server/utils/database.ts` | Supabase query wrappers: `handleQuery`, `handleCount`, `handleList`, `createRecord`, `updateRecord`, `deleteRecord`, `findRecordById`, `countRecords` |
| entityGuards | `server/utils/entityGuards.ts` | Guard functions: `requireUser`, `requireContent`, `requireContentOwnership` |
| requestHelpers | `server/utils/requestHelpers.ts` | Request parameter extraction: `requireId`, `requireBody` |
| content.utils | `server/utils/content.utils.ts` | Content processing utilities |
| fee.utils | `server/utils/fee.utils.ts` | Fee calculation utilities |
| formatters | `server/utils/formatters.ts` | Data formatting utilities |
| subscription.utils | `server/utils/subscription.utils.ts` | Subscription business logic helpers |
| tier.utils | `server/utils/tier.utils.ts` | Tier level calculation/validation |
| user.utils | `server/utils/user.utils.ts` | User profile reshaping (`reshapeUserForApp`) |

---

## Database

### Database Platform

| Attribute | Value |
|---|---|
| **Engine** | PostgreSQL (via Supabase) |
| **Client** | `@supabase/supabase-js` (service role key for server, anon key for client) |
| **Auth** | Supabase Auth (built-in JWT management) |

### Schema: Tables (12)

| Table | Primary Key | Description |
|---|---|---|
| `profiles` | `id` (UUID, FK to `auth.users`) | User profiles — all roles (fan, creator, admin) |
| `content` | `id` (bigint) | Published content — photos, videos, text, audio |
| `subscriptions` | `id` (bigint) | Fan-to-creator subscription records |
| `transactions` | `id` (bigint) | Payment transactions (subscriptions, tips, PPV) |
| `messages` | `id` (bigint) | Direct messages between users |
| `conversations` | `id` (bigint) | Message conversation threads |
| `galleries` | `id` (bigint) | Fan-curated content galleries |
| `analytics_events` | `id` (bigint) | Profile visits and post views |
| `monthly_analytics_summary` | `id` (bigint) | Aggregated monthly analytics |
| `platform_settings` | `key` (text) | Key-value platform configuration |
| `support_tickets` | `id` (bigint) | User support requests |
| `reports` | `id` (UUID) | Saved admin report configurations |

### Schema: Additional Tables (from migrations)

- `contests` — Creator-hosted contests
- `referrals` — Referral tracking
- `enclave_applications` — Enclave membership applications
- Saved reports, RLS policies, crypto fields

### Schema: Enums

| Enum | Values |
|---|---|
| `user_role` | `fan`, `creator`, `admin` |
| `user_status` | `active`, `suspended`, `banned`, `pending`, `pending verification` |
| `subscription_status` | `active`, `canceled`, `expired` |
| `transaction_type` | `Subscription`, `Tip`, `PPV Message`, `PPV Post` |
| `transaction_status` | `Pending`, `Cleared`, `Failed`, `Refunded` |
| `content_type` | `photo`, `video`, `text`, `audio` |
| `content_status` | `draft`, `published`, `scheduled`, `flagged` |
| `content_visibility` | `subscribers_only`, `pay_per_view` |
| `ticket_status` | `Open`, `Pending`, `Closed`, `Escalated` |
| `ticket_priority` | `Low`, `Medium`, `High` |
| `report_metric` | `Users`, `Revenue`, `Engagement` |
| `report_filter` | `User Type`, `User Status` |

### Migrations

**Root migrations** (`PoDM_project/migrations/` — 9 files): Platform-wide schema changes (crypto, enclave, referrals, RLS, speed bonus).

**Script migrations** (`server/scripts/migrations/` — 6 files): Contests, reports, RLS fixes, tier levels.

### Seeds

| File | Purpose |
|---|---|
| `server/scripts/seed.ts` | Database seeding (run via `npm run seed`) |

### Connection Architecture

```
[Frontend]                 [Backend]                  [Database]
   │                          │                           │
   ├─ supabaseClient.ts ──────┤                           │
   │  (anon key, auth only)   │                           │
   │                          ├─ supabaseClient.ts ───────┤
   │                          │  (service role key, admin)│
   │                          │                           │
   │  apiClient.ts ──────────►│  models/* ──────────────► │
   │  (Axios HTTP)            │  (query wrappers)         │
```

---

## AI

| Component | File | Details |
|---|---|---|
| **Provider** | OpenAI | `openai` npm package |
| **Service** | `server/services/ai.service.ts` | OpenAI API integration |
| **Controller** | `server/controllers/ai.controller.ts` | Caption endpoint handler |
| **Route** | `server/routes/ai.routes.ts` | `POST /api/v1/ai/caption` |
| **Frontend** | `src/lib/apiClient.ts` (generateCaption) | Sends image URL or file to caption endpoint |
| **Capability** | **Image-to-caption generation** | Only AI feature implemented |
| **Prompts** | Hardcoded in service (not externalized) | No prompt management system |
| **Agents** | None | No agent framework |
| **Tool Calling** | None | No function/tool calling |
| **Memory** | None | No conversational memory |
| **Vector Search** | None | No embeddings/vector DB |
| **RAG** | None | No retrieval-augmented generation |
| **Embeddings** | None | No embedding generation |
| **Orchestration** | None | Single endpoint, no AI pipeline |

---

## Integrations

| Service | Integration | SDK/Client | Purpose |
|---|---|---|---|
| **Supabase** | Database + Auth | `@supabase/supabase-js` | PostgreSQL database, user authentication, JWT management |
| **Stripe** | Payments | `stripe` (v18 backend), `@stripe/stripe-js` + `@stripe/react-stripe-js` (frontend) | Connect, PaymentIntents, SetupIntents, subscriptions, payouts |
| **Cloudflare R2** | File Storage | `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` | Object storage for media files (images, video, audio), signed URLs |
| **OpenAI** | AI | `openai` (v6) | Image caption generation |
| **Socket.IO** | Real-time | `socket.io` (backend), `socket.io-client` (frontend) | Live messaging, conversation room management |
| **Nodemailer** | Email | `nodemailer` | Transactional emails (password reset, notifications) |
| **Ethereum** | Crypto | Custom Solidity contract + ethers (via crypto wallet hooks) | USDC subscription/tip/PPV payments via smart contract splitter |
| **Cloudflare Pages** | Hosting | Netlify config + Cloudflare Pages preview (`*.pages.dev`) | Frontend deployment |
| **Render** | Hosting | Production API URL: `https://podm.onrender.com` | Backend deployment |
| **Netlify** | Hosting | `netlify.toml` | Alternative frontend deployment (SPA with redirects) |

---

## Authentication

| Mechanism | Source | Details |
|---|---|---|
| **Supabase Auth** | Backend `auth.middleware.ts` | JWT verification via `supabase.auth.getUser(token)`. Service role key validates tokens server-side. |
| **JWT Bearer Token** | Backend middleware, Frontend `apiClient.ts` | Token stored in `localStorage` or `sessionStorage`. Sent as `Authorization: Bearer <token>` header. |
| **Role-Based Access** | Backend `auth.middleware.ts` | Three roles: `fan`, `creator`, `admin`. Middleware factory `requireRole(...roles)` + composite arrays (`protectAndCreator`, `protectAndAdmin`). |
| **Optional Auth** | Backend `optionalProtect` | Public routes optionally attach user data if valid token present |
| **Admin Impersonation** | Backend `auth.middleware.ts` | Admin can set `X-Impersonating-User-Id` header to act as another user. Original admin stored in `req.originalUser`. |
| **Supabase Auth (Frontend)** | Frontend `supabaseClient.ts` | Anon key used for client-side auth flows (password reset) |
| **Stripe Connect** | Backend + Frontend | Creators onboard via Stripe Connect for payout capability |
| **Crypto Wallet** | Frontend `useCryptoWallet.ts` | Ethereum wallet connection for smart contract payments |

---

## Configuration

### Environment Files

| File | Contents |
|---|---|
| `PoDM_project/server/.env` | Backend environment (Supabase URL + keys, R2 credentials, Stripe keys, OpenAI key, SMTP config, Ethereum RPC, JWT secret, client URL) |
| `podm-frontend/.env` | Frontend environment (VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_STRIPE_PUBLISHABLE_KEY) |

### TypeScript Configuration

| File | Purpose |
|---|---|
| `PoDM_project/tsconfig.json` | Backend TS config (target ES2020, module commonjs, strict, outDir dist) |
| `podm-frontend/tsconfig.json` | Frontend TS config (strict, JSX react-jsx, path aliases) |
| `podm-frontend/tsconfig.jest.json` | Jest-specific overrides |

### Build Configuration

| File | Purpose |
|---|---|
| `podm-frontend/vite.config.ts` | Vite bundler (React plugin, CSS, build output to dist/) |
| `podm-frontend/postcss.config.js` | PostCSS with Tailwind + autoprefixer |
| `podm-frontend/tailwind.config.js` | Tailwind content paths, theme extensions |

### Linting

| File | Purpose |
|---|---|
| `podm-frontend/eslint.config.js` | ESLint flat config (TypeScript + React hooks + React refresh) |

### Testing

| File | Purpose |
|---|---|
| `PoDM_project/jest.config.js` + `jest.setup.js` | Backend Jest config |
| `podm-frontend/jest.config.ts` + `setupTests.ts` + `babel.config.cjs` | Frontend Jest config (jsdom) |
| `podm-frontend/playwright.config.ts` | E2E test config |

---

## Infrastructure

### Deployment

| Platform | Service | Config File |
|---|---|---|
| **Docker Compose** | Local orchestration | `docker-compose.yml` |
| **Docker** | Backend container | `PoDM_project/Dockerfile` |
| **Docker** | Frontend container | `podm-frontend/Dockerfile` |
| **Netlify** | Frontend hosting | `netlify.toml` |
| **Cloudflare Pages** | Frontend (preview) | Handled via `_redirects` |
| **Render** | Backend hosting | URL: `https://podm.onrender.com` (config external) |
| **CI/CD** | GitHub Actions | `.github/workflows/ci.yml` |

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
Jobs:
  backend-build-and-test:
    runs-on: ubuntu-latest
    Node 18.x
    npm ci → npm test
    Working dir: ./PoDM_project

  frontend-build-and-lint:
    runs-on: ubuntu-latest
    Node 18.x
    npm ci → npm run lint → npm run build
    Working dir: ./podm-frontend
```

### Docker Compose Services

```yaml
services:
  backend:
    build: ./PoDM_project
    ports: 5000:5000
    env_file: ./PoDM_project/server/.env

  frontend:
    build: ./podm-frontend
    ports: 5173:5173
    env_file: ./podm-frontend/.env
    depends_on: backend
```

---

## Testing

### Backend Tests (Jest)

| Test | File | Type |
|---|---|---|
| Auth Controller | `server/tests/auth.controller.test.ts` | Unit |
| Auth Integration | `server/tests/integration/auth.integration.test.ts` | Integration |
| PPV Subscription | `server/tests/integration/ppv_subscription.test.ts` | Integration |

### Frontend Tests

| Test | File | Type |
|---|---|---|
| App | `src/App.test.tsx` | Unit (Jest) |

### E2E Tests (Playwright)

| Spec | File | Flow |
|---|---|---|
| Login | `tests/login.spec.ts` | Authentication flows |
| Fan | `tests/fan.spec.ts` | Fan dashboard + content browsing |
| Creator | `tests/creator.spec.ts` | Creator hub + content management |
| Admin | `tests/admin.spec.ts` | Admin panel operations |
| Tip | `tests/tip.spec.ts` | Tipping flow |

---

## Shared Type Definitions (`common/types/`)

| Type File | Key Types |
|---|---|
| `User.ts` | User, UserRole, UserProfile, UserStatus |
| `Content.ts` | Content, ContentType, ContentStatus, ContentVisibility |
| `Creator.ts` | Creator (extends User), CreatorData, CreatorMetrics, Tier |
| `Subscription.ts` | Subscription, SubscriptionStatus, TierConfig |
| `Transaction.ts` | Transaction, TransactionType, TransactionStatus |
| `Message.ts` | Message, MessageContent |
| `Conversation.ts` | Conversation, ConversationParticipant |
| `Notification.ts` | Notification, NotificationType |
| `Contest.ts` | Contest, ContestStatus, ContestEntry |
| `Gallery.ts` | GalleryItem, GalleryCollection |
| `Report.ts` | ReportConfig, ReportMetric, ReportFilter |
| `SupportTicket.ts` | SupportTicket, TicketStatus, TicketPriority |

---

## Smart Contract

| Attribute | Value |
|---|---|
| **File** | `contracts/PoDMPaymentProtocol.sol` |
| **Language** | Solidity ^0.8.20 |
| **Standard** | ERC-20 (USDC) |
| **Network** | Ethereum (address-based) |
| **Functions** | `paySubscription()`, `payTip()`, `payPPV()` |
| **Admin** | `setPlatformTreasury()`, `setPlatformFeeBps()` |
| **Events** | `SubscriptionPaid`, `TipPaid`, `PPVPaid`, `TreasuryUpdated`, `FeeUpdated` |
| **Fee Model** | Basis points (BPS), capped at 30% |

---

## Scripts

### Backend Scripts (`server/scripts/` — 15 files)

| Script | Purpose |
|---|---|
| `seed.ts` | Database seeding with test data |
| `add-voice-message-column.ts` + `.sql` | Add voice message column migration |
| `debug_subs.ts` | Subscription debug |
| `fix-content-types.ts` + `.sql` | Content type fixing migration |
| `generate-missing-files-report.ts` | Missing files audit |
| `migrate-supabase-to-r2.ts` | Storage migration from Supabase to R2 |
| `test_settings.ts`, `test_settings_direct.ts`, `test_settings_robust.ts` | Settings configuration testing |
| `verify-storage.ts`, `verify_persistence.ts`, `verify_r2.ts` | Storage verification |
| `fix_analytics.sql` | Analytics data fix |

### Root Scripts

| Script | Purpose |
|---|---|
| `scripts/migrate-to-r2.ts` | R2 migration utility |
| `check_env.ts` | Environment variable validation |
| `debug_transactions.ts` | Transaction processing debug |
| `instagram_liker.ts` | Instagram automation |
| `scrape_ig.js` | Instagram data scraping |
| `debug-login.ps1`, `get-token.ps1`, `test-notifications.ps1` | API debugging (PowerShell) |

---

## Known Gaps / Unanswered Questions

- **Notification table**: Referenced in models but not in the root schema DDL — may be managed by Supabase or added in unlisted migration
- **Enclave model**: Controller exists but no separate model file — may use raw queries or be embedded in another service
- **Settings model**: Table `platform_settings` exists at `server/models/settings.model.ts` with `getSetting`, `updateSetting`, `getAllSettings` functions
- **AI prompts**: Not externalized — hardcoded in service file
- **No scheduled jobs framework**: No cron, queues, or worker infrastructure found
- **No monitoring/logging pipeline**: No structured logging, APM, or error tracking integration
- **Crypto wallet integration**: Frontend `useCryptoWallet` hook exists, but backend crypto payment integration is minimal (single controller)
- **Duplicate/compiled files**: `dist/` directory contains 113 compiled JS files — build artifact, not source
- **Debug artifacts**: Multiple `.log`, `.txt` files scattered across the backend — indicate active development

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-02 | AI Architect | Initial repository inventory (Phase 1) |

---

## Related Documents

- [00-session-notes.md](00-session-notes.md) — Session notes and discoveries
- [01-documentation-plan.md](01-documentation-plan.md) — Multi-phase documentation roadmap
- `PoDM_project/AGENTS.md` — Backend DOX contract
- `podm-frontend/AGENTS.md` — Frontend DOX contract
