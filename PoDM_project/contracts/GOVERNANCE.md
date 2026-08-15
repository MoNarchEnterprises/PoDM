# PoDM On-Chain Governance & Trust Model

This document is the binding record of PoDM's governance decision for H-05/M-03
(owner/upgrade authority concentration). It is the authoritative reference for
deploy, ops, and any future auditor asking "what trust model did PoDM adopt
and what proves it is in place?"

## Decision

**Option C — keep UUPS but strongly constrain governance.** Adopted 2026-08-15
in response to the H-05/M-03 finding. The alternative options (A: Safe+timelock
operational config; B: freeze upgrades; C+A hybrid) were considered and
rejected for this stage. Option C removes the H-05 concentration directly
while preserving the upgradeability a beta-stage protocol still needs.

## Trust boundaries — five roles, one admin

The single legacy `owner` (which simultaneously held upgrade authority,
treasury change, fee change, pause, payout push, and keeper nomination) is
replaced with five distinct `AccessControl` roles plus `DEFAULT_ADMIN_ROLE`.

| Role | Holder | Powers | What it CANNOT do |
|---|---|---|---|
| `DEFAULT_ADMIN_ROLE` | Safe multisig (prod) / deployer (bootstrap only) | grant / revoke the other four roles | upgrade, pause, configure, payout, renew |
| `UPGRADE_ROLE` | `TimelockController` instance — never an EOA | `_authorizeUpgrade` only | anything except authorise an upgrade (cannot itself upgrade; only the timelock can run `upgradeToAndCall` after its delay) |
| `PAUSER_ROLE` | separate key | `pause` / `unpause` | upgrade, configure, payout, renew |
| `KEEPER_ROLE` | renewal worker key | `processRenewal` only (bounded by standing allowance logic) | everything else |
| `TREASURY_ROLE` | treasury config key | `setPlatformTreasury`, `setPlatformFeeBps`, `setReferralFeeBps`, `setCreatorFeeBps`, `setUsdcToken`, `setKeeper`, `setEnforceOnChainIdempotency` | push funds out; pause; upgrade; renew; grant/revoke roles |
| `PAYOUT_ROLE` | payout key — MUST NOT be the same key as `TREASURY_ROLE` in production | `processPayout` only (single highest-trust push of ERC-20) | configure treasury / fees / keeper / idempotency; upgrade; pause; renew |

Two deliberate invariants:

- No key holds ≥ 2 of the operational roles (`UPGRADE`/`PAUSER`/`KEEPER`/`TREASURY`/`PAYOUT`), and `DEFAULT_ADMIN_ROLE` is held by its own dedicated signer.
- `UPGRADE_ROLE` is never an EOA. It belongs to a `TimelockController`. The timelock itself uses the non-upgradeable `@openzeppelin/contracts/governance/TimelockController` (NOT the upgradeable variant — see `contracts/Imports.sol`) so its delay logic cannot be swapped out under the upgrade key.

## Risk budget — what is and is not mitigated by this design

- **Mitigated:** a single compromised owner key can no longer (a) swap the
  implementation arbitrarily, (b) redirect treasury, (c) push all
  proxy-held ERC-20 to an arbitrary address, (d) halt the protocol, (e)
  pull from standing renewal allowances. Each of those now requires a
  distinct, role-specific key, and upgrades require a scheduled
  timelock operation whose delay is observable before execution.
- **Not mitigated — deliberately:**
  - `DEFAULT_ADMIN_ROLE` can grant any operational role to any address. The
    admin key is therefore the most sensitive of all. A Safe multisig (≥ 2/3
    or 3/5 threshold) is the baseline expectation before mainnet stress and
    before any material USD flows through the proxy. A single admin EOA is an
    **interim** accept (and is flagged in `deploy.ts` via a deployer-must-not-
    hold-operational-role negative attestation) — it must be rotated to a
    multisig before public launch.
  - A proposer+executor who can sign both roles on the timelock can schedule
    and execute an upgrade with no social delay beyond the timelock delay.
    Production must hold these on different keys (different multisig signers
    where possible); the deploy script calls this out explicitly.
  - The role separation enforced on-chain is only as strong as the key
    management behind it. On-chain role grant is a *capability*, not a
    *guarantee* — see "Verification" below.

## Bootstrap and key rotation

1. **Bootstrap (testnet / initial deploy):** the deployer holds
   `DEFAULT_ADMIN_ROLE` only. The four operational roles are granted to the
   four named env-provided addresses, with `UPGRADE_ROLE` going to a freshly
   deployed `TimelockController`. The `scripts/deploy.ts` script runs a
   post-deploy attestation that prints `hasRole(...)` for each role and a
   **negative attestation** that the deployer holds no operational role. Any
   operational role held by the deployer is flagged as a VIOLATION.
2. **Before public launch (mainnet / real USD):**
   - Transfer `DEFAULT_ADMIN_ROLE` to a Safe multisig (2/3 or 3/5).
   - Verify each operational role is held by the production multisig/router
     for that boundary (the platform treasury and payout push can use a Safe
     with spend-limit policy if available; keeper and pauser can be hot keys
     on hardware signers).
   - Verify timelock proposer ≠ timelock executor (separate multig signers).
3. **Rotation:** role grants are revocable by `DEFAULT_ADMIN_ROLE` via
   `revokeRole` / `grantRole`. `TimelockController` admin role should be
   renounced after the proposer set is finalised so the timelock is
   self-managed.

## Storage incompatibility — DO NOT upgrade the legacy proxy in place

