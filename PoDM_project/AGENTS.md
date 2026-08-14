# PoDM Backend

## Purpose

Server-side API, business logic, database layer, payments, real-time messaging, and smart contracts for the PoDM creator-fan platform.

## Ownership

- All `/api/v1/*` REST endpoints (auth, users, creator, content, subscriptions, messages, payments/crypto, payments/onramp, wallet/embeddedWallet, admin, analytics, support, ai, notifications, contests, enclave, referrals, feature-flags, health) — 19 route files, ~115 endpoints
- Business logic in `/server/services/` (26 service modules)
- Data models and DB interfaces in `/server/models/` (13 models)
- Express middleware: auth, error, upload, validation, rateLimiter, sanitize, requestId
- Database migrations (`/migrations/` — sole SQL migration folder; `server/scripts/migrations/` was consolidated into it) and seed scripts
- Supabase PostgreSQL client config
- Cloudflare R2 storage client config
- Socket.IO real-time server config
- Solidity smart contract (`/contracts/PoDMPaymentProtocol.sol`). Test-only contract fixture `MockUSDC.sol` (local USDC stand-in) lives in `contracts/contracts/`. Hostile security fixtures (`MaliciousV2.sol`, `ReentrantToken.sol`) and the Hardhat attack/reproduction suites live in the git-ignored `security/` workspace (see `security/AGENTS.md`), NOT in this project tree — this folder only keeps legitimate production tests (`test/PoDMPaymentProtocol.test.ts`, `test/security.test.ts`). `contracts/tsconfig.json` includes `typechain-types/` so `getContractFactory('MockUSDC')` resolves to a typed factory (otherwise `transfer`/`approve` fall back to `BaseContract` and `tsc` errors).
- Shared TypeScript types (`/common/types/`)
- Backend test suite (Jest unit + integration)
- Dockerfile and Docker Compose service definition
- Utility modules (`/server/utils/`)

## Local Contracts

