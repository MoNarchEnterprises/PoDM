# Crypto Payment Fix Plan

## Problem

The ERC-4337 v0.7 payment flow fails at the bundler with `AA24 signature error` during
`eth_sendUserOperation` simulation. The bundler response is:

```
UserOperation reverted with reason: AA24 signature error
```

## Root Cause: EIP-191 Wrapping Mismatch

The chain of trust for signature verification has a disconnect:

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. computeUserOpHash(op, entryPoint)                             │
│    → calls EntryPoint.getUserOpHash(op) via eth_call             │
│    → returns raw 32-byte userOpHash (signature excluded from     │
│      hash per ERC-4337 spec: "hash over userOp except signature") │
│    → userOpHash = keccak256(abi.encode(                          │
│                      pack(sender,nonce,initCode,callData,        │
│                            gasLimits,preVerGas,gasFees,          │
│                            paymasterAndData),                     │
│                      entryPoint, chainId))                       │
└──────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. walletProvider.signUserOperation(userId, userOpHash)           │
│    → Privy secp256k1_sign: signs the RAW 32-byte hash            │
│      (no EIP-191 prefix, no \\x19Ethereum Signed Message:\\n)    │
│    → Returns ECDSA signature {r,s,v}                              │
└──────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. SimpleAccount._validateSignature(userOp, userOpHash)            │
│    → hash = MessageHashUtils.toEthSignedMessageHash(userOpHash)   │
│    → hash = keccak256("\\x19Ethereum Signed Message:\\n32"         │
│                       + userOpHash)                               │
│    → recovered = ECDSA.recover(hash, userOp.signature)           │
│    → require(recovered == owner)                                  │
│    ┌──────────────────────────────────────────────────────────┐   │
│    │  MISMATCH: Privy signed raw(userOpHash)                   │   │
│    │  but contract recovers from EthSigned(userOpHash)         │   │
│    │  → ECDSA.recover(EthSigned(userOpHash), sig) ≠ owner      │   │
│    │  → "AA24 signature error"                                  │   │
│    └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

## Why This Wasn't Caught Earlier

1. **8-field vs 9-field ABI confusion**: The v0.7 `PackedUserOperation` struct
   includes `signature` as the 9th field, but `PackedUserOperation.hash()` only
   hashes fields 1-8 (signature excluded). Our 8-field ABI caused `execution
   reverted` on `getUserOpHash` because ethers encoded the struct wrong.
   Fixing to 9 fields made the call succeed, but didn't fix the signing issue.

2. **ERC-4337 spec clarity**: The spec says "hash over userOp (except
   signature)" but the struct definition includes signature. The ABI definition
   passed to ethers needs all fields for proper encoding, even though `hash()`
   ignores signature.

3. **v0.7 design assumption**: In v0.6, `getUserOpHash` and `ECDSA.recover` both
   operate on the raw hash without EIP-191 wrapping inside the contract code
   (the EIP-191 prefix is expected to be done off-chain). In v0.7,
   SimpleAccount explicitly calls `MessageHashUtils.toEthSignedMessageHash()`
   before recovery, introducing the need for EIP-191 wrapping in the signed data.

## The Fix

**Single-line change** in `userOperation.service.ts`:

```typescript
// Before (broken):
const userOpHash = await computeUserOpHash(op as UserOperation, entryPoint);
const signature = await walletProvider.signUserOperation(userId, userOpHash);

// After (fixed):
const userOpHash = await computeUserOpHash(op as UserOperation, entryPoint);
const ethSignedHash = ethers.hashMessage(ethers.getBytes(userOpHash));
const signature = await walletProvider.signUserOperation(userId, ethSignedHash);
```

`ethers.hashMessage(bytes)` computes:
```
keccak256("\\x19Ethereum Signed Message:\\n32" + bytes)
```

This matches exactly what SimpleAccount v0.7's `_validateSignature` does:
```
hash = MessageHashUtils.toEthSignedMessageHash(userOpHash)
// = keccak256("\\x19Ethereum Signed Message:\\n32" + userOpHash)
```

