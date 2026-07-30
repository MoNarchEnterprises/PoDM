# Bundler Error Fix — AA21 didn't pay prefund

## Problem

```
Bundler RPC error (eth_estimateUserOperationGas):
UserOperation reverted during simulation with reason: AA21 didn't pay prefund
```

The EntryPoint contract rejects the UserOperation because the sender (smart account) has zero ETH balance and no valid paymaster is attached to cover gas costs.

---

## Root Cause (Two Bugs)

### Bug 1 — Paymaster strips factory/factoryData for undeployed accounts

**File:** `paymaster.service.ts:56-66`

The flow for an **undeployed (counterfactual)** smart account:

1. `userOperation.service.ts:224` — `op.initCode` is set (non-empty hex, includes factory address + calldata for `createAccount`)
2. `userOperation.service.ts:239` — `convertToBundlerFormat(op)` converts `initCode` → `factory` + `factoryData`, **removes `initCode`**
3. `paymaster.service.ts:56` — checks `if (op.initCode && op.initCode !== '0x' ...)` — **`op.initCode` is now `undefined`** (removed in step 2)
4. Falls into the `else` branch at line 63 — **sets `paymasterOp.factory = undefined` and `paymasterOp.factoryData = undefined`**
5. `pm_sponsorUserOperation` receives no deployment info → paymaster can't verify the account → returns paymaster data without proper sponsorship
6. EntryPoint simulates → sender has no code, no paymaster → checks sender deposit → 0 ETH → **AA21 error**

**Why it used to work:** This code path was written before `convertToBundlerFormat` was added. Now that `convertToBundlerFormat` is called before the paymaster call (line 239), the paymaster's own initCode parsing is both redundant and destructive.

### Bug 2 — Non-sponsored path always fails (smart accounts have no ETH)

**File:** `paymaster.service.ts:80-86`, `userOperation.service.ts:242-245`

`isEligibleForSponsorship` returns `false` for amounts under **$5 (500 cents)**:

```typescript
if (amountInCents >= 500) return true;
return false;
```

When `false`, the fallback path at line 242-245 is:

```typescript
const gasEstimates = await bundler.estimateUserOperationGas(convertToBundlerFormat(op), entryPoint);
op = { ...op, ...gasEstimates };
```

The UserOp is sent **without any paymaster**. The smart account has zero ETH (it only holds USDC that was paid to it). The EntryPoint checks `sender.deposit >= requiredPrefund` → 0 ETH → **AA21 error**.

This affects any transaction under $5, regardless of whether the account is deployed or not.

---

## Fixes

### Fix 1 — Remove redundant initCode parsing from paymaster service

**File:** `PoDM_project/server/services/paymaster.service.ts`

Replace lines 54-67. The method should **pass through** `factory` and `factoryData` from the op directly, since the caller already passes bundler-format ops:

```typescript
// Before (lines 54-67):
if (op.initCode && op.initCode !== '0x' && op.initCode.length > 42) {
    const raw = op.initCode.slice(2);
    const factoryAddr = '0x' + raw.slice(0, 40);
    paymasterOp.factory = ethers.getAddress(factoryAddr);
    paymasterOp.factoryData = '0x' + raw.slice(40);
} else {
    paymasterOp.factory = undefined;
    paymasterOp.factoryData = undefined;
}

// After:
if (op.factory && op.factoryData) {
    paymasterOp.factory = ethers.getAddress(op.factory);
    paymasterOp.factoryData = op.factoryData;
} else {
    delete paymasterOp.factory;
    delete paymasterOp.factoryData;
}
```

**Notes:**
- Uses `op.factory` and `op.factoryData` directly (already in bundler format from the caller)
- `ethers.getAddress()` is kept for checksumming (matches bundler.service.ts behavior)
- For deployed accounts: `factory`/`factoryData` are `undefined` → both are deleted → paymaster sees no deployment needed
- For undeployed accounts: `factory`/`factoryData` are present → passed through correctly

