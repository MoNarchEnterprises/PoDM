# Deliverable 10: Risk-Based Test Priority

**Project**: PoDM Creator-Audience Platform  
**Date**: August 9, 2026  
**Synthesizes**: Deliverables 1–9 (317 total gaps identified)  
**Audience**: Engineering lead / test owner

---

## Summary State

| Deliverable | Scope | Total Cases | Covered | Gap |
|---|---|---|---|---|
| D4 — Scenario Suite | Feature scenarios | 95 | ~8 | 87 |
| D6 — State Transitions | State machines (11) | 51 | 5 | 46 |
| D7 — Integration Matrix | System boundaries (9) | 94 | 11 | 83 |
| D8 — Security Suite | Attack domains (10) | 97 | 5 | 92 |
| D9 — Payment Suite | Blockchain/payment | 89 | 0 | 89 |
| **Total (deduped)** | | **~317** | **~18** | **~299** |

> [!CAUTION]
> **~94% of identified test cases have no coverage.** This is not a quality signal about the code — the application may be correct — but there is **no verified evidence** that any financial, access control, or smart contract behavior is correct under adversarial conditions.

---

## Risk Scoring Methodology

Each gap is scored on four dimensions (1–5 each):

| Dimension | 5 | 1 |
|---|---|---|
| **FI** Financial Impact | Direct monetary loss (payments, fees) | No financial consequence |
| **AI** Access Impact | Unauthorized premium content access | No access change |
| **L** Likelihood | Trivially exploitable (no auth needed) | Requires deep technical access |
| **BR** Blast Radius | Platform-wide or all-user effect | Single isolated record |

**Priority Score** = FI + AI + L + BR (max 20)

Scores ≥ 16: 🔴 P0 — block production  
Scores 12–15: 🟠 P1 — resolve within 2 weeks  
Scores 8–11: 🟡 P2 — resolve within 6 weeks  
Scores < 8: 🟢 P3 — hardening backlog

---

## Top 30 Prioritized Test Items

