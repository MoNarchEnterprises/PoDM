# Deliverable 11: Coverage Gaps

**Project**: PoDM Creator-Audience Platform  
**Date**: August 9, 2026  
**Lens**: Code-centric — gaps organized by source file, not by priority  
**Cross-reference**: D4 (scenarios), D6 (state machines), D7 (integration), D8 (security), D9 (payment), D10 (priority)

---

## How to Read This Document

Each section maps to a source file. For each gap:

- **Function**: exact function name where the gap lives
- **Branch**: the specific condition or path not covered
- **Risk**: what happens if this path behaves incorrectly in production
- **Test Type**: unit / integration / E2E
- **D-Ref**: cross-reference to prior deliverable

**Coverage tier definition**:

| Tier | Meaning |
|---|---|
| ⬛ None | No tests touch this function at all |
| 🟥 Partial | Function is called in tests but critical branches are skipped |
| 🟨 Shallow | Happy path tested; error/edge cases not |
| 🟩 Adequate | Core paths + at least one error path covered |

---

## Feature-Level Coverage Snapshot

| Feature Area | Files | Coverage Tier | Riskiest Gap |
|---|---|---|---|
| Auth & Session | auth.service.ts, auth.middleware.ts | 🟨 Shallow | Orphan cleanup on signup failure |
| Payment Verification | cryptoPayment.service.ts, verification.service.ts | ⬛ None | All 8 on-chain validation checks |
| Content Management | content.service.ts | ⬛ None | Batch upload cleanup, FFmpeg path |
| Subscriptions | subscription.service.ts | 🟨 Shallow | Renewal eligibility filter |
| Messaging | message.service.ts | ⬛ None | IDOR, PPV unlock, gallery enrichment |
| Referrals | referral.service.ts | ⬛ None | 180-day expiry, CASH milestone |
| Wallet | wallet.service.ts | ⬛ None | No-treasury-fallback invariant |
| Notifications | notification.service.ts | ⬛ None | Preference opt-out guard |
| Contests | contest.service.ts | ⬛ None | All lifecycle transitions |
| Admin | admin.service.ts | ⬛ None | Enclave commission lock |
| Gallery | gallery.service.ts | 🟨 Shallow | Dedup, inGallery enrichment |
| Reports | report model & service | ⬛ None | Auto-flag threshold, dismiss |
| Smart Contract | PoDMPaymentProtocol.sol | ⬛ None | All functions, all guards |
| Middleware | auth.middleware.ts | 🟥 Partial | `optionalProtect`, impersonation |
| Frontend API | apiClient.ts | ⬛ None | 401 refresh interceptor |

---

## S1: auth.middleware.ts

### `protect`
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| Valid token → `req.user` set | 🟩 Yes | — | Unit | D8/S1-01 |
| No token in cookie or header → 401 | 🟩 Yes | — | Unit | D8/S1-02 |
| Token present, Supabase returns `authError` → 401 | 🟨 Partially | Auth bypass if error silently swallowed | Unit | D8/S1-03 |
| Token valid, `profiles` row missing → 404 `User profile not found` | ⬛ None | User permanently locked out; no recovery flow | Unit | D7/B3-07 |
| Supabase Auth service unreachable → 401 (not 500) | ⬛ None | 500 leak would expose internal error details | Unit | D7/B3-04 |

### `optionalProtect`
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| Token provided → `req.user` set normally | ⬛ None | Any public route that uses `req.user` could behave incorrectly | Unit | — |
| No token → `req.user = null`, proceeds without error | ⬛ None | If caller assumes `req.user` is always non-null, NPE in service | Unit | — |
| Invalid token → `req.user = null`, proceeds (no 401) | ⬛ None | Silent auth failure on routes that should optionally enrich | Unit | — |

### `creatorOnly` / `protectAndCreator`
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| Role `'creator'` → passes | 🟨 Shallow (assumed) | — | Integration | — |
| Role `'fan'` → 403 | ⬛ None | Fan accessing creator routes | Unit | D8/S2-01 |
| Role `'admin'` → 403 (admin is not creator) | ⬛ None | Admin could accidentally trigger creator-only logic | Unit | — |
| Creator with `status = 'pending'` → **passes** (no status check in middleware) | ⬛ None | Pending creators upload content | D10/D5 gap | Unit | D5 known gap |

