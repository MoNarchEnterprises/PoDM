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
- Solidity smart contract (`/contracts/PoDMPaymentProtocol.sol`). Test-only contract fixture `MockUSDC.sol` (local USDC stand-in) lives in `contracts/contracts/`. `Imports.sol` exists solely so Hardhat compiles the non-upgradeable `TimelockController` artifact used by the contract tests, deploy, and upgrade scripts — do NOT delete without restoring the import elsewhere. Hostile security fixtures (`MaliciousV2.sol`, `ReentrantToken.sol`) and the Hardhat attack/reproduction suites live in the git-ignored `security/` workspace (see `security/AGENTS.md`), NOT in this project tree — this folder only keeps legitimate production tests (`test/PoDMPaymentProtocol.test.ts`, `test/security.test.ts`). `contracts/tsconfig.json` includes `typechain-types/` so `getContractFactory('MockUSDC')` resolves to a typed factory (otherwise `transfer`/`approve` fall back to `BaseContract` and `tsc` errors). The contract trust model (H-05/M-03) and the conditions under which that finding may be closed are recorded in `contracts/GOVERNANCE.md` — read it before touching `PoDMPaymentProtocol.sol` access control, the deploy script, or the upgrade script.
- Shared TypeScript types (`/common/types/`)
- Backend test suite (Jest unit + integration)
- Dockerfile and Docker Compose service definition
- Utility modules (`/server/utils/`)

## Local Contracts

