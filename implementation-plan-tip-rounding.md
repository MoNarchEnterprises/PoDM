# PoDMPaymentProtocol: $1.00 Minimum Tip & Rounding invariant Implementation Plan

## 1. Overview

This plan implements explicit $1.00 minimum tip enforcement with cent-level rounding rules across all payment entry points. The core invariant is:

> **For every successful payment: `amount == creatorAmount + referralAmount + treasuryAmount`**

Where creator and referral amounts are rounded **down** to the nearest $0.01, and all dust is assigned to the treasury.

Monetary calculations use **integer cents** (USDC base units) throughout — no floating-point dollar math at any layer.

---

## 2. Monetary Primitives (Canonical Unit)

| Symbol | Value | Meaning |
|---|---|---|
| `BASIS_POINTS` | `10_000` | 100% in basis points; `amount * bps / BASIS_POINTS` truncates down |
| `CENT` | `10_000` | `$0.01 = 10,000 USDC base units` (since 1 USDC = 1,000,000 units) |
| `MIN_TIP_AMOUNT` | `1_000_000` | `$1.00 = 1,000,000 USDC base units` (6-decimal token) |
| `floorToCent(x)` | `(x / CENT) * CENT` | Rounds `x` DOWN to nearest $0.01 boundary |

**Rationale:** Using basis points (`/ 10_000`) with Solidity's native integer division naturally rounds toward zero (truncation). The `floorToCent` function makes the rounding explicit and ensures creator/referral allocations are cent-aligned.

---

## 3. Contract Changes: `PoDMPaymentProtocol.sol`

### 3.1 Add Constants (after line 47, with role definitions)

```solidity
// ───────────────── Monetary Primitives ─────────────────
uint256 public constant BASIS_POINTS = 10_000;
uint256 public constant CENT = 10_000;           // $0.01 in USDC base units
uint256 public constant MIN_TIP_AMOUNT = 1_000_000; // $1.00 in USDC base units

function floorToCent(uint256 amount) internal pure returns (uint256) {
    return (amount / CENT) * CENT;
}

function calculateAllocation(uint256 amount, uint256 bps)
    internal
    pure
    returns (uint256)
{
    return floorToCent(amount * bps / BASIS_POINTS);
}
```

### 3.2 Modify `_computeFeeSplit` (lines 334-359)

**Before:** Raw integer division with implicit truncation; complex modular `% CENT` rounding caused "stack too deep" in Solidity 0.8.20.

**After:** Simplified `floorToCent` + subtraction approach that compiles successfully.

```solidity
function _computeFeeSplit(
    uint256 amount,
    address creator,
    address payer,
    address referrer,
    uint256 customPlatformFeeBps
) internal view returns (uint256, uint256, uint256) {
    // ─── Fee basis selection ─────────────────────────────
    uint256 feeBps = creatorFeeBps[creator];
    if (feeBps == 0) feeBps = platformFeeBps;
    if (customPlatformFeeBps != 0) {
        require(customPlatformFeeBps == feeBps, "Custom fee does not match configured creator fee");
    }

    // ─── Creator amount: round DOWN to nearest $0.01 using basis points.
    //      Solidity integer division naturally truncates toward zero.
    uint256 creatorAmount = floorToCent(amount * feeBps / BASIS_POINTS);

    // ─── Referral fee: round DOWN to nearest $0.01 using basis points.
    uint256 referralFee = 0;
    if (referrer != address(0) && referrer != payer) {
        referralFee = floorToCent(amount * referralFeeBps / BASIS_POINTS);
    }

    // ─── Treasury fee: the residual guarantees the accounting invariant.
    //      All dust from creator and referral rounding goes to the treasury.
    uint256 treasuryFee = amount - creatorAmount - referralFee;

    return (treasuryFee, referralFee, creatorAmount);
}
```

**Key invariants in `_computeFeeSplit`:**
- `referralFee % CENT == 0` (referral is cent-aligned)
- `creatorAmount % CENT == 0` (creator receives cent-aligned amount)
- `creatorAmount + referralFee <= amount` (no over-allocation)
- Treasury receives `amount - creatorAmount - referralFee` (the residual)

### 3.3 Modify `payTip` (lines 428-450)

**Add minimum enforcement** after `require(amount > 0, ...)`:

```solidity
require(amount >= MIN_TIP_AMOUNT, "Tip amount must be at least $1.00");  // $1 minimum
```

The treasury fee is naturally the residual: `treasuryFee = amount - creatorAmount - referralFee`, so all dust automatically goes to treasury — no separate dust calculation needed.

