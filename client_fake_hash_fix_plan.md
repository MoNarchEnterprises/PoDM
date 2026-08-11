# Client-Side Fake Hash Fallback Fix Plan (CRITICAL-02)

## Problem

`podm-frontend/src/lib/apiClient.ts:622-629` (`sendTip`) fabricates a random
32-byte hex string whenever `txHash` is omitted and posts it to
`POST /payments/crypto/verify`. The same anti-pattern is repeated across the
payment stack:

| File | Location | Issue |
|---|---|---|
| `podm-frontend/src/lib/apiClient.ts` | :624 | `sendTip` → `txHash: txHash \|\| '0x' + <random 32 bytes>` |
| `podm-frontend/src/lib/apiClient.ts` | :617 | `createSubscription` → `txHash: paymentMethodId` (arbitrary string) |
| `podm-frontend/src/shared/lib/PaymentOrchestrator.ts` | :162 | No-hook fallback posts a random hash to `/payments/crypto/verify` |
| `podm-frontend/src/features/profile/SubscriptionModal.tsx` | :86, :109 | `paymentMethodId: txHash \|\| 'subscription-payment'` / `txHash \|\| 'embedded-payment'` (sent as txHash) |
| `PoDM_project/server/services/cryptoPayment.service.ts` | :124-129 | Server silently normalizes ANY arbitrary string into a valid-looking 64-hex hash |

## Root Cause

The client was designed as the origin of payment "proof". When a real hash is
missing (embedded path, subscription path, or no-hook fallback), the code
synthesizes a plausible-looking hash instead of failing. The chain is the only
legitimate source of a transaction hash — a client can never fabricate one.

### Why it is critical (defense-in-depth / integrity)

- **Fail-open UX**: `TipModal.tsx:59-66` swallows `onSubmit` errors
  (`catch { }`), and the browser path sets `step 2` ("Tip Sent!") at
  `TipModal.tsx:97-99` — so a fabricated hash silently shows success while the
  tip is never verified.
- **Redundant failing calls**: The embedded tip is already recorded server-side
  (`userOperation.service.ts:388` → `verifyPaymentReceiptInBackground`), then
  `sendTip` fires a second `/verify` with a random hash that will never match a
  receipt → 404, wasted RPC calls, and noise.
- **Trust boundary violation**: `cryptoPayment.service.ts:124-129` converts any
  attacker-controlled string (e.g. `'subscription-payment'`) into a deterministic
  "valid" hash that is then looked up on-chain. Today the on-chain receipt check
  (`:171-175`) blocks credit, but this normalization is a soft spot that must not
  exist once client fabrication is removed.
- **Payer-not-validated gap (same trust root)**: `cryptoPayment.service.ts:206-215`
  validates the **recipient** (topics[2]) but never checks **topics[1] (payer)**
  against the authenticated fan's wallet. A fan could submit a *real* on-chain
  hash belonging to someone else's payment to the same creator/amount and get a
  Cleared tip recorded in their name.

## Fix Plan

### Phase 1 — Client never fabricates a hash (fail fast)

1. **`apiClient.sendTip`** (:622-629): make `txHash` required and pass it through
   verbatim. Remove the `|| random32Bytes` fallback. If a caller omits it, throw
   an error that surfaces in the UI instead of a fake 0x string.
2. **`PaymentOrchestrator.payWithBrowserWallet`** (:161-168): remove the
   fabricated-hash branch. A browser payment must go through
   `useCryptoPayment.processPayment`, which already posts the **real** hash from
   `eth_sendTransaction` to `/verify` (`useCryptoPayment.ts:195-218`). Delete the
   dead no-hook fallback or make it return an error ("cryptoPayment hook required").
3. **`SubscriptionModal.tsx`** (:86, :109): stop passing
   `'subscription-payment'` / `'embedded-payment'` literal strings as the
   payment identifier. Require the real `txHash` from the embedded/browser result;
   if absent, surface an error and do not call `createSubscription`.
4. **`apiClient.createSubscription`** (:616-617): pass `txHash` explicitly as a
   required param (no `paymentMethodId` alias); reject empty values.
5. **`TipModal` embedded path** (:59-66): the embedded payment is already recorded
   server-side by `userOperation.service.ts`. Do NOT call `sendTip` again after
   `handleEmbeddedSuccess` — remove the redundant `/verify` round trip (or only
   call it with the real `result.data.txHash` when the caller genuinely needs a
   separate Tip record). Stop swallowing errors.

### Phase 2 — Server rejects fabricated/malformed hashes

6. **`cryptoPayment.service.ts:124-129`**: delete the `Buffer` normalization.
   Require `/^0x[A-Fa-f0-9]{64}$/` strictly. On-ramp / card identifiers (which
   this code currently launders into hashes) must be handled by their own
   dedicated paths (`onramp.service.ts` webhook, debit-card payout), never via
   `/verify` txHash. Reject non-hex input with 400.
7. **Payer validation (defense-in-depth)**: in `verifyAndRecordBasePayment`,
   parse `contractLog.topics[1]` (payer) and verify it equals the authenticated
   fan's wallet — the fan's linked `crypto_wallet_address` (browser wallet) or
   their smart-account address (embedded wallet). Reject with 400 on mismatch so
   no one can repurpose another person's on-chain payment. (Embedded payers are
   smart accounts; resolve via `profiles.crypto_wallet_provider_id`/smart account.)
8. Ensure the 409 duplicate-hash guard (`:119-121`) stays; with client fabrication
   gone, only genuine hashes hit it.

### Phase 3 — Consistency

9. Grep for `crypto.getRandomValues`, `'subscription-payment'`,
   `'embedded-payment'`, and any other synthetic hash builders in
   `podm-frontend/src`; remove all instances (currently 4 confirmed).
10. Confirm `useCryptoPayment.ts:205` (browser verify POST) and
    `PaymentOrchestrator` both use the same real `hash` returned by
    `eth_sendTransaction`, and that `sendTip`/`createSubscription` callers pass it
    through unchanged.

## Deployment Order

1. Ship Phase 2 first (server hardens + rejects malformed hashes), so the client
   changes land against a strict backend and any missed call site fails loudly
   instead of being laundered.
2. Ship Phase 1 + 3 (frontend removes fabrication, requires real hashes).
3. Verify no remaining caller passes `undefined`/literal strings as txHash.

## Files to Modify

| File | Change |
|---|---|
| `podm-frontend/src/lib/apiClient.ts` | `sendTip` + `createSubscription` require real txHash; drop random fallback |
| `podm-frontend/src/shared/lib/PaymentOrchestrator.ts` | Remove fabricated-hash fallback branch |
| `podm-frontend/src/features/profile/SubscriptionModal.tsx` | Remove literal payment identifiers; require real hash |
| `podm-frontend/src/components/shared/TipModal.tsx` | Stop redundant post-embedded `sendTip`; stop swallowing errors |
| `PoDM_project/server/services/cryptoPayment.service.ts` | Strict hash regex (remove Buffer normalization); validate payer (topics[1]) against authenticated fan |

## Verification

- `npm test` (backend Jest): add tests asserting `/verify` rejects non-hex and
  fabricated hashes (400), and rejects a real hash whose payer (topics[1]) is not
  the authenticated fan.
- `npm run lint` + `npm test` (frontend Jest).
- Manual smoke: browser-wallet tip (real hash verified), embedded-wallet tip
  (single server-side record, no second fake `/verify` call), subscription via
  embedded + browser (real hash recorded), and a tampered request (fake/foreign
  hash) rejected with 400/409.
