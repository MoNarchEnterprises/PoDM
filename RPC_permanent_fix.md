# RPC Permanent Fix — `pm_sponsorUserOperation: UserOperation reverted during simulation with reason: 0x`

Authoritative incident report + permanent prevention plan for the recurring "paymaster simulation reverts with `0x`" failure that reappears every time the payment contract is changed.

---

## 1. Current Incident (diagnosed 2026-07-31)

### Symptom

```
Paymaster RPC error (pm_sponsorUserOperation): UserOperation reverted during simulation with reason: 0x
```

Thrown from `server/services/paymaster.service.ts:31` on the embedded-wallet payment path (`userOperation.service.ts` → `PimlicoPaymasterService.sponsorUserOperation`). Pimlico simulates the whole UserOp (EntryPoint → SimpleAccount `executeBatch` → inner calls) before agreeing to sponsor; the inner payment call reverted with an **empty** reason (`0x`), so simulation failed.

### Root cause (confirmed on-chain)

The backend runtime is pointed at the **old v1 contract** while it builds **v2 calldata**.

| File | `BASE_TESTNET_CONTRACT_ADDRESS` | Match |
|---|---|---|
| `PoDM_project/.env` (hardhat/deploy) | `0xa8f480C42C6216a35a435424409d8e0932ee66e9` (v2) | ✅ |
| `podm-frontend/.env` (`VITE_BASE_TESTNET_CONTRACT_ADDRESS`) | `0xa8f480C42C6216a35a435424409d8e0932ee66e9` (v2) | ✅ |
| `PoDM_project/server/.env` (runtime) | `0x454D9F55E580928876447096348E41f832d4a448` (**v1**) | ❌ **THE BUG** |

`server/Server.ts:10-15` loads `server/.env` first, so the root `.env` being correct does **not** rescue the runtime. `userOperation.service.ts:169` reads `BASE_TESTNET_CONTRACT_ADDRESS` from the runtime env and encodes the v2 6-arg `paySubscription`/`payTip`/`payPPV` calldata, then targets v1 `0x454D9F55…`.

`eth_getCode` on Base Sepolia proves the mismatch:

- `0xa8f480…` — 14,468 bytes, contains selectors `e87c1a59` (paySubscription), `7a02b81c` (payTip) → real v2 code live.
- `0x454D9F55…` — 11,636 bytes, does **not** contain `e87c1a59` → v1, no matching function.

v1 has no `fallback()`, so the unknown-selector call reverts with an empty reason; the empty revert bubbles through SimpleAccount → EntryPoint simulation → Pimlico reports `reason: 0x`.

### Why this incident happened

The v2 contract was deployed to `0xa8f480…` and the root + frontend env files were updated, but `server/.env` was missed. **Three separate env files carry the contract address with zero machine-enforced consistency** — exactly the class of manual-sync failure that recurs on every contract change.

---

## 2. The Class of Bug (why it keeps coming back)

The contract's public surface is duplicated by hand across 10+ locations in two codebases and three env files. A contract change that doesn't update **all** of them in lockstep produces an opaque `0x` revert (or silent verification failure):

| # | Surface | Location (current state) |
|---|---|---|
| 1 | Contract address (runtime) | `PoDM_project/server/.env` → v1 ❌ |
| 2 | Contract address (deploy/scripts) | `PoDM_project/.env` → v2 ✅ |
| 3 | Contract address (browser wallet) | `podm-frontend/.env` (`VITE_BASE_TESTNET_CONTRACT_ADDRESS`) → v2 ✅ |
| 4 | Pay ABI (embedded wallet calldata) | `server/services/userOperation.service.ts:17-21` → 6-arg ✅ |
| 5 | Renewal ABI (calldata) | `server/jobs/renewSubscriptions.ts:39` → 6-arg ✅ |
| 6 | Pay selectors (browser-wallet calldata) | `podm-frontend/src/shared/hooks/useCryptoPayment.ts:5-7` → v2 ✅ |
| 7 | ERC-20 approve/allowance selectors (browser wallet) | `useCryptoPayment.ts:3-4` → **WRONG** (`0xb3886be3`/`0xd1ac244a`; canonical `0x095ea7b3`/`0xdd62ed3e`) |
| 8 | Event topic hashes | `server/services/cryptoPayment.service.ts:32-34`, `verification.service.ts:10-12` |
| 9 | Event log-data slot layout | `cryptoPayment.service.ts:239-240`, `verification.service.ts:176-177` (indices hardcoded) |
| 10 | Fee policy (bps) | `contract` constructor `platformFeeBps`, `referralFeeBps=100`, `PLATFORM_FEE_BPS` env, `lib/constants.ts` |

