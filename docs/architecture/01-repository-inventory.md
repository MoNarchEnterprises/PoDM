# Repository Inventory

**Purpose**: Complete inventory of every file, module, service, controller, model, route, component, configuration, and integration in the PoDM platform.

**Date**: 2026-07-19
**Project Version**: 1.0.0 (backend), 0.0.0 (frontend)
**Confidence**: High — every source file was read or inspected

## Files Examined

- All 98 TypeScript files in `PoDM_project/server/`
- All 103 TypeScript/TSX files in `podm-frontend/src/`
- All 11 root migrations in `PoDM_project/migrations/`
- All 7 scripts/migrations in `PoDM_project/server/scripts/migrations/`
- All 12 common type files in `PoDM_project/common/types/`
- All root-level config files (package.json, tsconfig.json, Dockerfile, etc.)
- All frontend config files (vite.config.ts, tailwind.config.js, playwright.config.ts, etc.)
- CI/CD pipeline config (`.github/workflows/ci.yml`)
- Smart contract (Solidity + Hardhat)
- All 5 frontend Playwright E2E test specs
- All 11 SQL migration files
- All environment files (`.env` for both modules)

## Modules Referenced

- Backend: `PoDM_project/server/`
- Frontend: `podm-frontend/src/`
- Shared Types: `PoDM_project/common/types/`
- Smart Contract: `PoDM_project/contracts/`
- Database Migrations: `PoDM_project/migrations/`, `PoDM_project/server/scripts/migrations/`

---

## Repository Overview

### Application
- **Name**: PoDM
- **Purpose**: Creator-fan subscription platform — enables creators to publish gated content, manage subscriptions, receive tips/PPV payments, message fans, run contests, and manage referrals. Fans subscribe to creator tiers, access content, send tips, and participate in contests.
- **Type**: Full-stack web application with blockchain (USDC) payment integration

### Languages
| Language | Usage |
|---|---|
| TypeScript | 100% of backend (98 files) and frontend (103 files) |
| Solidity | Smart contract (`PoDMPaymentProtocol.sol`, `MockUSDC.sol`) |
| SQL | 17 migration files (PostgreSQL for Supabase) |
| CSS | Tailwind CSS (frontend styles) |
| YAML | CI/CD pipeline, Docker Compose |
| TOML | Netlify deployment config |
| JSON | NPM package configs, Hardhat config |
| Nix | IDX workspace config |

### Frameworks
| Framework | Module | Version | Purpose |
|---|---|---|---|
| Express | Backend | 5.1.0 | HTTP server and routing |
| React | Frontend | 18.2.0 | UI component library |
| Vite | Frontend | 7.1.2 | Build tool and dev server |
| Tailwind CSS | Frontend | 3.4.1 | Utility-first CSS framework |
| Hardhat | Contracts | 2.22.19 | Solidity development framework |
| Jest | Both | 30.x | Unit/integration test runner |
| Playwright | Frontend | 1.57.0 | E2E test framework |

### Major Libraries
| Library | Module | Purpose |
|---|---|---|
| `@supabase/supabase-js` | Both (2.86.0) | Database client + auth |
| `@aws-sdk/client-s3` | Backend (3.953.0) | Cloudflare R2 (S3-compatible) storage |
| `@aws-sdk/s3-request-presigner` | Backend (3.953.0) | Signed URL generation for private content |
| `stripe` | Backend | Payment processing (subscriptions, tips, PPV) |
| `socket.io` | Backend (4.8.1) | Real-time messaging server |
| `socket.io-client` | Frontend (4.8.1) | Real-time messaging client |
| `ethers` | Backend (6.17.0) | Ethereum/Base blockchain interaction |
| `openai` | Backend (6.16.0) | AI caption generation (OpenRouter-compatible) |
| `nodemailer` | Backend (7.0.12) | Email sending (SMTP) |
| `sharp` | Backend (0.34.3) | Image processing (watermarking, thumbnails) |
| `fluent-ffmpeg` | Backend (2.1.3) | Video processing (thumbnails) |
| `multer` | Backend (2.0.2) | File upload handling (memory storage) |
| `axios` | Both (1.11.0) | HTTP client |
| `react-router-dom` | Both (7.8.0) | Frontend routing |
| `recharts` | Both (3.1.2) | Charts and analytics visualization |
| `lucide-react` | Both | Icon library |
| `express-validator` | Backend (7.2.1) | Request validation |
| `jsonwebtoken` | Backend (9.0.2) | JWT token handling |
| `uuid` | Both | UUID generation |

### Build System
| Tool | Module | Purpose |
|---|---|---|
| `tsc` (TypeScript) | Backend | Compile TS to JS in `dist/` |
| Vite | Frontend | Bundle and dev server |
| Hardhat | Contracts | Compile Solidity, run tests, deploy |
| Babel | Both | Jest transformation |
| ts-jest | Both | TypeScript Jest integration |

### Package Managers
- **npm** (both modules)

### Runtime Environments
| Environment | Backend | Frontend |
|---|---|---|
| Development | `ts-node-dev` (hot-reload) | Vite dev server (port 5173) |
| Production | Node.js on Render (compiled JS) | Netlify (static SPA) |
| Docker | Node 20-alpine (compiled) | Node 18-alpine (dev mode only) |
| CI | GitHub Actions (runs Jest tests) | GitHub Actions (lint + build) |

---

## Directory Structure

### Root (`PoDM/`)

Contains 39 entries. Key items:

| Path | Type | Purpose |
|---|---|---|
| `PoDM_project/` | Directory | Backend module (Express API) |
| `podm-frontend/` | Directory | Frontend module (React SPA) |
| `docs/` | Directory | Project documentation, architecture KB |
| `.github/workflows/` | Directory | CI/CD pipeline |
| `.agent/workflows/` | Directory | AI agent workflow specifications |
| `.idx/` | Directory | Google Project IDX config |
| `netlify.toml` | File | Netlify deployment config (root, builds podm-frontend) |
| `docker-compose.yml` | File | Docker Compose orchestration (backend + frontend) |
| `.gitignore` | File | Git ignore rules |
| `package.json` | File | Root npm config (shared deps: puppeteer, csv-parser) |
| `AGENTS.md` | File | Root DOX framework contract |

**Root-owned dev tooling scripts:**
- `debug-login.ps1`, `test-notifications.ps1` — PowerShell dev utilities
- `get-token.ps1` — Token retrieval utility
- `instagram_liker.ts`, `scrape_ig.js` — Instagram scraping tools
- `cookies.json`, `secret.txt` — Scraping credentials (gitignored?)
- `implementation_details.txt`, `TYPESCRIPT_ERRORS_SOLUTION.md` — Dev notes

---

### Backend (`PoDM_project/`)

42 entries. Core server code in `server/`.