- **Stack**: Node.js (CommonJS), Express 5, TypeScript 5
- **Database**: Supabase (PostgreSQL) via `@supabase/supabase-js`
- **Payments**: USDC on Base via PoDMPaymentProtocol smart contract (OpenZeppelin `ReentrancyGuard`, `AccessControlUpgradeable` role-gated + `PausableUpgradeable`, UUPS proxy upgradeability, OpenZeppelin `IERC20` with `SafeERC20`). H-05/M-03 trust model (Option C): the legacy single `owner` is gone; five `AccessControl` roles now split the trust boundary — `UPGRADE_ROLE` (holder = `TimelockController`, never an EOA), `PAUSER_ROLE`, `KEEPER_ROLE` (renewals only), `TREASURY_ROLE` (treasury/fees/keeper/idempotency/USDC pin config), `PAYOUT_ROLE` (`processPayout` only — the single highest-trust ERC-20 push, deliberately kept separate from `TREASURY_ROLE`). `DEFAULT_ADMIN_ROLE` is its own dedicated signer and can ONLY grant/revoke the other four roles — it cannot upgrade, pause, configure, payout, or renew. Full decision, risk budget, bootstrap/rotation, and the conditions under which H-05/M-03 may be closed are in `contracts/GOVERNANCE.md`. Contract still pins canonical USDC token address (`usdcToken` via `onlyUsdc` modifier). Every fan payment splits on-chain in a single transaction: treasury + creator, plus an optional referrer share (`referralFeeBps`, default 100 = 1%) deducted from the platform commission. Pay functions (`paySubscription`/`payTip`/`payPPV`/`processRenewal`) accept a `referrer` address (zero address = no referral) and `customPlatformFeeBps` parameter (caller passes creator's custom rate or 0 for 12.5% default); events carry `referralFee` + `referrer`. `processRenewal` uses `onlyKeeper` and `onlyUsdc` modifiers. **Storage incompatibility:** the legacy single-owner proxy `0x6065836CA141DA7579B4D2F43178c9CBA30bdbcD` (Base Sepolia, implementation `0xB353406AC0e6B05F3B355621a8713e4E2B58A368`) is NOT a storage-compatible upgrade target — bootstrapping the role-separated contract requires a fresh proxy via `scripts/deploy.ts` (which provisions the TimelockController + 5 roles + post-deploy attestation) and repointing `BASE_TESTNET_CONTRACT_ADDRESS`/`BASE_CONTRACT_ADDRESS`. Upgrades against the new proxy go through the timelock via `scripts/upgrade-contract.ts` (`MODE=schedule` → wait → `MODE=execute`), NOT via `upgrades.upgradeProxy` with a single owner key.
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
| `npm run check:contract` | Run contract sync & bytecode verification gate (follows ERC-1967 impl slot when the configured address is a proxy; verifies implementation bytecode contains expected selectors) |
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
- **Role-separation / upgrade-timelock env vars** (H-05/M-03, required by `contracts/scripts/deploy.ts` and `contracts/scripts/upgrade-contract.ts`): `GOVERNANCE_DEFAULT_ADMIN` (Safe multisig in prod), `GOVERNANCE_PAUSER`, `GOVERNANCE_KEEPER`, `GOVERNANCE_TREASURY_AUTHORITY`, `GOVERNANCE_PAYOUT_AUTHORITY`, `UPGRADE_AUTHORITY_TIMELOCK_ADDRESS` (post-deploy, used by the upgrade script). Optional at deploy time: `TIMELOCK_PROPOSERS`, `TIMELOCK_EXECUTORS`, `TIMELOCK_MIN_DELAY_SECONDS` (default 3600; use ≥ 172800 = 48h in production), `USDC_CONTRACT_ADDRESS`, `DEPLOYER_BOOTSTRAPS_USDC`. Upgrade script uses `MODE=info|schedule|execute`, `UPGRADE_OP_ID`, `UPGRADE_NEW_IMPL`. See `contracts/GOVERNANCE.md`.
- **Migration required for embedded wallet signing**: `migrations/add_provider_wallet_id.sql` adds `profiles.crypto_wallet_provider_id` (Privy wallet id) — needed for `signUserOperation` to resolve the EOA to sign with

## Verification

- `npm test` — Jest with ts-jest (unit + integration tests in `/server/tests/`). Integration tests under `server/tests/integration/` require `npm run dev:server` to be running on port 5000 with seed data.
- CI pipeline (`.github/workflows/ci.yml`) runs tests on push/PR to main/master
- Existing tests: `auth.controller.test.ts`, `admin.ai_settings.test.ts`, `commission.utils.test.ts`, `contract.utils.test.ts`, `content_gallery_fix.test.ts`, `paymaster.test.ts`, `integration/auth.integration.test.ts`, `integration/ppv_subscription.test.ts`
- Contract Hardhat suite (`contracts/test/PoDMPaymentProtocol.test.ts` + `contracts/test/security.test.ts`): 52 tests covering fee/payment/referral/renewal logic, on-chain renewalId replay protection (`processedRenewals`), H-05/M-03 role separation (5 roles, default-admin non-operational, cross-role rejection for pause/fee/payout/upgrade), and timelock-gated UUPS upgrade (bypass rejection, scheduled execution after delay, direct `upgradeToAndCall` from a `UPGRADE_ROLE` holder). Run with `npx hardhat test` (compiled via `npm run compile`).

## Current Security Controls

- Browser payments register and attach a payment intent before broadcast; `server/jobs/reconcilePaymentIntents.ts` is the scheduler entrypoint for intents with an attached transaction hash.
- Payouts use atomic balance reservations from `migrations/add_payout_reservations.sql`; a reservation remains pending after broadcast until reconciliation can finalize it.
- All payout/renewal RPCs (`reserve_payout`, `complete_payout_reservation`, `release_payout_reservation`, `claim_subscription_renewal`, `acquire_payout_lock`, `release_payout_lock`) are `SECURITY DEFINER` with `SET search_path = public, pg_temp` and EXECUTE granted to `service_role` only (anon/authenticated revoked). `payment_intents` and `payout_reservations` are service-role-only tables: RLS enabled, all DML revoked from PUBLIC/anon/authenticated (`migrations/secure_payment_intents_payout_reservations.sql`). `transaction_type` enum includes `SubscriptionRenewal` and `Payout` (`migrations/add_subscription_renewal_payout_types.sql`).
- Payout recovery (H-03) is **mitigated**: `reserve_payout` atomically prevents double payouts (partial unique index `payout_reservations_one_pending_per_creator`), and `payout.service.ts` attaches the broadcast `tx.hash` to the reservation right after `sendTransaction` (before `tx.wait()`). The `reconcilePayoutReservations` job (`server/jobs/reconcilePayoutReservations.ts`, run from the production scheduler like `reconcilePaymentIntents`) resolves any `pending` reservation older than `PAYOUT_RESERVATION_GRACE_MS` (default 5 min): with a hash → on-chain receipt (status 1 → backfill Payout row + complete; status 0 → release; no receipt → release after `PAYOUT_RESERVATION_NO_RECEIPT_RELEASE_MS`, default 1h); without a hash (crash before attach) → scan `PayoutCompleted` events for the creator wallet (found → complete with event tx hash; not found → release); creator with no wallet → left pending for review. Funds that moved on-chain are never released. Verified against the live DB (H-03 36/36, reconciler harness 13/13, crash-recovery 8/8) and 7 Jest unit tests.
- Renewal idempotency and crash-recovery (H-04) is **implemented and hardened**: Defense-in-depth across database concurrency, deterministic renewal identity, authoritative pending tx reconciliation, DB uniqueness constraints, and smart contract on-chain replay protection.
  - **Database Concurrency & State Machine**: `claim_subscription_renewal` (`migrations/add_renewal_idempotency_state_machine.sql`) atomically transitions `renewal_status` to `PROCESSING` with a 30-minute lease, binding `p_renewal_id` and `p_renewal_period`.
  - **Deterministic Identity**: Derived as `renewal:{subscriptionId}:{renewalPeriod}` and hashed to `bytes32` for the contract.
  - **Authoritative Pending Hash**: `server/jobs/renewSubscriptions.ts` captures `tx.hash` immediately after broadcast into `renewal_pending_tx_hash` with `renewal_status = 'SUBMITTED'`. Phase 1 `reconcilePendingRenewals()` verifies stored hashes before processing new due renewals (status 1 + verified log → `CONFIRMED` & settle; status 0 → `RETRYABLE` & clear; unmined after timeout → `RETRYABLE`). Never re-broadcasts.
  - **Database Uniqueness**: Partial unique index `idx_transactions_renewal_id_unique` on `transactions(renewal_id)` and unique index on `blockchain_tx_hash` prevent duplicate payments or transaction records.
  - **On-Chain Replay Guard**: `PoDMPaymentProtocol.processRenewal` requires `!processedRenewals[renewalId]`, stores `processedRenewals[renewalId] = true`, and emits `SubscriptionRenewed` with `bytes32 indexed renewalId`.
  - **Verification**: 52 Hardhat tests passing (including on-chain replay rejection) and 11 Jest unit tests covering concurrency, crash-recovery, reverted transactions, unmined timeouts, and state transitions. `contracts/contracts/FakeRenewal.sol` is never deployed to a real network.
- `assertCatalogPrice` (`paymentCatalog.service.ts`) is shared by browser verification (`POST /verify`), payment intent registration (`POST /intent`), and embedded UserOps, strictly resolving authoritative database catalog pricing (subscription tiers and PPV content) and rejecting client-supplied price manipulation (H-01 / V-A04). `createSubscriptionForUser` enforces price equality on reused cleared transactions, and `payment_intents` updates match creator, transaction type, and amount.
- **Cryptographic Wallet Ownership Verification (H-02)**: Setting or replacing `crypto_wallet_address` requires cryptographic proof of ownership. The backend issues short-lived (5 min), single-use, domain-separated challenges (`wallet_verification_challenges` table via `migrations/create_wallet_verification_challenges.sql`) bound to the authenticated `user_id` and normalized `wallet_address`. `POST /api/v1/payments/crypto/wallet/challenge` generates the canonical challenge message. `POST /api/v1/payments/crypto/wallet` requires `challengeId` and `signature` (fail-closed), verifies the recovered signer against the requested wallet, atomically marks the challenge `used_at = now()` (preventing replay and concurrency reuse), and updates the profile only after verification succeeds. Generic profile/settings mutation endpoints (`updateFanSettings`, `updateUserProfile`) strictly strip wallet fields so no unauthenticated or unverified write paths bypass cryptographic verification. Verified by 17 Jest tests in `h02_wallet_ownership.test.ts`.
- Owner-key / upgrade concentration (H-05/M-03) is **implemented Option C and pending independent attestation**. The legacy single-owner proxy at `0x6065836CA141DA7579B4D2F43178c9CBA30bdbcD` on Base Sepolia still holds the OLD trust model — it must NOT be upgraded in place (storage-incompatible with the new `AccessControlUpgradeable`-based contract). The role-separated contract + `TimelockController` deploy ritual lives in `contracts/scripts/deploy.ts`. Hardhat suite (`contracts/test/PoDMPaymentProtocol.test.ts`) proves role exclusivity, default-admin non-operational, timelock-bypass rejection, and timelock-gated upgrade execution — **51 passing**. **H-05/M-03 is NOT marked fixed in any report until the role holdings above are independently attested against the deployed Base Sepolia/Base proxy (positive + negative checks); see `contracts/GOVERNANCE.md` for the closeout criteria. Until then every remediation report (VERIFICATION_OF_REMEDIATION.md, REMAINING-BLOCKERS.md) must record the finding as open.

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