Prior incidents (`docs/bundler_fix.md`, `docs/bundler_error_fix.md`) were one-off patches to the same fragile pipeline (factory/factoryData, initCode format, sponsorship threshold). Each was fixed at a single symptom; the underlying manual-sync fragility was never addressed — so the next contract update re-broke it.

---

## 3. Phase 0 — Immediate remediation (this incident)

**One line, no redeploy** (the v2 contract is already live at `0xa8f480C42C6216a35a435424409d8e0932ee66e9`):

1. Set `BASE_TESTNET_CONTRACT_ADDRESS=0xa8f480C42C6216a35a435424409d8e0932ee66e9` in `PoDM_project/server/.env`.
2. Restart the backend.
3. Verify one embedded-wallet payment end-to-end (sponsorship succeeds, tx Cleared, background verification passes).

This heals the whole runtime at once because `userOperation.service.ts`, `verification.service.ts`, `renewSubscriptions.ts`, and `payout.service.ts` all read the same runtime env var.

---

## 4. Permanent Fix (prevention, by layer)

The goal: **a contract change can no longer land with any consumer out of sync, and any remaining failure reports a readable reason instead of `0x`.**

### Layer 1 — Single source of truth (generated contract config)

- Add a generator script (`contracts/scripts/generateContractConfig.ts`) that reads the compiled artifact (`contracts/artifacts/contracts/PoDMPaymentProtocol.sol/PoDMPaymentProtocol.json`) and emits a TS module containing, **computed from the ABI**:
  - function selectors (keccak256)
  - event topic hashes
  - `ethers.Interface` ABI strings for `encodeFunctionData`
  - event log-data slot order
  - default deployed address per network (from the artifact/metadata or env)
- Backend consumers import it: replace `PODM_ABI` (`userOperation.service.ts:17-21`), renewal `Interface` (`renewSubscriptions.ts:39`), `EVENT_TOPICS` in both verifiers, and the hardcoded log-slot indices.
- Frontend consumers import it: replace the hardcoded selectors in `useCryptoPayment.ts` **and fix the two ERC-20 selectors** to the canonical `0x095ea7b3` (approve) / `0xdd62ed3e` (allowance).
- Result: there is exactly **one** place the ABI surface is defined (the compiled artifact); everything else derives from it. Hand-editing selectors/topics becomes impossible.

### Layer 2 — Automated consistency gate (the enforcement)

- New script `scripts/check-contract-sync.ts` + npm script `check:contract`, wired into **CI and `predeploy`** (and runnable locally):
  1. **ABI vs consumers**: compute selectors/topics from the artifact and assert each consumer matches (imports the generated config, so drift = import break — plus a byte-comparison against any residual literals).
  2. **Env reconciliation**: parse `PoDM_project/.env`, `PoDM_project/server/.env`, and `podm-frontend/.env`; assert all three carry the **same** `BASE_TESTNET_CONTRACT_ADDRESS`/`VITE_BASE_TESTNET_CONTRACT_ADDRESS` per network. **This single check would have caught today's incident.**
  3. **On-chain proof**: `eth_getCode(<deployed address>)` is non-empty and contains every selector's byte sequence (proves the deployed code actually implements the ABI we encode against). This converts the "silently points at the wrong contract" failure into a loud CI failure.