```
PoDM_project/
├── server/                    # Core application code (98 TS files)
│   ├── Server.ts              # Entry point — Express + HTTP + Socket.IO setup
│   ├── config/                # Infrastructure client configuration
│   │   ├── supabaseClient.ts  # Supabase admin (service-role) client
│   │   ├── r2Client.ts        # Cloudflare R2 (S3-compatible) client
│   │   └── socket.ts          # Socket.IO server init + auth middleware
│   ├── controllers/           # 16 controllers: request/response handling
│   ├── models/                # 13 models: database query interfaces
│   ├── services/              # 17 services: business logic layer
│   ├── routes/                # 16 route files: endpoint definitions
│   ├── middleware/            # 4 middleware: auth, error, upload, validation
│   ├── utils/                 # 12 utility modules
│   ├── tests/                 # 3 test files (1 unit + 2 integration)
│   ├── jobs/                  # 1 job: renewSubscriptions.ts
│   ├── scripts/               # 16 development/utility scripts
│   └── .env                   # Environment variables
├── common/types/              # 12 shared TypeScript interfaces
├── migrations/                # 11 SQL migration files
├── contracts/                 # Hardhat project (Solidity, tests, deploy)
│   ├── contracts/             # 2 Solidity files
│   ├── scripts/               # 1 deploy script
│   ├── test/                  # 1 test file
│   ├── hardhat.config.ts      # Hardhat config (Base Sepolia + Mainnet)
│   └── package.json           # Hardhat + OpenZeppelin deps
├── lib/                       # Shared constants
│   └── constants.ts           # DEFAULT_COMMISSION_RATE = 12.5
├── scripts/                   # Root-level scripts
│   └── migrate-to-r2.ts       # Supabase-to-R2 migration
├── src/                       # Legacy/alternative source (controllers + routes)
│   ├── controllers/           # Duplicate controllers? (empty/inactive?)
│   └── routes/                # Duplicate routes? (empty/inactive?)
├── dist/                      # Compiled JS output
├── .dockerignore
├── Dockerfile                 # Multi-stage: build (node:20-alpine) + production
├── tsconfig.json              # target ES2020, module nodenext
├── jest.config.js
├── babel.config.js
├── jest.setup.js
├── check_env.ts               # Environment validation script
├── .env                       # Environment variables (secrets committed)
├── package.json               # Backend dependencies
├── package-lock.json
├── *.log                      # Debug log files (debug.log, error_log.txt, etc.)
├── *.txt                      # Debug output files (debug_output.txt, etc.)
└── *.json                     # Debug JSON (debug_result.json, storage-report.json)
```

**Debug artifacts in backend root** (non-production, development artifacts):
- `debug.log` — 27,411+ lines of auth debugging
- `debug_output.txt`, `debug_output_clean.txt`, `debug_result.json` — Debug script output
- `error_log.txt`, `report.txt`, `verification-results.txt` — Error/debug reports
- `storage-report.json`, `migration-output.txt`, `migration-debug.txt` — Migration logs
- `backend_start.log`, `debug_subs.log`, `test_debug.log` — Various debug logs

---

### Frontend (`podm-frontend/`)

34 entries. React SPA in `src/`.

```
podm-frontend/
├── src/                           # Source code (103 TS/TSX files)
│   ├── main.tsx                   # React entry point
│   ├── App.tsx                    # Root component (router + auth provider)
│   ├── App.test.tsx               # Smoke test (single test)
│   ├── vite-env.d.ts              # Vite type declarations
│   ├── components/                # Reusable components (28 files)
│   │   ├── ui/                    # Primitive UI (5 components)
│   │   ├── layout/                # Layout shell (5 components)
│   │   ├── shared/                # Domain-shared components (17 components)
│   │   └── auth/                  # Auth guards (3 components)
│   ├── features/                  # Feature modules (47 files)
│   │   ├── admin/                 # Admin panel (10 files)
│   │   ├── auth/                  # Auth modals (3 files)
│   │   ├── contests/              # Contest management (3 files)
│   │   ├── creator/               # Creator dashboard (10 files)
│   │   ├── enclave/               # Enclave premium tier (6 files)
│   │   ├── fan/                   # Fan experience (6 files)
│   │   ├── messages/              # Messaging (1 file + components)
│   │   ├── profile/               # Creator profile page (3 files)
│   │   └── viewer/                # Content viewer (1 file)
│   ├── pages/                     # Top-level page components (6 files)
│   ├── hooks/                     # App-level hooks (5 files)
│   ├── shared/hooks/              # Cross-feature hooks (4 files)
│   ├── context/                   # React contexts (1 file)
│   ├── lib/                       # API client, socket, config (6 files)
│   ├── styles/                    # Global CSS (1 file)
│   └── types/                     # TypeScript declarations (1 file)
├── tests/                         # Playwright E2E tests (5 specs)
├── public/                        # Static assets
│   ├── assets/                    # 3 images (logo, placeholder, screenshot)
│   ├── _redirects                 # Netlify SPA redirect rule
│   ├── favicon.png
│   └── vite.svg
├── assets/                        # Additional assets (screenshots)
├── dist/                          # Build output
├── playwright-report/             # E2E test reports
├── test-results/                  # Test output
├── .env                           # Environment variables (secrets committed)
├── .gitignore
├── vite.config.ts                 # Vite config + @common alias + API proxy
├── tsconfig.json                  # target ES2020, strict
├── tsconfig.jest.json             # Jest-specific TS config
├── tailwind.config.js             # Tailwind theme (primary purple, secondary pink)
├── postcss.config.js              # PostCSS + Tailwind + autoprefixer
├── eslint.config.js               # ESLint flat config (React + TypeScript)
├── babel.config.cjs               # Babel for Jest
├── jest.config.ts                 # Jest config (ts-jest, jsdom)
├── setupTests.ts                  # Jest setup
├── playwright.config.ts           # Playwright config
├── index.html                     # Vite HTML entry
├── Dockerfile                     # Dev-mode Docker (runs vite dev --host)
├── package.json
├── package-lock.json
├── README.md
├── *.log                          # Dev logs
└── *.png                          # Debug screenshots
```

---

## Frontend: Pages, Routes, Layouts, Components, Hooks, State

### Pages (6 top-level)

| File | Lines | Purpose |
|---|---|---|
| `SplashPage.tsx` | 347 | Landing/marketing page |
| `AdminLoginPage.tsx` | 147 | Admin-specific login page |
| `ResetPasswordPage.tsx` | 104 | Password reset form |
| `PrivacyPolicy.tsx` | 130 | Legal/privacy policy page |
| `TermsOfService.tsx` | 101 | Terms of service page |
| `Enclave.tsx` | 54 | Enclave premium tier marketing page |

### Routing (34 routes in `App.tsx`)

All routes defined in `App.tsx:282-357`. 14 lazy-loaded via `React.lazy()`.

**Public Routes:**
| Route | Component | Auth |
|---|---|---|
| `/` | SplashPage | None |
| `/enclave` | Enclave | None |
| `/terms-of-service` | TermsOfService | None |
| `/privacy-policy` | PrivacyPolicy | None |
| `/creator/:username` | CreatorProfileLoader | None |
| `/content/:contentId` | ContentViewerLoader | None |
| `/reset-password` | ResetPasswordPage | None |
| `/onboarding` | CreatorOnboardingLoader | None |
| `/verification` | CreatorVerification | None |
| `/admin/login` | AdminLoginPage | None |

**Fan Routes** (protected, `FanLayout`):
| Route | Component |
|---|---|
| `/fan` (index) | FanFeed |
| `/fan/feed` | FanFeed |
| `/fan/gallery` | FanGalleryLoader |
| `/fan/subscriptions` | FanSubscriptions |
| `/fan/messages` | FanMessages |
| `/fan/settings` | FanSettingsLoader |

Note: No role-based guard on `/fan/*` routes — only token check via `ProtectedRoute` wrapper.

**Creator Routes** (protected via `CreatorRouteGuard`):
| Route | Component |
|---|---|
| `/hub` (index) | CreatorDashboardLoader |
| `/hub/dashboard` | CreatorDashboardLoader |
| `/hub/content` | CreatorContent |
| `/hub/messages` | CreatorMessages |
| `/hub/analytics` | CreatorAnalyticsLoader |
| `/hub/earnings` | CreatorEarningsLoader |
| `/hub/settings` | CreatorSettingsLoader |
| `/hub/bulk-upload` | BulkUploadPage |

**Admin Routes** (protected via `ProtectedRoute requiredRole="admin"`):
| Route | Component |
|---|---|
| `/admin` (index) | DashboardPanel |
| `/admin/dashboard` | DashboardPanel |
| `/admin/users` | UserManagementPanel |
| `/admin/content` | ContentModerationPanel |
| `/admin/analytics` | AnalyticsPanel |
| `/admin/reports` | ReportsPanel |
| `/admin/support` | SupportTicketsPanel |
| `/admin/settings` | SettingsPanel |
| `/admin/enclave` | EnclaveApplications |
| `/admin/enclave-applications` | EnclaveApplications |