### Fix 2 — Remove minimum sponsorship threshold

**File:** `PoDM_project/server/services/paymaster.service.ts`

Change `isEligibleForSponsorship` to sponsor **all** transactions:

```typescript
// Before:
if (amountInCents >= 500) return true;
return false;

// After:
return true; // Sponsor all UserOperations — smart accounts have no ETH
```

This is simpler than:
- Funding every smart account with ETH for gas
- Implementing a gas-station contract
- Adding a ETH→USDC swap path for gas

Pimlico paymaster costs are negligible ($0.0001–$0.001 per sponsored UserOp on testnet). If cost becomes a concern on mainnet, the threshold can be re-added alongside a ETH-funding mechanism for the non-sponsored path.

---

## Files Changed

| File | Lines | Change |
|---|---|---|
| `PoDM_project/server/services/paymaster.service.ts` | 54-67 | Replace initCode parsing with factory/factoryData passthrough |
| `PoDM_project/server/services/paymaster.service.ts` | 80-86 | `isEligibleForSponsorship` always returns `true` |

No changes to `userOperation.service.ts`, `bundler.service.ts`, or any other file.

---

## Verification

### Test 1 — Existing deployed account, any amount
1. Run a UserOp for a smart account that was already deployed (e.g. a second transaction)
2. `op.initCode = '0x'`, `convertToBundlerFormat` strips `initCode` and leaves `factory`/`factoryData` as `undefined`
3. Paymaster receives op with `factory = undefined` → deletes both fields
4. `pm_sponsorUserOperation` succeeds → transaction clears

### Test 2 — Undeployed (counterfactual) account, any amount
1. Run a UserOp for a smart account that hasn't been deployed yet (first transaction)
2. `op.initCode = '0x91E60e...c5265d5d...'`, `convertToBundlerFormat` extracts `factory = '0x91E60e...'` and `factoryData = '0xc5265d5d...'`
3. Paymaster receives op with `factory` and `factoryData` set → passes through correctly
4. `pm_sponsorUserOperation` succeeds with deployment info → transaction clears

### Test 3 — Small amount (under $5)
1. Run a UserOp with `amountInCents = 100` ($1)
2. `isEligibleForSponsorship(100, userId)` returns `true` (was `false`)
3. Paymaster sponsors the UserOp → transaction clears

---

## What Could Break

| Change | Risk | Mitigation |
|---|---|---|
| Removing initCode parsing | **None** — caller already converts to bundler format. The paymaster just needs factory/factoryData as-is. | Both `bundler.service.ts` and `userOperation.service.ts` use the same pattern. The invariant is: paymaster always receives bundler-format ops. |
| Removing $5 threshold | Pimlico paymaster costs for very small transactions. At ~$0.0005/sponsor, a $0.50 tip costs $0.0005 to sponsor — negligible. | If cost is a concern on mainnet, the threshold can be re-added AFTER implementing a ETH-funding mechanism for smart accounts (e.g., a small amount of ETH bridged to each smart account on creation). |

---

## Why This Fix Is Correct

**Before the fix (broken flow):**

```
userOperation.service.ts         paymaster.service.ts
───────────────────────          ────────────────────
op = { sender, initCode, ... }   
  ↓                               
convertToBundlerFormat(op)         
  → { sender, factory, 
      factoryData, ... }          
  ↓                               
paymaster.sponsor(op) ──────────→  checks op.initCode → undefined
                                   sets factory = undefined ← BUG
                                   pm_sponsorUserOperation({ ... factory: undefined, ... })
```

**After the fix (correct flow):**

```
userOperation.service.ts         paymaster.service.ts
───────────────────────          ────────────────────
op = { sender, initCode, ... }   
  ↓                               
convertToBundlerFormat(op)         
  → { sender, factory, 
      factoryData, ... }          
  ↓                               
paymaster.sponsor(op) ──────────→  checks op.factory → passed through
                                   pm_sponsorUserOperation({ ... factory: '0x...', factoryData: '0x...', ... })
```