### Impersonation (`X-Impersonating-User-Id`)
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| Admin + valid creator ID → `req.user = creatorProfile`, `req.originalUser = admin` | ⬛ None | Impersonation may silently fail or produce wrong user | Integration | D8/S9 |
| Admin + non-existent user ID → error or fallback | ⬛ None | Could throw unhandled or silently use admin profile | Unit | D8/S9-04 |
| Non-admin + header → header silently ignored | ⬛ None | **Critical**: header must have zero effect for non-admins | Unit | D8/S9-01 |

---

## S2: auth.service.ts

### `signup` / `signupAndSubscribe`
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| Happy path fan signup | 🟩 Yes (integration) | — | Integration | — |
| Happy path creator signup → `status = 'pending verification'` | ⬛ None | Creator could bypass pending status | Unit | D6/SM-6 |
| Referral code provided at creator signup → `referral_applications` created | ⬛ None | Referral tracking never starts | Unit | D9/REF |
| Enclave referral code at signup → `is_enclave_member = true`, `enclave_joined_at` set | ⬛ None | Enclave status never set; commission at wrong rate | Unit | D8/S1-15 |
| Subscription step throws → `supabase.auth.admin.deleteUser(userId)` called | ⬛ None | Orphan auth user with no profile persists | Unit | D7/B3-05 |
| `deleteUser` itself throws in cleanup → error logged, original error re-thrown | ⬛ None | Orphan remains; cleanup failure silently swallowed | Unit | D7/B3-06 |

### `login`
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| Valid credentials → tokens set in cookies | 🟩 Yes | — | Integration | — |
| Invalid credentials → 401 | 🟩 Yes | — | Integration | — |
| Account suspended → login behavior | ⬛ None | Suspended user may log in | Unit | D6/SM-6 |

### `refreshToken`
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| Valid refresh token → new `authToken` cookie set | ⬛ None | Silent session expiry; user cannot refresh | Integration | D7/B1-05 |
| Missing cookie → 401 `No refresh token provided` | 🟩 Yes | — | Unit | D8/S1-02 |
| Invalid/tampered refresh token → 401 | ⬛ None | Tampered refresh token should not grant access | Unit | D8/S1-03 |

---

## S3: cryptoPayment.service.ts

**Coverage tier: ⬛ None across all branches**

### `verifyAndRecordBasePayment` (sync path)
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| Duplicate `blockchain_tx_hash` → 409 | ⬛ None | Double-credit, double-subscription | Unit | D9/VER-06, D10/#2 |
| Receipt found attempt 1, all checks pass → Cleared | ⬛ None | Core payment flow unverified | Unit | D9/VER-01 |
| Receipt null attempts 1–4, found attempt 5 → Cleared | ⬛ None | Retry logic untested | Unit | D9/VER-02 |
| Receipt null all 5 attempts → 404, record stays `Pending` | ⬛ None | Timeout behavior | Unit | D9/VER-03 |
| `receipt.status = '0x0'` → 400 | ⬛ None | Reverted tx credited | Unit | D9/VER-07 |
| Log address ≠ PoDM contract → 400 | ⬛ None | Wrong contract tx credited | Unit | D9/VER-08 |
| `receipt.to` = EntryPoint (ERC-4337), PoDM log present → Cleared | ⬛ None | **All Coinbase Smart Wallet payments rejected** | Unit | D9/VER-14, D10/#1 |
| `receipt.to` = EntryPoint, no PoDM log → 400 | ⬛ None | Wrong contract UserOp silently accepted | Unit | D9/VER-15 |
| `topics[2]` ≠ creator wallet → 400 | ⬛ None | Payment to wrong creator | Unit | D9/VER-09, D10/#3 |
| Amount decoded ≠ requested ±1 cent → 400 | ⬛ None | Underpayment accepted | Unit | D9/VER-10 |
| Non-zero referrer when no active referral → 400 | ⬛ None | Unexpected referrer siphons platform fee | Unit | D9/VER-11, D10/#10 |
| Referrer wallet decoded ≠ DB-resolved → 400 | ⬛ None | Attacker substitutes own wallet | Unit | D9/VER-12, D10/#11 |
| Referral fee decoded ≠ expected ±2 cents → 400 | ⬛ None | Inflated referral fee | Unit | D9/VER-13 |
| Tx hash normalization (short hash padded) | ⬛ None | Non-normalized hash breaks RPC call | Unit | D9/VER-16 |
| `BASE_CONTRACT_ADDRESS` env not set → 500 | ⬛ None | Misconfiguration allows any log address | Unit | D9/VER-17 |

