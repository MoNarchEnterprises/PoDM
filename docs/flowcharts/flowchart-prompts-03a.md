# Flowchart Prompts — Batch 03a (Categories I–J)

> Self-contained prompts for generating Mermaid diagrams for the PoDM platform.
> Each prompt can be given to an AI system to produce a specific diagram.
>
> File: `docs/flowcharts/flowchart-prompts-03a.md`
> Covers: I-02–I-04, J-01–J-03

---

## I-02: Docker Local Development Architecture

**Type:** Graph (flowchart)
**Priority:** P2

Generate a Mermaid flowchart showing the local `docker-compose up` development setup.

Components:
- **Frontend container** (`podm-frontend`)
  - Image: node:18-alpine (multi-stage: dependencies -> build -> serve)
  - Starts Vite dev server on port 5173
  - Environment: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, etc.
  - Vite proxy config: `/api -> http://backend:5000`
  - Volumes: mounts source code for hot reload

- **Backend container** (`PoDM_project`)
  - Image: node:18-alpine
  - Starts with `ts-node-dev` on port 5000
  - Environment: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `R2_*`, `STRIPE_*`, `RPC_URL`, etc.
  - Volumes: mounts source code for hot reload
  - Port mapping: `5000:5000`

- **External connections** (not containerized):
  - Supabase (remote -- not local PostgreSQL)
  - Cloudflare R2 (remote)
  - Ethereum RPC (Base network -- remote)
  - OpenAI/OpenRouter API (remote)

Annotate:
- No local PostgreSQL -- relies on remote Supabase; no `db` service in docker-compose
- No Nginx -- Vite handles proxying; frontend talks directly to backend in dev mode
- Frontend Dockerfile runs `npm run dev` (development server), not production build

**Sources:** `docker-compose.yml`, `Dockerfile` (frontend), `Dockerfile` (backend), `Server.ts`, `07-cross-cutting-concerns.md`

---

## I-03: Database Migration Timeline

**Type:** Gantt
**Priority:** P2

Generate a Mermaid Gantt diagram showing the 15+ SQL migrations in chronological order, grouped by feature area.

Use sections:

**Section: Foundation**
- `create_profiles_and_auth.sql` -- profiles table, roles enum, triggers
- `create_content_table.sql` -- content table, content_type enum, content_status enum

**Section: Payments**
- `create_transactions.sql` -- transactions table, transaction_type enum, transaction_status enum
- `create_subscriptions.sql` -- subscriptions table, subscription_tier enum
- `add_platform_fee_fields.sql` -- platform_fee, creator_payout columns

**Section: Messaging**
- `create_messages_conversations.sql` -- messages + conversations tables
- `add_voice_message_support.sql` -- voice message columns

**Section: Analytics**
- `create_analytics_events.sql` -- analytics_events table
- `create_analytics_summary.sql` -- monthly_analytics_summary table

**Section: Admin & Settings**
- `create_platform_settings.sql` -- platform_settings table
- `create_support_tickets.sql` -- support_tickets table

**Section: Content**
- `create_content_related.sql` -- content_reports, content_flags etc.
- `update_content_schema.sql` -- post-launch content table patches

**Section: Engagement**
- `create_contests.sql` -- contests + contest_entries tables
- `update_contests_schema.sql` -- contest schema patch
- `create_referrals.sql` -- referral_codes + referral_redemptions tables

**Section: Premium**
- `create_enclave_table.sql` -- enclave_applications table

Annotate:
- Patches (`update_contests_schema.sql`, `update_content_schema.sql`) are post-launch additions
- `add_voice_message_support.sql` and `fix-content-types.sql` are the smallest migrations

**Sources:** All migration files in `PoDM_project/server/scripts/migrations/` and `PoDM_project/server/migrations/`, `01-repository-inventory.md`

---

## I-04: Build & Deploy Pipeline (Frontend)

**Type:** Flowchart
**Priority:** P3