**Loader Wrappers** (6 components in `App.tsx`):
- `CreatorProfileLoader` — fetches public creator profile
- `ContentViewerLoader` — fetches content + creator + related content
- `FanGalleryLoader` — fetches fan gallery data
- `FanSettingsLoader` — fetches fan settings
- `CreatorDashboardLoader` — fetches dashboard metrics (uses `useCreatorData`)
- `CreatorAnalyticsLoader` — fetches analytics data
- `CreatorEarningsLoader` — fetches earnings data
- `CreatorSettingsLoader` — passes auth user to settings component
- `CreatorOnboardingLoader` — pass-through to CreatorOnboarding
- `AdminPanel` — acts as data loader + provides `<Outlet />`

### Layouts (5 components)

| File | Lines | Purpose |
|---|---|---|
| `MainLayout.tsx` | 122 | Sidebar nav + content area shell |
| `Header.tsx` | 132 | Top navigation bar |
| `Footer.tsx` | 21 | Site footer |
| `Container.tsx` | 13 | Simple container wrapper |
| `AuthLayout.tsx` | 19 | Auth page layout |

3 layout wrappers in App.tsx: `FanLayout`, `CreatorLayout`, `AdminLayout` — each wraps `<MainLayout>` with role-specific nav items.

### Reusable Components

**UI Primitives** (5 files, `components/ui/`):
| File | Lines | Purpose |
|---|---|---|
| `Button.tsx` | 91 | Styled button with variants |
| `Input.tsx` | 70 | Styled input field |
| `Card.tsx` | 29 | Content card container |
| `Modal.tsx` | 74 | Generic modal dialog |
| `AudioPlayer.tsx` | 91 | Audio playback component |

**Auth Guards** (3 files, `components/auth/`):
| File | Lines | Purpose |
|---|---|---|
| `withAuthGuard.tsx` | 84 | HOC factory for role-based protection |
| `ProtectedRoute.tsx` | 24 | Route-level auth guard |
| `CreatorRouteGuard.tsx` | 16 | Creator role check + redirect |

**Domain-Shared** (17 files, `components/shared/`):
| File | Lines | Purpose |
|---|---|---|
| `ContentCard.tsx` | 161 | Content preview card |
| `ContentLockManager.tsx` | 194 | Content access control logic |
| `ContentLockOverlay.tsx` | 118 | Visual lock overlay |
| `ConversationListItem.tsx` | 116 | Message conversation row |
| `ConfirmModal.tsx` | 71 | Confirmation dialog |
| `ImpersonationBanner.tsx` | 26 | Admin impersonation indicator |
| `OnRampButton.tsx` | 84 | Crypto on-ramp (card to USDC) |
| `PaymentModal.tsx` | 198 | Payment processing modal |
| `ReportModal.tsx` | 91 | Content report dialog |
| `SettingsCard.tsx` | 48 | Settings section wrapper |
| `StatCard.tsx` | 33 | Dashboard stat display |
| `StatusBadge.tsx` | 35 | Colored status badge |
| `TierCard.tsx` | 47 | Subscription tier display |
| `TipModal.tsx` | 126 | Tip sending modal |
| `ToggleSwitch.tsx` | 57 | Toggle control |
| `UnlockModal.tsx` | 111 | PPV unlock modal |
| `VerificationBanner.tsx` | 57 | Verification status banner |

### Hooks (9 files)

**App-level hooks** (`src/hooks/`):
| File | Lines | Purpose | Used By |
|---|---|---|---|
| `useAuth.tsx` | 204 | Auth context provider (login, signup, logout, impersonation) | Entire app |
| `useCreatorData.ts` | 40 | Fetch creator dashboard data | CreatorDashboardLoader |
| `useModal.ts` | 25 | Generic open/close state | Multiple modals |
| `useOnClickOutside.ts` | 31 | Click-outside detection | Modals, dropdowns |
| `useVoiceRecorder.ts` | 82 | Voice message recording | CreatorMessages |

**Shared hooks** (`src/shared/hooks/`):
| File | Lines | Purpose |
|---|---|---|
| `useAsyncData.ts` | 63 | Prescribed data-fetching pattern (not adopted in practice) |
| `useCryptoPayment.ts` | 110 | Crypto wallet payment flow (uses raw `fetch()`) |
| `useCryptoWallet.ts` | 168 | Wallet connection (fully mocked: fake addresses, 1250 USDC) |
| `useFormSubmission.ts` | 61 | Form submission loading/error state |

### State Management

- **No Redux, Zustand, or external state library**
- **Auth state**: React Context (`useAuth` provider wraps entire app)
- **Toast/notifications**: `ToastContext.tsx` (98 LOC) — global toast + Axios error interceptor integration
- **Local state**: Component-level `useState`/`useEffect` throughout feature modules
- **No React Router loaders/actions** — all data fetching in wrapper components via `useEffect`

### API Integration Layer

**`src/lib/apiClient.ts`** — 614 lines, ~70 exported API functions

Architecture: Axios instance with request/response interceptors:
- **Request interceptor**: Attaches `Bearer` token from localStorage/sessionStorage + `X-Impersonating-User-Id` header
- **Response interceptor**: Global error handler, 401 auto-redirect (clears token, redirects to `/`)
- **Error handler registration**: `registerErrorHandler()` — integrates with `ToastContext`
- **`api()` helper**: Shorthand for single-line calls: `api(method, url, data?, config?)`

**API functions by category:**

| Category | Functions | Count |
|---|---|---|
| Auth | `signup`, `login`, `forgotPassword`, `getMe`, `changePassword`, `signupAndSubscribe` | 6 |
| User Profile | `updateMe`, `uploadAvatar`, `completeCreatorOnboarding`, `submitVerification` | 4 |
| Creator | `updateCreatorSettings`, `getCreatorDashboardData`, `getCreatorAnalyticsData`, `exportCreatorMetricsCSV`, `exportCreatorFanEngagementCSV`, `getCreatorActivity`, `requestCreatorPayout`, `getCreatorTiers`, `broadcastMessage`, `getCreatorEarningsData` | 10 |
| Content | `getMyCreatorContent`, `createContent`, `deleteContent`, `updateContent`, `getPublicCreatorProfile`, `getSecureContentUrl`, `getSecureContentViewUrl`, `getContentViewerData`, `reportContent` | 9 |
| Fan | `getFanFeed`, `getFanSubscriptions`, `getFanGallery`, `getFanSettings`, `updateFanSettings`, `addContentToGallery`, `removeContentFromGallery` | 7 |
| Messages | `getMyConversations`, `getMessagesInConversation`, `markConversationAsRead`, `sendMessage`, `deleteMessage`, `sendVoiceMessage` | 6 |
| Admin | `getPlatformSettings`, `updatePlatformSettings`, `updateUserStatus`, `updateCreatorCommission`, `getVerificationDocs`, `getPlatformAnalytics`, `getSavedReports`, `generateReport`, `updateContentStatus`, `messageUser`, `getUserById` | 11 |
| Subscriptions | `updateFanSubscription` | 1 |
| Support | `submitSupportTicket`, `replyToSupportTicket` | 2 |
| Notifications | `getNotifications`, `getUnreadNotificationCount`, `markNotificationAsRead`, `deleteNotification` | 4 |
| Contests | `createContest`, `getMyContests`, `publishContest`, `finalizeContest`, `getFanContests`, `enterContest` | 6 |
| Crypto | `linkWallet` (via settings endpoint) | 1 |
| AI | `generateCaption` | 1 |
| Analytics | `logAnalyticsEvent` | 1 |