| Rank | ID | Description | FI | AI | L | BR | Score | Phase | Source |
|---|---|---|---|---|---|---|---|---|---|
| 1 | VER-14 / B4-06 / SEC-S3-15 | ERC-4337 UserOp: `receipt.to` = EntryPoint — gasless payments silently rejected if `to` checked instead of `logs` | 5 | 5 | 3 | 5 | **18** | 🔴 P0 | D7/D8/D9 |
| 2 | VER-06 / SEC-S3-01 / PAY-002 | Duplicate `blockchain_tx_hash` → double-credit or double-subscription | 5 | 5 | 4 | 4 | **18** | 🔴 P0 | D4/D8/D9 |
| 3 | VER-09 / SEC-S3-04 / PAY-007 | Wrong creator wallet in tx `topics[2]` → payment attributed to wrong creator | 5 | 5 | 3 | 4 | **17** | 🔴 P0 | D4/D8/D9 |
| 4 | SEC-S3-11 / WAL-001 / REF-03 | `getCryptoWalletForUser` must return `''` when no wallet — never platform treasury address | 5 | 5 | 2 | 5 | **17** | 🔴 P0 | D8/D9 |
| 5 | RECUR-02 / SEC-S6-01 / SOL-005 | `processRenewal` by non-keeper EOA → must revert `onlyKeeper` | 5 | 4 | 3 | 5 | **17** | 🔴 P0 | D8/D9 |
| 6 | RECUR-07 / SEC-S6-07 / SOL-006 | `processRenewal` before period elapsed → over-billing Audience | 5 | 4 | 3 | 5 | **17** | 🔴 P0 | D8/D9 |
| 7 | RECUR-04 / SEC-S6-08 / SOL-007 | `processRenewal` with `amount > maxAmountPerPeriod` → overcharge | 5 | 4 | 3 | 5 | **17** | 🔴 P0 | D8/D9 |
| 8 | ACCESS-07 / SEC-S6-13 | UUPS upgrade by non-owner → arbitrary contract replacement | 5 | 5 | 2 | 5 | **17** | 🔴 P0 | D8/D9 |
| 9 | SEC-S6-06 / XFER-01 | Reentrancy via malicious ERC-20 callback in `paySubscription` | 5 | 5 | 2 | 5 | **17** | 🔴 P0 | D8/D9 |
| 10 | VER-11 / SEC-S3-05 / PAY-009 | Unexpected referrer in tx when creator has no active referral | 5 | 3 | 4 | 4 | **16** | 🔴 P0 | D4/D8/D9 |
| 11 | VER-12 / SEC-S3-06 / PAY-010 | Referrer wallet in tx ≠ DB-resolved referrer wallet | 5 | 3 | 4 | 4 | **16** | 🔴 P0 | D4/D8/D9 |
| 12 | ADM-004 / SEC-S3-12 | Enclave commission override: admin PATCH → effective rate must remain 10% | 4 | 3 | 3 | 5 | **15** | 🟠 P1 | D4/D8 |
| 13 | SEC-S2-07 / CON-008 | Vault/unlisted content: no access path for any fan under any condition | 4 | 5 | 3 | 3 | **15** | 🟠 P1 | D4/D8 |
| 14 | SEC-S3-07 / PAY-013 | Subscription tx hash accepted for PPV unlock — wrong type accepted | 4 | 5 | 4 | 3 | **16** | 🔴 P0 | D4/D8 |
| 15 | SEC-S2-03 / MSG-008 | Non-participant requests conversation messages (IDOR) | 3 | 5 | 4 | 3 | **15** | 🟠 P1 | D4/D8 |
| 16 | SEC-S2-04 / MSG-009 | Non-participant calls `PATCH /messages/:id/unlock` (IDOR) | 4 | 5 | 4 | 3 | **16** | 🔴 P0 | D4/D8 |
| 17 | VER-03 | Sync 5×3s timeout → 404 returned, record NOT marked Failed | 4 | 2 | 3 | 4 | **13** | 🟠 P1 | D9 |
| 18 | VER-04 | Async 10×6s timeout → `updateTransactionStatus(hash, 'Failed')` called | 4 | 2 | 3 | 4 | **13** | 🟠 P1 | D9 |
| 19 | SEC-S1-04 / B1 | No rate limit on `POST /auth/login` → brute-force attack | 3 | 4 | 5 | 4 | **16** | 🔴 P0 | D7/D8 |
| 20 | SEC-S2-05 / SUB-001 | Unsubscribed Audience accesses `subscribers_only` content (verify service guard) | 3 | 5 | 4 | 4 | **16** | 🔴 P0 | D4/D8 |
| 21 | SEC-S2-06 / PPV-001 | Audience without cleared PPV tx requests locked content (verify `isUnlocked: false`) | 3 | 5 | 4 | 4 | **16** | 🔴 P0 | D4/D8 |
| 22 | B3-05 / AUTH-signup | `signupAndSubscribe` failure → orphan auth user cleaned up | 3 | 2 | 2 | 4 | **11** | 🟡 P2 | D7 |
| 23 | B2-03 / SUB-005 | `findSubscriptionsDueForRenewal` excludes subs with null `fan_wallet_address` | 5 | 3 | 2 | 5 | **15** | 🟠 P1 | D7 |
| 24 | CON-011 / SEC-S2-auto | 3 reports auto-flags content; 2 reports does NOT | 2 | 2 | 4 | 3 | **11** | 🟡 P2 | D4/D6 |
| 25 | REF-03 / WAL-02 | PERCENT referral after 180 days → `getPercentageReferralInfo` returns null, fee = 0 | 4 | 2 | 2 | 3 | **11** | 🟡 P2 | D9 |
| 26 | CASH-01 / REF-006 | CASH referral $750 in ≤30 days → $50 bonus; $750 in ≤14 days → $75 | 3 | 2 | 2 | 3 | **10** | 🟡 P2 | D9 |
| 27 | B5-02 | Batch content upload partial failure → R2 cleanup of all already-uploaded files | 2 | 2 | 2 | 3 | **9** | 🟡 P2 | D7 |
| 28 | B6-02 / MSG-009 | `PATCH /unlock` → Socket.IO `message_updated` fires with `isUnlocked: true` | 2 | 3 | 2 | 3 | **10** | 🟡 P2 | D7 |
| 29 | SEC-S1-05/06/07 | Cookie security attributes: `HttpOnly`, `Secure`, `SameSite=Lax` | 2 | 4 | 3 | 4 | **13** | 🟠 P1 | D8 |
| 30 | SEC-S10-06 | Supabase service key absent from frontend bundle | 5 | 5 | 2 | 5 | **17** | 🔴 P0 | D8 |