The legacy single-owner proxy at
`0x6065836CA141DA7579B4D2F43178c9CBA30bdbcD` (Base Sepolia) was deployed with
`OwnableUpgradeable`. The new contract uses `AccessControlUpgradeable`. The
storage layout does NOT line up — silently upgrading the legacy proxy would
corrupt stored state (allowances, paidHashes, fees, role assignments).

The correct path is: deploy a NEW proxy with the refactored contract and the
`scripts/deploy.ts` script, migrate any relevant live state, then repoint
`BASE_CONTRACT_ADDRESS` / `BASE_TESTNET_CONTRACT_ADDRESS` to the new
address and verify `npm run check:contract` passes. There is no upgrade path
from the legacy proxy to the new contract on purpose.

## Verification — what counts as "fixed", and what does not

Per the user's explicit instruction when this work was commissioned:

> *Don't let the report say "Role separation fixed" until the actual deployed
> contract demonstrates it.*

Therefore:

- **Local test evidence does NOT close H-05/M-03.** The 51-test Hardhat suite
  (`contracts/test/PoDMPaymentProtocol.test.ts`) proves the on-chain rules
  are correct, including the timelock-gated upgrade path, but it does not
  prove the deployed proxy uses them.
- **Deploy-script attestation does NOT close H-05/M-03.** It prints
  `hasRole(...)` for the configured holders, but it is operator self-report.
- **What closes H-05/M-03:** an *independent* record of each of the five
  role holders plus the timelock's `getMinDelay()` value, reproduced by
  querying the live proxy on Base Sepolia (and Base Mainnet once deployed),
  read from the chain via a block explorer or `ethers.getContractAt`.
  That record must include the negative check that no single address holds
  two of the five operational roles, and that no EOA holds
  `UPGRADE_ROLE`. **Until that record is produced, H-05/M-03 remains
  open in every report (VERIFICATION_OF_REMEDIATION.md,
  REMAINING-BLOCKERS.md).**

- **What closes H-05/M-03:** an *independent* record of each of the five
  role holders plus the timelock's `getMinDelay()` value, reproduced by
  querying the live proxy on Base Sepolia (and Base Mainnet once deployed),
  read from the chain via a block explorer or `ethers.getContractAt`.
  That record must include the negative check that no single address holds
  two of the five operational roles, and that no EOA holds
  `UPGRADE_ROLE`. **Until that record is produced, H-05/M-03 remains
  open in every report (VERIFICATION_OF_REMEDIATION.md,
  REMAINING-BLOCKERS.md).**

## R-04 Referral Authority (added 2026-08-18)

**Decision:** Option 1 — on-chain authoritative binding.

Per the architectural inconsistency documented in R-04, the contract's
acceptance of any caller-supplied `referrer` address with zero validation
below the on-chain layer created a risk: a fan paying directly to the
contract could redirect the 1% referral fee to an arbitrary address via a
direct-contract calldata injection, with the on-chain transaction
irreversibly moving USDC before the platform's post-tx verification could
reject it.

The on-chain binding ensures the economic invariant is enforced in
consensus, not merely reconciled after the fact.

**Closeout criteria:**
- `setReferrer` is callable only by `TREASURY_ROLE`.
- `_assertReferrer` is called at the top of `paySubscription`,
  `payTip`, `payPPV`, and `processRenewal`.
- A non-zero `referrer` that does not match the active on-chain binding
  causes the transaction to revert (USDC never moves).
- An independent block explorer attestation of the above three conditions
  is recorded before R-04 may be marked "fixed" in any report.

**What closes R-04:** an *independent* block explorer attestation of the
three conditions above, read from the deployed Base Sepolia (or Base
Mainnet) proxy. Until that record is produced, R-04 remains open in every
report (VERIFICATION_OF_REMEDIATION.md,
REMAINING-BLOCKERS.md).

## Operation runbook (condensed)

- **Deploy a new proxy:** see `scripts/deploy.ts`. Required env:
  `PLATFORM_TREASURY_ADDRESS`, `GOVERNANCE_DEFAULT_ADMIN`, `GOVERNANCE_PAUSER`,
  `GOVERNANCE_KEEPER`, `GOVERNANCE_TREASURY_AUTHORITY`,
  `GOVERNANCE_PAYOUT_AUTHORITY`. Optional: `TIMELOCK_PROPOSERS`,
  `TIMELOCK_EXECUTORS`, `TIMELOCK_MIN_DELAY_SECONDS`, `USDC_CONTRACT_ADDRESS`,
  `DEPLOYER_BOOTSTRAPS_USDC`.
- **Schedule an upgrade:** `MODE=schedule npm run --silent hardhat run
  scripts/upgrade-contract.ts --network baseSepolia`. Prints a
  `UPGRADE_OP_ID` and the earliest executable timestamp.
- **Execute an upgrade:** after the delay elapses, run
  `MODE=execute UPGRADE_OP_ID=... UPGRADE_NEW_IMPL=... npm run --silent hardhat run
  scripts/upgrade-contract.ts --network baseSepolia`.
- **Read-only state:** `npm run --silent hardhat run scripts/upgrade-contract.ts
  --network baseSepolia` (defaults to `MODE=info`). Prints proxy, impl,
  timelock, `hasRole(UPGRADE_ROLE, timelock)`, proposer/executor membership of
  the signer, and the timelock's current min delay.
- **Pause / unpause:** a `PAUSER_ROLE` signer calls `pause()` / `unpause()`.
- **Push a payout:** a `PAYOUT_ROLE` signer calls `processPayout`.
- **Modify fees / treasury / idempotency / keeper:** a `TREASURY_ROLE`
  signer calls the matching `setX(...)` function.