### `verifyTransactionInBackground` (async path)
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| 10 null receipts → `updateTransactionStatus(hash, 'Failed')` | ⬛ None | Record stuck in `Pending` forever | Unit | D9/VER-04 |
| Found on attempt N (1–10) → Cleared, stops retrying | ⬛ None | Retry loop continues past success | Unit | D9/VER-05 |
| Validation failure in async path → `Failed` state | ⬛ None | Invalid tx never marked Failed | Unit | D9 |

---

## S4: referral.service.ts

**Coverage tier: ⬛ None**

### `getPercentageReferralInfo`
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| Active referral within 180 days → returns referral info | ⬛ None | Referral fee never applied | Unit | D9/REF-01 |
| No referral record → returns null | ⬛ None | Fee incorrectly applied | Unit | D9/REF-02 |
| Referral record older than 180 days → returns null | ⬛ None | Expired referrals still earn fees | Unit | D9/REF-04, D10/#25 |

### `calculateReferralFee`
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| Referrer has wallet → fee = 1% capped at platformFee | ⬛ None | Fee not paid to referrer | Unit | D9/REF-01 |
| Referrer wallet = '' → fee = 0 (no treasury fallback) | ⬛ None | **Treasury address substituted as referrer** | Unit | D9/REF-03, D10/#4 |
| Referral fee would exceed platformFee → capped | ⬛ None | Referrer receives more than platform fee | Unit | D9/REF-05 |
| Fee = 0 → no `recordReferralFee` DB call | ⬛ None | Phantom referral records created | Unit | D9/REF-06 |

### `checkCashMilestone`
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| $750 within 30 days → $50 base bonus | ⬛ None | Referrer never paid | Unit | D9/CASH-01 |
| $750 within 14 days → additional $25 speed bonus | ⬛ None | Speed bonus unpaid | Unit | D9/CASH-02 |
| $749 within 30 days → no bonus | ⬛ None | Bonus paid prematurely | Unit | D9/CASH-04 |
| After 30 days, $750 not reached → no bonus | ⬛ None | Late bonus incorrectly paid | Unit | D9/CASH-03 |
| Milestone triggered twice concurrently → idempotent | ⬛ None | Double bonus payment | Unit | D9/CASH-05 |

---

## S5: content.service.ts

**Coverage tier: ⬛ None**

### `createNewContent`
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| Image upload → Sharp thumbnail → upload to R2 | ⬛ None | Thumbnail missing for all images | Integration | D7/B9-01 |
| Sharp thumbnail upload fails → fallback to original path | ⬛ None | 500 instead of graceful fallback | Unit | D7/B9-02 |
| Video upload → FFmpeg extracts frame → upload to R2 | ⬛ None | Video thumbnails broken | Integration | D7/B9-06 |
| FFmpeg binary missing → `AppError(500)` | ⬛ None | Unhandled error in prod | Unit | D7/B9-07 |
| FFmpeg/Sharp temp files cleaned up from `os.tmpdir()` | ⬛ None | Disk fill in long-running process | Unit | D7/B9-08 |
| FFmpeg cleanup fails (`ENOENT`) → error logged only | ⬛ None | Re-throw kills content upload | Unit | D7/B9-09 |
| Audio file → no thumbnail generated, original path used | ⬛ None | Wrong thumbnail logic applied | Unit | D7/B9-10 |
| Batch upload: 3rd file fails → `deleteFromPrivate([path1, path2])` | ⬛ None | R2 orphan files accumulate | Integration | D7/B5-02 |
| `schedule.isScheduled = true` → `status = 'scheduled'` | ⬛ None | Scheduled content published immediately | Unit | D6/SM-3 |
| Pending creator uploads content → succeeds (no status block) | ⬛ None | Confirmed gap: no guard in service | Unit | D5, D10/#16 |

