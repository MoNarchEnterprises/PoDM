# Payment Refactor Plan

## Problem

All payment modes must use the same consolidated method so they work correctly
and consistently.  Currently there are three parallel browser-wallet
implementations and the PPV-message unlock path in `FanMessages.tsx` only
supports the browser-wallet path (no embedded-wallet fallback).

---

## Current Architecture (25 files)

### Payment Systems

| System | Mechanism | Files |
|---|---|---|
| **Browser Wallet** | `window.ethereum` EIP-1193, user pays gas | `useCryptoPayment.ts`, `cryptoPayments.ts`, `PaymentModal.tsx`, `SubscriptionModal.tsx` (lines 70-150) |
| **Embedded Wallet** | Backend-signed ERC-4337 user ops (gasless) | `EmbeddedPaymentModal.tsx`, `EmbeddedWalletContext.tsx`, `embeddedWalletApi.ts` |
| **Hybrid modals** | User chooses wallet type | `TipModal.tsx`, `UnlockModal.tsx`, `SubscriptionModal.tsx` (the modal itself) |

### Browser-Wallet Duplication

Three separate implementations of the same on-chain flow (allowance check,
approve, contract `payX` call):

| File | Lines | Used By |
|---|---|---|
| `useCryptoPayment.ts` | 133-219 (processPayment) | `FanMessages.tsx`, can be used by any component |
| `cryptoPayments.ts` | 30-154 (payFromWallet) | Legacy `TipModal.tsx`, `UnlockModal.tsx` |
| `PaymentModal.tsx` | 87-175 (handleConfirmPayment) | Inline, no shared call |
| `SubscriptionModal.tsx` | 70-150 (handleConfirmSubscription) | Inline, no shared call |

### Payment Flows That Need Embedded Wallet Support

| Flow | Current Wallet Support | File |
|---|---|---|
| **Tip** | Browser + Embedded (hybrid modal) | `TipModal.tsx` |
| **PPV Post unlock** | Browser + Embedded (hybrid modal) | `UnlockModal.tsx` |
| **PPV Message unlock** | **Browser only** (no embedded path) | `FanMessages.tsx` handleUnlockContent |
| **Subscription** | Browser + Embedded (hybrid modal) | `SubscriptionModal.tsx` |

---

## Target Architecture

```
PaymentOrchestrator (single class)
├── resolveRecipientWallet()   — one canonical fallback chain
├── payWithBrowserWallet()     — single on-chain flow (wraps useCryptoPayment)
└── payWithEmbeddedWallet()    — single gasless flow (wraps EmbeddedPaymentModal)

All callers use PaymentOrchestrator.
No duplicate on-chain implementations.
Every payment entry point offers both wallet types.
```

### Single Source of Truth: `PaymentOrchestrator` class

Location: `src/shared/lib/PaymentOrchestrator.ts` (new file)

```
class PaymentOrchestrator {
  constructor(
    private embeddedWallet: EmbeddedWalletContext,
    private cryptoPayment: CryptoPaymentHook
  )

  // Resolves wallet address with fallback chain:
  // 1. explicit address param
  // 2. message.content.creatorWalletAddress
  // 3. getCryptoWallet(creatorProfile)
  // 4. apiClient.getUserById(creatorId)
  resolveRecipientWallet(params): Promise<string>

  // Unified browser-wallet payment
  async payWithBrowserWallet(params: PaymentParams): Promise<PaymentResult>

  // Opens embedded wallet modal or calls signPaymentOperation directly
  async payWithEmbeddedWallet(params: PaymentParams): Promise<PaymentResult>

  // High-level: checks feature flag, chooses wallet type, executes
  async pay(params: PaymentParams): Promise<PaymentResult>
}

interface PaymentParams {
  paymentType: 'Tip' | 'PPV Post' | 'PPV Message' | 'Subscription';
  amount: number;           // in USD dollars
  creatorId: string;
  creatorWalletAddress?: string;  // optional, resolved via chain if absent
  contentId?: string;
  tierId?: string;
  message?: string;
}

interface PaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
}
```

---

## Refactor Steps

### Step 1 — Create `PaymentOrchestrator`

- New file `src/shared/lib/PaymentOrchestrator.ts`
- Implements `resolveRecipientWallet()` with the fallback chain already proven
  in `FanMessages.tsx` (content field → conversation creator → API fetch)
- Implements `payWithBrowserWallet()` wrapping `useCryptoPayment().processPayment`
- Implements `payWithEmbeddedWallet()` — opens `EmbeddedPaymentModal` or calls
  `signPaymentOperation` directly
