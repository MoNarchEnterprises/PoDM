# Deliverable 4: Autonomous Test Scenario Suite

**Project**: PoDM Creator-Fan Platform  
**Scope**: 95 precision-specified test scenarios covering all domains  
**Date**: August 9, 2026  
**Grounded in**: Live code audit of routes, services, models, contracts, and existing test files

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ | Scenario already covered by existing test |
| ⬜ | New scenario — no existing test |
| **P0** | Critical — payment integrity, auth, security |
| **P1** | High — core business logic, access control |
| **P2** | Medium — supporting features |
| **P3** | Low — edge cases, infrastructure |

---

## Domain 1 — Authentication & Session Management

**Test File Targets**: `server/tests/auth.controller.test.ts`, `server/tests/integration/auth.integration.test.ts`

| ID | Scenario | Priority | Type | Status |
|---|---|---|---|---|
| AUTH-001 | Fan login returns 200 with `authToken` + `authRefreshToken` HttpOnly cookies and user envelope | P0 | Unit | ✅ |
| AUTH-002 | Login with wrong password returns 401 `Invalid credentials` | P0 | Unit | ✅ |
| AUTH-003 | Login with missing email/password field calls `next()` with error | P0 | Unit | ✅ |
| AUTH-004 | Fan signup creates profile with `status='active'`, returns 201 + session token | P0 | Unit | ✅ |
| AUTH-005 | Creator signup creates profile with `status='pending verification'`, returns 201 | P0 | Unit | ⬜ |
| AUTH-006 | Token refresh with valid `authRefreshToken` cookie → 200, new `authToken` + `authRefreshToken` set in cookies | P0 | Unit | ✅ |
| AUTH-007 | Token refresh with no cookie and no body refreshToken → 401 `No refresh token provided` | P0 | Unit | ✅ |
| AUTH-008 | Token refresh with expired/tampered token → 401 `Invalid or expired refresh token` | P0 | Integration | ⬜ |
| AUTH-009 | `GET /users/me` without token → 401 | P0 | Integration | ✅ |
| AUTH-010 | `GET /users/me` with valid Bearer token → 200, returns correct user profile | P0 | Integration | ✅ |
| AUTH-011 | Change password with correct `currentPassword` → 200 `Password updated successfully` | P1 | Unit | ⬜ |
| AUTH-012 | Change password with wrong `currentPassword` → 401 `Incorrect current password` | P1 | Unit | ⬜ |
| AUTH-013 | Forgot password endpoint always returns success (email existence not revealed) | P1 | Unit | ⬜ |
| AUTH-014 | `signupAndSubscribe` failure during subscription step → orphan auth user deleted from Supabase Auth | P0 | Unit | ⬜ |
| AUTH-015 | Creator signup matching accepted Enclave application → `is_enclave_member=true`, `enclave_joined_at` set | P1 | Unit | ⬜ |
| AUTH-016 | Creator signup with valid active `referralCode` → `referral_applications` record created, `awardReferralBonus` called | P1 | Unit | ⬜ |

---

## Domain 2 — Crypto Payments & On-Chain Verification

**Test File Targets**: `server/tests/integration/ppv_subscription.test.ts`, new `payment.verification.test.ts`

