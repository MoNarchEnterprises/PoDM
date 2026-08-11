# Production Network Trap Fix Plan (BLOCKER-01)

## Problem

Setting `NODE_ENV=production` is conflated with choosing the blockchain network.
`getContractConfig()` in `PoDM_project/server/utils/contract.utils.ts` and its
duplicated siblings key **network selection** off the same flag used for **runtime
behavior** (cookie `SameSite`, error stacks, rate limits, tracing, logging):

- `NODE_ENV !== 'production'` → Base Sepolia (chain 84532), `https://sepolia.base.org`
- `NODE_ENV === 'production'`  → Base Mainnet (chain 8453), `https://mainnet.base.org`

Because `BASE_CONTRACT_ADDRESS` is still an unconfigured placeholder
(`PLACEHOLDER_BASE_MAINNET_CONTRACT_ADDRESS` in `PoDM_project/.env:49` and absent
from `server/.env`), flipping to production makes every payment path query mainnet
with an empty/placeholder contract address — breaking testnet payment verification,
balance reads, smart-account derivation, payouts, and onramp completions.

We want to ship a `NODE_ENV=production` deployment **while payments stay on Base
Sepolia**. These two concerns must be decoupled.

## Root Cause

`NODE_ENV` is a runtime-mode switch. The blockchain network is a deployment
parameter. The codebase wires the latter to the former across ~10 backend files,
each repeating its own copy of the `isProd ? mainnet : sepolia` ternary. There is
no single source of truth for network config and no fail-fast guard for
placeholder/incomplete mainnet values.

## Affected Inventory

### Backend — duplicated network resolution

| File | Location | Issue |
|---|---|---|
| `server/utils/contract.utils.ts` | :19-29 | `getContractConfig()` keys network off `NODE_ENV`; mainnet contract falls back to `''` |
| `server/controllers/embeddedWallet.controller.ts` | :16-18 `getRpcUrl()` | Local duplicate ternary; USDC addresses hardcoded at :70-72, :110-112, :169-171 |
| `server/services/embeddedWallet.provider.ts` | :158-162 | Local duplicate ternary; **`chainId = 84532` hardcoded** at :172 |
| `server/services/admin.service.ts` | :18-22 `getRpcUrl()` | Local duplicate ternary; USDC addresses hardcoded at :26-28 |
| `server/services/bundler.service.ts` | :39-46 | `chainNamespace` (`base`/`base-sepolia`) + `standardRpcUrl` derived from `NODE_ENV` |
| `server/services/paymaster.service.ts` | :12-14 | `chainNamespace` derived from `NODE_ENV`; **Pimlico API key hardcoded fallback** at :11 |
| `server/services/smartAccount.service.ts` | :13-18 | Local duplicate ternary; `DEFAULT_FACTORY` testnet hardcoded at :7 |
| `server/services/userOperation.service.ts` | :129-132 | Local duplicate ternary for RPC |
| `server/services/payout.service.ts` | :117 | **`chain_id: 84532` hardcoded** when recording payout tx |
| `server/services/onramp.service.ts` | :226 | **`chain_id: 84532` hardcoded** when completing onramp tx |
| `server/routes/health.routes.ts` | :37 | `BASE_RPC_URL || BASE_TESTNET_RPC_URL` — mainnet wins on production regardless of active chain |

### Backend — already correct (consume `getContractConfig`)

`cryptoPayment.service.ts:29-31`, `verification.service.ts:11-13`,
`userOperation.service.ts:174`, `payout.service.ts:42`, `renewSubscriptions.ts:31,95`
use `getContractConfig()` — they inherit the trap but need no per-file change once
the source is fixed.

### Env files

| File | Issue |
|---|---|
| `PoDM_project/.env:49` | `BASE_CONTRACT_ADDRESS=PLACEHOLDER_BASE_MAINNET_CONTRACT_ADDRESS` — unconfigured mainnet placeholder |
| `PoDM_project/.env:48` | `BASE_RPC_URL=https://mainnet.base.org` set unconditionally |
| `server/.env` | No `BASE_CONTRACT_ADDRESS`, no `BASE_RPC_URL`, no `PLATFORM_TREASURY_ADDRESS` |
| `server/.env:47-49` | Pimlico bundler/paymaster URLs pinned to `base-sepolia` |
| `server/.env:43-44` | Privy creds present (needed in both networks) |

### Frontend