## Verification

After applying the fix, the flow should be:

1. Build UserOperation with dummy 65-byte ECDSA signature
2. `computeUserOpHash()` → raw 32-byte hash (signature excluded from hash)
3. `ethers.hashMessage()` → wrap with EIP-191 → 32-byte ethSignedHash
4. Privy signs `ethSignedHash` → returns ECDSA sig over the wrapped hash
5. Replace signature in op with real ECDSA sig
6. Submit to bundler
7. EntryPoint computes `userOpHash` (same as step 2, since signature not in hash)
8. SimpleAccount does `ECDSA.recover(toEthSignedMessageHash(userOpHash), sig)`
9. Since `toEthSignedMessageHash(userOpHash) == ethSignedHash` (step 3)
10. `ECDSA.recover(ethSignedHash, sig)` → returns owner ✓
11. No AA24 error

## Previous Fixes (Already Applied)

| # | Issue | Fix | File |
|---|-------|-----|------|
| 1 | `executeBatch` ABI wrong (missing `uint256[] values`) | Added `values` param | `userOperation.service.ts:28-31` |
| 2 | `ENTRYPOINT_ABI` 8-field struct missing `signature` | Added 9th field `bytes signature` | `userOperation.service.ts:23-25` |
| 3 | `computeUserOpHash` missing `signature` in struct arg | Added `signature: op.signature \|\| '0x'` | `userOperation.service.ts:94` |
| 4 | Bundler rejects `initCode` key | `convertToBundlerFormat` strips `initCode`, adds `factory`/`factoryData` | `bundler.service.ts:21-31` |

## Issue #2: maxPriorityFeePerGas Below Bundler Minimum

**Error**: `maxPriorityFeePerGas must be at least 1000000 (current maxPriorityFeePerGas: 500000)`

### Root Cause (Revised)

`getUserOperationGasPrice()` in `bundler.service.ts:91-114` has two code paths:

1. **Primary**: calls `pimlico_getUserOperationGasPrice`
2. **Fallback**: `eth_feeHistory` on Base Sepolia

The `500000 wei` value confirms the fallback path is being hit:
`500000 = 5000000 (baseFee) / 10`.

**The primary path is likely succeeding** — but we parse the response wrong.
Pimlico's API returns three speed tiers:

```json
{
  "slow": { "maxFeePerGas": "0x...", "maxPriorityFeePerGas": "0x..." },
  "standard": { "maxFeePerGas": "0x...", "maxPriorityFeePerGas": "0x..." },
  "fast": { "maxFeePerGas": "0x...", "maxPriorityFeePerGas": "0x..." }
}
```

But our code checks:

```typescript
if (result && result.maxFeePerGas) {
```

`result.maxFeePerGas` is `undefined` (it lives under `result.standard.maxFeePerGas`).
The condition always fails → always falls through to `eth_feeHistory`.

### Diagnostic Logging

Add this to `bundler.service.ts` at the catch block (~line 95):

```typescript
try {
    result = await this.rpcCall<any>('pimlico_getUserOperationGasPrice', []);
} catch (err) {
    console.warn('[BundlerService] pimlico_getUserOperationGasPrice threw:', (err as Error).message);
    result = null;
}
```

And inside the success branch, log what we received:

```typescript
if (result && result.maxFeePerGas) {
    // ... existing code ...
} else {
    console.warn('[BundlerService] pimlico_getUserOperationGasPrice returned unexpected shape:',
        JSON.stringify(result).slice(0, 500));
    result = null;
}
```

This will confirm whether the call succeeds (expect `result = { slow, standard, fast }`)
or fails (expect error message).

### The Fix (once diagnosed)

Replace the `result.maxFeePerGas` check with proper parsing of the `standard` tier:

```typescript
if (result?.standard?.maxFeePerGas) {
    return {
        maxFeePerGas: result.standard.maxFeePerGas,
        maxPriorityFeePerGas: result.standard.maxPriorityFeePerGas || result.standard.maxFeePerGas
    };
}
```

