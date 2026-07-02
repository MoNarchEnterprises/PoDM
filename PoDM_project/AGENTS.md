# PoDM Backend

## Purpose

Server-side API, business logic, database layer, payments, real-time messaging, and smart contracts for the PoDM creator-fan platform.

## Ownership

- All `/api/v1/*` REST endpoints (auth, users, creator, content, subscriptions, messages, payments/crypto, admin, analytics, support, ai, notifications, contests, enclave, referrals)
- Business logic in `/server/services/` (15 service modules)
- Data models and DB interfaces in `/server/models/` (13 models)
- Express middleware: auth, error, upload, validation
- Database migrations (`/migrations/`) and seed scripts
- Supabase PostgreSQL client config
- Cloudflare R2 storage client config
- Socket.IO real-time server config
- Solidity smart contract (`/contracts/PoDMPaymentProtocol.sol`)
- Shared TypeScript types (`/common/types/`)
- Backend test suite (Jest unit + integration)
- Dockerfile and Docker Compose service definition
- Utility modules (`/server/utils/`)

## Local Contracts

- **Stack**: Node.js (CommonJS), Express 5, TypeScript 5
- **Database**: Supabase (PostgreSQL) via `@supabase/supabase-js`
- **Payments**: Stripe v18 (Connect, PaymentIntents, SetupIntents)
- **Crypto**: Ethereum/Solidity smart contract
- **Storage**: Cloudflare R2 (S3-compatible) via AWS SDK v3
- **Real-time**: Socket.IO v4
- **Auth**: JWT with refresh tokens
- **AI**: OpenAI SDK
- **Media**: `sharp` (images), `fluent-ffmpeg` (video), watermarking
- **Pattern**: Controller → Service → Model; routes defined separately per resource
- **Route prefix**: `/api/v1/{resource}`
- **Error handling**: Custom `ApiError` class, centralized error middleware
- **All source in TypeScript**, compiled via `tsc` to `/dist/`

## Work Guidance

| Command | Purpose |
|---|---|
| `npm run dev:server` | Start dev server with hot-reload (ts-node-dev) |
| `npm run build` | Compile TypeScript to dist/ |
| `npm run start` | Run compiled server |
| `npm test` | Run Jest test suite |
| `npm run seed` | Run database seed script |

- Use `async/await` throughout; avoid raw callbacks
- Controllers handle request/response; services hold business logic; models define DB shape
- Validate request bodies via `express-validator` (validation middleware)
- All API responses follow consistent JSON envelope

## Verification

- `npm test` — Jest with ts-jest (unit + integration tests in `/server/tests/`)
- CI pipeline (`.github/workflows/ci.yml`) runs tests on push/PR to main/master
- Existing tests: `auth.controller.test.ts`, `integration/auth.integration.test.ts`, `integration/ppv_subscription.test.ts`

## Child DOX Index

No child AGENTS.md files yet. The following subdirectories are governed by this doc:

| Directory | Notes |
|---|---|
| `server/` | Core server — controllers, services, models, routes, middleware, utils, scripts, tests |
| `common/types/` | Shared TypeScript interfaces used across the platform |
| `contracts/` | Solidity smart contract |
| `migrations/` | SQL migration files |
| `lib/` | Shared constants |
| `scripts/` | Tooling scripts |