- Failure output is a table: `file → expected → actual`.

### Layer 3 — Post-deploy smoke test (catch before flipping env)

- New `contracts/scripts/smoke-test.ts`, run against the **newly deployed** address before any env var is changed:
  1. `eth_getCode` length > 0 and contains all selectors.
  2. `eth_call` the view functions (`platformTreasury()`, `platformFeeBps()`, `referralFeeBps()`) → sane values.
  3. `eth_call`/`eth_estimateGas` the **exact encoded `payX` calldata** from a funded test smart account → confirms no `0x` revert before the address is promoted to env.
- `deploy.ts` already prints the address; the runbook promotes it to **all three** env files together and re-runs `check-contract-sync`.

### Layer 4 — Runtime readability (stop seeing `0x`)

- Before `pm_sponsorUserOperation`, simulate the inner `executeBatch` with an `eth_call` (dummy signature, `stateOverride` to inject the sender's USDC balance) and decode any revert:
  - `Error(string)` (4-byte selector `0x08c379a0` + message),
  - custom errors, ERC-20/EntryPoint codes (e.g., `AA21`, ERC-20 transfer failures),
  - empty revert (`0x`) → map to the known causes below.
- Surface the decoded reason in the API response/log instead of `pm_sponsorUserOperation … reason: 0x`.
- Common empty-revert causes to classify: contract address points at code with no matching function (Phase 0/Layer 2), smart account has 0 USDC, allowance not granted, USDC paused/blacklisted, creator/referrer resolved to zero address.

### Layer 5 — Contract-change runbook (process)

Codify in this doc + `AGENTS.md` a mandatory checklist for **every** contract change:

1. Edit contract → `npx hardhat compile` (all contract tests pass).
2. Regenerate contract config → `npm run check:contract` **must pass**.
3. Full backend build + frontend build + unit tests.
4. Deploy → `npx hardhat run scripts/deploy.ts --network baseSepolia`.
5. `npm run smoke` against the new address (Layer 3).
6. Update **all three** env files from the deploy output (one commit), re-run `check:contract` + `smoke`.
7. Record the new address + ABI change in `AGENTS.md` (deployed-address bullet) in the same change.

---

## 5. Implementation order

| Step | Change | Done when |
|---|---|---|
| 0 | Fix `server/.env` address | Embedded-wallet payment Clears end-to-end |
| 1 | Layer 4: pre-sponsor `eth_call` + revert decoding | A broken op returns a readable reason, not `0x` |
| 2 | Layer 1: generator + generated config, migrate backend consumers | No inline ABI/topics/slots left in `server/services` |
| 3 | Layer 1: migrate frontend `useCryptoPayment.ts`, fix approve/allowance selectors | Browser-wallet approve + payX works |
| 4 | Layer 2: `check-contract-sync` in CI + predeploy | CI fails on any address/ABI drift |
| 5 | Layer 3: smoke test in deploy flow | Deploy script cannot be "done" without green smoke |
| 6 | Layer 5: runbook in AGENTS.md | Contract-change checklist enforced |

---

## 6. Definition of done

- Current payment flow succeeds: paymaster sponsorship → mined UserOp → Cleared + verified.
- `npm run check:contract` passes locally and in CI.
- Deliberately breaking any one of the three env files makes CI (and local `check:contract`) fail.
- A deliberately wrong ABI (e.g., reverted v1 signature) fails the gate, not runtime.
- Browser-wallet path uses canonical ERC-20 selectors.

---

## 7. Retro — what today's incident looked like through this plan

- Layer 2 (env reconciliation) would have failed the gate the moment `server/.env` was left at v1 → the v2 deploy would never have been "done".
- Layer 4 would have turned the empty `0x` into: `Inner call reverted: no function matching selector 0xe87c1a59 at 0x454D9F55… (server/.env points at the old v1 contract)`.
- Layer 1 would have made the v2 selector change impossible to hand-copy incompletely.
