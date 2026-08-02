# PoDM Frontend

## Purpose

Client-facing user interface for audience, creators, and administrators on the PoDM platform.

## Ownership

- All React UI components and pages
- Feature modules: auth, fan, creator, admin, profile, viewer, messages, contests, enclave
- Reusable components: `components/ui/` (primitives), `components/layout/` (shell), `components/shared/` (18 domain components incl. PaymentModal, EmbeddedPaymentModal, OnRampButton)
- Routing and lazy loading via React Router v7
- API client (`src/lib/apiClient.ts`) — all frontend-to-backend communication
- Socket.IO client for real-time messaging
- Crypto wallet payment UI (via `useCryptoPayment` hook, `window.ethereum` EIP-1193)
- Embedded wallet payment UI (via `EmbeddedPaymentModal`, `useEmbeddedWallet` context, feature-flagged)
- CEX Fiat Cashout Guidance UI (`CexGuidanceModal` in creator onboarding Step 5 & wallet settings for offramping USDC to local bank accounts)
- State management: React Context (ToastContext, EmbeddedWalletContext), custom hooks
- Global styles (Tailwind CSS) and Tailwind configuration
- E2E tests (Playwright) in `/tests/`
- Jest unit test configuration
- Build tooling: Vite 7 config, ESLint config, PostCSS config, Babel config
- Dockerfile and Netlify/Cloudflare deployment config
- Static assets (`public/`, `assets/`)

## Local Contracts

- **Stack**: React 18, TypeScript, Vite 7
- **Styling**: Tailwind CSS 3.4 with `@tailwindcss/forms`
- **Routing**: React Router v7 (lazy-loaded routes in `App.tsx`)
- **Real-time**: Socket.IO client v4
- **Payments UI**: Consolidated payment orchestrator (`PaymentOrchestrator` in `src/shared/lib/PaymentOrchestrator.ts`) handles address resolution, browser-wallet payments (via `useCryptoPayment`), and embedded-wallet payments (via `EmbeddedPaymentModal` / ERC-4337 gasless user ops across Tips, PPV Posts, PPV Messages, and Subscriptions). `TipModal` accepts and forwards `contentId` to embedded (`relatedId`) and browser wallet payments so content tips aggregate correctly. `ContentCard` syncs bookmark state via `post.inGallery`. `useCryptoPayment.processPayment` returns `{ success, txHash, error }` with the freshly minted tx hash (never stale hook state); `PaymentOrchestrator.payWithBrowserWallet` passes that hash through for downstream calls. Browser-wallet calldata builders append the referrer address and creator `platformFeeBps` (v2 contract: `paySubscription`/`payTip`/`payPPV` take `address referrer, uint256 customPlatformFeeBps`); `PaymentOrchestrator` resolves both via `GET /payments/crypto/referrer/:creatorId` before paying. Selectors in `useCryptoPayment.ts` MUST match the deployed contract ABI (`0xe87c1a59`/`0x7a02b81c`/`0x33f2ab62`).
- **Feature Flags**: `useFeatureFlag` hook with env kill switch (`VITE_ENABLE_EMBEDDED_WALLET`) + backend flag resolution
- **Charts**: Recharts 3
- **Icons**: Lucide React
- **HTTP client**: Axios (wrapped in `apiClient.ts`). 401 response interceptor performs single-flight `POST /auth/refresh` with `withCredentials: true` before retrying original request or executing logout flow. `socket.ts` provides `refreshSocketToken()` helper for live WebSocket re-authentication with updated access tokens.
- **Organization**: Feature-based (`src/features/{feature}/`); components split into `ui/`, `layout/`, `shared/`
- **Component style**: Functional components with hooks; TypeScript strict
- **API calls**: Centralized in `src/lib/apiClient.ts` (872 lines); use `api(method, url, data?, config?)` helper for single-line calls that unwrap `response.data`; keep `apiClient.get/post/put/delete` for requests needing custom config or multi-step logic
- **Data fetching pattern**: `useAsyncData<T>(fetchFn, deps, opts?)` hook eliminates `useState/useEffect/isLoading/error` boilerplate; `useAsyncAction()` for mutation loading states; `useFeedback()` for auto-clearing success/error messages
- **Build output**: `dist/` (Vite default)

## Work Guidance

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | ESLint with max-warnings 0 |
| `npm test` | Run Jest unit tests |
| `npx playwright test` | Run E2E tests |

- Feature modules under `src/features/` are the primary organizational boundary
- Shared/domain components go in `src/components/shared/` (SettingsCard, ToggleSwitch, ConfirmModal, ConversationListItem)
- Primitive UI components go in `src/components/ui/`
- Layout shell components go in `src/components/layout/`
- Custom hooks go in `src/hooks/` (feature-level: useAuth, useCreatorData, useModal, useOnClickOutside, useVoiceRecorder) or `src/shared/hooks/` (cross-feature: useAsyncData/useFeedback/useAsyncAction, useCryptoPayment, useCryptoWallet, useFeatureFlag, useFormSubmission)
- API calls go through `src/lib/apiClient.ts` — do not use raw Axios elsewhere; prefer `api()` helper for simple calls
- Auth guards: use `withAuthGuard(Component, requiredRole?)` HOC instead of inline role checks
- Status badges: use `statusBadgeMap` from `src/lib/statusBadgeMap.ts` instead of inline color mappings

## Verification

- `npm run lint` — ESLint (TypeScript-aware)
- `npm test` — Jest with ts-jest and jsdom environment
- `npx playwright test` — Playwright E2E tests in `/tests/` (login, fan, creator, admin, tip flows)
- CI pipeline (`.github/workflows/ci.yml`) runs lint + build on push/PR

## Child DOX Index

No child AGENTS.md files yet. The following subdirectories are governed by this doc:

| Directory | Notes |
|---|---|
| `src/components/` | Reusable UI — `ui/`, `layout/`, `shared/` |
| `src/features/` | Feature modules — auth, fan, creator, admin, profile, viewer, messages, contests, enclave |
| `src/pages/` | Top-level page components |
| `src/hooks/` | Custom React hooks |
| `src/context/` | React context providers |
| `src/lib/` | API client, Supabase client, socket, constants, formatters |
| `src/shared/` | Cross-feature code |
| `tests/` | Playwright E2E specs |