Also add a minimum floor as safety net:

```typescript
const MIN_PRIORITY_FEE = 1_000_000n;   // 0.001 gwei — Pimlico minimum
const MIN_MAX_FEE    = 1_000_000n;

const safePriority = priority < MIN_PRIORITY_FEE ? MIN_PRIORITY_FEE : priority;
const safeMaxFee = (baseFee * 2n) < MIN_MAX_FEE ? MIN_MAX_FEE : (baseFee * 2n);

return {
    maxFeePerGas: '0x' + safeMaxFee.toString(16),
    maxPriorityFeePerGas: '0x' + safePriority.toString(16)
};
```

### File to Edit

- `server/services/bundler.service.ts` — add logging to diagnose response shape,
  then fix the response parsing from flat to nested `standard` tier, plus minimum
  floor for fallback.

## Issue #3: Receipt Polling Timing — `eth_getTransactionReceipt` Not Found

**Error** (from `cryptoPayment.service.ts:173`):
```
Transaction receipt not found on-chain. It might still be pending or was never broadcast.
```

### Current Flow

```
Client                userOperation.service          cryptoPayment.service        Standard RPC
  │                           │                              │                        │
  │  submit UserOp            │                              │                        │
  │──────────────────────────>│                              │                        │
  │                           │  eth_sendUserOperation       │                        │
  │                           │─────────────────────────────────────────────────────>│
  │                           │  finalOpHash                 │                        │
  │                           │<─────────────────────────────────────────────────────│
  │                           │                              │                        │
  │                           │  eth_getUserOperationReceipt (poll 60s, every 2s)    │
  │                           │─────────────────────────────────────────────────────>│
  │                           │  receipt { transactionHash } │                        │
  │                           │<─────────────────────────────────────────────────────│
  │                           │                              │                        │
  │                           │  verifyAndRecordBasePayment(txHash)                  │
  │                           │─────────────────────────────>│                        │
  │                           │                              │  eth_getTransactionReceipt
  │                           │                              │  (5 attempts × 3s = 15s)
  │                           │                              │───────────────────────>│
  │                           │                              │  NOT FOUND after 15s   │
  │                           │                              │<───────────────────────│
  │                           │     throw 404                │                        │
  │                           │<─────────────────────────────│                        │
  │  HTTP 504 / 404           │                              │                        │
  │<──────────────────────────│                              │                        │
```

### Root Cause

The UserOperation is accepted and included in a bundle (bundler's
`eth_getUserOperationReceipt` returns a receipt). But the actual L2 transaction
containing the bundle isn't indexed by the public Base Sepolia RPC within the
15-second window in `verifyAndRecordBasePayment`.

### Design Decision: When to Grant Access?

Content access is gated by `transactions.status = 'Cleared'`:

- **PPV**: `content.service.ts:412` checks `Cleared` transactions with matching
  `related_content_id`
- **Subscriptions**: `subscription.service.ts` creates/updates a subscription
  record

Three strategies:

| Strategy | Access granted when | Fraud risk | UX | Complexity |
|---|---|---|---|---|
| **Pessimistic** | After on-chain receipt verified (current) | None | Poor — fails if RPC lags | Low |
| **Optimistic** | Immediately on bundler acceptance | Low — bundler validated op | Great — instant | Low |
| **Hybrid** (recommended) | On bundler UserOp receipt | Near-zero — op included in bundle | Good — ~seconds | Medium |

### Recommendation: Optimistic Async Architecture

Mark `Cleared` when the bundler confirms UserOperation inclusion. If on-chain
verification fails within the revocation window, revert to `Failed`.

**Trigger for optimism**: `eth_getUserOperationReceipt` returns a receipt (op
was included in a mined bundle, not just mempool acceptance). The bundler's
simulation already validated the op — the fraud window from UserOp receipt to
on-chain revert is near-zero (chain reorg or execution OOG).

**New `transactions` status flow**:

```
Pending (submitted) → Cleared (UserOp receipt received)
                    → Failed (on-chain receipt not found within revocation window)
```