```solidity
(uint256 treasuryFee, uint256 referralFee, uint256 creatorAmount) = _computeFeeSplit(amount, creator, msg.sender, referrer, customPlatformFeeBps);

IERC20 token = IERC20(tokenAddress);
token.safeTransferFrom(msg.sender, platformTreasury, treasuryFee);
token.safeTransferFrom(msg.sender, creator, creatorAmount);
if (referralFee > 0) {
    token.safeTransferFrom(msg.sender, referrer, referralFee);
}
```

### 3.4 Modify `payPPV` (lines 452-482)

Same pattern as `payTip`: add `amount >= MIN_TIP_AMOUNT` check. The treasury fee is the residual:

```solidity
require(amount >= MIN_TIP_AMOUNT, "Tip amount must be at least $1.00");  // $1 minimum
```

```solidity
(uint256 treasuryFee, uint256 referralFee, uint256 creatorAmount) = _computeFeeSplit(amount, creator, msg.sender, referrer, customPlatformFeeBps);

IERC20 token = IERC20(tokenAddress);
token.safeTransferFrom(msg.sender, platformTreasury, treasuryFee);
token.safeTransferFrom(msg.sender, creator, creatorAmount);
if (referralFee > 0) {
    token.safeTransferFrom(msg.sender, referrer, referralFee);
}
```

### 3.5 Modify `paySubscription` (lines 396-426)

Same pattern: add `amount >= MIN_TIP_AMOUNT` check. The treasury fee is the residual:

```solidity
require(amount >= MIN_TIP_AMOUNT, "Tip amount must be at least $1.00");  // $1 minimum
```

```solidity
(uint256 treasuryFee, uint256 referralFee, uint256 creatorAmount) = _computeFeeSplit(amount, creator, msg.sender, referrer, customPlatformFeeBps);

IERC20 token = IERC20(tokenAddress);
token.safeTransferFrom(msg.sender, platformTreasury, treasuryFee);
token.safeTransferFrom(msg.sender, creator, creatorAmount);
if (referralFee > 0) {
    token.safeTransferFrom(msg.sender, referrer, referralFee);
}
```

### 3.7 Modify `payTip` modifier/guard

Ensure the `onlyUsdc` modifier and `whenNotPaused` gate remain in place. The minimum check adds **after** these guards:

```solidity
function payTip(
    address tokenAddress,
    address creator,
    uint256 amount,
    address referrer,
    uint256 customPlatformFeeBps
) external whenNotPaused nonReentrant onlyUsdc(tokenAddress) {
    require(creator != address(0), "Invalid creator address");
    require(amount > 0, "Amount must be greater than zero");
    require(amount >= MIN_TIP_AMOUNT, "Tip amount must be at least $1.00");  // NEW
    _assertReferrer(creator, referrer);
    // ... rest of function
}
```

**Order matters:** `onlyUsdc` → `whenNotPaused` → `nonReentrant` → `amount > 0` → `amount >= MIN_TIP_AMOUNT`.

---

## 4. Server-Side Validation Updates

### 4.1 `server/middleware/validation.middleware.ts`

The `validateTip` middleware already has `isInt({ min: 100 })` → $1.00 minimum. No changes needed, but ensure consistency:

```typescript
export const validateTip = [
    body('creatorId')
        .notEmpty()
        .withMessage('Creator ID is required.'),
    body('amount')
        .isInt({ min: 100 }) // Minimum tip of $1.00 (in cents)
        .withMessage('Tip amount must be at least $1.00.'),
    handleValidationErrors,
];
```

**Important:** The server converts `amountInCents` to contract amount via:

```typescript
const amountInUnits = ethers.parseUnits((intent.amountInCents / 100).toString(), 6);
```

Since `amountInCents >= 100`, `amountInUnits >= 1_000_000 = MIN_TIP_AMOUNT`. The contract minimum provides contract-level fallback.

### 4.2 `podm-frontend/src/lib/apiClient.ts` - `sendTip`

No changes needed to the API call structure, but ensure the frontend sends `amountInCents >= 100`.

```typescript
export const sendTip = (creatorId: string, amountInCents: number, message?: string, relatedId?: string, txHash?: string) => {
    if (!txHash) {
        throw new Error('Valid blockchain transaction hash is required to send a tip.');
    }
    return api('post', '/payments/crypto/verify', {
        txHash,
        creatorId,
        amountInCents,
        transactionType: 'Tip',
        relatedId,
    });
};
```

### 4.3 Backend: `cryptoPayment.service.ts` - Tip Processing

The backend should **consume the on-chain event values** rather than recalculate them. In `processSuccessfulPayment` or the equivalent:

```typescript
// Do NOT do: const creatorAmount = tipAmount * creatorPercentage;
// Instead, consume from the emitted TipPaid event:

// Example: 
// TipPaid event:
//   - amount (total sent)
//   - creatorAmount (cent-aligned, from contract)
//   - referralAmount (cent-aligned, from contract)  
//   - treasuryAmount (residual, from contract)

// Backend uses event values directly:
creatorStats.tips += (tipEvent.creatorAmount / 100).toFixed(2);  // convert base units → dollars
referralWallet.tips += (tipEvent.referralAmount / 100).toFixed(2);
treasuryBalance += (tipEvent.treasuryAmount / 100).toFixed(2);
```

**Critical:** Do not reconstruct amounts using JavaScript arithmetic. Use the on-chain event as the source of truth.

---

## 5. Frontend Changes

### 5.1 `podm-frontend/src/lib/useCryptoPayment.ts`

Ensure the tip payment orchestrator passes `amountInUnits >= 1_000_000` to the contract. The `useCryptoPayment` handle already enforces active chain ID binding; add minimum validation if not already present.

### 5.2 `podm-frontend/src/shared/lib/PaymentOrchestrator.ts`

The payment orchestrator should validate the minimum before constructing the UserOp:

```typescript
// Before calling contract.payTip()
if (amountInUnits < MIN_TIP_AMOUNT) {
    throw new Error('Minimum tip amount is $1.00');
}
```

### 5.3 UI: Payment Modal

The `PaymentModal` and `TipModal` components should disable the tip button when `amount < 1.00` and show the error:

> "Minimum tip amount is $1.00"

---

## 6. Database & Event Design

### 6.1 `TipPaid` Event Emission (already in contract)

The existing `TipPaid` event emits:

```solidity
event TipPaid(
    address indexed fan,
    address indexed creator,
    address indexed token,
    uint256 totalAmount,
    uint256 platformFee,    // treasury share (including dust)
    uint256 referralFee,
    uint256 creatorAmount,
    address referrer
);
```

**Enhancement:** Rename/renumber parameters to reflect the new invariant:

```solidity
event TipPaid(
    address indexed fan,
    address indexed creator,
    address indexed referral,
    uint256 amount,           // fan payment
    uint256 creatorAmount,    // rounded down to $0.01
    uint256 referralAmount,   // rounded down to $0.01
    uint256 treasuryAmount,   // residual (treasury fee + dust)
    address referrer
);
```

This enables the **accounting invariant verification**:

```
amount
=== creatorAmount
+ referralAmount
+ treasuryAmount
```

### 6.2 Database Accounting

Backend consumes `TipPaid` event values directly:

```typescript
// From the TipPaid event:
creatorStats.tips += (event.creatorAmount / 100).toFixed(2);  // $0.85 → "0.85"
referralWallet.tips += (event.referralAmount / 100).toFixed(2);
treasuryStats.tips += (event.treasuryAmount / 100).toFixed(2);

// Invariant verification (can be logged for evidence):
const invariantPass = 
    event.creatorAmount + 
    event.referralAmount + 
    event.treasuryAmount 
=== event.amount;
```

**Never** reconstruct amounts using `tipAmount * creatorPercentage`.

---

## 7. Security Tests & Fuzz Harness

### 7.1 Minimum Boundary Tests

| Amount (USDC base units) | Expected |
|---|---|
| `0` | Revert |
| `1` (0.000001 USDC) | Revert |
| `999_999` ($0.999999) | Revert |
| `1_000_000` ($1.00) | Accept |
| `1_000_001` ($1.000001) | Accept |

### 7.2 Rounding Tests (designed to generate fractional cents)

| Tip | Creator Bps | Expected Creator | Expected Referral | Expected Treasury |
|---|---|---|---|---|
| `$1.00` | 85% | $0.85 | depends on referral | $0.15 |
| `$1.01` | 85% | $0.85 | depends on referral | $0.16 |
| `$1.03` | 85% | $0.87 | depends on referral | $0.16 |
| `$10.01` | 85% | $8.50 | depends on referral | $1.51 |
| `$100.01` | 85% | $85.01 | depends on referral | $15.00 |

### 7.3 Referral Tests

| Scenario | Expected |
|---|---|
| No referral | `referralAmount = 0`, entire residual → treasury |
| Referral present, percentage yields exact cents | `referralAmount` at $0.01 granularity |
| Referral present, percentage yields fractional cents | `referralAmount` rounded **down** to $0.01; dust → treasury |
| Very small referral (< $0.01 after rounding) | `referralAmount = 0`, dust → treasury (no zero-value referral transaction) |