Generate a Mermaid flowchart showing the frontend build and deploy pipeline.

Flow nodes:
1. **Source**: TypeScript + React source in `podm-frontend/src/`
2. **Type checking**: `tsc` -- TypeScript compiler checks types (part of build script)
3. **Build**: `vite build` -- bundles into `dist/`
   - CSS: PostCSS + autoprefixer
   - JS: Rollup (Vite's internal bundler) -- code splitting with `React.lazy()`
   - Assets: content hashing for cache busting
4. **Output**: `podm-frontend/dist/` -- static HTML, JS, CSS, assets
5. **Netlify deploy** (production):
   - Build command: `cd podm-frontend && npm run build`
   - Publish directory: `podm-frontend/dist/`
   - SPA redirect: `/* -> /index.html` via `_redirects` file
   - Security headers: `netlify.toml` configures CSP, HSTS, X-Frame-Options
6. **Cloudflare Pages deploy** (preview):
   - Deploys preview branches
   - Same build process as production
7. **Environment variables**:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`
   - `VITE_STRIPE_PUBLISHABLE_KEY`
   - Critical: `JWT_SECRET` exposed in frontend `.env` -- should never be client-side

Annotate:
- `JWT_SECRET` in frontend `.env` -- a server-side secret exposed to clients
- No E2E tests run before deployment (see K-02)

**Sources:** `podm-frontend/vite.config.ts`, `netlify.toml`, `podm-frontend/package.json`, `06-frontend-architecture.md`, `07-cross-cutting-concerns.md`

---

## J-01: Error Handling Layer Architecture

**Type:** Flowchart
**Priority:** P1

Generate a Mermaid flowchart showing the 5-layer error handling pipeline.

Layers (top to bottom):

1. **asyncHandler wrapper** (`utils/asyncHandler.ts`)
   - Catches thrown errors from async route handlers
   - Passes to `next(err)`
   - Catches: unhandled promise rejections in route handlers

2. **AppError classes** (`utils/apiError.ts` and possibly another `AppError`)
   - Typed error class with `statusCode`, `message`, `isOperational`
   - TWO identical AppError classes exist -- one in `PoDM_project/server/utils/apiError.ts` and one elsewhere; they are not interchangeable (different locations, same name)
   - Subtypes: `NotFoundError`, `BadRequestError`, `UnauthorizedError`, `ForbiddenError`

3. **Error handler middleware** (`middleware/error.middleware.ts`)
   - Global catch-all (`app.use(err, req, res, next)`)
   - Prunes stack trace in production (`NODE_ENV === 'production'`)
   - Returns structured JSON: `{ success: false, error: { message, statusCode } }`
   - Unknown errors -> generic "Internal server error"
   - No error classification beyond status code

4. **Axios response interceptor** (`apiClient.ts`)
   - Catches HTTP errors on frontend
   - 401 -> auto-clear auth token -> redirect to login
   - All other errors -> display toast notification
   - No retry logic (except for 5xx where configured)

5. **React ErrorBoundary** (MISSING)
   - No ErrorBoundary component exists -- uncaught React errors crash the UI

Annotate with flow arrows showing error propagation path:
- Route handler -> asyncHandler (catch) -> next(err) -> errorHandler middleware -> JSON response
- API response -> Axios interceptor (catch) -> toast + redirect

**Sources:** `asyncHandler.ts`, `utils/apiError.ts`, `middleware/error.middleware.ts`, `apiClient.ts`, `07-cross-cutting-concerns.md`, `10-internal-workflows.md`

---

## J-02: Security Boundary & Trust Diagram

**Type:** Graph (C4 or flowchart)
**Priority:** P1

Generate a Mermaid flowchart defining trust boundaries across the system.

Use 4 trust zones (innermost to outermost):

**Zone 1: Trusted Internal** (dark green)
- Express server process
- Supabase PostgreSQL (database)
- Server-side environment variables
- Trust boundary: inside the Render/backend network

**Zone 2: Partially Trusted** (yellow-green)
- Cloudflare R2 (S3-compatible storage)
- Stripe API (legacy integration -- payment intents)
- Ethereum RPC node (Base network -- read-only for verification)
- OpenRouter/OpenAI API (AI captions)
- Trust rationale: Outbound API calls to known providers; data leaves server but over HTTPS with API keys

**Zone 3: Untrusted Client** (light red)
- Browser (React SPA)
- localStorage / sessionStorage (JWT stored here)
- Mobile / any HTTP client
- Trust rationale: Client-side code and storage can be inspected/modified by user

**Zone 4: External Actors** (red)
- End users (fans, creators)
- Admin users (elevated privileges but same untrusted client)
- Third-party attackers (internet)

Draw data flows across boundaries with annotations:
- **HTTPS**: Frontend <-> Backend (encrypted in transit)
- **JWT in localStorage**: Crosses Zone 3 into Zone 2 on every request via Bearer header
  - XSS risk: If attacker injects JS, they can read JWT from localStorage
- **R2 signed URLs**: Generated in Zone 1, consumed in Zone 3
- **Crypto verification**: Zone 1 -> Zone 2 (JSON-RPC to Base) -> Zone 1
- **Sandbox bypass**: Zone 3 sends `0x0000` txHash -> Zone 1 skips on-chain verification -> fake transaction recorded (weakened boundary between Zone 3 and Zone 1)
- **AI caption**: Zone 1 -> Zone 2 (sends base64 image to OpenAI) -- no user consent

**Sources:** `auth.middleware.ts`, `cryptoPayment.service.ts`, `apiClient.ts`, `08-crypto-deep-dive.md`, `07-cross-cutting-concerns.md`, `11-data-flow.md`

---

## J-03: Sensitive Data Flow Map

**Type:** Graph (flowchart)
**Priority:** P1

Generate a Mermaid flowchart tracing where sensitive data categories enter, flow through, and leave the system.

Use color-coded paths:

**PII (Personally Identifiable Information)**
- Entry: Signup form (email, username, name), verification upload (ID, selfie), support tickets (user messages)
- Storage: profiles table (email, username, verification JSONB with file paths), support_tickets.conversation JSONB
- Transmission: Verification docs via 60s signed URLs (R2), email via SMTP (unused), auth debug log to disk
- Debug log: `auth.middleware.ts` writes PII to `appendFileSync('debug.log', ...)` -- 27K+ lines

**Secrets/Credentials**
- Entry: Environment variables, `.env` files
- Storage: 3 `.env` copies (root, backend, frontend), environment config on Render/Netlify
- Transmission: Accessible in frontend bundle if `VITE_`-prefixed
- `JWT_SECRET` in frontend `.env`: Server-side secret exposed to client-side bundle
- `SUPABASE_SERVICE_ROLE_KEY` in frontend `.env`: Full database access key in client code

**Auth Data (Tokens)**
- Entry: Supabase Auth response (JWT)
- Storage: localStorage (persistent) or sessionStorage (session-only)
- Transmission: Bearer header on every request
- localStorage XSS vector: Any XSS vulnerability leaks all JWTs

**Payment Data**
- Entry: Crypto wallet address (`profiles.crypto_wallet`), transaction hashes, USDC amounts
- Storage: `transactions` table (all payment details), `subscriptions` table (txHash in `stripe_subscription_id`)
- Transmission: Ethereum RPC (txHash, contract address)
- No raw card data stored (Stripe Elements tokenizes on frontend)

**AI Data (Prompts/Responses)**
- Entry: Image upload for caption generation
- Storage: Content description (caption result stored in `content.description`)
- Transmission: Base64-encoded image sent to OpenRouter/OpenAI
- No user consent: Media sent to third-party AI API without explicit user consent or disclosure

**Sources:** `11-data-flow.md`, `07-cross-cutting-concerns.md`, `auth.middleware.ts`, `podm-frontend/.env`, `cryptoPayment.service.ts`