#### Phase 1: Submit + Confirm (synchronous, waits for UserOp receipt)

```
Client                     API Server
  │                           │
  │  POST /api/v1/payments    │
  │──────────────────────────>│
  │                           │
  │  1. Build UserOp          │
  │  2. Sponsor (paymaster)   │
  │  3. Compute hash          │
  │  4. Privy signs           │
  │  5. eth_sendUserOperation │
  │  6. finalOpHash           │
  │                           │
  │  // Poll bundler for UserOp receipt (up to ~30s)
  │  // Op was included in a mined bundle
  │                           │
  │  if receipt found:        │
  │    txHash =               │
  │      receipt.transactionHash
  │                           │
  │    7. INSERT transaction  │
  │       status: 'Cleared' ★ │
  │       blockchain_tx_hash: │
  │         txHash            │
  │       user_op_hash:       │
  │         finalOpHash       │
  │                           │
  │    8. Enqueue async job   │
  │       to verify on-chain  │
  │       receipt             │
  │                           │
  │    9. Return:             │
  │       { success: true,    │
  │         transactionId,    │
  │         status: 'Cleared',│
  │         txHash }          │
  │                           │
  │  else (no receipt):       │
  │    7. Return:             │
  │       { success: true,    │
  │         status: 'Pending',│
  │         userOpHash }      │
  │<──────────────────────────│
```

**★ Optimistic clearance**: Content access is granted immediately because
`transactions.status = 'Cleared'`. The bundler already simulated the op —
it will not revert during execution.

#### Phase 2: Verify on-chain receipt (background worker, 60s revocation window)

```
Background Worker                  Standard RPC
     │                                  │
     │  eth_getTransactionReceipt        │
     │  (poll every 6s, up to 60s)       │
     │──────────────────────────────────>│
     │                                  │
     │  ── Case A: Receipt found ──     │
     │                                  │
     │  Validate:                        │
     │  • contract interaction           │
     │  • correct event topic            │
     │  • recipient = creator's wallet   │
     │  • amount matches                 │
     │                                  │
     │  // Transaction already Cleared,  │
     │  // just record metadata          │
     │  UPDATE transactions              │
     │  SET payment_method = 'crypto',   │
     │      payment_currency = 'USDC',   │
     │      chain_id = $chainId,         │
     │      verified_at = now()          │
     │  WHERE id = $transactionId        │
     │                                  │
     │  ── Case B: Not found after 60s ──│
     │                                  │
     │  // Revoke access                 │
     │  UPDATE transactions              │
     │  SET status = 'Failed',           │
     │      failure_reason =             │
     │        'onchain_receipt_not_found'│
     │  WHERE id = $transactionId        │
     │                                  │
     │  // Content access queries filter │
     │  // on status='Cleared', so the   │
     │  // Failed record is invisible    │
     │  // to the access gate            │
```

#### Phase 3: Status check (client polls)

```
Client                     API Server
  │                           │
  │  GET /api/v1/payments     │
  │  /status/:transactionId   │
  │──────────────────────────>│
  │                           │
  │  SELECT status, txHash    │
  │  FROM transactions        │
  │  WHERE id = $id           │
  │                           │
  │  { status: 'Cleared',     │
  │    txHash: '0x...' }      │
  │<──────────────────────────│
```

#### Phase 3: Status check (client polls)

```
Client                     API Server
  │                           │
  │  GET /api/v1/payments     │
  │  /status/:transactionId   │
  │──────────────────────────>│
  │                           │
  │  SELECT status, txHash    │
  │  FROM transactions        │
  │  WHERE id = $id           │
  │                           │
  │  { status: 'Cleared',     │
  │    txHash: '0x...' }      │
  │<──────────────────────────│
```

### How DB Gets Updated

Currently `verifyAndRecordBasePayment` does (line 247-272):

```
1. TransactionModel.createTransaction({ status: 'Cleared', blockchain_tx_hash })
2. UPDATE transactions SET blockchain_tx_hash, payment_method, etc.
```

In the new optimistic design:

```
Submit phase (when UserOp receipt confirmed):
  INSERT INTO transactions (fan_id, creator_id, type, amount,
                            platform_fee, creator_payout,
                            status: 'Cleared',       ← immediate!
                            blockchain_tx_hash: txHash,
                            user_op_hash: finalOpHash,
                            related_content_id)

Verify phase (background worker, after on-chain receipt found):
  UPDATE transactions
  SET payment_method = 'crypto',
      payment_currency = 'USDC',
      chain_id = $chainId,
      verified_at = now()
  WHERE id = $transactionId

Revocation (background worker, if no on-chain receipt within 60s):
  UPDATE transactions
  SET status = 'Failed',
      failure_reason = 'onchain_receipt_not_found'
  WHERE id = $transactionId
```

### How Content Access Unlocks

No changes to the access gate logic:

- **PPV**: `content.service.ts:412-413` — queries transactions `WHERE
  status = 'Cleared' AND related_content_id = ...` — this sees the record
  immediately after the UserOp receipt is confirmed.
- **Subscriptions**: Subscription is created/updated during the submit phase
  alongside the transaction insert.

If the revocation path fires (Case B), the status changes to `Failed` and the
access gate no longer sees a `Cleared` record → access is effectively revoked.

### Failure Path

If the background worker exhausts all retries without finding an on-chain
receipt:

1. Transaction status changes from `Cleared` → `Failed`
2. Content access queries no longer find a matching `Cleared` record
3. User appears to have never paid — they'd need to retry the payment
4. If the transaction actually went through (RPC was just slow), admin can
   manually promote it back to `Cleared` via the dashboard
5. A periodic job can re-check `Failed` records with `failure_reason =
   'onchain_receipt_not_found'` against the RPC to auto-recover

### Files to Modify

| # | File | Change |
|---|------|--------|
| 1 | `userOperation.service.ts` | Split `processPaymentIntent`: remove `verifyAndRecordBasePayment` call, change to INSERT with `status: 'Pending'`, enqueue async job |
| 2 | `cryptoPayment.service.ts` | Refactor into a worker function that can be called from a job queue, not from HTTP context. Increase retry window to 10×6s = 60s. |
| 3 | New: `server/jobs/verifyPayment.ts` | Background job that polls `eth_getTransactionReceipt`, validates, and promotes to `Cleared` |
| 4 | `transaction.model.ts` | Add `user_op_hash` field support to `createTransaction` |
| 5 | New: `server/routes/payment.routes.ts` | Add `GET /status/:transactionId` endpoint |
| 6 | New (optional): `server/jobs/cleanupStalePayments.ts` | Periodic job to retry/fail aged `Pending` records |

## Implementation Status

| # | Issue | Files Changed | Status |
|---|-------|---------------|--------|
| 1 | EIP-191 wrapping mismatch | `userOperation.service.ts` | ✅ Applied |
| 2 | maxPriorityFeePerGas / response shape | `bundler.service.ts` | ✅ Applied |
| 3 | Optimistic async architecture | `userOperation.service.ts`, `verification.service.ts` (new), `EmbeddedWallet.ts` | ✅ Applied |

### Files Changed (Issue #3)

| File | Change |
|------|--------|
| `server/services/userOperation.service.ts` | Replaced `verifyAndRecordBasePayment` call with optimistic flow: poll UserOp receipt → INSERT `status: 'Cleared'` → fire `verifyPaymentReceiptInBackground` |
| `server/services/verification.service.ts` | New — background worker: polls `eth_getTransactionReceipt` 10×6s=60s, validates on-chain data, updates metadata or marks `Failed` |
| `common/types/EmbeddedWallet.ts` | Added `status?: 'Pending' \| 'Cleared'` to `PaymentIntentResult` |

### Remaining

- `cryptoPayment.service.ts` is still importable but no longer called from the payment flow. Can be cleaned up later.
- No job queue yet — background verification runs in-process as a fire-and-forget Promise. For 10K users, a proper queue (Bull/BullMQ + Redis) should replace this.