- Implements `pay()` — reads `useEmbeddedWalletEnabled()` flag, routes to
  appropriate method

### Step 2 — Delete `src/lib/cryptoPayments.ts`

- `payFromWallet()` in `cryptoPayments.ts` is a legacy function used only by
  `TipModal.tsx` and `UnlockModal.tsx`
- Replace those callers with `PaymentOrchestrator`
- Remove `cryptoPayments.ts`

### Step 3 — Delete inline browser-wallet code in `PaymentModal.tsx`

- `PaymentModal.tsx` (lines 87-175) implements the full allowance/approve/contract
  call flow inline
- Replace with `PaymentOrchestrator.payWithBrowserWallet()`
- Keep the modal UI shell (wallet connect, success/error display)

### Step 4 — Delete inline browser-wallet code in `SubscriptionModal.tsx`

- Lines 70-150 implement the same on-chain flow for subscriptions
- Replace with `PaymentOrchestrator.payWithBrowserWallet({ paymentType: 'Subscription', ... })`
- Keep the modal UI (plan selection, price display, success/error)

### Step 5 — Add embedded-wallet path to `FanMessages.tsx`

- `handleUnlockContent` currently only calls `processCryptoPayment` (browser wallet)
- Add embedded-wallet path using the feature flag, similar to `UnlockModal.tsx`
- Flow: check `useEmbeddedWalletEnabled()` → if true, route to
  `PaymentOrchestrator.payWithEmbeddedWallet()`, else fall back to
  `PaymentOrchestrator.payWithBrowserWallet()`

### Step 6 — Remove dead code

- Delete `src/lib/cryptoPayments.ts`
- Remove unused `useCryptoPayment` imports from files that switch to `PaymentOrchestrator`
- Confirm `PaymentOrchestrator` is the only way browser-wallet payments execute

---

## After Refactor: File State

| File | Change |
|---|---|
| `src/shared/lib/PaymentOrchestrator.ts` | **NEW** — the one payment class |
| `src/lib/cryptoPayments.ts` | **DELETED** |
| `src/lib/wallet.ts` | Keep — `getCryptoWallet` used by orchestrator |
| `src/lib/embeddedWalletApi.ts` | Keep — `signPaymentOperation` used by orchestrator |
| `src/shared/hooks/useCryptoPayment.ts` | Keep — wrapped by orchestrator |
| `src/shared/hooks/useCryptoWallet.ts` | Keep — wallet connection used by modals |
| `src/components/shared/EmbeddedPaymentModal.tsx` | Keep — used by orchestrator |
| `src/components/shared/PaymentModal.tsx` | Simplify — remove inline on-chain flow |
| `src/components/shared/TipModal.tsx` | Simplify — call orchestrator |
| `src/components/shared/UnlockModal.tsx` | Simplify — call orchestrator |
| `src/features/profile/SubscriptionModal.tsx` | Simplify — remove inline on-chain flow |
| `src/features/fan/FanMessages.tsx` | Add embedded-wallet path via orchestrator |
| `src/components/shared/ContentCard.tsx` | No change needed (delegates to modals) |
| `src/features/viewer/ContentViewer.tsx` | No change needed (delegates to modals) |
| `src/features/creator/CreatorEarnings.tsx` | No change (payout, not payment) |
| `src/features/creator/WalletSettings.tsx` | No change (wallet config, not payment) |
| `src/features/fan/FanSettings.tsx` | No change (wallet linking, not payment) |

---

## Verification

After each step, verify these flows still work end-to-end:

1. **Browser-wallet Tip** — `ContentCard` → `TipModal` → MetaMask → tip sent
2. **Embedded-wallet Tip** — `TipModal` → Embedded Wallet → gasless tip sent
3. **Browser-wallet PPV Post** — `ContentCard` → `UnlockModal` → MetaMask → unlocked
4. **Embedded-wallet PPV Post** — `UnlockModal` → Embedded Wallet → gasless unlock
5. **Browser-wallet PPV Message** — `FanMessages` → lock button → MetaMask → unlocked
6. **Embedded-wallet PPV Message** — `FanMessages` → lock button → gasless unlock (NEW)
7. **Browser-wallet Subscription** — `CreatorProfile` → `SubscriptionModal` → MetaMask → subscribed
8. **Embedded-wallet Subscription** — `SubscriptionModal` → Embedded Wallet → gasless sub
9. **Fiat On-Ramp** — `SubscriptionModal`/`PaymentModal` → Coinbase On-Ramp → buy USDC

`npm run lint` and `npx tsc --noEmit` must pass after each step.