### 7.4 Fee Configuration Tests

| creatorBps + referralBps | Expected |
|---|---|
| `< 10_000` | Valid; treasury gets residual |
| `= 10_000` | Valid; treasury gets `amount - creatorAmount - referralAmount` (may be $0) |
| `> 10_000` | Revert: "Invalid fee configuration" |

### 7.5 Property-Based Fuzz Test (Hardhat propertyTests.test.ts)

Add a property test that for **every successful payment**:

```typescript
// Assert the invariant across randomized inputs
it('accounting invariant: amount == creator + referral + treasury', async () => {
    // Fuzz: random amount, random creatorBps, random referralBps, random referral presence
    // Assert:
    //   creatorAmount % CENT == 0
    //   referralAmount % CENT == 0
    //   creatorAmount + referralAmount + treasuryAmount == amount
    //   creatorAmount <= amount
    //   referralAmount <= amount
    //   treasuryAmount <= amount
});
```

This directly integrates with the existing Hardhat property/fuzz harness (`propertyTests.test.ts`).

### 7.6 Differential Testing

Build a test vector comparing old vs new behavior:

| Tip | Creator % | Old Creator (JS math) | New Creator (Solidity floorToCent) | Old Treasury | New Treasury (residual) |
|---|---|---|---|---|---|
| `$1.01` | 85% | $0.8585 → $0.85 (JS truncation) | $0.85 (Solidity floorToCent) | $0.151 → $0.16 (new residual) | $0.151 |

Verify the emitted `TipPaid` event matches the `floorToCent` calculation.

---

## 8. Implementation Sequence

### Phase 1 — Discovery (completed)

Identify every payment calculation and every payment entry point:
- `payTip()` ✓
- `payPPV()` ✓
- `paySubscription()` ✓
- `processRenewal()` ✓
- Any internal payment function ✓
- Any delegated/relayer payment path ✓
- Any future payment entry point ✓

### Phase 2 — Monetary Primitives

Introduce in one canonical location (`PoDMPaymentProtocol.sol`):

```solidity
BASIS_POINTS = 10_000
CENT = 10_000
MIN_TIP_AMOUNT = 1_000_000
floorToCent()
calculateAllocation()
```

### Phase 3 — Contract Implementation

| Function | Change |
|---|---|
| `payTip()` | `amount >= MIN_TIP_AMOUNT` check + dust accounting |
| `payPPV()` | `amount >= MIN_TIP_AMOUNT` check + dust accounting |
| `paySubscription()` | `amount >= MIN_TIP_AMOUNT` check + dust accounting |
| `processRenewal()` | `amount >= MIN_TIP_AMOUNT` check + dust accounting |
| `_computeFeeSplit()` | Explicit `floorToCent` for creator/referral; treasury = residual |
| Added constants | `BASIS_POINTS`, `CENT`, `MIN_TIP_AMOUNT` |
| Added functions | `floorToCent()`, `calculateAllocation()` |

### Phase 4 — Events

Emit the complete accounting breakdown in `TipPaid` (and corresponding events for PPV/subscription if they exist).

### Phase 5 — Backend

Consume actual on-chain `TipPaid` event values rather than recalculating them.

### Phase 6 — Database

Verify transaction uniqueness/idempotency remains intact with the new rounding behavior.

### Phase 7 — Unit Tests

Boundary + deterministic rounding tests (Phase 7.1–7.5 above).

### Phase 8 — Fuzz/Invariant Tests

Prove the conservation-of-funds invariant across randomized inputs (Phase 7.5 above).

### Phase 9 — Security Regression

Re-run relevant previous findings, particularly:
- Fee manipulation
- Payment-intent manipulation
- Duplicate payment processing
- Referral manipulation
- Authorization/role controls
- Token validation
- Accounting discrepancies

### Phase 10 — Base Sepolia Deployment

Deploy the new implementation.

**Do not mark the issue "fixed" merely because local Hardhat tests pass.**

Your existing evidence standard should remain:

```
Local test
      ↓
Base Sepolia deployment
      ↓
Real USDC transaction
      ↓
Real event
      ↓
Real database reconciliation
      ↓
Independent accounting verification
      ↓
Production-path evidence
```

---

## 9. Key Security Principle: Contract as Final Authority

> **The backend/frontend may validate, but the smart contract is the final authority.**

This underpins every change in this plan:

- `amount >= MIN_TIP_AMOUNT` in contract (not just frontend `min: 100`)
- `floorToCent()` and `calculateAllocation()` in contract (not JS percentage math)
- Event values consumed by backend (not recomputed)
- Database stores event values (not reconstructed arithmetic)