### `getContentById`
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| `subscribers_only` + unsubscribed fan → no signed URL, placeholder only | 🟩 Yes | — | Integration | D8/S2-05 |
| `subscribers_only` + expired subscription → no signed URL | ⬛ None | Expired subscriber retains access | Integration | D6/SM-2 |
| `pay_per_view` + cleared PPV tx → `isUnlocked: true` | 🟨 Shallow | — | Integration | — |
| `pay_per_view` + cleared **Subscription** tx (wrong type) → `isUnlocked: false` | ⬛ None | Subscription tx used to unlock PPV | Integration | D8/S3-07 |
| `unlisted` content → no access for any fan | ⬛ None | Vault content exposed | Integration | D8/S2-07 |

### `reportContent`
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| 2 reports → content NOT flagged | ⬛ None | Boundary condition unchecked | Unit | D6/SM-3 |
| 3rd report → `ContentModel.updateContent(id, { status: 'flagged' })` called | ⬛ None | Auto-flag never fires | Unit | D6/SM-3, D4/CON-011 |

### Watermark generation
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| Username contains `<`, `>`, `"` → `escapeXml()` applied before SVG | ⬛ None | SVG injection via username | Unit | D8/S4-01 |
| R2 download of original for watermark fails → fallback to original path | ⬛ None | 500 on every watermarked view | Unit | D7/B9-05 |
| Watermark uploaded to `temp/wm-{fanId}-{ts}.webp` key | ⬛ None | Watermarked images stored at wrong key | Unit | D7/B9-04 |

---

## S6: subscription.service.ts

### `createSubscription`
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| Inserts row with all required columns (including `blockchain_tx_hash`) | ⬛ None | Missing tx hash breaks renewal tracking | Integration | D7/B2-01 |
| Re-use of already-Cleared tx hash → 409 (no duplicate subscription) | ⬛ None | Double subscription from one payment | Unit | D7/B2, D4/SUB-006 |

### `findSubscriptionsDueForRenewal`
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| Correctly filters: `status='active'`, `next_billing_date <= NOW()`, `fan_wallet_address IS NOT NULL` | ⬛ None | **Null-wallet fans auto-billed (impossible) or valid fans skipped** | Integration | D7/B2-03, D10/#23 |

### `cancelSubscription`
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| Fan cancels → `cancel_at_period_end = true`, `status` stays `active` until period end | ⬛ None | Immediate access revocation on cancel | Unit | D4/SUB-004 |

---

## S7: message.service.ts

**Coverage tier: ⬛ None**

### `sendDirectMessage`
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| Creator `status = 'pending'` → 403 `account must be verified` | ⬛ None | Pending creator sends DMs | Unit | D5, D8/S2-16 |
| Content attachment with `price > 0` → `isUnlocked: false` | ⬛ None | PPV content auto-unlocked | Unit | D6/SM-11 |
| Content attachment with `price = 0` → `isUnlocked: true` | ⬛ None | Free content stays locked | Unit | D6/SM-11 |
| Attached content deleted between calls → 404 `Attached content could not be found` | ⬛ None | 500 or NPE on stale content reference | Unit | D7/B7-06 |
| Creator wallet injected via `getCryptoWalletForUser` → never treasury address | ⬛ None | Treasury substituted as payment recipient | Unit | D7/B7-07, D10/#4 |
| Socket.IO `new_message` emitted to conversation room | ⬛ None | Real-time delivery untested | Unit | D7/B6-01 |

### `getMessagesForConversation`
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| Non-participant requests conversation → 403 | ⬛ None | IDOR — read all messages between two users | Integration | D8/S2-03, D10/#15 |
| `inGallery` flag computed correctly from gallery snapshot | ⬛ None | Gallery enrichment always false or always true | Unit | D7/B7 |

### `PATCH /messages/:id/unlock`
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| Non-participant calls unlock → 403 | ⬛ None | Any user unlocks any locked message | Integration | D8/S2-04, D10/#16 |
| Cleared PPV Message tx → `isUnlocked = true` persisted in DB | ⬛ None | DB not updated; user must re-pay | Integration | D7/B6-02 |
| Socket.IO `message_updated` emitted after DB write | ⬛ None | Real-time state update lost | Integration | D7/B6-02 |
| PPV Post tx hash used for message unlock → rejected | ⬛ None | PPV Post hash unlocks messages | Unit | D8/S3-08 |

---

## S8: notification.service.ts

**Coverage tier: ⬛ None**