---

## Mock Infrastructure Prerequisites

> [!IMPORTANT]
> **Build these first.** The mock helpers are shared across D9 payment tests, D7 integration tests, and D8 security tests. Without them, no test file can be wired up.

```
Priority order (build before tests that depend on them):

Week 0 (pre-sprint):
  ① MockERC20.sol                    — D9/File 0; required by all Hardhat tests
  ② RPC mock factory                 — buildReceipt() helper from D9/File 2
  ③ Jest supabase client mock        — jest.mock('../config/supabaseClient')
  ④ Jest model mock factory          — reusable TransactionModel, SubscriptionModel stubs
  ⑤ Socket.IO test adapter           — io.to().emit() spy setup
```

**Estimated build time**: 1–2 days. Unblocks all 89 D9 cases and ~40 D7/D8 cases simultaneously.

---

## Phase 1: P0 — Financial Integrity & Smart Contract (Weeks 1–3)

**Goal**: Verify no money moves incorrectly under any condition.

### Sprint 1A: Smart Contract Tests (Hardhat) — Week 1

All tests from D9/File 1 (`PoDMPaymentProtocol.test.ts`).

```
Test file: contracts/test/PoDMPaymentProtocol.test.ts
Command:   npx hardhat test --network hardhat
```

| Test Group | Cases | Ranks Covered |
|---|---|---|
| Fee split math (FEES-01–05) | 5 | #4, #10, #11 |
| Token balance accounting (BAL-01–04) | 4 | #3, #4 |
| Input validation (GUARD-01–06) | 6 | — |
| Pause/unpause (PAUSE-01–04) | 4 | — |
| Recurring subscription (RECUR-01–09) | 9 | **#5, #6, #7** |
| Access control + UUPS (ACCESS-01–07) | 7 | **#5, #8** |
| ERC-20 transfer failures (XFER-01–03) | 3 | #9 |

---

## Phase 2: P1 — Auth, IDOR & Subscription Integrity (Weeks 4–6)

**Goal**: Verify all identity and access paths are correctly guarded.

---

## Phase 3: P2 — State Machine Coverage & Infrastructure (Weeks 7–10)

**Goal**: Verify all state transitions and cross-service interactions.

---

## Phase 4: P3 — Hardening Backlog (Weeks 11–14)

**Goal**: Defense-in-depth, configuration, and E2E coverage.

---

## Platform-Specific Invariants (Never Break These)

| Invariant | Assert In | Source |
|---|---|---|
| `getCryptoWalletForUser` never returns treasury address | Any test involving wallet lookup | D5/D8 |
| Referral fee never reduces creator payout | Any fee split test | D5/D6/D9 |
| Enclave `getEffectiveCommissionRate` always returns 10% | Any commission-related test | D5/D8 |
| `processRenewal` is only callable by registered keepers | Any smart contract test | D6/D9 |
| `createTransaction` always records `blockchain_tx_hash` | Any payment verification test | D6/D9 |
| Subscription access requires `status='active'` (not just existence) | Any subscription access test | D6 |

---

*Status: Complete. All 10 deliverables produced.*