| ID | Scenario | Priority | Type | Status |
|---|---|---|---|---|
| PAY-001 | Verify valid subscription tx → status `Cleared`, fees split: `platform_fee`, `creator_payout`, `referral_fee` all correct | P0 | Integration | ✅ |
| PAY-002 | Verify duplicate `blockchain_tx_hash` → 409 `This transaction hash has already been verified` | P0 | Integration | ⬜ |
| PAY-003 | Verify tx with non-standard hash format → normalized to 64-char hex buffer, proceeds to verification | P0 | Unit | ⬜ |
| PAY-004 | Verify tx with no on-chain receipt after 5 retries × 3s → 404 `Transaction receipt not found on-chain` | P0 | Unit | ⬜ |
| PAY-005 | Verify tx with `receipt.status = '0x0'` (reverted) → 400 `Transaction failed on the blockchain` | P0 | Unit | ⬜ |
| PAY-006 | Verify tx where `receipt.logs` has no matching PoDM contract address → 400 `Interacted target is not the PoDM smart contract` | P0 | Unit | ⬜ |
| PAY-007 | Verify tx where `topics[2]` (creator address) ≠ creator's wallet address → 400 `Transaction recipient does not match` | P0 | Unit | ⬜ |
| PAY-008 | Verify tx where on-chain amount differs from requested by >1 cent → 400 `Transaction amount mismatch` | P0 | Unit | ⬜ |
| PAY-009 | Verify tx with non-zero referrer when creator has no active referral → 400 `unexpected referrer for a creator without an active referral` | P0 | Unit | ⬜ |
| PAY-010 | Verify tx with referrer address ≠ DB-resolved referrer wallet → 400 `Transaction referrer does not match` | P0 | Unit | ⬜ |
| PAY-011 | Verify tx where on-chain referral fee differs from expected by >2 cents → 400 `Referral fee mismatch` | P0 | Unit | ⬜ |
| PAY-012 | Background verification: no receipt after 10 retries × 6s → transaction status updated to `Failed` | P0 | Unit | ⬜ |
| PAY-013 | ERC-4337 UserOp: `receipt.to` = EntryPoint address, but `receipt.logs` contains PoDM contract event → verifies `Cleared` (not rejected) | P0 | Unit | ⬜ |
| PAY-014 | PPV Post payment → `incrementContentPpvEarningsStats` called with `relatedId` and `creatorPayout` | P1 | Unit | ⬜ |
| PAY-015 | Tip payment with `relatedId` → `incrementContentTipStats` called with `relatedId` and `amount` | P1 | Unit | ⬜ |
| PAY-016 | Missing `BASE_CONTRACT_ADDRESS` env var → 500 `PoDM smart contract address not configured` | P0 | Unit | ⬜ |
| PAY-017 | RPC network error on all retry attempts → 503 `Blockchain RPC connection failed` | P1 | Unit | ⬜ |

---

## Domain 3 — Smart Contract (Solidity / Hardhat)

**Test File Targets**: `contracts/test/` (new: `PoDMPaymentProtocol.test.ts`)

| ID | Scenario | Priority | Type | Status |
|---|---|---|---|---|
| SOL-001 | `paySubscription` with referrer → fee split: treasury gets `platformFee - referralFee`, referrer gets 1%, creator gets `amount - platformFee` | P0 | Contract | ⬜ |
| SOL-002 | `paySubscription` with `referrer = address(0)` → no referral transfer, `referralFee = 0` in event | P0 | Contract | ⬜ |
| SOL-003 | `payTip` with referrer → `TipPaid` event emitted with correct `referralFee` and `referrer` | P0 | Contract | ⬜ |
| SOL-004 | `payPPV` → `PPVPaid` event contains `contentIdHash` and all fee fields | P0 | Contract | ⬜ |
| SOL-005 | `processRenewal` called by non-keeper EOA → reverts `Not authorized keeper` | P0 | Contract | ⬜ |
| SOL-006 | `processRenewal` before period elapsed → reverts `Renewal period has not elapsed` | P0 | Contract | ⬜ |
| SOL-007 | `processRenewal` with `amount > allowance.maxAmountPerPeriod` → reverts `Amount exceeds allowance` | P0 | Contract | ⬜ |
| SOL-008 | `_computeFeeSplit` with `customPlatformFeeBps = 0` → falls back to contract `platformFeeBps` | P1 | Contract | ⬜ |
| SOL-009 | `_computeFeeSplit` with `customPlatformFeeBps = 1000` (10%) → correct treasury/referrer/creator split | P1 | Contract | ⬜ |
| SOL-010 | `setPlatformFeeBps(3001)` → reverts `Fee cannot exceed 30%` | P0 | Contract | ⬜ |
| SOL-011 | `setReferralFeeBps` > `platformFeeBps` → reverts `Referral fee cannot exceed platform fee` | P0 | Contract | ⬜ |
| SOL-012 | `paySubscription` when contract is paused → reverts `(whenNotPaused)` | P0 | Contract | ⬜ |
| SOL-013 | `approveRecurringSubscription` with `periodInSeconds < 1 day` → reverts | P1 | Contract | ⬜ |
| SOL-014 | `revokeRecurringSubscription` when no active allowance → reverts `No active allowance` | P1 | Contract | ⬜ |
| SOL-015 | `referralFee > platformFee` in `_computeFeeSplit` → fee capped at `platformFee`, treasury gets 0 | P1 | Contract | ⬜ |