### `notifySubscribersOfNewContent`
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| No subscribers → returns early, no notifications created | 🟩 Yes (inferred from D7/B7-11) | — | Unit | — |
| Subscriber with `preferences.notifications.newContent = false` → skipped | ⬛ None | Opt-out ignored; unwanted notifications sent | Unit | D6/SM-8 |
| Subscriber with missing `preferences` key → defaults to `true` (opt-in) | ⬛ None | Missing preferences block all notifications | Unit | D7/B7-12 |
| Notification created with `is_read = false` | ⬛ None | Unread count incorrect | Unit | D6/SM-8 |

### Notification read/delete routes
| Branch | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| `PUT /notifications/:id/read` → `is_read = true` | ⬛ None | Notifications always show as unread | Unit | D6/SM-8 |
| `PUT /notifications/read-all` → bulk update | ⬛ None | Read-all doesn't clear badge | Unit | D6/SM-8 |
| `DELETE /notifications/:id` (own only) | ⬛ None | User cannot delete notifications | Unit | D6/SM-8 |

---

## S9: wallet.service.ts

**Coverage tier: ⬛ None**

| Function | Branch | Covered | Risk | D-Ref |
|---|---|---|---|---|
| `getCryptoWalletForUser` | Wallet configured → returns address | ⬛ None | Wallet lookup broken | D9/WAL-02 |
| `getCryptoWalletForUser` | Wallet null → returns `''` | ⬛ None | **Treasury address substituted** | D9/WAL-01, D10/#4 |
| `getCryptoWalletForUser` | DB error → returns `''` | ⬛ None | Error silently treated as no wallet | D9/WAL-03 |

> [!CAUTION]
> This is the most impactful single-function gap in the codebase. The no-treasury-fallback invariant is a platform rule recorded in the root AGENTS.md. It has zero test enforcement. A regression here means platform treasury receives payments that should fail silently.

---

## S10: contest.service.ts

**Coverage tier: ⬛ None**

| Function | Branch | Covered | Risk | D-Ref |
|---|---|---|---|---|
| `createContest` | `end_date <= start_date` → 400 | ⬛ None | Invalid contest created | D4/CNT-002 |
| `publishContest` | Non-owner creator publishes → 403 | ⬛ None | IDOR — any creator publishes any draft | D4/CNT-005 |
| `enterContest` | `status !== 'active'` → 400 | ⬛ None | Entries accepted for draft contests | D4/CNT-006 |
| `enterContest` | `new Date() > end_date` → 400 | ⬛ None | Late entries accepted | D4/CNT-007 |
| `enterContest` | Fan not subscribed → 403 | ⬛ None | Non-subscribers enter gated contests | D4/CNT-008 |
| `enterContest` | Duplicate entry → 409 | ⬛ None | Same fan enters multiple times | D4/CNT-009 |
| `pickWinner` | Non-owner creator picks → 403 | ⬛ None | IDOR — any creator picks winner | D4/CNT-011 |
| `pickWinner` | Already `completed` → guard fires | ⬛ None | Winner overwritten | D6/SM-5 |

---

## S11: admin.service.ts (commission & user management)

| Function | Branch | Covered | Risk | D-Ref |
|---|---|---|---|---|
| `setCreatorCommission` | Enclave creator → override rejected, rate stays 10% | ⬛ None | Enclave commission silently changed | D8/S3-12, D10/#12 |
| `updateUserStatus` | Status → `active` (reinstate) | ⬛ None | Reinstatement broken | D4/ADM-003 |
| `updateUserStatus` | Status → `suspended` | ⬛ None | Suspension broken | D4/ADM-003 |
| `generateReferralCode` | Code uniqueness collision handling | ⬛ None | Duplicate codes issued | D4/ADM |

---

## S12: gallery.service.ts

| Function | Branch | Covered | Risk | D-Ref |
|---|---|---|---|---|
| `addItemToGallery` | First add → `added: true`, gallery stat incremented | 🟨 Shallow | — | D7/B2-07 |
| `addItemToGallery` | Duplicate add → `added: false`, no UPDATE | 🟩 Yes (inferred) | — | D7/B2-07 |
| `getGalleryForCreatorAndFan` | Fan not subscribed → 403 | ⬛ None | Unsubscribed fan views gallery | D4/GAL-003 |

---

## S13: PoDMPaymentProtocol.sol

**Coverage tier: ⬛ None across all functions**

