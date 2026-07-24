# Phase 3: Frontend Architecture Analysis

**Created:** 2026-07-02
**Phase:** 3 (Frontend Deep Analysis)
**Deliverable:** Component tree, routing, state management, feature modules, hooks, API integration, build config
**Covers:** `podm-frontend/` — 28 components, 9 feature modules, 6 pages, 6 lib files, 9 hooks, 1 context, 2,399+10,172+967+1,132+98+10 ≈ **14,778 source lines** across ~80 files

---

## Table of Contents

1. [Directory Structure & Layout](#1-directory-structure--layout)
2. [Routing Architecture](#2-routing-architecture)
3. [Component Hierarchy](#3-component-hierarchy)
4. [Feature Modules](#4-feature-modules)
5. [Hooks Layer](#5-hooks-layer)
6. [API Integration Layer](#6-api-integration-layer)
7. [State Management](#7-state-management)
8. [Build & Tooling Configuration](#8-build--tooling-configuration)
9. [Testing Strategy](#9-testing-strategy)
10. [Cross-Cutting Concerns & Architectural Smells](#10-cross-cutting-concerns--architectural-smells)
11. [Common Type System](#11-common-type-system)

---

## 1. Directory Structure & Layout

```
podm-frontend/src/
├── main.tsx                          # React 18 entry (StrictMode + App mount)
├── App.tsx                           # Root: Providers → Router → Route tree (367 LOC)
├── App.test.tsx                      # Jest smoke test
├── vite-env.d.ts                     # Vite client types
│
├── components/                       # Reusable UI (28 files, 2,399 LOC)
│   ├── ui/                           # Primitives (5 files, 403 LOC)
│   │   ├── Button.tsx                # Variants/sizes/loading/ref-forwarding
│   │   ├── Input.tsx                 # Labeled input + icon + error
│   │   ├── Card.tsx                  # Glassmorphism container
│   │   ├── Modal.tsx                 # Escape+backdrop-close, aria-modal
│   │   └── AudioPlayer.tsx           # Custom audio with seek bar
│   ├── layout/                       # Shell components (5 files, 350 LOC)
│   │   ├── MainLayout.tsx            # Authenticated app shell (sidebar+header)
│   │   ├── Header.tsx                # Top nav: logo, notifications, profile
│   │   ├── Footer.tsx                # Links (Terms/Privacy/Support/Admin)
│   │   ├── Container.tsx             # Centered responsive wrapper
│   │   └── AuthLayout.tsx            # Centered auth form shell
│   ├── shared/                       # Domain composites (15 files, 1,499 LOC)
│   │   ├── ContentLockManager.tsx    # Lock state engine (centralized) [210 LOC]
│   │   ├── ContentCard.tsx           # Feed/gallery card with lock+tip+save
│   │   ├── ContentLockOverlay.tsx    # Blur/lock overlay UI
│   │   ├── TipModal.tsx              # Stripe tip payment (2-step)
│   │   ├── UnlockModal.tsx           # PPV unlock (2-step Stripe)
│   │   ├── ReportModal.tsx           # Content/user reporting
│   │   ├── ConfirmModal.tsx          # Generic confirmation dialog
│   │   ├── ConversationListItem.tsx  # Unified message list item
│   │   ├── TierCard.tsx              # Subscription tier selector
│   │   ├── SettingsCard.tsx          # Settings section card
│   │   ├── StatCard.tsx              # Dashboard metric card
│   │   ├── StatusBadge.tsx           # Colored status pill
│   │   ├── ToggleSwitch.tsx          # Settings toggle
│   │   ├── VerificationBanner.tsx    # Creator status alert
│   │   └── ImpersonationBanner.tsx   # Admin impersonation notice
│   └── auth/                         # Route guards (3 files, 147 LOC)
│       ├── withAuthGuard.tsx         # HOC factory: roles, onboarding, verification
│       ├── ProtectedRoute.tsx        # Admin route guard (simple)
│       └── CreatorRouteGuard.tsx     # Creator guard (pre-configured HOC)
│
├── features/                         # Feature modules (47 files, 10,172 LOC)
│   ├── admin/                        # Admin panel (10 files, 2,284 LOC)
│   ├── auth/                         # Auth modal + onboarding (3 files, 515 LOC)
│   ├── contests/                     # Creator/fan contests (3 files, 405 LOC)
│   ├── creator/                      # Creator dashboard (14 files, 3,870 LOC)
│   ├── enclave/                      # Enclave landing (6 files, 833 LOC)
│   ├── fan/                          # Fan experience (6 files, 1,304 LOC)
│   ├── messages/                     # Shared message bubble (1 file, 100 LOC)
│   ├── profile/                      # Creator profile page (3 files, 663 LOC)
│   └── viewer/                       # Content viewer (1 file, 198 LOC)
│
├── pages/                            # Top-level page components (6 files, 967 LOC)
│   ├── SplashPage.tsx                # Marketing landing (370 LOC)
│   ├── AdminLoginPage.tsx            # Admin auth (163 LOC)
│   ├── Enclave.tsx                   # Enclave landing page (63 LOC)
│   ├── ResetPasswordPage.tsx         # Supabase password reset (118 LOC)
│   ├── TermsOfService.tsx            # Static legal (111 LOC)
│   └── PrivacyPolicy.tsx             # Static legal (142 LOC)
│
├── hooks/                            # Custom React hooks (5 files, 443 LOC)
│   ├── useAuth.tsx                   # Auth context + provider (234 LOC)
│   ├── useCreatorData.ts             # Dashboard data fetcher (46 LOC)
│   ├── useModal.ts                   # Open/close boolean (29 LOC)
│   ├── useOnClickOutside.ts          # Click detection (35 LOC)
│   └── useVoiceRecorder.ts           # MediaRecorder API (99 LOC)
│
├── shared/hooks/                     # Cross-feature hooks (4 files, 397 LOC)
│   ├── useAsyncData.ts              # Data fetching boilerplate eliminator (73 LOC)
│   ├── useStripePayment.ts          # Centralized Stripe payment flow (155 LOC)
│   ├── useFormSubmission.ts         # Form submit loading/error wrapper (71 LOC)
│   └── useCryptoWallet.ts           # Wallet connect + crypto verify (98 LOC)
│
├── lib/                              # Infrastructure layer (6 files, 1,132 LOC)
│   ├── apiClient.ts                  # Axios wrapper: ~70 API functions (800 LOC)
│   ├── socket.ts                     # Socket.IO client config (17 LOC)
│   ├── supabaseClient.ts            # Supabase auth client (21 LOC)
│   ├── constants.ts                  # Nav items, commission rate, Stripe style (81 LOC)
│   ├── formatters.ts                 # Currency, date, slug utilities (132 LOC)
│   └── statusBadgeMap.ts            # Status→color mapping (81 LOC)
│
├── context/                          # React context (1 file, 98 LOC)
│   └── ToastContext.tsx              # Global toast + error handler registration
│
└── styles/                           # Global CSS (1 file, 33 LOC)
    └── globals.css                   # Tailwind directives + body base
```

### Total Sizing

| Layer | Files | LOC |
|---|---|---|
| Components (ui/layout/shared/auth) | 28 | 2,399 |
| Features | 47 | 10,172 |
| Pages | 6 | 967 |
| Hooks (incl. shared) | 9 | 840 |
| Lib | 6 | 1,132 |
| Context | 1 | 98 |
| Entry + styles + config | 5 | 456 |
| **Total (src, excl. tests)** | **102** | **~16,064** |

---

## 2. Routing Architecture

### 2.1 Route Tree

All routes are defined in `src/App.tsx:296-358` as a flat `Routes` block inside `BrowserRouter`.

```
<Routes>
  ──── PUBLIC ────
  /                         → SplashPage
  /enclave                  → Enclave
  /terms-of-service         → TermsOfService
  /privacy-policy           → PrivacyPolicy
  /creator/:username        → CreatorProfileLoader (data fetcher → CreatorProfile)
  /content/:contentId       → ContentViewerLoader (data fetcher → ContentViewerPage)

  ──── AUTH ────
  /reset-password           → ResetPasswordPage
  /onboarding               → CreatorOnboarding
  /verification             → CreatorVerification
  /admin/login              → AdminLoginPage

  ──── FAN (unprotected layout) ────
  /fan → FanLayout [MainLayout + FAN_NAV_ITEMS]
    /fan/                   → FanFeed
    /fan/feed               → FanFeed
    /fan/gallery            → FanGalleryLoader → FanGallery
    /fan/subscriptions      → FanSubscriptions
    /fan/messages           → FanMessages
    /fan/settings           → FanSettingsLoader → FanSettings

  ──── CREATOR (guarded: creator role + onboarding + verification, admin bypass) ────
  /hub → CreatorLayout [MainLayout + CREATOR_NAV_ITEMS]
    /hub/                   → CreatorDashboardLoader → CreatorDashboard
    /hub/dashboard          → CreatorDashboardLoader → CreatorDashboard
    /hub/content            → CreatorContent
    /hub/messages           → CreatorMessages
    /hub/analytics          → CreatorAnalyticsLoader → CreatorAnalytics
    /hub/earnings           → CreatorEarningsLoader → CreatorEarnings
    /hub/settings           → CreatorSettingsLoader → CreatorSettings
    /hub/bulk-upload        → BulkUploadPage

  ──── ADMIN (guarded: admin role) ────
  /admin → AdminLayout [MainLayout + ADMIN_NAV_ITEMS]
    /admin/enclave          → EnclaveApplications
    /admin/enclave-applications → EnclaveApplications
    /admin {nested via AdminPanel → Outlet}
      /admin/               → DashboardPanel
      /admin/dashboard      → DashboardPanel
      /admin/users          → UserManagementPanel
      /admin/content        → ContentModerationPanel
      /admin/analytics      → AnalyticsPanel
      /admin/reports        → ReportsPanel
      /admin/support        → SupportTicketsPanel
      /admin/settings       → SettingsPanel
```

**Route counts (unique paths):** 6 public + 4 auth + 6 fan + 9 creator + 9 admin = **34 routes**, 14 of which are lazy-loaded.

### 2.2 Routing Strategy

| Concern | Implementation |
|---|---|
| **Framework** | React Router v7 (`react-router-dom`) |
| **Lazy loading** | `React.lazy(() => import('./path'))` + `<React.Suspense>` |
| **Layout nesting** | Parent route with `<Outlet />` pattern for sidebar-per-role |
| **Loading fallback** | `<div>Loading...</div>` or full-screen spinner within Suspense |
| **Auth guards** | `CreatorRouteGuard` (HOC) for creator routes; `ProtectedRoute` (component) for admin |
| **No guard on fan routes** | Fan routes under `/fan` have no role check — any authenticated user can access |
| **Data loaders** | Loader wrapper components (`*Loader`) perform data fetching instead of the route component — **no React Router loaders/actions used** |

### 2.3 Notable Routing Observations

1. **No React Router loaders/actions**: All data fetching happens in wrapper components (`CreatorDashboardLoader`, `FanGalleryLoader`, etc.) using `useEffect`. React Router v7's data-loading APIs (`loader`, `action`) are unused.
2. **Duplicate routes**: `/fan/` and `/fan/feed` both render `FanFeed`; `/hub/` and `/hub/dashboard` both render `CreatorDashboardLoader`; `/admin/` and `/admin/dashboard` both render `DashboardPanel`.
3. **No fan route guard**: Unlike creator (`CreatorRouteGuard`) and admin (`ProtectedRoute`), fan routes under `/fan` have no explicit guard. Navigation items are only shown to fans, but direct URL access by a non-fan user isn't prevented at the route level.
4. **Admin routing split**: Enclave applications live outside the nested `AdminPanel` Outlet (direct child of `AdminLayout`), while all other admin panels nest inside `AdminPanel` which provides shared admin data via Outlet context.
5. **Creator settings loads user from auth**: `CreatorSettingsLoader` reads from `useAuth()` context instead of a dedicated API call — leverages authenticated user data from session restore.

---

## 3. Component Hierarchy

### 3.1 Render Tree

```
<App>
  <ToastProvider>                    # Global toast notifications
    <Elements stripe={stripePromise}> # Stripe Elements wrapper
      <BrowserRouter>
        <AuthProvider>               # Auth context (user, login, logout, impersonation)
          <React.Suspense>           # Lazy-load boundary
            <Routes>
              ... per route ...

              ──── Fan Layout ────
              <MainLayout logoText="PoDM" navItems={FAN_NAV_ITEMS}>
                <Outlet>
                  <FanFeed>
                    <ContentCard>+</ContentCard>   # Many instances
                    <FanContestList>
                      <FanContestEntry>
                    </FanContestList>
                  </FanFeed>

                  <FanGallery>
                    <ContentViewerModal>
                      <ContentLockOverlay />
                    </ContentViewerModal>
                  </FanGallery>

                  <FanSubscriptions>               # Tier cards + modals
                  <FanMessages>
                    <ConversationListItem>+</ConversationListItem>
                    <MessageBubble>+</MessageBubble>
                    <AttachmentModal />
                  </FanMessages>

                  <FanSettings>                    # Multi-tab settings
                    <SettingsCard>+</SettingsCard>
                    <ToggleSwitch>+</ToggleSwitch>
                    <ConfirmModal />
                  </FanSettings>
                </Outlet>
              </MainLayout>

              ──── Creator Layout ────
              <MainLayout logoText="PoDM" navItems={CREATOR_NAV_ITEMS}>
                <Outlet>
                  <CreatorDashboard>
                    <StatCard>+</StatCard>
                    <ReferralCodes />
                    <CreatorContestList>
                      <CreateContestModal />
                    </CreatorContestList>
                  </CreatorDashboard>

                  <CreatorContent>
                    <ContentModal />
                    <UploadModal />
                    <AudioPlayer />
                  </CreatorContent>

                  <CreatorAnalytics>
                    <Recharts: LineChart, PieChart />
                  </CreatorAnalytics>

                  <CreatorEarnings>
                    <StatCard>+</StatCard>
                    <WithdrawModal>
                      <useStripePayment />
                    </WithdrawModal>
                  </CreatorEarnings>

                  <CreatorMessages>
                    <ConversationListItem>+</ConversationListItem>
                    <MessageBubble>+</MessageBubble>
                    <AttachmentModal />
                    <BroadcastModal />
                    <useVoiceRecorder />
                  </CreatorMessages>

                  <CreatorSettings>
                    <SettingsCard>+</SettingsCard>
                    <WalletSettings />
                  </CreatorSettings>

                  <BulkUploadPage>
                    <DropZone />
                    <DraftCard>+</DraftCard>
                  </BulkUploadPage>
                </Outlet>
              </MainLayout>

              ──── Admin Layout ────
              <MainLayout logoText="PoDM - Admin" navItems={ADMIN_NAV_ITEMS}>
                <EnclaveApplications />
                <AdminPanel>               # Data provider via Outlet context
                  <Outlet>
                    <DashboardPanel>       # Charts, metrics
                    <UserManagementPanel /> # User CRUD table
                    <ContentModerationPanel />
                    <AnalyticsPanel />
                    <ReportsPanel />
                    <SupportTicketsPanel />
                    <SettingsPanel />
                  </Outlet>
                </AdminPanel>
              </MainLayout>
            </Routes>
          </React.Suspense>
        </AuthProvider>
      </BrowserRouter>
    </Elements>
  </ToastProvider>
</App>
```

### 3.2 Component Classification

| Category | Count | Pattern | Examples |
|---|---|---|---|
| **Primitive UI** | 5 | Stateless, generic, no business logic | Button, Input, Card, Modal, AudioPlayer |
| **Layout Shell** | 5 | Page structure, navigation | MainLayout, Header, Footer, Container, AuthLayout |
| **Domain Shared** | 15 | Business-domain composites | ContentCard, TipModal, UnlockModal, ContentLockOverlay, StatCard, StatusBadge |
| **Auth Guards** | 3 | Access control logic | withAuthGuard, ProtectedRoute, CreatorRouteGuard |
| **Feature Pages** | 24 | Full page views per role | FanFeed, CreatorDashboard, AdminPanel, etc. |
| **Feature Sub-components** | 23 | Feature-specific partials | BroadcastModal, DraftCard, WalletSettings, ContentViewerModal |
| **Loader Wrappers** | 6 | Data-fetching adapters | CreatorDashboardLoader, FanGalleryLoader, etc. |

### 3.3 Component Sharing Matrix

| Shared Component | Used By |
|---|---|
| `ContentCard` | FanFeed, CreatorProfile |
| `MessageBubble` | FanMessages, CreatorMessages |
| `ConversationListItem` | FanMessages, CreatorMessages |
| `ContentViewerModal` | FanGallery, FanMessages, CreatorContent |
| `ContentLockOverlay` | ContentCard, ContentViewerPage |
| `ContentLockManager` | ContentCard, ContentViewerPage, useContentLock hook |
| `TipModal` | ContentCard, ContentViewerPage |
| `UnlockModal` | ContentCard, FanGallery |
| `ConfirmModal` | FanSettings, CreatorContent, EnclaveApplications, CreatorEarnings |
| `StatusBadge` | CreatorContent, SupportTicketsPanel, VerificationBanner, CreatorContestList |
| `SettingsCard` | FanSettings, CreatorSettings |
| `ToggleSwitch` | FanSettings, CreatorSettings |
| `StatCard` | CreatorDashboard, CreatorAnalytics, CreatorEarnings, DashboardPanel |

---

## 4. Feature Modules

### 4.1 Feature Summary

| Module | Files | LOC | Purpose | Role(s) |
|---|---|---|---|---|
| `admin` | 10 | 2,284 | Platform administration, user/content moderation, analytics, reports | admin |
| `auth` | 3 | 515 | Login/signup modal, creator onboarding wizard, verification | all (unauthenticated + creator) |
| `contests` | 3 | 405 | Create/manage contests (creator), enter contests (fan) | creator, fan |
| `creator` | 14 | 3,870 | Dashboard, content CRUD, analytics, earnings, messages, settings, bulk upload | creator |
| `enclave` | 6 | 833 | Enclave program marketing, application form | all (unauthenticated) |
| `fan` | 6 | 1,304 | Feed, gallery, subscriptions, messages, settings | fan |
| `messages` | 1 | 100 | Shared `MessageBubble` component | creator, fan |
| `profile` | 3 | 663 | Public creator profile, subscription modals | all |
| `viewer` | 1 | 198 | Full-page content viewer | all |

### 4.2 Creator Module (Largest: 3,870 LOC)

The creator module dominates the frontend at **24%** of all source code. Key sub-modules:

| Sub-area | Component | LOC | API Dependencies |
|---|---|---|---|
| **Content Management** | `CreatorContent.tsx` | 763 | createContent, updateContent, deleteContent, getMyCreatorContent, getSecureContentUrl |
| **Settings** | `CreatorSettings.tsx` + `WalletSettings.tsx` | 1,208 | updateCreatorSettings, uploadAvatar, createStripeOnboardingLink, crypto wallet raw fetch |
| **Messaging** | `CreatorMessages.tsx` | 428 | getMyConversations, sendMessage, sendVoiceMessage, deleteMessage, Socket.IO |
| **Earnings** | `CreatorEarnings.tsx` + WithdrawModal | 239 | getCreatorEarningsData, requestCreatorPayout |
| **Analytics** | `CreatorAnalytics.tsx` | 387 | getCreatorAnalyticsData, exportCreatorMetricsCSV, exportCreatorFanEngagementCSV |
| **Bulk Upload** | `BulkUploadPage.tsx` + DropZone + DraftCard | 472 | createContent (per file), generateCaption |
| **Dashboard** | `CreatorDashboard.tsx` | 188 | getCreatorDashboardData, getMyContests, get creator tiers |
| **Referral** | `ReferralCodes.tsx` | 245 | /referrals/my-codes, /referrals/stats, /referrals/generate |
| **Wallet** | `WalletSettings.tsx` | 480 | fetch('/api/v1/payments/crypto/*') [raw fetch] |

### 4.3 Admin Module (2,284 LOC)

The admin module uses a **data provider pattern**: `AdminPanel.tsx` fetches all shared data on mount and provides it to child route panels via `<Outlet context>`. Child panels read it via `useAdminData()` (a wrapper around `useOutletContext`).

**Data fetched concurrently by AdminPanel (7 API calls):**
- `/admin/dashboard` — key metrics, user growth
- `/admin/users` — user list
- `/admin/content/flagged` — flagged content
- `/admin/analytics` — platform analytics
- `/admin/reports` — report queue
- `/admin/support-tickets` — ticket queue
- `/admin/settings/admins` — admin list

### 4.4 Enclave Module (833 LOC)

The enclave module is a marketing landing page for the premium creator program. It is **independent** — fetched lazily as a standalone page (`/enclave`), not embedded in a feature dashboard. Its sub-components are:
- `EnclaveHero` — CTA with spots-remaining counter
- `EnclaveValueProps` — 3-column value grid
- `EnclaveBenefits` — 2x2 benefit grid with trust signals
- `EnclaveComparison` — Feature comparison table (PoDM vs OnlyFans vs Fansly vs YouTube)
- `EnclaveFAQ` — Accordion FAQ (8 questions)
- `EnclaveApplicationForm` — Multi-section application with referral code from URL

### 4.5 Feature Module API Call Distribution

| Module | Distinct API Endpoints/Functions | Approx. calls in code |
|---|---|---|
| creator | 30 | ~50 |
| fan | 16 | ~25 |
| admin | 9 | ~15 |
| contests | 7 | ~10 |
| viewer | 6 | ~8 |
| auth | 4 | ~6 |
| profile | 3 | ~5 |
| enclave | 2 | ~3 |
| messages | 0 (props) | 0 |
| **Total** | **~77** | **~122** |

---

## 5. Hooks Layer

### 5.1 Hook Inventory

| Hook | File | LOC | Purpose | Pattern |
|---|---|---|---|---|
| `useAuth` | `hooks/useAuth.tsx` | 234 | Auth context: user, login, signup, logout, impersonation, session restore | Context + Provider |
| `useCreatorData` | `hooks/useCreatorData.ts` | 46 | Fetch creator dashboard metrics | `useState` + `useEffect` |
| `useModal` | `hooks/useModal.ts` | 29 | Open/close boolean state | `useState` + `useCallback` |
| `useOnClickOutside` | `hooks/useOnClickOutside.ts` | 35 | Detect clicks outside ref'd element | `useEffect` event listener |
| `useVoiceRecorder` | `hooks/useVoiceRecorder.ts` | 99 | MediaRecorder API for voice messages | `useState` + `useRef` |
| `useAsyncData<T>` | `shared/hooks/useAsyncData.ts` | 73 | Data fetching boilerplate eliminator | Generic hook |
| `useAsyncAction` | `shared/hooks/useAsyncData.ts` | (same file) | Mutation loading state wrapper | Generic hook |
| `useFeedback` | `shared/hooks/useAsyncData.ts` | (same file) | Auto-clearing success/error messages | Generic hook |
| `useStripePayment` | `shared/hooks/useStripePayment.ts` | 155 | Centralized Stripe card payment | Custom hook |
| `useFormSubmission` | `shared/hooks/useFormSubmission.ts` | 71 | Form submit with loading/error state | Generic hook |
| `useCryptoWallet` | `shared/hooks/useCryptoWallet.ts` | 98 | Wallet connect/disconnect/verify (mock) | Custom hook |

### 5.2 Hook Relationships

```
useAuth (context)
├── used by: MainLayout, Header, CreatorDashboardLoader, CreatorSettingsLoader,
│            AuthModal, CreatorOnboarding, CreatorVerification, AdminLoginPage,
│            FanSettings, FanMessages, ContentViewerPage, CreatorMessages,
│            CreatorProfile, useStripePayment, ImpersonationBanner
│
useCreatorData (calls: apiClient.getCreatorDashboardData)
└── used by: CreatorDashboardLoader

useStripePayment (calls: apiClient.unlockPost, apiClient.confirmTransaction)
├── depends on: useAuth (reads paymentMethod)
└── used by: CreatorEarnings WithdrawModal, UnlockModal, TipModal

useCryptoWallet (calls: raw fetch to /api/v1/payments/crypto/verify)
├── used by: WalletSettings, SubscriptionModal (profile)

useFormSubmission (generic — takes mutationFn parameter)
└── used by: CreatorContent, CreatorEarnings, TipModal, UnlockModal, UpdatePaymentModal

useAsyncData (generic — takes fetchFn parameter)
├── used by: (intended for all data-fetching components)
│              Note: CreatorData does NOT use this — manual useState/useEffect instead
```

### 5.3 Hook Patterns & Observations

| Pattern | Prevalence | Examples |
|---|---|---|
| `useState` + `useEffect` for data fetching | 6 loader components + useCreatorData | All *Loader wrappers in App.tsx |
| Generic `useAsyncData<T>` (preferred per AGENTS.md) | 0 usages in feature code | Not adopted yet |
| Context + Provider | 2 (auth, toast) | `useAuth`, `useToast` |
| `useCallback` for stable references | 3 | `useModal`, `useAuth` (addToast, removeToast) |
| Raw DOM event listeners | 2 | `useOnClickOutside`, `useVoiceRecorder` |
| Stripe Elements hooks | 1 | `useStripe`, `useElements` (from @stripe/react-stripe-js) |

**Notable:** The AGENTS.md contract specifies `useAsyncData<T>` for data fetching, but every loader component and `useCreatorData` still uses manual `useState`/`useEffect`/`isLoading`/`error` — the generic hook was created but never adopted.

---

## 6. API Integration Layer

### 6.1 Architecture

```
Component/Page
    │
    │ Option A: api() helper (preferred)     Option B: apiClient.get/post/put/delete
    │   api('get', '/users')                   apiClient.getMe()
    │   wraps response.data                    for requests needing custom config
    │
    ▼
apiClient.ts (centralized Axios instance)
    │
    ├── Request interceptor #1: Attach Bearer token from localStorage/sessionStorage
    ├── Request interceptor #2: Attach X-Impersonating-User-Id header
    ├── Request interceptor #3: Remove Content-Type for FormData (let browser set it)
    ├── Response interceptor: 401 → clear tokens → redirect to /
    │
    ▼
Vite Dev Proxy (vite.config.ts: /api → http://localhost:5000)
    │
    ▼
Backend Express Server
```

### 6.2 API Function Categories

| Category | Functions | Count |
|---|---|---|
| **Auth** | signup, login, forgotPassword, getMe, signupAndSubscribe | 5 |
| **Profile/Settings** | updateMe, updateCreatorSettings, changePassword, uploadAvatar, getFanSettings, updateFanSettings | 6 |
| **Content** | getMyCreatorContent, createContent, updateContent, deleteContent, getPublicCreatorProfile, getSecureContentUrl, getSecureContentViewUrl, getContentViewerData | 8 |
| **Payments** | sendTip, confirmTransaction, createSubscription, unlockPost, updateFanSubscription | 5 |
| **Creator Finance** | getCreatorEarningsData, requestCreatorPayout, createStripeOnboardingLink | 3 |
| **Creator Analytics** | getCreatorDashboardData, getCreatorAnalyticsData, exportCreatorMetricsCSV, exportCreatorFanEngagementCSV | 4 |
| **Messaging** | getMyConversations, getMessagesInConversation, sendMessage, sendVoiceMessage, deleteMessage, unlockMessageContent, markConversationAsRead | 7 |
| **Fan** | getFanFeed, getFanSubscriptions, getFanGallery, addContentToGallery, removeContentFromGallery | 5 |
| **Notifications** | getNotifications, getUnreadNotificationCount, markNotificationAsRead, deleteNotification | 4 |
| **Admin** | getPlatformSettings, updatePlatformSettings, updateUserStatus, updateCreatorCommission, getUserById, getPlatformAnalytics, getSavedReports, generateReport, messageUser, getVerificationDocs, updateContentStatus | 11 |
| **Support** | submitSupportTicket, replyToSupportTicket | 2 |
| **Contests** | createContest, getMyContests, publishContest, finalizeContest, getFanContests, enterContest | 6 |
| **Referral** | (via raw paths: /referrals/my-codes, /referrals/stats, /referrals/generate) | 3 |
| **Enclave** | (via raw paths: /enclave/spots-remaining, /enclave/applications) | 2 |
| **AI** | generateCaption | 1 |
| **Analytics Events** | logAnalyticsEvent | 1 |
| **Broadcast** | broadcastMessage | 1 |
| **Admin Onboarding** | completeCreatorOnboarding, submitVerification | 2 |

### 6.3 API Bypass Sites

Despite the AGENTS.md mandate that all API calls go through `apiClient.ts`, the following files make direct HTTP calls:

| File | Endpoint | Method |
|---|---|---|
| `features/creator/WalletSettings.tsx` | `/api/v1/payments/crypto/wallet` | GET |
| `features/creator/WalletSettings.tsx` | `/api/v1/payments/crypto/withdraw` | POST |
| `shared/hooks/useCryptoWallet.ts` | `/api/v1/payments/crypto/verify` | POST |
| `features/admin/EnclaveApplications.tsx` | `/api/v1/enclave/applications/:id` | PATCH |
| `features/admin/EnclaveApplications.tsx` | `apiClient.patch(...)` — uses apiClient but bypasses typed function | — |
| `features/creator/ReferralCodes.tsx` | `/api/v1/referrals/my-codes`, `/api/v1/referrals/stats`, `/api/v1/referrals/generate` | GET, POST |
| `features/enclave/EnclaveHero.tsx` | `/api/v1/enclave/spots-remaining` | GET |
| `features/enclave/EnclaveApplicationForm.tsx` | `/api/v1/enclave/applications` | POST |

These bypass sites use one of two patterns:
1. `apiClient.get('/path')` — uses the Axios instance but bypasses typed function wrappers
2. `fetch('/api/v1/path')` — raw browser fetch, bypassing Axios entirely (crypto wallet)

### 6.4 API Call Patterns by Feature

| Pattern | Code | Used where |
|---|---|---|
| `const res = await api(fn, args)` | apiClient.ts helper | Preferred pattern for simple calls |
| `apiClient.get/post/put/delete(path)` | Direct Axios method | ReferralCodes, Enclave, WalletSettings |
| `fetch('/api/v1/path')` | Raw fetch | useCryptoWallet, WalletSettings |

---

## 7. State Management

### 7.1 State Layers

| Layer | Mechanism | Scope | Examples |
|---|---|---|---|
| **Global (auth)** | React Context | App-wide | `useAuth`: user, impersonatedUser, paymentMethod, login/logout |
| **Global (toast)** | React Context | App-wide | `useToast`: addToast, removeToast; connected to apiClient error handler |
| **Feature-level** | `useState` + `useEffect` | Per-page | CreatorContent (content list), FanFeed (posts), AdminPanel (adminData) |
| **Local (UI)** | `useState` | Per-component | Modal open/close, loading spinners, form fields, selected tabs |
| **Route-level** | Outlet context | Route subtree | AdminPanel → child panels via `useOutletContext` |
| **Real-time** | Socket.IO | Per-session | FanMessages/CreatorMessages: join_room, new_message, message_deleted events |

### 7.2 State Flow Diagrams

**Auth state flow:**
```
App mount
  └─ AuthProvider mount
       ├─ Check localStorage/sessionStorage for authToken
       ├─ Found? → apiClient.getMe() → verify session → setUser
       ├─ Admin? → Restore impersonation from storage
       │
       └─ Supabase auth listener: onAuthStateChange
            └─ Sync token to localStorage as 'authToken'
                 (intentionally no 'else' branch — doesn't clear on init)

login(email, password, rememberMe?)
  └─ apiClient.login() → store token → setUser → fetch fan payment settings

logout()
  └─ nullify user/paymentMethod → clear both storages → supabase.auth.signOut() → navigate /

startImpersonation(targetUser)
  └─ store targetUser.id → navigate to /hub or /fan/feed

stopImpersonation()
  └─ clear impersonation ID → navigate to /admin/dashboard
```

**Data fetching state flow (e.g., CreatorDashboardLoader):**
```
Component mount
  └─ useState: loading=true, data=null, error=null
  └─ useEffect([creator]):
       ├─ if !creator → return
       ├─ try: data = await apiClient.getCreatorDashboardData()
       ├─ setData, setLoading(false)
       └─ catch: setError, setLoading(false), console.error
  └─ Render: loading → spinner | error → red text | data → CreatorDashboard

[NB: Does NOT use useAsyncData hook — manual pattern]
```

**Toast state flow:**
```
Any component → addToast(type, message)
  └─ ToastContext: create Toast { id, type, message } → setToasts(prev => [...prev, toast])
  └─ setTimeout: removeToast(id) after duration (default 5000ms)
  └─ Render: fixed bottom-right position, animate-slide-in

apiClient error interceptor → registerErrorHandler((message, type) => addToast(...))
  └─ Connects backend errors to user-facing notifications
```

**Admin panel data provider state flow:**
```
AdminPanel mount
  └─ useState: loading=true, adminData=null, error=null
  └─ useEffect([]):
       ├─ Promise.all([
       │     apiClient.get('/admin/dashboard'),
       │     apiClient.get('/admin/users'),
       │     apiClient.get('/admin/content/flagged'),
       │     apiClient.get('/admin/analytics'),
       │     apiClient.get('/admin/reports'),
       │     apiClient.get('/admin/support-tickets'),
       │     apiClient.get('/admin/settings/admins')
       │   ])
       └─ AdminData { dashboardData, usersData, ... }
  └─ Provide via <Outlet context={adminData}>

Child panels (DashboardPanel, UserManagementPanel, etc.)
  └─ useAdminData() = useOutletContext<AdminData>()
  └─ No re-fetching — all data already loaded by parent
```

### 7.3 State Management Assessment

| Aspect | Status |
|---|---|
| **Global state** | Minimal — only auth + toast. Appropriate for app size. |
| **No Redux/Zustand** | Correct decision for this scale. |
| **Outlet context pattern** | Used well in admin module — single fetch, multiple consumers. |
| **Loader pattern mismatch** | AGENTS.md specifies `useAsyncData` but all loaders use manual state. Would reduce boilerplate in ~6 components. |
| **Socket.IO state** | Handled component-locally (connect/disconnect in useEffect). No global socket state. |
| **Impersonation** | Stored in localStorage + React context — survives page refreshes. |

---

## 8. Build & Tooling Configuration

### 8.1 Stack

| Tool | Version | Config File | Key Settings |
|---|---|---|---|
| Vite | ^7.1.2 | `vite.config.ts` | React plugin, `@common` alias, `/api` proxy to `localhost:5000` |
| TypeScript | ^5.8+ (implied) | `tsconfig.json` | ES2020, strict, moduleResolution: bundler, jsx: react-jsx |
| ESLint | ^9.38.0 | `.eslintrc` (implied) | React plugin, hooks plugin, react-refresh, max-warnings 0 |
| Tailwind CSS | ^3.4.1 | `tailwind.config.js` (implied) | `@tailwindcss/forms` plugin |
| PostCSS | ^8.4.38 | `postcss.config.js` | Tailwind + autoprefixer |
| Jest | ^30.2.0 | `jest.config` (implied) | ts-jest, jsdom environment |
| Babel | ^7.28.5 | `babel.config.js` (implied) | preset-env, preset-react, preset-typescript |

### 8.2 Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server (with proxy) |
| `npm run build` | Production build → `dist/` |
| `npm run lint` | ESLint with max-warnings 0 |
| `npm test` | Jest unit tests |
| `npx playwright test` | E2E tests in `tests/` |

### 8.3 Vite Proxy Configuration

```js
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
}
```

All `/api/v1/*` requests from the dev server are proxied to the backend. In production, the deployment platform (Netlify via `netlify.toml` or Cloudflare) handles proxy/rewrite rules.

### 8.4 Dependency Overview

| Category | Packages | Count |
|---|---|---|
| **Runtime** | react, react-dom, react-router-dom | 3 |
| **HTTP** | axios | 1 |
| **UI/Charts** | lucide-react, recharts, qrcode.react | 3 |
| **Stripe** | @stripe/react-stripe-js, @stripe/stripe-js | 2 |
| **Supabase** | @supabase/supabase-js | 1 |
| **Socket.IO** | socket.io-client | 1 |
| **File upload** | react-dropzone | 1 |
| **Utilities** | uuid | 1 |
| **Dev** | vite, typescript, eslint, tailwindcss, postcss, autoprefixer | 6 |
| **Test** | @playwright/test, jest, @testing-library/react, ts-jest, babel-jest, jest-environment-jsdom | 6 |
| **Total** | | **24** |

---

## 9. Testing Strategy

### 9.1 Test Infrastructure

| Layer | Framework | Location | Files |
|---|---|---|---|
| Unit | Jest + ts-jest + jsdom | `src/` adjacent | 1 (`App.test.tsx` — smoke test) |
| E2E | Playwright | `tests/` | 5 (`login.spec.ts`, `fan.spec.ts`, `creator.spec.ts`, `admin.spec.ts`, `tip.spec.ts`) |

### 9.2 E2E Test Coverage

| Test File | What It Covers |
|---|---|
| `login.spec.ts` | Page title, modal open, form fill, valid credentials login |
| `fan.spec.ts` | Fan-specific flows (subscriptions, feed) |
| `creator.spec.ts` | Creator-specific flows (dashboard, content) |
| `admin.spec.ts` | Admin panel access, user/content management |
| `tip.spec.ts` | Tipping payment flow |

### 9.3 Test Coverage Gaps

| Area | Unit Tests | E2E Tests | Status |
|---|---|---|---|
| Auth flows | 0 | 1 (login) | **Minimal** |
| Content CRUD | 0 | 1 (creator) | Minimal |
| Payments (Stripe) | 0 | 1 (tip) | Minimal |
| Real-time messaging | 0 | 0 | **Missing** |
| Admin operations | 0 | 1 | Minimal |
| Hooks (8 custom hooks) | 0 | 0 | **Missing** |
| Components (28 total) | 0 | (implicit via E2E) | **Missing** |
| Pure functions (formatters.ts, statusBadgeMap.ts) | 0 | 0 | **Missing** |
| apiClient functions | 0 | 0 | **Missing** |
| Error/edge cases | 0 | 0 | **Missing** |

---

## 10. Cross-Cutting Concerns & Architectural Smells

### 10.1 Critical Issues

| Issue | Location | Description |
|---|---|---|
| **apiClient bypass (raw fetch)** | `shared/hooks/useCryptoWallet.ts`, `features/creator/WalletSettings.tsx` | Uses `fetch()` for crypto endpoints instead of centralized `apiClient`. No auth interceptors, no error handling, no response unwrapping. No service worker interceptors for auth token attachment. |
| **apiClient bypass (raw path strings)** | `features/creator/ReferralCodes.tsx`, `features/enclave/*.tsx`, `features/admin/EnclaveApplications.tsx` | Uses `apiClient.get/post/patch('/path/...')` with path strings instead of typed function wrappers. Bypasses the typing and discoverability benefits of the centralized API layer. |
| **No fan route guard** | `src/App.tsx:312-319` | Fan routes under `/fan` have no role-based guard. Any authenticated user (creator, admin) can access them. Only UI hides nav items — no enforcement at route level. |
| **useAsyncData not adopted** | All 6 loader wrappers + `useCreatorData` | Despite being created as the prescribed data-fetching pattern, `useAsyncData` is used **zero times** in feature code. Every loader uses manual `useState`/`useEffect`. |
| **Stale endpoint call** | `hooks/useCreatorData.ts` | Calls `apiClient.getCreatorDashboardData()` with comment "This endpoint doesn't exist yet, we will create it next". Either the endpoint was never created or the comment is stale. |

### 10.2 Moderate Issues

| Issue | Location | Description |
|---|---|---|
| **Duplicate route registrations** | `App.tsx` | `/fan/` ≡ `/fan/feed`, `/hub/` ≡ `/hub/dashboard`, `/admin/` ≡ `/admin/dashboard`. 6 redundant route entries. |
| **Inline payment logic in modals** | `TipModal.tsx:100-150`, `UnlockModal.tsx:70-120` | Both contain replicated Stripe card handling (create PaymentMethod, confirm, confirmTransaction) despite `useStripePayment` hook existing for exactly this purpose. |
| **No React Router loaders** | All routes | React Router v7 provides `loader`/`action` APIs for data fetching, but all loaders use wrapper components with `useEffect`. This means no SSR/data preloading, no route-level error boundaries, no deferred data. |
| **Crypto wallet is mocked** | `shared/hooks/useCryptoWallet.ts:59-75` | `connectWallet` returns hardcoded addresses after an 800ms setTimeout. No real wallet connection (MetaMask, WalletConnect, etc.). The `balance` is always `1250.00` USDC. |
| **Missing loading boundary for fan routes** | `App.tsx:278` | FanLayout wraps `<Outlet />` in `<React.Suspense>` but does **not** have a route-level guard. A non-fan navigating to `/fan/feed` will see the fan layout. |
| **Inline Stripe initialization** | `App.tsx:284-285` | `loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)` — Stripe is initialized once at module level. This is correct for the current pattern but could fail if the env var is missing (no fallback check unlike supabaseClient.ts). |

### 10.3 Minor Issues

| Issue | Location | Description |
|---|---|---|
| **Magic strings for routes** | `App.tsx` | Route paths are hardcoded strings, not constants. Renaming requires grep across codebase. |
| **No error boundary** | Entire app | No React error boundary wrapping any section. A crash in one lazy-loaded module brings down the entire route tree. |
| **Formatters use fallback LOWDATE** | `formatters.ts` | Date formatting functions fall back to Jan 1, 1801 on parse failure — silently swallows errors. |
| **Admin panel loads 7 APIs sequentially** | `AdminPanel.tsx` | `Promise.all` runs 7 concurrent requests. No retry logic, no partial data rendering if some fail. |
| **Socket.IO auto-connect is false** | `socket.ts:13` | Correct for control, but means every messaging component must remember to call `socket.connect()`. |
| **No PWA/manifest** | Project root | No service worker, no manifest.json. The app is not installable. |

### 10.4 Architectural Strengths

| Aspect | Strength |
|---|---|
| **Feature-based organization** | Clear separation of concerns by user role (fan/creator/admin) |
| **Centralized API client** | Single Axios instance with auth interceptors, token management, error handling |
| **Lazy loading** | All route-level components are `React.lazy()` — code splitting works correctly |
| **Shared domain components** | ContentLockManager, ContentCard, MessageBubble reduce duplication across features |
| **Route guards via HOC** | `withAuthGuard` factory handles auth→role→onboarding→verification chain cleanly |
| **Toast error integration** | `ToastContext.registerErrorHandler` connects Axios error interceptor to user-facing notifications |
| **Stripe Elements wrapping** | Single `Elements` provider at App root avoids re-initialization |
| **TypeScript strict mode** | Full strict mode enabled in tsconfig.json |

---

## 11. Common Type System

### 11.1 Shared Types Directory

```
PoDM_project/common/types/  (12 files)
├── Content.ts               # Content, ContentType, ContentStatus, ContentWithCreator
├── Creator.ts               # Creator (extends User), CreatorDashboardData
├── User.ts                  # User, UserRole, UserStatus
├── Subscription.ts          # SubscriptionTier, Subscription, SubscriptionStatus
├── Transaction.ts           # Transaction, TransactionStatus, TransactionType
├── Message.ts               # Message, MessageType
├── Conversation.ts          # Conversation, ConversationParticipant
├── Gallery.ts               # GalleryItem
├── Contest.ts               # Contest, ContestStatus, ContestEntry
├── Notification.ts          # Notification, NotificationType
├── Report.ts                # Report
├── SupportTicket.ts         # SupportTicket, TicketStatus, TicketPriority
```

### 11.2 Import Mechanism

Both frontend and backend import from `@common/types/*`:

```json
// tsconfig.json (frontend)
"paths": {
  "@common/*": ["../PoDM_project/common/*"]
}

// vite.config.ts
"@common": path.resolve(__dirname, '../common')
```

The `@common` alias is defined in both `tsconfig.json` (for TypeScript) and `vite.config.ts` (for Vite bundler). This is the **only shared code** between frontend and backend — no shared utilities, validation schemas, or constants exist outside this directory.

### 11.3 Type Reuse Observations

- 12 shared type files cover **all** major domain entities
- Frontend re-exports/extends some types locally (e.g., `FanSettingsData` in `FanSettings.tsx`, `ConversationItem` in `ConversationListItem.tsx`)
- No shared **validation** — frontend does its own ad-hoc form validation
- No shared **constants** — commission rate, status values defined independently in `constants.ts` and `statusBadgeMap.ts`
- No shared **API types** — every API response type is defined per-request in the consuming component

---

## Appendix A: Lines of Code by File (Top 20 Largest)

| Rank | File | LOC | Module |
|---|---|---|---|
| 1 | `lib/apiClient.ts` | 800 | Lib |
| 2 | `features/creator/CreatorContent.tsx` | 763 | Creator |
| 3 | `features/creator/CreatorSettings.tsx` | 728 | Creator |
| 4 | `features/creator/WalletSettings.tsx` | 480 | Creator |
| 5 | `features/creator/CreatorMessages.tsx` | 428 | Creator |
| 6 | `features/admin/EnclaveApplications.tsx` | 427 | Admin |
| 7 | `features/enclave/EnclaveApplicationForm.tsx` | 415 | Enclave |
| 8 | `features/creator/CreatorAnalytics.tsx` | 387 | Creator |
| 9 | `pages/SplashPage.tsx` | 370 | Pages |
| 10 | `features/profile/CreatorProfile.tsx` | 341 | Profile |
| 11 | `features/fan/FanSettings.tsx` | 313 | Fan |
| 12 | `features/creator/pages/BulkUploadPage.tsx` | 294 | Creator |
| 13 | `features/fan/FanSubscriptions.tsx` | 281 | Fan |
| 14 | `features/admin/components/DashboardPanel.tsx` | 277 | Admin |
| 15 | `features/admin/components/SettingsPanel.tsx` | 272 | Admin |
| 16 | `features/fan/FanMessages.tsx` | 279 | Fan |
| 17 | `components/shared/ContentLockManager.tsx` | 210 | Shared |
| 18 | `features/fan/FanGallery.tsx` | 208 | Fan |
| 19 | `features/auth/CreatorOnboarding.tsx` | 192 | Auth |
| 20 | `components/shared/TipModal.tsx` | 195 | Shared |

## Appendix B: File Counts by Directory

```
podm-frontend/ (root)           5 files (package.json, vite.config, tsconfig, etc.)
├── src/                        ~80 files, ~16,064 LOC
│   ├── components/             28 files, 2,399 LOC
│   ├── features/               47 files, 10,172 LOC
│   ├── pages/                  6 files, 967 LOC
│   ├── hooks/                  5 files (hooks/) + 4 files (shared/hooks/) = 9, 840 LOC
│   ├── lib/                    6 files, 1,132 LOC
│   ├── context/                1 file, 98 LOC
│   └── styles/                 1 file, 33 LOC
├── tests/                      5 files (Playwright E2E)
└── public/                     (static assets)
```

## Appendix C: Key Files Reference

| Purpose | Path |
|---|---|
| Main component tree | `src/App.tsx` |
| API client | `src/lib/apiClient.ts` |
| Auth context | `src/hooks/useAuth.tsx` |
| Toast system | `src/context/ToastContext.tsx` |
| Route guards | `src/components/auth/withAuthGuard.tsx` |
| Content lock engine | `src/components/shared/ContentLockManager.tsx` |
| Data fetching hook | `src/shared/hooks/useAsyncData.ts` |
| Stripe payment hook | `src/shared/hooks/useStripePayment.ts` |
| Layout shell | `src/components/layout/MainLayout.tsx` |
| Stripe initialization | `src/App.tsx:284-285` |
| Vite config | `vite.config.ts` |
| TypeScript config | `tsconfig.json` |
| Shared types (backend + frontend) | `../PoDM_project/common/types/` |