---

## Domain 4 — Commission & Referral System

**Test File Targets**: `server/tests/commission.utils.test.ts` (extend), new `referral.service.test.ts`

| ID | Scenario | Priority | Type | Status |
|---|---|---|---|---|
| COM-001 | Enclave member with no `commission_rate` → returns `ENCLAVE_COMMISSION_RATE` (10%) | P0 | Unit | ✅ |
| COM-002 | Enclave member with `commission_rate = 20` set → still returns `ENCLAVE_COMMISSION_RATE` (override ignored) | P0 | Unit | ✅ |
| COM-003 | Non-Enclave with `commission_rate = 15` → returns 15 | P0 | Unit | ✅ |
| COM-004 | Non-Enclave with `commission_rate = null` → returns `DEFAULT_COMMISSION_RATE` (12.5) | P0 | Unit | ✅ |
| COM-005 | `null` profile → returns `DEFAULT_COMMISSION_RATE` | P0 | Unit | ✅ |
| REF-001 | `calculateReferralFee` with active referrer within 180 days, referrer has wallet → fee = 1% of gross, referrerId set | P0 | Unit | ⬜ |
| REF-002 | `calculateReferralFee` with no active referral → `{ referralFee: 0, referrerId: null }` | P0 | Unit | 0 |
| REF-003 | `calculateReferralFee` with active referrer but referrer has no configured wallet → fee = 0 | P0 | Unit | 0 |
| REF-004 | `calculateReferralFee` when 1% would exceed platform fee → fee capped at `platformFee` | P0 | Unit | 0 |
| REF-005 | `getPercentageReferralInfo` outside 180-day window → returns null, fee = 0 | P1 | Unit | 0 |
| REF-006 | CASH path: referred creator hits $750 within 30 days → `$50` base bonus `ReferralBonus` transaction created | P1 | Unit | 0 |
| REF-007 | CASH path: referred creator hits $750 within 14 days → `$75` total bonus (base $50 + speed $25) | P1 | Unit | 0 |
| REF-008 | CASH path: referred creator hits $750 after 30-day window → no bonus created | P1 | Unit | 0 |
| REF-009 | `recordReferralFee` with `feeAmount = 0` → no DB update executed | P2 | Unit | 0 |
| REF-010 | `getReferrerWalletForCreator` for creator with no active referral → returns `''` | P0 | Unit | 0 |

---

## Domain 5 — Content & Moderation

**Test File Targets**: new `content.service.test.ts`, `report.model.test.ts`

| ID | Scenario | Priority | Type | Status |
|---|---|---|---|---|
| CON-001 | Create content with images → file uploaded to R2, Sharp thumbnail generated and uploaded | P0 | Integration | ⬜ |
| CON-002 | Create content with video → FFmpeg frame extracted to `os.tmpdir()`, thumbnail uploaded to R2 | P0 | Integration | ⬜ |
| CON-003 | Create content with audio → original file path used as thumbnail URL (no processing) | P1 | Unit | 0 |
| CON-004 | Create content with batch upload failure on 3rd file → `deleteFromPrivate` cleans up files 1 and 2 | P0 | Integration | 0 |
| CON-005 | Scheduled content creation (`isScheduled=true`) → status set to `scheduled`, publishDate recorded | P1 | Unit | 0 |
| CON-006 | Audience views `subscribers_only` content without active subscription → returns metadata + placeholder, no signed R2 URL | P0 | Integration | ✅ |
| CON-007 | Audience views `pay_per_view` content without cleared tx → returns `isUnlocked: false`, no signed R2 URL | P0 | Integration | ✅ |
| CON-008 | Audience views `unlisted` (vault) content → returns 403 or `isUnlocked: false` under all conditions | P0 | Unit | 0 |
| CON-009 | Watermark composite: username containing XML special chars (`<`, `>`, `&`) → `escapeXml` prevents SVG breakage | P1 | Unit | 0 |
| CON-010 | Audience files content report → `content_reports` row inserted with `status='pending'` | P1 | Unit | 0 |
| CON-011 | 3rd report filed on same content → content status updated to `flagged` automatically | P0 | Unit | 0 |
| CON-012 | Admin approves flagged content → content status set to `published`, `dismissReportsForContent` sets reports to `dismissed` | P1 | Unit | 0 |