| File | Location | Issue |
|---|---|---|
| `podm-frontend/.env:7` | `VITE_BASE_TESTNET_CONTRACT_ADDRESS` only — no mainnet build var |
| `src/shared/hooks/useCryptoWallet.ts` | :4-8 `BASE_SEPOLIA_*` + USDC map (84532/8453), :14 `getRpcUrl()` only reads testnet var, :73-95 `switchToBaseSepolia` only, :103 `setChainId(84532)` hardcoded | Browser wallet flow is testnet-only |
| `src/shared/hooks/useCryptoPayment.ts` | :16-21 USDC map, :23-28 `getContractAddress()` reads `VITE_BASE_CONTRACT_ADDRESS \|\| VITE_BASE_TESTNET_CONTRACT_ADDRESS`, :153 default chain 84532 | Reads env correctly but defaults to testnet |

## Fix Plan (Recommended: explicit network selector)

### Phase 1 — Decouple network from NODE_ENV (backend)

1. **Add a network selector env var**, e.g. `CHAIN_NETWORK=testnet|mainnet` (default
   `testnet`). Document it in `server/.env`, `PoDM_project/.env`, root `.env.example`
   if one exists, and `server/config` bootstrap if env is validated at startup.
2. **Centralize in `contract.utils.ts`** (single source of truth):
   - `getChainNetwork(): 'testnet' | 'mainnet'` — reads `CHAIN_NETWORK` only.
   - `getContractConfig()` uses `getChainNetwork()` instead of
     `process.env.NODE_ENV === 'production'`.
   - Add shared helpers consumed everywhere: `getRpcUrl()`, `getUsdcAddress()`,
     `getChainId()`, `getChainNamespace()` (`base-sepolia`/`base`).
   - **Fail-fast**: `getContractConfig()` throws (or logs fatal) when the active
     network's contract address is empty or still a `PLACEHOLDER_` value — never
     silently fall back to `''` or a placeholder RPC/address.
3. **Replace every local duplicate** with the shared helpers:
   - `embeddedWallet.controller.ts:16-18` → `getRpcUrl()`; replace hardcoded USDC
     addresses at :70-72, :110-112, :169-171 with `getUsdcAddress()`.
   - `embeddedWallet.provider.ts:158-162` → `getRpcUrl()`; fix hardcoded
     `chainId = 84532` at :172 to `getChainId()`.
   - `admin.service.ts:18-22` → `getRpcUrl()`; replace :26-28 with `getUsdcAddress()`.
   - `bundler.service.ts:39-46` → `getChainNamespace()` + `getRpcUrl()`.
   - `paymaster.service.ts:12-14` → `getChainNamespace()`; remove the hardcoded
     Pimlico API key fallback at :11 (require `PIMLICO_API_KEY`, or load the URL +
     key from env for both networks).
   - `smartAccount.service.ts:13-18` → `getRpcUrl()`; make `SMART_ACCOUNT_FACTORY_ADDRESS`
     per-network (add `SMART_ACCOUNT_FACTORY_ADDRESS_MAINNET`, keep testnet default).
   - `userOperation.service.ts:129-132` → `getRpcUrl()`.
   - `payout.service.ts:117` and `onramp.service.ts:226` → `getChainId()` instead of
     hardcoded `84532`.
   - `health.routes.ts:37` → `getRpcUrl()` (active-network aware).
   - `bundler.service.ts` / `userOperation.service.ts` EntryPoint + factory:
     make `ENTRYPOINT_ADDRESS`/`SMART_ACCOUNT_FACTORY_ADDRESS` per-network
     (`*_MAINNET` variants), since both current values are Base Sepolia only.
4. **Payout/verification chain_id**: ensure recorded `chain_id` always comes from
   `getChainId()` so testnet transactions stay labeled 84532 even under
   `NODE_ENV=production`.

### Phase 2 — Env hygiene

5. Remove `PLACEHOLDER_BASE_MAINNET_CONTRACT_ADDRESS` from `PoDM_project/.env:49`
   (leave the key empty or commented until a real mainnet address exists) so the
   fail-fast guard trips instead of silently running against a bogus address.
6. Align `server/.env` and `PoDM_project/.env` so both define `CHAIN_NETWORK`,
   `BASE_TESTNET_CONTRACT_ADDRESS`, and (once real) `BASE_CONTRACT_ADDRESS`,
   `BASE_RPC_URL`, `BASE_TESTNET_RPC_URL`.
