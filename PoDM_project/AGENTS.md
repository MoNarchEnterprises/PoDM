# PoDM Backend

## Purpose

Server-side API, business logic, database layer, payments, real-time messaging, and smart contracts for the PoDM creator-fan platform.

## Ownership

- All `/api/v1/*` REST endpoints (auth, users, creator, content, subscriptions, messages, payments/crypto, admin, analytics, support, ai, notifications, contests, enclave, referrals, wallet, feature-flags)
- Business logic in `/server/services/` (21 service modules)
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
- **Payments**: USDC on Base via PoDMPaymentProtocol smart contract (`0x454D9F55E580928876447096348E41f832d4a448` on Base Sepolia) with OpenZeppelin `ReentrancyGuard` protection
- **Embedded Wallets**: Privy server-side REST API (v1) — server-controlled EOA wallets (`POST /v1/wallets`, `POST /v1/wallets/{id}/rpc` with `secp256k1_sign`). Wallet ID persisted on `profiles.crypto_wallet_provider_id`.
- **Account Abstraction (ERC-4337 v0.7)**: Pimlico bundler + paymaster on Base Sepolia, EntryPoint `0x0000000071727De22E5E9d8BAf0edAc6f37da032`, SimpleAccountFactory `0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985`. Privy EOA signs the EntryPoint's `getUserOpHash` via `secp256k1_sign`. `userOperation.service.ts` polls `eth_getUserOperationReceipt` and records the real tx hash via `verifyAndRecordBasePayment`.
- **Verification Policy**: A crypto transaction is NEVER marked Cleared without an on-chain receipt (`cryptoPayment.service.ts` retries 5×3s = 15s; background verification inspects contract event logs so ERC-4337 UserOps through the EntryPoint pass cleanly).
- **Referral Program**: Dual-path system in `referral.service.ts`: 1% gross revenue share (`{USERNAME}-PERCENT`, 180-day window, deducted from platform commission, leaving creator payout untouched) and milestone cash bonus (`{USERNAME}-CASH`, $50 base + $25 speed bonus on $750 in 30 days, creating a `ReferralBonus` transaction for referrer).
- **Feature Flags**: Database-backed feature flag system with env kill switch, per-user overrides, percentage rollout
- **On-Ramp**: Coinbase On-Ramp API for card-to-USDC purchases (service + webhook)
- **Browser Wallet UI**: MetaMask/Coinbase Wallet flow hits the contract directly — `useCryptoPayment` hook and `PaymentModal` perform `USDC.approve(contract, MAX_UINT256)` then `payX(...)` (one-time approve, then single-click)
- **Storage**: Cloudflare R2 (S3-compatible) via AWS SDK v3
- **Real-time**: Socket.IO v4
- **Auth**: JWT with `HttpOnly; SameSite=Lax` cookie + `Authorization: Bearer` header fallback
- **Body Limits**: `express.json` limited to 10MB for API endpoints; media uploads stream up to 1GB via Multer `uploadContent`
- **AI**: OpenAI SDK with multi-provider support (`openrouter`, `nvidia`, `openai`). Dynamic provider (`ai_provider`) and model (`ai_model_id`) resolution order: 1) DB `platform_settings`, 2) `AI_MODEL_ID` env var, 3) provider default model. API keys loaded exclusively from `.env` (`AI_API_KEY`/`OPENROUTER_API_KEY`, `NVIDIA_API_KEY`, `OPENAI_API_KEY`).
- **Media**: `sharp` (images), `fluent-ffmpeg` (video), watermarking
- **Pattern**: Controller → Service → Model; routes defined separately per resource
- **Route prefix**: `/api/v1/{resource}`
- **Error handling**: Custom `ApiError` class, centralized error middleware
- **All source in TypeScript**, compiled via `tsc` to `/dist/`
- **Controller pattern**: `asyncHandler`, `requireAuth`, `requireId`, `requireBody` utilities eliminate try/catch and manual guard blocks
- **Response pattern**: `ok(res, data)`, `created(res, data)`, `okMsg(res, msg, data?)`, `createdMsg(res, msg, data?)` for consistent envelope
- **Service guard pattern**: `requireUser`, `requireContent`, `requireContentOwnership` from `entityGuards.ts` replace inline null checks
- **Route middleware pattern**: Composite middleware (`protectAndCreator`, `protectAndAdmin`, `requireRole(...roles)`) replaces `[protect, creatorOnly]` arrays
- **Model query pattern**: `handleQuery<T>`, `handleCount`, `handleList<T>` wrappers replace `console.error + return null/0` blocks (73 instances eliminated)
- **Model CRUD helpers**: `createRecord`, `updateRecord`, `deleteRecord`, `findRecordById`, `countRecords` for standard table operations

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
- New model functions: always use `handleQuery<T>`, `handleCount`, or `handleList<T>` for consistent error handling
- New controller handlers: always use `asyncHandler` wrapper and response helpers; never catch errors or send 500 inline
- **Crypto payments env vars** (server/.env): `PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `PIMLICO_API_KEY`, `PIMLICO_BUNDLER_URL`, `PIMLICO_PAYMASTER_URL`, `ENTRYPOINT_ADDRESS`, `SMART_ACCOUNT_FACTORY_ADDRESS`, `BASE_TESTNET_CONTRACT_ADDRESS`, `BASE_CONTRACT_ADDRESS`, `PLATFORM_TREASURY_ADDRESS`
- **Migration required for embedded wallet signing**: `migrations/add_provider_wallet_id.sql` adds `profiles.crypto_wallet_provider_id` (Privy wallet id) — needed for `signUserOperation` to resolve the EOA to sign with

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