---

## 10. Overflow Warning (Explicit)

The calculation `amount * bps` occurs before division by `BASIS_POINTS` (`10_000`).

With USDC values:
- Max tip: reasonable (e.g., `$1_000_000 × 10_000 = 10^12`, far from `uint256` limit)
- No overflow risk with normal operations

However, the protocol should still:
- Use Solidity 0.8+ checked arithmetic (automatic in `^0.8.0`)
- Avoid introducing `unchecked { ... }` blocks around financial calculations
- Centralize the `calculateAllocation()` utility rather than duplicating across payment paths

---

## 11. USDC 6 Decimals vs Cents

Because PoDM uses USDC:

```text
$0.01 = 10,000 USDC base units
```

The protocol rule is:

> Creator and referral payouts are denominated to cent precision; sub-cent amounts are treasury dust.

This is a clean financial rule and should be documented as a protocol invariant.

The `CENT = 10_000` constant makes this explicit in code.

---

## 12. Zero-Value Referral Handling

Explicit decision: **do not create zero-value referral transactions or database records merely because a referral exists.**

If a referral percentage rounds to $0.00 after `floorToCent`:
- `referralAmount = 0`
- The entire residual (treasury fee + dust) goes to treasury
- No referral database record is created for zero-amount transfers

The `TipPaid` event still emits `referral = address(0)` or the actual referrer, but the amount field is `0`.

---

## 13. Notable: All Payment Entry Points Use $1 Minimum

Per the user's instruction, the `$1.00 minimum` applies to **all** payment types:

| Entry Point | Function | Minimum |
|---|---|---|
| Fan tip | `payTip()` | `amount >= 1_000_000` ($1.00) |
| PPV post | `payPPV()` | `amount >= 1_000_000` ($1.00) |
| Subscription | `paySubscription()` | `amount >= 1_000_000` ($1.00) |
| Renewal | `processRenewal()` | `amount >= 1_000_000` ($1.00) |
| Any future payment | TBD | `amount >= 1_000_000` ($1.00) |

This is a **protocol-wide rule**, not a `payTip`-only rule. The constant `MIN_TIP_AMOUNT` is visible and enforceable in every money-moving function.

---

## 14. Diagramming the Accounting Flow

```
Fan → Contract pays amount (e.g., $1.01 = 1_010_000 units)
       │
       ├──► _computeFeeSplit()
       │    ├──► platformFee = (amount × feeBps) / 10_000   → treasury
       │    ├──► referralFee = floorToCent(rawReferralFee) → referrer (or $0)
       │    ├──► creatorAmount = floorToCent(rawCreatorAmount) → creator
       │    └──► treasuryAmount = amount - creator - referral → treasury (residual)
       │
       ├──► token.safeTransferFrom → platformTreasury: platformFee + treasuryAmount
       │                    (platformFee + treasuryAmount = total treasury share)
       │
       ├──► token.safeTransferFrom → creator: creatorAmount
       │                    (creatorAmount is cent-aligned, < $0.01 dust eliminated)
       │
       ├──► token.safeTransferFrom → referrer: referralFee
       │                    (referralFee is cent-aligned, < $0.01 dust eliminated)
       │
       └──► emit TipPaid(amount, creatorAmount, referralFee, treasuryAmount)
```

**Invariant check:** `amount === creatorAmount + referralFee + treasuryAmount` ✓

**Rounding check:** `creatorAmount % CENT === 0` ✓, `referralFee % CENT === 0` ✓

**Dust check:** Any sub-cent remainder is in `treasuryAmount` ✓

---

## 15. Conclusion

This plan delivers:

1. **$1.00 minimum enforcement** at the contract surface for all payment entry points
2. **Explicit cent-level rounding** via `floorToCent()` — creator and referral always receive $0.01-truncated amounts
3. **Dust accountability** — all remainder goes to treasury; the invariant `amount == creator + referral + treasury` is guaranteed by the residual calculation
4. **Integer-arithmetic-only** calculations from beginning to end; no floating-point dollar math at any layer
5. **Event-driven backend consumption** — the `TipPaid` event is the source of truth; backend does not recompute amounts
6. **Fuzz/invariant-ready** — property tests can assert the conservation-of-funds invariant across randomized inputs
7. **Full audit trail** — every payment emits the complete accounting breakdown for independent verification

The plan is designed to be implemented in phases, with security regression at each step, and production-path evidence from local tests through Base Sepolia deployment.

---
*End of Implementation Plan*