7. Set `CHAIN_NETWORK=testnet` in the production deployment for now — payments stay
   on Base Sepolia while the runtime runs in production mode. Flip to `mainnet`
   only after a mainnet contract address + USDC + treasury are configured.

### Phase 3 — Frontend

8. `useCryptoWallet.ts`:
   - `getRpcUrl()` → read `VITE_BASE_RPC_URL || VITE_BASE_TESTNET_RPC_URL`.
   - Generalize `switchToBaseSepolia` into `switchToBase(chainId, rpcUrl, explorer)`
     driven by a `VITE_CHAIN_ID`/`VITE_NETWORK` build var (default 84532/testnet).
   - Replace `setChainId(84532)` at :103 with the resolved chain id.
9. `useCryptoPayment.ts`: keep the `VITE_BASE_CONTRACT_ADDRESS ||
   VITE_BASE_TESTNET_CONTRACT_ADDRESS` resolution, but add `VITE_CHAIN_ID` (default
   `84532`) for the fallback at :153 instead of the hardcoded testnet constant.
10. Add `VITE_BASE_CONTRACT_ADDRESS`/`VITE_CHAIN_ID` to `podm-frontend/.env` when the
    mainnet contract exists; keep the current testnet value for now.

## Deployment Steps for "Production now, Testnet payments"

1. Ship the Phase 1 + 2 changes (decoupling + fail-fast).
2. Deploy backend with `NODE_ENV=production` **and** `CHAIN_NETWORK=testnet`.
   - Production runtime behavior (secure cookies, min logging, no stacks) activates.
   - Payments, verification, balances, smart accounts, payouts, onramp all resolve
     to Base Sepolia config from `getContractConfig()`.
3. `npm test` and `npm run build` on backend; run the contract sync/bytecode gate
   (`npm run check:contract`).
4. Smoke test on the deployed env: create embedded wallet, tip via browser wallet
   and embedded wallet, verify tx lands `Cleared` with `chain_id = 84532`.
5. Later, when mainnet contract + treasury exist: set `CHAIN_NETWORK=mainnet`,
   configure `BASE_CONTRACT_ADDRESS`/`BASE_RPC_URL`/`PLATFORM_TREASURY_ADDRESS` and
   per-network factory/entrypoint, build frontend with `VITE_CHAIN_ID=8453` +
   `VITE_BASE_CONTRACT_ADDRESS`.

## Files to Modify (backend)

| File | Change |
|---|---|
| `server/utils/contract.utils.ts` | Network selector + shared helpers + fail-fast guard |
| `server/controllers/embeddedWallet.controller.ts` | Use `getRpcUrl()`/`getUsdcAddress()` |
| `server/services/embeddedWallet.provider.ts` | Use `getRpcUrl()`/`getChainId()`; remove hardcoded 84532 |
| `server/services/admin.service.ts` | Use `getRpcUrl()`/`getUsdcAddress()` |
| `server/services/bundler.service.ts` | Use `getChainNamespace()`/`getRpcUrl()`; per-network entrypoint |
| `server/services/paymaster.service.ts` | Use `getChainNamespace()`; drop hardcoded API key |
| `server/services/smartAccount.service.ts` | Use `getRpcUrl()`; per-network factory |
| `server/services/userOperation.service.ts` | Use `getRpcUrl()`; per-network entrypoint |
| `server/services/payout.service.ts` | `getChainId()` for recorded chain |
| `server/services/onramp.service.ts` | `getChainId()` for recorded chain |
| `server/routes/health.routes.ts` | Active-network RPC check |
| `PoDM_project/.env`, `server/.env` | `CHAIN_NETWORK`, remove placeholder, align vars |
| `podm-frontend/.env`, `src/shared/hooks/useCryptoWallet.ts`, `src/shared/hooks/useCryptoPayment.ts` | Per-network build config |

## Verification

- `npm test` (backend Jest) — add a unit test asserting `getContractConfig()`
  returns Sepolia config for `CHAIN_NETWORK=testnet` even when `NODE_ENV=production`,
  and that a placeholder/empty `BASE_CONTRACT_ADDRESS` fails fast.
- `npm run build` (backend + frontend).
- `npm run check:contract` — contract sync/bytecode gate still passes against testnet.
- Manual smoke: wallet create → browser-wallet tip → embedded-wallet tip →
  `GET /payments` shows `Cleared` with `chain_id = 84532`.