---

## Domain 6 — Direct Messaging & PPV Message Unlocks

**Test File Targets**: new `message.service.test.ts`

| ID | Scenario | Priority | Type | Status |
|---|---|---|---|---|
| MSG-001 | Send DM with `price = 0` content attachment → content auto-unlocked (`isUnlocked: true`) at send time | P1 | Unit | ⬜ |
| MSG-002 | Send DM with `price > 0` content attachment → content locked (`isUnlocked: false`), signed URL omitted | P0 | Unit | ⬜ |
| MSG-003 | Send DM with deleted content attachment → returns 404 `Attached content could not be found` | P1 | Unit | 0 |
| MSG-004 | Send DM when creator has no wallet → creatorWalletAddress injected as `''` (never treasury address) | P0 | Unit | 0 |
| MSG-005 | Creator with `status = 'pending verification'` attempts to send DM → 403 `account must be verified` | P0 | Unit | 0 |
| MSG-006 | `getMessagesForConversation` populates `inGallery` from fan's gallery snapshot | P2 | Unit | 0 |
| MSG-007 | `getAttachableVaultContent` returns only unlisted vault items not already in recipient fan's gallery | P1 | Unit | 0 |
| MSG-008 | Non-participant attempts `GET /messages/conversations/:id` → 403 `Access denied` | P0 | Integration | 0 |
| MSG-009 | `PATCH /messages/:id/unlock` with cleared PPV Message tx → `isUnlocked: true` in DB, Socket.IO `message_updated` emitted | P0 | Integration | 0 |
| MSG-010 | `PATCH /messages/:id/unlock` with PPV Post tx hash → 400 `Transaction type mismatch` | P0 | Unit | 0 |

---

## Domain 7 — Subscriptions & Auto-Renewal

**Test File Targets**: `server/tests/integration/ppv_subscription.test.ts`, new `subscription.service.test.ts`

| ID | Scenario | Priority | Type | Status |
|---|---|---|---|---|
| SUB-001 | Subscribe to creator → `subscriptions` row created with `status='active'`, `blockchain_tx_hash` populated | P0 | Integration | ✅ |
| SUB-002 | Re-subscribe after expiration → new `subscriptions` row created with new tx hash | P1 | Unit | ⬜ |
| SUB-003 | `findSubscriptionsDueForRenewal` returns active subs where `next_billing_date <= NOW()` AND `fan_wallet_address IS NOT NULL` | P0 | Unit | 0 |
| SUB-004 | Fan cancels subscription → `cancel_at_period_end = true`, access retained until `current_period_end` | P1 | Unit | 0 |
| SUB-005 | Renewal worker processes due subscription via contract `processRenewal` → `next_billing_date` advanced | P0 | Integration | 0 |
| SUB-006 | Idempotent `createSubscriptionForUser`: called twice with same cleared tx hash → returns existing subscription, no second row | P0 | Unit | 0 |

---

## Domain 8 — Admin Operations & Impersonation

**Test File Targets**: `server/tests/admin.ai_settings.test.ts`, new `admin.service.test.ts`

| ID | Scenario | Priority | Type | Status |
|---|---|---|---|---|
| ADM-001 | Admin updates platform AI settings (provider/model) → `platform_settings` table updated, 200 returned | P1 | Unit | ✅ |
| ADM-002 | Admin updates user status to `suspended` → target user API calls return 403 | P0 | Integration | ⬜ |
| ADM-003 | Admin updates user status from `suspended` to `active` → access restored | P1 | Unit | 0 |
| ADM-004 | Admin attempts `PATCH /admin/users/:id/commission` for Enclave creator → rate stays 10%, error returned | P0 | Unit | 0 |
| ADM-005 | Admin sends `X-Impersonating-User-Id` header → `req.originalUser` set to admin, `req.user` set to target profile | P0 | Integration | 0 |
| ADM-006 | Non-admin sends `X-Impersonating-User-Id` header → header ignored, caller remains normal user | P0 | Integration | 0 |
| ADM-007 | Admin impersonating user attempts admin-only route → 403 (impersonating user role controls access) | P1 | Unit | 0 |
| ADM-008 | Admin generates manual referral code → valid code inserted in DB with requested path (PERCENT/CASH) | P2 | Unit | 0 |