- **Stack**: Node.js (CommonJS), Express 5, TypeScript 5
- **Database**: Supabase (PostgreSQL) via `@supabase/supabase-js`
- **Payments**: USDC on Base via PoDMPaymentProtocol smart contract (OpenZeppelin `ReentrancyGuard`, ownable/pausable, UUPS proxy upgradeability, OpenZeppelin `IERC20` with `SafeERC20`). Contract strictly pins canonical USDC token address (`usdcToken` via `onlyUsdc` modifier). Every fan payment splits on-chain in a single transaction: treasury + creator, plus an optional referrer share (`referralFeeBps`, default 100 = 1%) deducted from the platform commission. Pay functions (`paySubscription`/`payTip`/`payPPV`/`processRenewal`) accept a `referrer` address (zero address = no referral) and `customPlatformFeeBps` parameter (caller passes creator's custom rate or 0 for 12.5% default); events carry `referralFee` + `referrer`. `processRenewal` uses `onlyKeeper` and `onlyUsdc` modifiers. Deployed address is set via `BASE_TESTNET_CONTRACT_ADDRESS`/`BASE_CONTRACT_ADDRESS` (`0xa8f480C42C6216a35a435424409d8e0932ee66e9` on Base Sepolia). Controlled UUPS upgrade script lives in `contracts/scripts/upgrade-contract.ts`.
- **Embedded Wallets**: Privy server-side REST API (v1) — server-controlled EOA wallets (`POST /v1/wallets`, `POST /v1/wallets/{id}/rpc` with `secp256k1_sign`). Wallet ID persisted on `profiles.crypto_wallet_provider_id`.
- **Account Abstraction (ERC-4337 v0.7)**: Pimlico bundler + paymaster on Base Sepolia, EntryPoint `0x0000000071727De22E5E9d8BAf0edAc6f37da032`, SimpleAccountFactory `0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985`. Privy EOA signs the EntryPoint's `getUserOpHash` via `secp256k1_sign`. `userOperation.service.ts` polls `eth_getUserOperationReceipt`, verifies `userOpReceipt.success === true`, and records the verified tx via synchronous `verifyAndRecordBasePayment`.
- **Verification Policy**: A crypto transaction is NEVER marked Cleared without an on-chain receipt (`cryptoPayment.service.ts` retries 5×3s = 15s; background verification inspects contract event logs so ERC-4337 UserOps through the EntryPoint pass cleanly). Transaction hashes must strictly match `/^0x[A-Fa-f0-9]{64}$/` (malformed or synthetic hashes return 400). Verification validates event `topics[1]` (payer) against the authenticated fan's `crypto_wallet_address` or `smart_account_address`, `topics[2]` (recipient creator wallet), `topics[3]` (canonical USDC token address), and `tierIdHash`/`contentIdHash` against `input.relatedId` (with right-padded UTF-8 hex matching), rejecting mismatches with 400 so on-chain hashes cannot be reused or forged. Database transaction hash deduplication is enforced atomically via unique index constraint (`migrations/add_unique_tx_hash_index.sql`) and 409 error handling (`V-A01`). Payout locks use PostgreSQL advisory lock RPC functions (`migrations/add_payout_lock_rpc.sql`, `V-A06`). Payment intents validate subscription tier and PPV catalog pricing server-side before constructing UserOps (`V-A04`). Cash milestone referral checks require `protectAndCreator` session authentication and derive creator earnings server-side (`V-A03`). `createSubscriptionForUser` reuses an already-Cleared Subscription transaction (matched by hash + fan + creator) instead of re-verifying, keeping the subscribe call idempotent after the payment endpoint has recorded it. Verification also validates the emitted `referrer` address and `referralFee` against the DB-resolved referrer (mismatch → reject/Failed) so a fan cannot redirect the referral share. Tip transactions set `related_content_id` for content tips, and `findSuccessfulTransactionByFanAndContent` strictly filters on PPV transaction types (`PPV Post`, `PPV Message`).
- **Gallery Idempotency**: `addItemToGallery` deduplicates content additions by `contentId` and returns `{ gallery, added: boolean }`. `addToUserGallery` only increments `gallery_add_count` on newly added items (`added === true`). `inGallery` is populated across feed, creator profile, and content detail endpoints.
- **Attachable Vault Content**: `GET /api/v1/messages/fans/:fanId/attachable-content` (`getAttachableVaultContent` in `message.service.ts`) returns creator vault items (`visibility === 'unlisted'`) that are not present in the recipient fan's gallery, verifying conversation participation before returning.
- **Content Moderation**: Fan reports land in the dedicated `content_reports` table (`migrations/create_content_reports_table.sql`), NOT the admin analytics `reports` table. Three reports auto-flag content; admin approve → dismisses pending `content_reports` rows. The moderation badge read/dismiss flow lives in `report.model.ts`.
- **Referral Program**: Dual-path system in `referral.service.ts`: 1% gross revenue share (`{USERNAME}-PERCENT`, 180-day window) paid on-chain to the referrer's wallet in the same payment transaction via the v2 contract `referrer` param (deducted from platform commission, leaving creator payout untouched) and milestone cash bonus (`{USERNAME}-CASH`, $50 base + $25 speed bonus on $750 in 30 days, creating a `ReferralBonus` transaction for referrer). A referral fee is only recorded when the referrer has a configured crypto wallet — `getReferrerWalletForCreator` resolves it and `calculateReferralFee` zeroes the fee otherwise.
- **Commission**: Effective rate resolved by `getEffectiveCommissionRate` in `server/utils/commission.utils.ts`. Enclave members (`profiles.is_enclave_member`) are locked at `ENCLAVE_COMMISSION_RATE` (10%) — admin override is rejected server-side; non-Enclave creators use per-profile `commission_rate`, falling back to `DEFAULT_COMMISSION_RATE` (12.5). All fee sites (`fee.utils.ts`, `cryptoPayment.service.ts`, `verification.service.ts`, `userOperation.service.ts`, `jobs/renewSubscriptions.ts`) share this resolver.
- **Feature Flags**: Database-backed feature flag system with env kill switch, per-user overrides, percentage rollout
- **On-Ramp**: Coinbase On-Ramp API for card-to-USDC purchases (service + webhook)
- **Browser Wallet UI**: MetaMask/Coinbase Wallet flow hits the contract directly — `useCryptoPayment` hook and `PaymentModal` perform exact `USDC.approve(contract, amountInUnits)` then `payX(...)` (exact per-transaction approval)
- **Storage**: Cloudflare R2 (S3-compatible) via AWS SDK v3
- **Real-time**: Socket.IO v4
- **Auth**: JWT with `HttpOnly` `authToken` & `authRefreshToken` cookies (`SameSite=Lax` in dev, `SameSite=None; Secure` in prod) + `Authorization: Bearer` header fallback. `POST /api/v1/auth/refresh` exchanges refresh token cookie for renewed session tokens. `protect` middleware prefers `Authorization` header over cookie token. `optionalProtect` (public routes) never fails on a present-but-invalid/expired token — it continues as a guest so stale browser tokens can't break public pages.
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
- **Route middleware pattern**: Composite middleware (`protectAndCreator`, `protectAndAnyCreator`, `protectAndAdmin`, `requireRole(...roles)`). `creatorOnly` strictly enforces `status === 'active'` (blocking pending creators from creator management, referrals, and Audience messaging), while `anyCreator` / `protectAndAnyCreator` permits pending creators to upload media and complete onboarding/verification.
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
| `npm run check:contract` | Run contract sync & bytecode verification gate |
| `npm run generate:contract-config` | Generate `common/contractConfig.ts` from compiled contract artifact |
| `npm run sync:contract-env <0xAddr>` | Synchronize contract address across all 3 environment files |
| `npm run test:autonomous` | Run Autonomous QA Test Suite (`scripts/run-autonomous-suite.ts --all`) |

- Use `async/await` throughout; avoid raw callbacks
- Controllers handle request/response; services hold business logic; models define DB shape
- Validate request bodies via `express-validator` (validation middleware)
- All API responses follow consistent JSON envelope
- New model functions: always use `handleQuery<T>`, `handleCount`, or `handleList<T>` for consistent error handling
- New controller handlers: always use `asyncHandler` wrapper and response helpers; never catch errors or send 500 inline
- **Crypto payments env vars** (server/.env): `CHAIN_NETWORK`, `PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `PIMLICO_API_KEY`, `PIMLICO_BUNDLER_URL`, `PIMLICO_PAYMASTER_URL`, `ENTRYPOINT_ADDRESS`, `SMART_ACCOUNT_FACTORY_ADDRESS`, `BASE_TESTNET_CONTRACT_ADDRESS`, `BASE_CONTRACT_ADDRESS`, `PLATFORM_TREASURY_ADDRESS`
- **Migration required for embedded wallet signing**: `migrations/add_provider_wallet_id.sql` adds `profiles.crypto_wallet_provider_id` (Privy wallet id) — needed for `signUserOperation` to resolve the EOA to sign with

## Verification

- `npm test` — Jest with ts-jest (unit + integration tests in `/server/tests/`). Integration tests under `server/tests/integration/` require `npm run dev:server` to be running on port 5000 with seed data.
- CI pipeline (`.github/workflows/ci.yml`) runs tests on push/PR to main/master
- Existing tests: `auth.controller.test.ts`, `admin.ai_settings.test.ts`, `commission.utils.test.ts`, `contract.utils.test.ts`, `content_gallery_fix.test.ts`, `paymaster.test.ts`, `integration/auth.integration.test.ts`, `integration/ppv_subscription.test.ts`

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