**Known bypass sites** (raw `fetch()` or raw apiClient calls outside typed wrappers):
- `useCryptoWallet.ts` — uses raw `fetch()` for crypto verification endpoints
- `WalletSettings.tsx` — uses raw `fetch()` for crypto operations
- `ReferralCodes.tsx` — uses `apiClient.get('/referrals/...')` with raw path strings
- `EnclaveApplications.tsx` — uses `apiClient.get('/admin/...')` with raw path strings
- `EnclaveApplicationForm.tsx` — uses `apiClient.post('/enclave/...')` with raw path strings

### Other `lib/` Files
| File | Lines | Purpose |
|---|---|---|
| `constants.ts` | 43 | Nav items, DEFAULT_COMMISSION_RATE, report reasons |
| `formatters.ts` | 121 | `formatCurrency`, `slugify`, `formatDate`, `formatMessageTimestamp`, `timeAgo`, `truncateText` |
| `statusBadgeMap.ts` | 74 | Status-to-color mapping for badges |
| `socket.ts` | 15 | Socket.IO client (autoConnect: false, auth via token) |
| `supabaseClient.ts` | 16 | Supabase anon client for frontend auth |

### Feature Modules (9, 47 files total)

**admin/** (10 files, ~2,000 LOC):
- `AdminPanel.tsx` — Data loader + outlet provider
- `EnclaveApplications.tsx` — Enclave application management
- `components/DashboardPanel.tsx` — Key metrics dashboard
- `components/UserManagementPanel.tsx` — User list + status management
- `components/ContentModerationPanel.tsx` — Flagged content moderation
- `components/AnalyticsPanel.tsx` — Platform-wide analytics
- `components/ReportsPanel.tsx` — Saved reports
- `components/SupportTicketsPanel.tsx` — Support ticket management
- `components/SettingsPanel.tsx` — Platform settings
- `components/VerificationDetailPanel.tsx` — Creator verification docs review

**auth/** (3 files):
- `AuthModal.tsx` (230 LOC) — Login/signup modal with role selection
- `CreatorOnboarding.tsx` (176 LOC) — Multi-step onboarding flow
- `CreatorVerification.tsx` (109 LOC) — ID upload + verification

**contests/** (3 files):
- `CreateContestModal.tsx` (199 LOC) — Contest creation form
- `CreatorContestList.tsx` (115 LOC) — Creator's contests list
- `FanContestList.tsx` (91 LOC) — Fan's available contests

**creator/** (10 files, ~3,870 LOC — largest feature):
- `CreatorDashboard.tsx` (167 LOC)
- `CreatorContent.tsx` (694 LOC) — Content management with grid + filters
- `CreatorMessages.tsx` (395 LOC) — DMs + voice messages
- `CreatorAnalytics.tsx` (362 LOC) — Metrics, subscriber growth, revenue, top content
- `CreatorEarnings.tsx` (219 LOC) — Earnings summary with transactions
- `CreatorSettings.tsx` (674 LOC) — Profile, tiers, payouts, content settings
- `ReferralCodes.tsx` (228 LOC) — Referral code management
- `WalletSettings.tsx` (376 LOC) — Crypto wallet configuration
- `components/AttachmentModal.tsx` — File attachment UI
- `components/BroadcastModal.tsx` — Subscriber broadcast compose
- `components/BulkUpload/DraftCard.tsx` — Bulk upload draft card
- `components/BulkUpload/DropZone.tsx` — Bulk upload file drop zone
- `pages/BulkUploadPage.tsx` (260 LOC) — Bulk upload page

**enclave/** (6 files):
- `EnclaveApplicationForm.tsx` (385 LOC) — Enclave membership application
- `EnclaveBenefits.tsx`, `EnclaveComparison.tsx`, `EnclaveFAQ.tsx`, `EnclaveHero.tsx`, `EnclaveValueProps.tsx` — Marketing sections

**fan/** (6 files):
- `FanFeed.tsx` (100 LOC) — Personalized content feed
- `FanGallery.tsx` (179 LOC) — Saved content collection
- `FanSubscriptions.tsx` (255 LOC) — Subscription management
- `FanMessages.tsx` (239 LOC) — Direct messages
- `FanSettings.tsx` (287 LOC) — Fan settings + payment methods
- `components/ContentViewerModal.tsx` (246 LOC) — Content viewer modal

**messages/** (1 file + 1 component):
- `components/MessageBubble.tsx` (100 LOC) — Message display component
- *(Messaging logic primarily in CreatorMessages.tsx and FanMessages.tsx)*

**profile/** (3 files):
- `CreatorProfile.tsx` (302 LOC) — Public creator profile page
- `SubscriptionAuthModal.tsx` (133 LOC) — Combined auth + subscribe flow
- `SubscriptionModal.tsx` (202 LOC) — Tier selection + payment modal

**viewer/** (1 file):
- `ContentViewer.tsx` (198 LOC) — Full-size content viewer

### Context (1 file)
| File | Lines | Purpose |
|---|---|---|
| `ToastContext.tsx` | 84 | Global toast notifications + registers with apiClient error handler |

### Styles (1 file)
| File | Purpose |
|---|---|
| `globals.css` | Tailwind directives (`@tailwind base/components/utilities`) + custom styles |

---

## Backend

### Entry Point: `Server.ts` (110 LOC)

- Loads `.env` from `server/` or parent directory
- Creates Express app + HTTP server (for Socket.IO)
- Initializes Socket.IO via `initSocketServer(httpServer)`
- Configures CORS (localhost:5173, podm.app, all `*.pages.dev`)
- Sets 1100MB body limit (JSON + URL-encoded)
- Mounts 15 route groups at `/api/v1/*`
- Health check: `GET /` returns "PoDM API is running!"
- Global error handler middleware
- Listens on `process.env.PORT || 5000`

### Controllers (16 files)

All controllers follow the `asyncHandler` wrapper pattern — no try/catch blocks in controller code. Response helpers (`ok()`, `created()`, `okMsg()`, `createdMsg()`) standardize the JSON envelope.

| Controller | Lines | Exported Functions | Notes |
|---|---|---|---|
| `admin.controller.ts` | 115 | 10 (`getDashboardStats`, `getAllUsers`, `updateUserStatus`, `getFlaggedContent`, `updateContentStatus`, `getPlatformAnalytics`, `generateReport`, `getSupportTickets`, `updateSupportTicket`, `getAdminUsers`, `getSavedReports`, `getSettings`, `updateSettings`, `setCreatorCommission`, `getCreatorVerificationDocs`, `messageUser`) | Largest number of exported functions |
| `analytics.controller.ts` | 18 | 1 (`logAnalytics`) | Minimal |
| `auth.controller.ts` | 60 | 6 (`signup`, `login`, `logout`, `getMe`, `changePassword`, `forgotPassword`, `signupAndSubscribe`) | |
| `content.controller.ts` | 103 | 9 (`createContent`, `getContentById`, `updateContent`, `deleteContent`, `getContentByCreator`, `getMyContent`, `getSecureContentUrl`, `getContentView`, `getContentViewerData`, `reportContent`) | |
| `contest.controller.ts` | 32 | 3 (`createContest`, `publishContest`, `finalizeContest`, `getContestFeed`, `getMyContests`, `enterContest`) | |
| `creator.controller.ts` | 88 | 7 (`getDashboard`, `getAnalytics`, `getEarnings`, `getCreatorActivity`, `updateSettings`, `broadcastToSubscribers`, `requestPayout`, `getTiers`, `exportMetricsCSV`, `exportFanEngagementCSV`) | |
| `cryptoPayment.controller.ts` | 55 | 2 (`configureWallet`, `verifyPayment`, `getTransactionHistory`) | |
| `enclave.controller.ts` | 254 | 6+ (`submitApplication`, `getApplications`, `updateApplication`, etc.) | No dedicated service — uses raw Supabase + direct model imports |
| `message.controller.ts` | 61 | 5 (`sendMessage`, `getConversations`, `getMessages`, `deleteMessage`, `sendVoiceMessage`) | |
| `notification.controller.ts` | 33 | 4 (`getNotifications`, `getUnreadCount`, `markAsRead`, `deleteNotification`) | Direct model import bypass |
| `onramp.controller.ts` | 26 | 2 (`createOnRampSession`, `handleWebhook`) | |
| `referral.controller.ts` | 51 | 5+ (`generateCode`, `validateCode`, `getStats`, `checkMilestone`, `getLeaderboard`) | No dedicated service — direct model imports |
| `subscription.controller.ts` | 36 | 4 (`createSubscription`, `updateSubscription`, `cancelSubscription`, `getMySubscriptions`) | |
| `support.controller.ts` | 32 | 3 (`createTicket`, `getMyTickets`, `addReply`) | |
| `user.controller.ts` | 101 | 7 (`getMe`, `updateMe`, `updateMyAvatar`, `addToGallery`, `removeFromGallery`, `getPublicProfile`, `completeOnboarding`, `submitVerification`, `getMyFeed`, `getMySettings`, `updateMySettings`) | Exports `getSecureContentUrl` but no route maps to it |

### Services (17 files)

True business logic layer. Not all controllers have a corresponding service (enclave and referral bypass the service layer).

| Service | Lines | Key Functions | Ext Dependencies |
|---|---|---|---|
| `admin.service.ts` | 343 | Dashboard stats, user management, platform analytics, reports, support tickets, settings | 7 models + StorageService + EmailService |
| `ai.service.ts` | 62 | `generateCaption` — calls OpenAI/OpenRouter vision model | OpenAI SDK |
| `analytics.service.ts` | 64 | `logAnalyticsEvent` — logs to `analytics_events` table | Supabase |
| `auth.service.ts` | 257 | `signupUser`, `loginUser`, `changeUserPassword`, `requestPasswordReset`, `signupAndSubscribe` | Supabase auth (anon + admin), UserModel, SubscriptionService, ReferralModel |
| `content.service.ts` | 646 | Content CRUD, watermarking (sharp), thumbnail generation (ffmpeg), access control, upload | ContentModel, StorageService, NotificationService, sharp, ffmpeg |
| `contest.service.ts` | 64 | Contest CRUD, entry handling, weighted random winner selection | ContestModel, SubscriptionModel |
| `creator.service.ts` | 593 | Dashboard/analytics/earnings aggregation, settings update, broadcast, payout | AnalyticsService, CryptoPaymentService, StorageService, 5 models |
| `cryptoPayment.service.ts` | 227 | `verifyAndRecordBasePayment` (11-step flow), wallet config, fee calculation, network config | ethers, axios (BaseScan/Coinbase), Stripe |
| `email.service.ts` | 55 | `sendEmail` — SMTP via nodemailer | Nodemailer |
| `message.service.ts` | 354 | Message CRUD, conversation management, voice messages, Socket.IO broadcast | ConversationModel, MessageModel |
| `notification.service.ts` | 94 | Create/query notifications | NotificationModel |
| `onramp.service.ts` | 146 | Coinbase On-Ramp session creation, webhook handling | Coinbase API |
| `payout.service.ts` | 103 | Payout request creation, approval flow | TransactionModel, profiles |
| `storage.service.ts` | 181 | R2 upload (private/public), signed URLs, download, delete, exists check | AWS SDK S3 |
| `subscription.service.ts` | 177 | Subscription CRUD, blockchain tx verification, welcome DM, tier validation | 5 models + MessageService + CryptoPaymentService |
| `support.service.ts` | 147 | Ticket CRUD, admin reply, DM sync | Dynamic `require()` of message.service |
| `user.service.ts` | 396 | Profile CRUD, avatar upload, gallery, feed, settings, creator onboarding/verification | StorageService, 5 models |

**Service Gap** (no service layer):
| Controller | Bypasses Service Via |
|---|---|
| `enclave.controller.ts` | Raw Supabase queries + direct model imports (EmailService, SupportTicketModel, ReferralModel) |
| `referral.controller.ts` | Direct ReferralModel imports |

### Models (13 files)

All models use the `handleQuery<T>`, `handleCount`, `handleList<T>` database wrappers from `utils/database.ts`. Models define the database interface layer, not the database schema itself (schema is in Supabase).

| Model | Lines | Table(s) | Key Functions |
|---|---|---|---|
| `user.model.ts` | 132 | `profiles` | `findUserById` (via RPC `get_user_details`), `findUserByUsername`, `findUserByEmail`, `findUsersByIds`, `createProfile`, `updateProfile`, `countAllUsers`, `findAll` (via RPC `get_all_users_details`), `getNewUsersOverTime` (via `auth.admin.listUsers`) |
| `content.model.ts` | 190 | `content` | CRUD, list by creator, search/filter, content stats, bulk operations |
| `subscription.model.ts` | 84 | `subscriptions` | CRUD, find by fan/creator |
| `transaction.model.ts` | 211 | `transactions` | CRUD, earning aggregation, payout queries, analytics |
| `message.model.ts` | 66 | `messages` | CRUD, conversation messages |
| `conversation.model.ts` | 32 | `conversations` | CRUD, participant queries |
| `notification.model.ts` | 52 | `notifications` | CRUD, unread count |
| `contest.model.ts` | 171 | `contests` | CRUD, entries, winner selection |
| `referral.model.ts` | 209 | `enclave_applications`, `referrals` | Code generation, validation, bonus awarding, milestone checking, leaderboard |
| `supportTicket.model.ts` | 45 | `support_tickets` | CRUD, admin assignment |
| `report.model.ts` | 45 | `reports` | CRUD, status management |
| `gallery.model.ts` | 42 | `gallery` | CRUD, fan gallery |
| `settings.model.ts` | 14 | `settings` | Get/update platform settings |

### Routes (16 files)

All routes mount under `/api/v1/{resource}` in `Server.ts:100-115`.

| Routes File | Lines | Prefix | Endpoints | Auth Pattern |
|---|---|---|---|---|
| `auth.routes.ts` | 50 | `/api/v1/auth` | 7 endpoints (POST signup, login, logout, forgot-password, signup-and-subscribe; GET me; PUT change-password) | Public except `me` and `change-password` (protect) |
| `user.routes.ts` | 93 | `/api/v1/users` | 11+ endpoints | Mixed (protect, optionalProtect) |
| `creator.routes.ts` | 71 | `/api/v1/creator` | 10+ endpoints | protectAndCreator |
| `content.routes.ts` | 70 | `/api/v1/content` | 10 endpoints | Mixed (protectAndCreator, protect, optionalProtect) |
| `subscription.routes.ts` | 30 | `/api/v1/subscriptions` | 4 endpoints | protect |
| `message.routes.ts` | 49 | `/api/v1/messages` | 5+ endpoints | protect |
| `cryptoPayment.routes.ts` | 34 | `/api/v1/payments/crypto` | 3+ endpoints | protect |
| `admin.routes.ts` | 106 | `/api/v1/admin` | 15 endpoints | protectAndAdmin |
| `analytics.routes.ts` | 7 | `/api/v1/analytics` | 1 endpoint | protect (skipAuthRedirect) |
| `support.routes.ts` | 14 | `/api/v1/support` | 3+ endpoints | protect |
| `ai.routes.ts` | 9 | `/api/v1/ai` | 1 endpoint | protectAndCreator |
| `notification.routes.ts` | 17 | `/api/v1/notifications` | 4 endpoints | protect |
| `contest.routes.ts` | 14 | `/api/v1/contests` | 6+ endpoints | protect |
| `enclave.routes.ts` | 11 | `/api/v1/enclave` | 2+ endpoints | Public (submit) + protect |
| `referral.routes.ts` | 13 | `/api/v1/referrals` | 4+ endpoints | Mixed — 2 unprotected (`/check-milestone/:userId`, `/validate/:code`) |
| `onramp.routes.ts` | 17 | `/api/v1/payments/onramp` | 2+ endpoints | protect |

**Total endpoints**: ~90+ across 15 route groups

### Middleware (4 files)

| Middleware | Lines | Purpose |
|---|---|---|
| `auth.middleware.ts` | 141 | `protect` (JWT verify + user fetch + impersonation), `optionalProtect`, `creatorOnly`, `adminOnly`, `requireRole`, `protectAndCreator`, `protectAndAdmin`. Debug logging via `fs.appendFileSync` to `debug.log`. |
| `error.middleware.ts` | 64 | `AppError` class + `errorHandler` — catches errors, normalizes status codes, standardized JSON response. |
| `upload.middleware.ts` | 109 | Multer memoryStorage (1GB limit for content, 10MB for voice). Export: `uploadContent`, `uploadAvatar`, `uploadVerificationDocs`, `uploadBanner`, `uploadVoiceMessage`, `uploadAICaptionImage`. |
| `validation.middleware.ts` | 70 | `express-validator` chains: `validateSignup`, `validateContent`, `validateTip`. |

### Utilities (12 files)

| Utility | Lines | Purpose |
|---|---|---|
| `apiError.ts` | 19 | `AppError` class (duplicate of `error.middleware.ts:AppError` — different implementation!) |
| `asyncHandler.ts` | 8 | Wraps async route handlers — catches errors and passes to `next()` |
| `content.utils.ts` | 237 | `generateSignedUrlsForContent`, `enrichContentWithUnlockStatus` — signed URL generation, access control, watermarking orchestration |
| `database.ts` | 129 | `handleQuery`, `handleCount`, `handleList`, `createRecord`, `updateRecord`, `deleteRecord`, `findRecordById`, `countRecords` — Supabase query wrappers |
| `entityGuards.ts` | 26 | `requireUser`, `requireContent`, `requireContentOwnership` — throw `AppError` if not found/not owned |
| `fee.utils.ts` | 28 | `getCommissionRateForCreator`, `calculatePlatformFee` |
| `formatters.ts` | 104 | `formatCurrency`, `slugify`, `formatDate`, `timeAgo`, `truncateText` (server-side formatting) |
| `requestHelpers.ts` | 26 | `requireAuth`, `requireId`, `requireBody` — guard helpers for controllers |
| `response.ts` | 21 | `ok()`, `created()`, `okMsg()`, `createdMsg()` — standardized response helpers |
| `subscription.utils.ts` | 38 | `reshapeSubscriptionForApp` — enriches subscription with creator + tier data |
| `tier.utils.ts` | 36 | `syncTiers` — assigns permanent UUIDs to subscription tiers |
| `user.utils.ts` | 78 | `reshapeUserForApp` — transforms flat DB RPC result to nested `User`/`Creator` object |

### Jobs (1 file)

| File | Lines | Purpose |
|---|---|---|
| `jobs/renewSubscriptions.ts` | 84 | Batch subscription renewal logic — queries active subscriptions approaching `next_billing_date`, processes renewals. Not scheduled — must be triggered externally. |

### Config (3 files)

| File | Lines | Purpose |
|---|---|---|
| `config/supabaseClient.ts` | 20 | Supabase admin client (service-role key), `autoRefreshToken: false`, `persistSession: false` |
| `config/r2Client.ts` | 36 | Cloudflare R2 S3 client, bucket names (private + public), public URL base |
| `config/socket.ts` | 76 | Socket.IO server init, CORS, auth middleware (Supabase JWT), room management (`join_conversation`/`leave_conversation`) |

---

## Database

### Schema

Managed via Supabase PostgreSQL. 12+ tables defined across 17 SQL migration files.

#### Migration Files

**Root migrations** (`PoDM_project/migrations/`, 11 files):

| File | Lines | Purpose |
|---|---|---|
| `add_crypto_fields.sql` | 25 | Adds `crypto_wallet_address`, `crypto_wallet_type`, `crypto_wallet_payout_preference` to `profiles`; `blockchain_tx_hash`, `payment_method`, `payment_currency`, `chain_id` to `transactions` |
| `add_enclave_membership_to_profiles.sql` | 10 | Adds `is_enclave_member`, `enclave_joined_at` to `profiles` |
| `add_rls_application_referral_tables.sql` | 71 | Row-level security policies for application/referral tables |
| `add_speed_bonus_tracking.sql` | 11 | Speed bonus tracking columns |
| `create_enclave_applications.sql` | 28 | `enclave_applications` table |
| `create_referrals_table.sql` | 53 | `referrals` table (code, referrer, bonus, milestones, leaderboard) |
| `fix_function_search_paths.sql` | 12 | Fix search paths for DB functions |
| `rename_payment_gateway_id.sql` | 1 | Rename column |
| `rename_stripe_subscription_id.sql` | 1 | Rename column |
| `update_crypto_constraints.sql` | 16 | Update crypto column constraints |
| `update_enclave_platforms_to_array.sql` | 20 | Change enclave platforms from single to array |

**Script-level migrations** (`PoDM_project/server/scripts/migrations/`, 6 files):

| File | Lines | Purpose |
|---|---|---|
| `create_contests_table.sql` | 48 | `contests` + `contest_entries` tables |
| `create_reports_table.sql` | 13 | `reports` table |
| `create_saved_reports_table.sql` | 12 | `saved_reports` table (admin) |
| `add_min_tier_level.sql` | 8 | Add `min_tier_level` to content |
| `update_contests_schema.sql` | 6 | Contest schema updates |
| `enable_rls_security_fixes.sql` | 63 | RLS policy fixes + security |

#### Tables (identified from schema files + model usage)

| Table | Purpose | Key Columns |
|---|---|---|
| `profiles` | User accounts (extends Supabase auth.users) | `id`, `username`, `email`, `role` (fan/creator/admin), `status`, `creator_data` (JSONB), `verification_data` (JSONB), `onboarding_complete`, `commission_rate`, `crypto_wallet_address`, `crypto_wallet_type`, `is_enclave_member`, `enclave_joined_at` |
| `content` | Creator posts | `id`, `creator_id`, `title`, `type`, `files` (JSONB), `visibility`, `price`, `min_tier_level`, `tags`, `stats` (JSONB), `schedule` (JSONB), `status` |
| `subscriptions` | Fan-to-creator subscriptions | `id`, `fan_id`, `creator_id`, `tier_id`, `status`, `price`, `billing_cycle`, `blockchain_tx_hash`, `fan_wallet_address`, `start_date`, `end_date`, `next_billing_date` |
| `transactions` | Financial events | `id`, `fan_id`, `creator_id`, `type`, `amount`, `platform_fee`, `creator_payout`, `status`, `blockchain_tx_hash`, `payment_method`, `payment_currency`, `chain_id`, `related_content_id` |
| `messages` | Direct messages | `id`, `conversation_id`, `sender_id`, `receiver_id`, `text`, `content` (JSONB, for PPV), `voice_message_url`, `is_read` |
| `conversations` | Message conversations | `id`, `participants` (array), `last_message` (JSONB) |
| `notifications` | User notifications | `id`, `user_id`, `type`, `title`, `message`, `related_content_id`, `is_read` — (model exists, DDL not found in migrations) |
| `contests` | Creator contests | `id`, `creator_id`, `title`, `description`, `start_date`, `end_date`, `entry_requirements`, `prize_description`, `status`, `winner_id` |
| `contest_entries` | Contest entries | (Referenced in contest.model.ts, no separate DDL file found) |
| `reports` | Content reports | `id`, `reporter_id`, `content_id`, `reason`, `status` |
| `saved_reports` | Admin saved reports | (Referenced in admin flow) |
| `support_tickets` | Customer support | `id`, `user_id`, `subject`, `status`, `priority`, `assigned_admin_id`, `conversation` (JSONB array) |
| `gallery` | Fan saved content | `id`, `fan_id`, `content` (JSONB array) |
| `enclave_applications` | Enclave membership | `id`, `full_name`, `email`, `status`, `referral_code`, `platforms` (array) |
| `referrals` | Referral tracking | `id`, `code`, `referrer_id`, `bonus_awarded`, `milestones` |
| `settings` | Platform settings | (Single-row table for commission rate, etc.) |
| `analytics_events` | Analytics log | `id`, `event_type`, `creator_id`, `viewer_id`, `content_id`, `created_at` |

#### DB Functions (referenced in code)

- `get_user_details(user_id)` — RPC returning shaped user object
- `get_all_users_details()` — RPC returning all users
- Various Supabase built-in auth functions

## AI Components

### AI Integration Inventory

| Component | File | Type | Lines | Purpose |
|---|---|---|---|---|
| AI Service | `server/services/ai.service.ts` | Service | 62 | Image caption generation |
| AI Route | `server/routes/ai.routes.ts` | Route | 9 | `POST /api/v1/ai/caption` |
| AI Controller | `server/controllers/ai.controller.ts` | Controller | 23 | Request handler |
| AI Upload | `middleware/upload.middleware.ts` | Middleware | (embedded) | `uploadAICaptionImage` — single image upload |
| AI Frontend | `src/lib/apiClient.ts` | API Client | (embedded) | `generateCaption()` — sends image, returns caption |

### AI Architecture

- **Provider**: OpenAI SDK v6 (compatible with OpenRouter)
- **Model**: `google/gemma-3-27b-it:free` (configurable via `AI_MODEL_ID` env var)
- **API Key**: `AI_API_KEY` — supports OpenAI keys and OpenRouter keys (auto-detected via `sk-or-v1` prefix)
- **Protocol**: OpenAI-compatible chat completions API
- **Input**: Single image (uploaded via FormData or URL)
- **Output**: Single caption string (≤20 words, 1-2 emojis, hashtags)
- **Rate**: No rate limiting, no caching, no retry logic

### Missing AI Capabilities
- ❌ No AI agents or multi-step reasoning
- ❌ No tool calling or function calling
- ❌ No vector search, embeddings, or RAG
- ❌ No memory/persistence of AI interactions
- ❌ No prompt management system (prompt hardcoded in ai.service.ts:39)
- ❌ No content moderation / NSFW filtering
- ❌ No AI-powered recommendations or personalization

---

## Integrations (External Services)

| Service | Module | SDK/Library | Purpose | Config |
|---|---|---|---|---|
| **Supabase** | Backend + Frontend | `@supabase/supabase-js` v2.86.0 | Database + Auth (PostgreSQL) | Service-role key (admin backend), Anon key (frontend) |
| **Stripe** | Backend | Stripe SDK v18 | PaymentIntents, Connect, subscriptions, payouts (SetupIntents ABORTED — removed) | Inline `new Stripe()` in 4+ files (no shared config) |
| **Cloudflare R2** | Backend | `@aws-sdk/client-s3` v3.953.0 | File storage (private + public buckets) | Account ID + Access Key + Secret Key |
| **OpenAI / OpenRouter** | Backend | `openai` v6.16.0 | AI image caption generation | API key (auto-detects OpenRouter prefix) |
| **Socket.IO** | Backend + Frontend | `socket.io` v4.8.1 + `socket.io-client` v4.8.1 | Real-time messaging | Backend: server init with CORS; Frontend: auto-connect with auth |
| **Nodemailer** | Backend | `nodemailer` v7.0.12 | Email sending (password reset, admin messages) | SMTP host/port/user/pass |
| **Ethereum (Base Blockchain)** | Backend | `ethers` v6.17.0 | On-chain transaction verification | RPC URLs, contract addresses, chain IDs (8453 mainnet / 84532 testnet) |
| **Coinbase On-Ramp** | Backend | HTTP API (axios) | Card-to-USDC purchase sessions | API key (shared with Stripe key env var) |
| **Render** | Deployment | — | Backend production hosting | `https://podm.onrender.com` |
| **Netlify** | Deployment | — | Frontend production hosting + SPA redirect | `netlify.toml` |
| **Cloudflare Pages** | Deployment | — | Frontend preview deployments | CORS allows all `*.pages.dev` |

---

## Authentication Mechanisms

Six distinct mechanisms, stacked throughout the request lifecycle:

### 1. Supabase JWT (Primary Auth)

- **Trigger**: `POST /api/v1/auth/signup` or `login`
- **Flow**: Frontend sends email/password → `authSupabase.auth.signUp()` / `signInWithPassword()` → returns `access_token` (JWT) → stored in `localStorage`/`sessionStorage`
- **Verification**: `middleware/auth.middleware.ts:protect` — `supabase.auth.getUser(token)` (2 API calls: JWT verify + profile fetch)
- **Scope**: All protected endpoints

### 2. Role Guards (Authorization)

| Guard | File | Check |
|---|---|---|
| `creatorOnly` | `auth.middleware.ts:117` | `req.user.role === 'creator'` (+ admin-impersonating-creator) |
| `adminOnly` | `auth.middleware.ts:139` | `req.user.role === 'admin'` |
| `requireRole(...roles)` | `auth.middleware.ts:151` | Factory: `req.user.role in roles` |
| `protectAndCreator` | `auth.middleware.ts:160` | `[protect, creatorOnly]` |
| `protectAndAdmin` | `auth.middleware.ts:161` | `[protect, adminOnly]` |

### 3. Optional Protect (Conditional Auth)

- **File**: `auth.middleware.ts:30`
- **Behavior**: If `Authorization` header exists → runs full `protect`; otherwise → continues without user
- **Used by**: Public routes that vary content for logged-in users (`content/creator/:username`, `users/profile/:username`)

### 4. Admin Impersonation

- **Trigger**: `X-Impersonating-User-Id` header on admin requests
- **File**: `auth.middleware.ts:80-96` (integrated into `protect`)
- **Behavior**: Admin requests with header → `findUserById(impersonatingUserId)` → stores original admin in `req.originalUser` → sets `req.user` to target user
- **Frontend**: `apiClient.ts` interceptor reads `impersonating_user_id` from localStorage/sessionStorage and attaches header
- **Audit**: No audit trail of impersonation actions

### 5. Socket.IO Auth (Real-Time)

- **File**: `config/socket.ts:44-67`
- **Flow**: Client passes `{ token }` in `handshake.auth` → `supabase.auth.getUser(token)` → attaches `userId` to socket data
- **Scope**: All WebSocket connections

### 6. Stripe Connect (Payment Identity)

- **File**: Inline in subscription/tip/payout services
- **Pattern**: Stripe account linking for creator payouts (Stripe Connect)
- **Scope**: Payout flows

**Authentication Gap**:
- No MFA / social login / OAuth providers
- No token refresh mechanism (401 interceptor clears auth and redirects to splash)
- `auth.middleware.ts` writes 5-10 `fs.appendFileSync` calls per request for debugging

---

## Configuration Files

### Backend Configuration

| File | Purpose | Key Settings |
|---|---|---|
| `PoDM_project/tsconfig.json` | TypeScript config | target ES2020, module nodenext, strict, paths (`@common/*`) |
| `PoDM_project/package.json` | NPM config | CommonJS, scripts (dev, build, start, seed, test) |
| `PoDM_project/jest.config.js` | Jest config | ts-jest transformation |
| `PoDM_project/babel.config.js` | Babel config | presets for TS + React + env |
| `PoDM_project/jest.setup.js` | Jest setup | Global test setup |
| `PoDM_project/.dockerignore` | Docker ignore | Node modules, dist |
| `PoDM_project/Dockerfile` | Docker build | Multi-stage (node:20-alpine) |
| `PoDM_project/contracts/hardhat.config.ts` | Hardhat config | Solidity 0.8.20, Base Sepolia + Mainnet |
| `PoDM_project/contracts/package.json` | Contracts NPM | Hardhat + OpenZeppelin deps |
| `PoDM_project/contracts/tsconfig.json` | Contracts TS config | Hardhat-recommended |

### Frontend Configuration

| File | Purpose | Key Settings |
|---|---|---|
| `podm-frontend/tsconfig.json` | TypeScript config | strict, jsx react-jsx, bundler module resolution, paths (`@common/*`) |
| `podm-frontend/tsconfig.jest.json` | Jest-specific TS config | |
| `podm-frontend/package.json` | NPM config | ESM, scripts (dev, build, lint, test) |
| `podm-frontend/vite.config.ts` | Vite config | React plugin, `@common` alias, API proxy to localhost:5000 |
| `podm-frontend/tailwind.config.js` | Tailwind config | Custom colors (primary purple, secondary pink), Inter font |
| `podm-frontend/postcss.config.js` | PostCSS config | Tailwind + autoprefixer |
| `podm-frontend/eslint.config.js` | ESLint config | TypeScript-aware, React + Hooks + Refresh plugins |
| `podm-frontend/babel.config.cjs` | Babel config | TS + React + env presets |
| `podm-frontend/jest.config.ts` | Jest config | ts-jest, jsdom environment |
| `podm-frontend/setupTests.ts` | Jest setup | |
| `podm-frontend/playwright.config.ts` | Playwright config | |
| `podm-frontend/Dockerfile` | Docker build | Node 18-alpine, runs `vite dev --host` (dev mode only) |
| `podm-frontend/.gitignore` | Git ignore | |

### Infrastructure Configuration

| File | Purpose | Key Settings |
|---|---|---|
| `.github/workflows/ci.yml` | CI/CD pipeline | 2 parallel jobs: backend-test (Jest), frontend-lint-build (ESLint + Vite) |
| `docker-compose.yml` | Local orchestration | Backend on 5000, Frontend on 5173 |
| `netlify.toml` | Netlify deploy | Build from podm-frontend, publish dist/, SPA redirects |
| `.idx/dev.nix` | Google IDX workspace | |

### Environment Files

| File | Variables Count | Key Variables |
|---|---|---|
| `PoDM_project/.env` | ~20+ | R2 keys, Supabase keys, AI_API_KEY, crypto RPC URLs, contract addresses, Stripe key, SMTP config, CLIENT_URL, DISCORD_ENCLAVE_INVITE_URL |
| `podm-frontend/.env` | 5 | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (!!), JWT_SECRET (!!), VITE_APP_BASE_URL |

**Security note**: Frontend `.env` file contains `SUPABASE_SERVICE_ROLE_KEY` and `JWT_SECRET` — these are backend secrets exposed in the client-accessible environment.

---

## Infrastructure

### Deployment Architecture

```
Internet
    ├── podm.app (Netlify — Frontend SPA)
    │       └── Reverse proxy: /api/* → podm.onrender.com
    │
    ├── podm.onrender.com (Render — Backend API)
    │       ├── Supabase PostgreSQL (Database)
    │       ├── Cloudflare R2 (File Storage)
    │       └── External: Stripe, OpenAI, Ethereum RPC, Coinbase, SMTP
    │
    └── *.pages.dev (Cloudflare Pages — Preview Deployments)
```

### CI/CD Pipeline (`.github/workflows/ci.yml`)

- **Trigger**: Push or PR to `main`/`master`
- **Jobs**:
  1. `backend-build-and-test`: Node 18, `npm ci`, `npm test` (Jest)
  2. `frontend-build-and-lint`: Node 18, `npm ci`, `npm run lint`, `npm run build` (Vite)
- **Not in CI**: Playwright E2E tests, contract tests, integration tests

### Docker

- **Compose** (`docker-compose.yml`): Backend + Frontend services
- **Backend Dockerfile**: Multi-stage build (node:20-alpine) — runs compiled JS
- **Frontend Dockerfile**: Dev-mode only — runs `vite dev --host`

### Monitoring & Observability

- **Status**: None. No structured logging, no APM, no error tracking (Sentry/Datadog), no health check endpoint, no metrics.
- **Current logging**: `console.log`/`console.error` scattered across 100+ call sites. Auth middleware uses synchronous `fs.appendFileSync` to `debug.log` (27,411+ lines).
- **No request logging middleware** (morgan/pino-http)

### Deployment Files

| File | Purpose |
|---|---|
| `.github/workflows/ci.yml` | CI pipeline |
| `docker-compose.yml` | Local Docker orchestration |
| `PoDM_project/Dockerfile` | Backend production Docker image |
| `podm-frontend/Dockerfile` | Frontend dev-mode Docker image |
| `netlify.toml` | Netlify frontend deployment config |
| `.idx/dev.nix` | Google IDX workspace |

---

## Key Metrics Summary

| Metric | Value |
|---|---|
| Backend TypeScript files | 98 |
| Frontend TS/TSX files | 103 |
| Shared types | 12 |
| SQL migration files | 17 |
| Solidity contracts | 2 |
| Configuration files | 20+ |
| Controllers | 16 |
| Services | 17 |
| Models | 13 |
| Routes | 16 |
| Middleware | 4 |
| Utilities | 12 (backend) |
| Frontend components | 28 (shared + ui + layout + auth) |
| Feature files | 47 |
| Hooks | 9 |
| API functions | ~70 |
| Routes defined | 34 |
| API endpoints | ~90+ |
| Test files | 9 (3 backend + 1 frontend unit + 5 E2E) |
| E2E test specs | 5 (login, fan, creator, admin, tip) |
| Migration SQL | 17 files |
| External integrations | 8 |
| Auth mechanisms | 6 |
| Dockerfiles | 2 |

---

## Dependencies

### Backend Runtime (22)
`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `@supabase/supabase-js`, `axios`, `body-parser`, `cors`, `dotenv`, `ethers`, `express`, `express-validator`, `fluent-ffmpeg`, `jsonwebtoken`, `lodash`, `lucide-react`, `ms`, `multer`, `nodemailer`, `openai`, `path-to-regexp`, `react-router-dom`, `recharts`, `sharp`, `socket.io`, `tailwind`, `uuid`

### Frontend Runtime (18)
`@supabase/supabase-js`, `axios`, `lucide-react`, `qrcode.react`, `react`, `react-dom`, `react-dropzone`, `react-router-dom`, `recharts`, `socket.io-client`, `uuid`

### Contracts Development (5)
`@nomicfoundation/hardhat-toolbox`, `@openzeppelin/contracts`, `dotenv`, `hardhat`, `typescript`

---

## Related Documents

- `docs/architecture/00-session-notes.md` — Running session log
- `docs/architecture/02-dependency-map.md` — Inter-module dependency graph
- `docs/architecture/03-architecture-kb.md` — Full architecture knowledge base
- `docs/architecture/04-business-capabilities.md` — Business capability mapping
- `docs/architecture/05-user-journeys.md` — End-to-end user journeys
- `docs/architecture/06-frontend-architecture.md` — Frontend architecture deep-dive
- `docs/architecture/07-cross-cutting-concerns.md` — Cross-cutting analysis

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-07-19 | AI Architect | Complete repository inventory covering all modules, files, and configurations |