| Function | Critical Uncovered Branch | D-Ref |
|---|---|---|
| `paySubscription` | Fee split with referrer | D9/FEES-02 |
| `paySubscription` | Fee cap when 1% > platformFee | D9/FEES-03 |
| `paySubscription` | `creator = address(0)` → revert | D9/GUARD-01 |
| `paySubscription` | `amount = 0` → revert | D9/GUARD-02 |
| `paySubscription` | `customPlatformFeeBps > 3000` → revert | D9/GUARD-03 |
| `paySubscription` | Paused → revert | D9/PAUSE-01 |
| `paySubscription` | Reentrancy via malicious ERC-20 → `nonReentrant` blocks | D8/S6-06 |
| `payTip` | All branches — completely untested | D9/BAL-03 |
| `payPPV` | All branches — completely untested | D9/BAL-04 |
| `processRenewal` | Non-keeper call → revert | D9/RECUR-02, D10/#5 |
| `processRenewal` | Before period elapsed → revert | D9/RECUR-03, D10/#6 |
| `processRenewal` | Amount > allowance → revert | D9/RECUR-04, D10/#7 |
| `processRenewal` | After revoke → revert | D9/RECUR-05 |
| `approveRecurringSubscription` | Period < 1 day → revert | D9/RECUR-06 |
| `revokeRecurringSubscription` | No active allowance → revert | D9/RECUR-07 |
| `setPlatformFeeBps` | > 3000 → revert | D8/S6-09 |
| `setReferralFeeBps` | > platformFeeBps → revert | D8/S6-10 |
| `setPlatformTreasury` | Non-owner → revert | D8/S6-04 |
| `pause` / `unpause` | Non-owner → revert | D8/S6-05 |
| `upgradeTo` | Non-owner → revert | D8/S6-13, D10/#8 |
| `initialize` | Called again → revert (initializer guard) | D9/ACCESS-06 |

---

## S14: Frontend — apiClient.ts

**Coverage tier: ⬛ None**

| Behavior | Covered | Risk | Test Type | D-Ref |
|---|---|---|---|---|
| 401 response → intercept → `POST /auth/refresh` → retry original | ⬛ None | Logged-out user cannot recover session | E2E | D7/B1-03 |
| Refresh fails → propagate 401 → redirect to `/login` | ⬛ None | User stuck in broken loop | E2E | D7/B1-04 |
| Concurrent 401s → only one refresh attempt (not N) | ⬛ None | Race condition floods refresh endpoint | E2E | D8/S1-09 |
| File upload with `Content-Type: multipart/form-data` | ⬛ None | File uploads silently fail | Integration | D7/B1-07 |

---

## Error-Handling Path Gaps (Catch Blocks)

Every `catch` block below has zero test coverage. A broken `catch` either silently swallows an error (wrong) or rethrows without cleanup (wrong):

| File | Function | Catch Scenario | Behavior if Broken |
|---|---|---|---|
| auth.service.ts | `signupAndSubscribe` | Subscription throws | Orphan auth user persists |
| auth.service.ts | `signupAndSubscribe` | `deleteUser` in cleanup throws | Original error swallowed |
| content.service.ts | `createNewContent` | R2 upload fails (any file) | Partial upload, no cleanup |
| content.service.ts | `generateVideoThumbnail` | FFmpeg throws | Unhandled rejection kills request |
| content.service.ts | `generateVideoThumbnail` | `fs.unlink` temp cleanup throws | Logged only, not re-thrown — correct behavior unverified |
| content.service.ts | `getWatermarkedUrl` | R2 download fails | Falls back to original — correct behavior unverified |
| cryptoPayment.service.ts | `verifyAndRecordBasePayment` | `axios.post` throws network error | Should count as null receipt and retry |
| notification.service.ts | `notifySubscribersOfNewContent` | DB error on subscriber fetch | Notifications silently not sent |
| message.service.ts | `sendDirectMessage` | Socket.IO emit throws | HTTP response already sent — error lost |
| referral.service.ts | `checkCashMilestone` | `createReferralBonus` throws | Milestone not recorded; re-trigger risk |
| wallet.service.ts | `getCryptoWalletForUser` | DB error | Returns `''` — no-treasury behavior unverified |
| auth.middleware.ts | `protect` | `supabase.auth.getUser` throws | Should be 401, could be 500 |
| auth.middleware.ts | impersonation block | `findUserById` for impersonated user throws | Could leak admin identity |

---

## Configuration-Dependent Code Paths

These paths only execute when specific environment variables are set. None are tested in CI:

| Env Var | Path Enabled | Risk if Misconfigured | D-Ref |
|---|---|---|---|
| `BASE_RPC_URL` missing | All verification fails with unhandled error | Payments permanently break | D7/B4-12 |
| `BASE_CONTRACT_ADDRESS` missing | Any log address accepted as PoDM | Payment fraud via any contract | D9/VER-17, D10/#30 |
| `NODE_ENV = 'production'` | Stack traces stripped from errors | Stack traces leak in prod | D8/S8-06 |
| `DEBUG_AUTH = 'true'` in production | Token data logged | Token exposure in logs | D8/S1-14 |
| `FFMPEG_PATH` pointing to missing binary | Video thumbnail fails with 500 | All video uploads break | D7/B9-07 |
| `PLATFORM_TREASURY_ADDRESS` missing | Fee recipient undefined | Fees sent to `undefined` | D10/#4 |
| `SUPABASE_SERVICE_KEY` in env | Admin operations enabled | Key exposure if in client bundle | D8/S10-06 |

---

## Test Type Distribution Gap

Current distribution (estimated from existing tests):

```
Unit tests:         ~12 tests  (auth controller, commission utils, AI settings)
Integration tests:  ~6 tests   (ppv_subscription, paymaster, auth integration)
E2E tests:          ~15 tests  (login, creator, fan, admin, tip specs)

Required for full coverage:
Unit tests:         ~180 additional
Integration tests:  ~90 additional
E2E tests:          ~30 additional
```

**The imbalance**: E2E tests exist for UI flows but there are almost no unit tests for service-layer logic. This means bugs in fee calculation, referral timing, and access control checks have no signal path.

```
Current coverage by type:
  E2E  ██████░░░░░░░░░░░░░░  ~30% of test effort on ~5% of risk
  Int  ███░░░░░░░░░░░░░░░░░  ~15% of test effort on ~30% of risk
  Unit ██░░░░░░░░░░░░░░░░░░  ~55% of test effort on ~65% of risk
                             (but most unit tests cover trivial paths)
```

---

## Dead Code / Unreachable Path Suspicions

These paths may be structurally unreachable in the current codebase. They warrant code review rather than test writing:

| Location | Suspicion | Action |
|---|---|---|
| `cryptoPayment.service.ts` — referrer branch | `referrerWallet` resolved to `''` when no referral; on-chain tx with referrer = `address(0)` should pass the "unexpected referrer" check. But the check fires before wallet resolution. Ordering may cause false positives. | Review execution order |
| `auth.middleware.ts` — `protectAndCreator` | `req.user.role === 'creator'` is checked but there's no `status === 'active'` check. By design? Or oversight? | Confirm design intent (D5 gap) |
| `notification.service.ts` — delete route | `DELETE /notifications/:id` exists in routes. Is there a corresponding service method that checks ownership? Or does it delete by ID without user check? | Audit ownership check |
| `content.service.ts` — audio thumbnail | `if (mimeType.startsWith('audio/'))` branch — what if mimeType is null? | Add null guard or test |
| `message.service.ts` — `inGallery` enrichment | `parseInt(message.content.contentId)` — if `contentId` is already a number, `parseInt` returns `NaN`. Could cause `inGallery` to always be false. | Audit type coercion |

---

## Cross-Reference Summary

| Gap Category | Count | Highest D10 Rank | Immediate Action |
|---|---|---|---|
| Payment verification branches | 15 | #1, #2, #3 | Copy D9/File 2 into repo |
| Smart contract functions | 21 | #5, #6, #7, #8, #9 | Copy D9/File 1 into repo |
| Referral fee branches | 9 | #4, #25, #26 | Copy D9/File 3 into repo |
| Error-handling catch blocks | 13 | #17, #18 | Add catch-path unit tests per service |
| Middleware auth paths | 9 | #19, #29 | New auth middleware test file |
| Content access control branches | 8 | #13, #14, #20, #21 | New content.access.test.ts |
| IDOR / ownership checks | 7 | #15, #16 | New idor.test.ts |
| Config-dependent paths | 7 | #30 | CI env audit + startup checks |
| State machine transitions | 46 | multiple | Per-machine test files (D6 roadmap) |
| Frontend interceptor | 4 | — | Playwright E2E test |

---

*Status: Complete. All 11 deliverables produced.*
