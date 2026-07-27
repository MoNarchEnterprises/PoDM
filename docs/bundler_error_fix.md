# Bundler Error Fix — `initCode` vs `factory`/`factoryData`

## Problem

Pimlico's v0.7 API rejects `initCode`. It expects `factory` and `factoryData`
as separate top-level fields on the user operation.

```
Validation error: Unrecognized key: "initCode" at "params[0].userOp"
```

## Solution

Before calling `eth_sendUserOperation` (and `pm_sponsorUserOperation`),
convert the user op from internal format to bundler format by splitting
`initCode` into `factory` + `factoryData`:

```
internal format:
  { initCode: '0x<addr><data>', ... }

bundler format:
  { factory: '0x<addr>', factoryData: '0x<data>', ... }
```

### Implementation

Add this helper and call it right before every `eth_sendUserOperation` /
`pm_sponsorUserOperation` call:

```typescript
// Convert internal UserOp (with initCode) to bundler format (factory/factoryData)
function convertToBundlerFormat(userOp: any) {
  if (!userOp.initCode || userOp.initCode === '0x') {
    return { ...userOp, factory: undefined, factoryData: undefined };
  }
  const factory = '0x' + userOp.initCode.slice(2, 42);
  const factoryData = '0x' + userOp.initCode.slice(42);
  return { ...userOp, factory, factoryData, initCode: undefined };
}
```

The `'0x'` case (no deployment needed) should strip both `initCode` and
`factory`/`factoryData` — neither field may be present when the account
is already deployed.

### Where to apply

Search for `eth_sendUserOperation` and `pm_sponsorUserOperation` in
`userOperation.service.ts`. Wrap the user op payload with the converter
at each call site (there are usually 2–3).