---

## Domain 9 — Notifications & Real-Time

**Test File Targets**: new `notification.service.test.ts`

| ID | Scenario | Priority | Type | Status |
|---|---|---|---|---|
| NOT-001 | Creator publishes content → notification inserted for all active subscribers with `preferences.notifications.newContent !== false` | P1 | Unit | ⬜ |
| NOT-002 | Subscriber with `preferences.notifications.newContent = false` → notification skipped | P1 | Unit | 0 |
| NOT-003 | Mark notification as read (`PUT /notifications/:id/read`) → `is_read = true` in DB | P2 | Unit | 0 |
| NOT-004 | Mark all notifications read (`PUT /notifications/read-all`) → all user notifications set `is_read = true` | P2 | Unit | 0 |
| NOT-005 | Delete notification (`DELETE /notifications/:id`) → row removed | P2 | Unit | 0 |

---

## Domain 10 — Contests

**Test File Targets**: new `contest.service.test.ts`

| ID | Scenario | Priority | Type | Status |
|---|---|---|---|---|
| CNT-001 | Creator creates contest (`draft` state) → title, start_date, end_date saved | P1 | Unit | ⬜ |
| CNT-002 | Create contest with `end_date <= start_date` → 400 `End date must be after start date` | P1 | Unit | 0 |
| CNT-003 | Creator publishes contest (`draft` → `active`) → contest visible in public list | P1 | Unit | 0 |
| CNT-004 | Audience enters active contest → `contest_entries` row created | P1 | Unit | 0 |
| CNT-005 | Non-creator attempts to publish contest → 403 | P1 | Unit | 0 |
| CNT-006 | Audience enters contest with `status !== 'active'` → 400 `Contest is not active` | P1 | Unit | 0 |
| CNT-007 | Audience enters contest past `end_date` → 400 `Contest has ended` | P1 | Unit | 0 |
| CNT-008 | Audience attempts contest entry without required subscription → 403 | P1 | Unit | 0 |
| CNT-009 | Duplicate contest entry by same audience member → 409 | P2 | Unit | 0 |
| CNT-010 | Creator picks winner (`active` → `completed`) → winner user_id set, status updated | P1 | Unit | 0 |
| CNT-011 | Creator attempts to pick winner for another creator's contest → 403 | P1 | Unit | 0 |

---

## Domain 11 — Gallery

**Test File Targets**: `server/tests/content_gallery_fix.test.ts` (extend)

| ID | Scenario | Priority | Type | Status |
|---|---|---|---|---|
| GAL-001 | Add item to gallery → `added: true` returned, `gallery_add_count` incremented | P1 | Unit | ✅ |
| GAL-002 | Duplicate add of same `contentId` to gallery → `added: false`, `gallery_add_count` NOT incremented | P1 | Unit | ✅ |
| GAL-003 | `GET /galleries/user/:userId` for another user's private gallery → 403 | P1 | Unit | 0 |
| GAL-004 | Feed endpoint correctly populates `inGallery: true` for bookmarked items | P2 | Unit | 0 |

---

## Coverage Target Summary

| Domain | Total Scenarios | Currently Tested | Gaps to Implement |
|---|---|---|---|
| 1 — Auth & Session | 16 | 7 | 9 |
| 2 — Crypto Payments | 17 | 1 | 16 |
| 3 — Smart Contract | 15 | 0 | 15 |
| 4 — Commission & Referrals | 15 | 5 | 10 |
| 5 — Content & Moderation | 12 | 2 | 10 |
| 6 — Messaging & PPV | 10 | 0 | 10 |
| 7 — Subscriptions | 6 | 1 | 5 |
| 8 — Admin Operations | 8 | 1 | 7 |
| 9 — Notifications | 5 | 0 | 5 |
| 10 — Contests | 11 | 0 | 11 |
| 11 — Gallery | 4 | 2 | 2 |
| **Total** | **95** | **19** | **76** |

---

*Status: Complete — Groundwork for Autonomous Execution.*
