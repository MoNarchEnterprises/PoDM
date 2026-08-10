# Deliverable 8: Security Test Suite

**Project**: PoDM Creator-Audience Platform  
**Date**: August 9, 2026  
**Framework**: OWASP Top 10 (2021) + payment platform specifics  
**Scope**: 97 security test cases across 10 attack domains

---

## Risk Legend

| Severity | Definition |
|---|---|
| 🔴 **Critical** | Exploitable with direct financial or data loss impact |
| 🟠 **High** | Significant access control bypass or sensitive data exposure |
| 🟡 **Medium** | Exploitable under specific conditions; limited blast radius |
| 🟢 **Low** | Defense-in-depth; hard to exploit or low impact |

---

## Domain Index

| # | Domain | OWASP | Cases | Critical/High |
|---|---|---|---|---|
| [S1](#s1-authentication--session-security) | Authentication & Session | A07 | 14 | 6 |
| [S2](#s2-authorization--idor) | Authorization & IDOR | A01 | 16 | 9 |
| [S3](#s3-payment--financial-integrity) | Payment & Financial Integrity | A04, A08 | 18 | 12 |
| [S4](#s4-input-validation--injection) | Input Validation & Injection | A03 | 10 | 3 |
| [S5](#s5-file-upload-security) | File Upload Security | A04, A05 | 8 | 4 |
| [S6](#s6-smart-contract-security) | Smart Contract Security | A04 | 15 | 8 |
| [S7](#s7-rate-limiting--abuse) | Rate Limiting & Abuse | A04, A05 | 8 | 3 |
| [S8](#s8-data-exposure) | Data Exposure | A02 | 8 | 4 |
| [S9](#s9-admin--impersonation) | Admin & Impersonation | A01 | 8 | 4 |
| [S10](#s10-infrastructure--configuration) | Infrastructure & Configuration | A05, A09 | 8 | 2 |

---

## S1: Authentication & Session Security

**OWASP**: A07 — Identification and Authentication Failures

| ID | Attack Vector | Expected Defense | Severity | Test Method | Status |
|---|---|---|---|---|---|
| SEC-S1-01 | Submit forged JWT with valid structure but wrong signature | `supabase.auth.getUser(token)` rejects → 401 `Not authorized: <authError.message>` | 🔴 Critical | Send `Authorization: Bearer <tampered_token>` | ✅ |
| SEC-S1-02 | Submit expired but structurally valid JWT | Supabase auth returns `authError` → 401 | 🟠 High | Use a token past expiry timestamp | ✅ |
| SEC-S1-03 | Submit token from a different Supabase project (wrong `aud` / `iss`) | JWT validation rejects mismatched issuer → 401 | 🔴 Critical | Generate token with different project JWT secret | ⬜ |
| SEC-S1-04 | Brute-force `POST /auth/login` with many passwords | Rate limiter returns 429 after threshold | 🔴 Critical | Send 50 rapid login attempts with same email | ⬜ |
| SEC-S1-05 | `authRefreshToken` cookie not marked `HttpOnly` → readable via JS | Cookie must have `HttpOnly` flag | 🟠 High | Browser `document.cookie` should not include `authRefreshToken` | ⬜ |
| SEC-S1-06 | `authToken` / `authRefreshToken` not marked `Secure` in production → sent over HTTP | Cookie must have `Secure` flag in production | 🟠 High | Inspect `Set-Cookie` header in prod response | ⬜ |
| SEC-S1-07 | `authRefreshToken` not marked `SameSite=Strict` or `Lax` → CSRF risk | `SameSite` attribute set | 🟡 Medium | Inspect `Set-Cookie` header | ⬜ |
| SEC-S1-08 | Logout does not invalidate server-side session → old token reusable after logout | `POST /auth/logout` calls `supabase.auth.signOut()` which revokes Supabase session | 🟠 High | Log out, then re-use `authToken` cookie on `/users/me` | ⬜ |
| SEC-S1-09 | Concurrent token refresh race condition → two threads both refresh → one token orphaned | Supabase handles single-use refresh tokens natively | 🟡 Medium | Fire two simultaneous `POST /auth/refresh` requests | ⬜ |
| SEC-S1-10 | Auth user exists in Supabase but `profiles` row deleted → 404 on every request | `protect` returns 404 `User profile not found for this token` | 🟡 Medium | Delete profile row; attempt any protected request | ⬜ |
| SEC-S1-11 | Password reset token reuse → reset same password twice with same token | Supabase invalidates OTP after first use → second use fails | 🟡 Medium | Use reset token, change password, re-submit same token | ⬜ |
| SEC-S1-12 | `forgot-password` endpoint reveals whether email is registered via timing or response body | Response always identical regardless of email existence | 🟡 Medium | Compare responses for registered vs. unregistered email | ⬜ |
| SEC-S1-13 | Session fixation: attacker pre-sets cookie, victim logs in | Login issues new tokens, replacing any pre-set cookie | 🟡 Medium | Set arbitrary `authToken` cookie before login; verify it is replaced | ⬜ |
| SEC-S1-14 | DEBUG_AUTH=true in production leaks token data to server logs | `logAuthDebug` only fires when `NODE_ENV !== 'production'` AND `DEBUG_AUTH === 'true'` | 🟢 Low | Verify env var gate in auth middleware | ⬜ |

---

## S2: Authorization & IDOR

**OWASP**: A01 — Broken Access Control

| ID | Attack Vector | Expected Defense | Severity | Test Method | Status |
|---|---|---|---|---|---|
| SEC-S2-01 | Fan requests `GET /content/my-content` (creator-only route) | `creatorOnly` → 403 `Access denied. Creator role required.` | 🔴 Critical | Authenticate as fan; call `GET /content/my-content` | ⬜ |
| SEC-S2-02 | Fan requests another fan's notifications via `GET /notifications` | `protect` sets `req.user`; model filters by `user_id = req.user.id` | 🟠 High | Call as fan A; verify only fan A's notifications returned | ⬜ |
| SEC-S2-03 | Fan requests `GET /messages/conversations/:id` for conversation they are not in | `getMessagesForConversation` checks `conversation.participants.includes(userId)` → 403 | 🔴 Critical | Authenticate as fan C; request conversation between A and B | ⬜ |
| SEC-S2-04 | Fan calls `PATCH /messages/:id/unlock` on a message they did not send or receive | `protect` + ownership check in controller/service | 🔴 Critical | Fan C unlocks message between A and B | ⬜ |
| SEC-S2-05 | Audience requests `GET /content/:id` for `subscribers_only` content without active subscription | Service: `findSubscriptionByFanAndCreator` → null → content locked | 🔴 Critical | Call as unsubscribed fan; check no signed URL returned | ✅ |
| SEC-S2-06 | Audience requests `GET /content/:id` for `pay_per_view` content without cleared transaction | Service: `findSuccessfulTransactionByFanAndContent` → null → `isUnlocked: false` | 🔴 Critical | Call as fan without PPV tx; verify `isUnlocked: false` and no signed URL | ✅ |
| SEC-S2-07 | Audience requests `GET /content/:id` for `unlisted` (vault) content | No access path for fans; 403 or `isUnlocked: false` | 🔴 Critical | Call as any fan; vault items should never be served | ⬜ |
| SEC-S2-08 | Creator requests `PUT /content/:id` on content owned by a different creator | Ownership check in `updateContent` service | 🟠 High | Creator A edits creator B's content by ID | ⬜ |
| SEC-S2-09 | Creator requests `DELETE /content/:id` on content owned by a different creator | Ownership check in `deleteContent` service | 🟠 High | Creator A deletes creator B's content | ⬜ |
| SEC-S2-10 | Fan requests `GET /messages/fans/:fanId/attachable-content` (creator-only route) | `protectAndCreator` → 403 | 🟠 High | Authenticate as fan; call the attachable-content route | ⬜ |
| SEC-S2-11 | Creator requests vault items for a fan who is neither subscribed nor in a conversation | Service checks conversation + subscription → 403 | 🟠 High | Creator A calls with fan ID that has no subscription or conversation | ⬜ |
| SEC-S2-12 | Fan accesses `GET /admin/dashboard` | `protectAndAdmin` → 403 `Access denied. Admin role required.` | 🔴 Critical | Authenticate as fan; call any admin route | ⬜ |
| SEC-S2-13 | Creator accesses `GET /admin/dashboard` | Same — 403 | 🔴 Critical | Authenticate as creator; call any admin route | ⬜ |
| SEC-S2-14 | IDOR: fan requests `GET /transactions/:id` belonging to another user | Service filters by `req.user.id`; other user's tx not returned | 🟠 High | Fan A requests transaction ID belonging to fan B | ⬜ |
| SEC-S2-15 | Fan requests contest entries of another fan | Entries filtered to `req.user.id` | 🟡 Medium | Fan A requests `GET /contests/my-entries` → only own entries | ⬜ |
| SEC-S2-16 | Pending creator requests `POST /content` → bypasses route guard | `protectAndCreator` role check passes; service does not block | 🟡 Medium | Authenticate as pending creator; upload content successfully | ⬜ (known gap — D5) |

---

## S3: Payment & Financial Integrity

**OWASP**: A04 — Insecure Design; A08 — Software and Data Integrity Failures

| ID | Attack Vector | Expected Defense | Severity | Test Method | Status |
|---|---|---|---|---|---|
| SEC-S3-01 | Submit same `blockchain_tx_hash` twice to claim content/subscription twice | `findTransactionByBlockchainTxHash(hash)` → if found → 409 | 🔴 Critical | POST verify with real hash; POST again → expect 409 | ⬜ |
| SEC-S3-02 | Submit tx hash from a different Base transaction (claiming a tx you didn't make) | Verification checks `topics[2]` = creator wallet; fan address in tx | 🔴 Critical | Submit tx hash from another user's tx | ⬜ |
| SEC-S3-03 | Manipulate `amount` in verify request body to claim underpayment was valid | On-chain `totalAmount` decoded from logs; compared to `amountInCents` with ≤1 cent tolerance | 🔴 Critical | Submit verify with `amountInCents` < actual tx amount — expect mismatch error | ⬜ |
| SEC-S3-04 | Submit tx that paid a different creator's wallet as a subscription for Creator A | `topics[2]` (creator slot) decoded and compared to Creator A's wallet → mismatch → 400 | 🔴 Critical | Craft tx to creator B's address; submit as subscription for creator A | ⬜ |
| SEC-S3-05 | Include an unexpected `referrer` address in a tx for a creator with no active referral | On-chain referrer slot checked: non-zero address when DB has no referral → 400 | 🔴 Critical | Submit tx with referrer ≠ address(0) for creator with no referral | ⬜ |
| SEC-S3-06 | Substitute a different referrer wallet in the on-chain tx vs. DB-resolved referrer | On-chain referrer decoded and compared to `getReferrerWalletForCreator()` → mismatch → 400 | 🔴 Critical | Submit tx with attacker's address as referrer; creator has a legitimate referrer | ⬜ |
| SEC-S3-07 | Claim PPV unlock by submitting a Subscription tx hash (wrong type) | `findSuccessfulTransactionByFanAndContent` filters `.in('type', ['PPV Post', 'PPV Message'])` only | 🔴 Critical | Attempt PPV content access using cleared Subscription tx hash | ⬜ |
| SEC-S3-08 | Claim message PPV unlock using a PPV Post tx hash (wrong sub-type) | Type filter: `'PPV Message'` specifically required for message unlock | 🔴 Critical | Attempt message unlock with `PPV Post` tx hash | ⬜ |
| SEC-S3-09 | Submit a tx hash that succeeded on a different chain (e.g., Ethereum mainnet) | `eth_getTransactionReceipt` on Base RPC returns null for foreign-chain hash | 🟠 High | Submit Ethereum tx hash to Base verify endpoint | ⬜ |
| SEC-S3-10 | Submit a tx hash where `receipt.status = '0x0'` (reverted on-chain) | `status === '0x0'` → 400 `Transaction failed on the blockchain` | 🟠 High | Submit reverted tx hash | ⬜ |
| SEC-S3-11 | `getCryptoWalletForUser` called for creator with no wallet → must not fall back to platform treasury | Returns `''`; treasury address never substituted | 🔴 Critical | Assert return value is `''` when `crypto_wallet_address = null` | ⬜ |
| SEC-S3-12 | Admin sets `setCreatorCommission` for Enclave member → rate must stay locked at 10% | Service rejects override; `getEffectiveCommissionRate` always returns `ENCLAVE_COMMISSION_RATE` | 🟠 High | Admin PATCH commission for Enclave creator; verify effective rate unchanged | ⬜ |
| SEC-S3-13 | Submit tx from a contract address that matches PoDM address in logs but is not on Base | `log.address` comparison is case-insensitive string match on Base; wrong network receipt would have different log origin | 🟡 Medium | Stub RPC to return receipt with PoDM address in logs from wrong chain | ⬜ |
| SEC-S3-14 | Referral fee manipulation: submit tx where on-chain referral fee ≠ 1% (e.g., 50%) | Referral fee decoded from event data; compared to expected with ≤2 cent tolerance → mismatch → 400 | 🟠 High | Submit tx with manipulated referral fee slot | ⬜ |
| SEC-S3-15 | ERC-4337 gasless payment: `receipt.to` = EntryPoint; PoDM logs present → must verify as Cleared | Log-based contract check (not `receipt.to`) must succeed | 🔴 Critical | Submit UserOp-originated tx hash; verify not rejected | ⬜ |
| SEC-S3-16 | Referral bonus double-claim: same milestone triggered twice | Milestone check is idempotent; bonus recorded once | 🟠 High | Force two concurrent eligible transactions crossing $750 | ⬜ |
| SEC-S3-17 | PERCENT referral outside 180-day window still earns fee | `getPercentageReferralInfo` returns null after 180 days; fee = 0 | 🟠 High | Mock `created_at` as 181 days ago; verify fee = 0 | ⬜ |
| SEC-S3-18 | Fan claims subscription access after subscription expired | `findSubscriptionByFanAndCreator` returns only `status='active'`; expired sub returns null | 🟠 High | Expire subscription; request subscriber-only content | ⬜ |

---

## S4: Input Validation & Injection

**OWASP**: A03 — Injection

| ID | Attack Vector | Expected Defense | Severity | Test Method | Status |
|---|---|---|---|---|---|
| SEC-S4-01 | SVG watermark with `<script>` tag in username → XSS via Sharp SVG composite | `escapeXml()` replaces `<`, `>`, `&`, `"`, `'` before SVG construction | 🟠 High | Create account with `username = '<script>alert(1)</script>'`; request watermarked image | ⬜ |
| SEC-S4-02 | SVG watermark with `&amp;entity;` in username (double-encode bypass) | `escapeXml` output fed to SVG; Sharp treats as literal text | 🟡 Medium | Username containing `&lt;script&gt;`; verify image renders text, not executes | ⬜ |
| SEC-S4-03 | SQL injection via Supabase filter params (e.g., `fan_id = "1 OR 1=1"`) | Supabase JS uses parameterized queries (PostgREST); string values auto-escaped | 🟡 Medium | Pass `'; DROP TABLE users; --` as a query parameter | ⬜ |
| SEC-S4-04 | Contest `title` field with >10,000 chars → storage or processing DoS | Input length validation or DB column constraint | 🟡 Medium | POST `/contests` with 100KB `title` string | ⬜ |
| SEC-S4-05 | `reason` field in content report with >10,000 chars | DB column constraint (`text` type) or explicit validation | 🟡 Medium | POST `/content/:id/report` with oversized `reason` | ⬜ |
| SEC-S4-06 | `amountInCents` in payment verify body: negative number | Service validation: `amount > 0` check | 🟡 Medium | POST verify with `amountInCents: -100` | ⬜ |
| SEC-S4-07 | `amountInCents` as extremely large number → overflow in fee calculation | Solidity 0.8.20 reverts on overflow; backend uses JS `number` (max safe integer check) | 🟡 Medium | POST verify with `amountInCents: Number.MAX_SAFE_INTEGER + 1` | ⬜ |
| SEC-S4-08 | `blockchain_tx_hash`: submit non-hex string (e.g., `../../../../etc/passwd`) | Hash normalization step catches invalid hex; RPC call fails gracefully | 🟠 High | POST verify with path-traversal string as hash | ⬜ |
| SEC-S4-09 | Null bytes in string fields (`\x00`) to truncate DB values | Supabase/PostgreSQL handles null bytes; no truncation attack | 🟢 Low | POST with null byte in message text | ⬜ |
| SEC-S4-10 | JSON body with prototype pollution (`__proto__`, `constructor`) | Express `bodyParser` does not execute prototype pollution | 🟢 Low | POST `{ "__proto__": { "isAdmin": true } }` | ⬜ |

---

## S5: File Upload Security

**OWASP**: A04, A05

| ID | Attack Vector | Expected Defense | Severity | Test Method | Status |
|---|---|---|---|---|---|
| SEC-S5-01 | Upload file with `Content-Type: image/jpeg` but actual content is executable (polyglot) | MIME type from Multer + Sharp/FFmpeg processing would fail on non-image binary | 🟠 High | Upload EICAR test file with `.jpg` extension and `image/jpeg` MIME | ⬜ |
| SEC-S5-02 | Upload `.html` or `.svg` file that could execute in browser if served directly | Files stored in private R2 bucket; served via signed URLs with `Content-Type` forced | 🟠 High | Upload `<img src=x onerror=alert(1)>.svg`; verify serving headers | ⬜ |
| SEC-S5-03 | Path traversal via filename: `../../../../etc/passwd` | Filename sanitized by `${Date.now()}-${file.originalname}`; stored under `{creator_id}/` prefix | 🟠 High | Upload with filename `../../secret.txt`; verify stored key | ⬜ |
| SEC-S5-04 | Upload file exceeding configured size limit → server OOM or disk fill | Multer `fileSize` limit enforced; 413 returned | 🔴 Critical | Upload 500MB file; verify 413 before memory impact | ⬜ |
| SEC-S5-05 | Upload large number of files in single request → exhausts R2 upload quota or server memory | Multer `maxCount` or backend validation limits file count | 🟠 High | POST with 100 files in multipart; verify limit enforced | ⬜ |
| SEC-S5-06 | Zip bomb: upload 1MB ZIP that decompresses to 1GB | No decompression in upload pipeline; stored as-is | 🟢 Low | Upload zip bomb; verify server unaffected | ⬜ |
| SEC-S5-07 | Video upload triggers FFmpeg on a maliciously crafted video file (FFmpeg exploit) | FFmpeg binary version pinned; input isolated to `os.tmpdir()` | 🟡 Medium | Upload crafted video targeting known FFmpeg CVE | ⬜ |
| SEC-S5-08 | R2 key collision via predictable `timestamp` in filename | `Date.now()` provides ms precision; concurrent uploads in same ms unlikely but theoretically possible | 🟢 Low | Rapid concurrent uploads; verify unique keys | ⬜ |

---

## S6: Smart Contract Security

**OWASP**: A04 — Insecure Design

| ID | Attack Vector | Expected Defense | Severity | Test Method | Status |
|---|---|---|---|---|---|
| SEC-S6-01 | Non-keeper EOA calls `processRenewal()` directly | `onlyKeeper` modifier → revert `Not authorized keeper` | 🔴 Critical | Call from arbitrary EOA (not keeper, not owner) | ⬜ |
| SEC-S6-02 | Non-keeper contract calls `processRenewal()` | `keepers[msg.sender] || msg.sender == owner()` both false → revert | 🔴 Critical | Deploy attacker contract; call `processRenewal` from it | ⬜ |
| SEC-S6-03 | Non-owner calls `setPlatformFeeBps` to drain treasury | `onlyOwner` → revert | 🔴 Critical | Call from non-owner EOA | ⬜ |
| SEC-S6-04 | Non-owner calls `setPlatformTreasury(attackerAddress)` to redirect fees | `onlyOwner` → revert | 🔴 Critical | Call from non-owner EOA | ⬜ |
| SEC-S6-05 | Non-owner calls `pause()` → DoS the platform | `onlyOwner` → revert | 🟠 High | Call from non-owner EOA | ⬜ |
| SEC-S6-06 | Reentrancy via malicious ERC-20 callback in `paySubscription` | `nonReentrant` modifier prevents reentry | 🔴 Critical | Deploy malicious IERC20 with `transferFrom` reentering `paySubscription` | ⬜ |
| SEC-S6-07 | `processRenewal` before period elapsed → over-billing fan | `require(block.timestamp >= lastRenewalAt + periodInSeconds)` → revert | 🔴 Critical | Call `processRenewal` immediately after previous renewal | ⬜ |
| SEC-S6-08 | `processRenewal` with `amount > maxAmountPerPeriod` | `require(amount <= allowance.maxAmountPerPeriod)` → revert | 🔴 Critical | Call with `amount = maxAmount + 1` | ⬜ |
| SEC-S6-09 | `setPlatformFeeBps(3001)` → fee exceeds 30% cap | `require(_newFeeBps <= 3000)` → revert | 🟠 High | Call with 3001 | ⬜ |
| SEC-S6-10 | `setReferralFeeBps` > `platformFeeBps` → referrer earns more than platform fee | `require(_newFeeBps <= platformFeeBps)` → revert | 🟠 High | Call with value > current platformFeeBps | ⬜ |
| SEC-S6-11 | Call `paySubscription` with `creator = address(0)` | `require(creator != address(0))` → revert `Invalid creator address` | 🟠 High | Call with `address(0)` as creator | ⬜ |
| SEC-S6-12 | Call `paySubscription` when contract is paused | `whenNotPaused` → revert | 🟠 High | Pause contract; call `paySubscription` | ⬜ |
| SEC-S6-13 | UUPS upgrade by non-owner | `_authorizeUpgrade` has `onlyOwner`; non-owner upgrade reverts | 🔴 Critical | Call `upgradeTo(newImpl)` from non-owner | ⬜ |
| SEC-S6-14 | `approveRecurringSubscription` with `periodInSeconds < 1 days` → sub-daily billing | `require(periodInSeconds >= 1 days)` → revert | 🟡 Medium | Call with `periodInSeconds = 3600` (1 hour) | ⬜ |
| SEC-S6-15 | `_computeFeeSplit` referral fee capped correctly when 1% > platform fee | `if (referralFee > platformFee) referralFee = platformFee` — treasury gets 0, no negative | 🟡 Medium | Set `platformFeeBps = 50` (0.5%), `referralFeeBps = 100` (1%); call `paySubscription` with referrer | ⬜ |

---

## S7: Rate Limiting & Abuse

**OWASP**: A04, A05 — Security Misconfiguration, Insecure Design

| ID | Attack Vector | Expected Defense | Severity | Test Method | Status |
|---|---|---|---|---|---|
| SEC-S7-01 | Brute-force login: 100 rapid POST /auth/login requests | Auth rate limiter → 429 after threshold (e.g., 10 attempts/min) | 🔴 Critical | Script 100 sequential login attempts; verify 429 | ⬜ |
| SEC-S7-02 | Brute-force `POST /auth/refresh` with crafted tokens | Rate limiter on auth routes | 🟠 High | Rapid refresh token attempts | ⬜ |
| SEC-S7-03 | Abuse content report auto-flag: attacker creates 3 alt accounts → reports a creator's content | Auto-flag queues content for **human admin review** — no automatic removal; admin determines legitimacy before acting | 🟡 Medium | Register 3 accounts; report same content → content status becomes `flagged`; verify admin review required before any action | ⬜ |
| SEC-S7-04 | Spam `POST /content/:id/report` with same account | Check if same reporter can report same content multiple times | 🟡 Medium | Report same content twice with same user | ⬜ |
| SEC-S7-05 | Flood `POST /crypto-payments/verify` with junk hashes → trigger 10×3s retry loops per request | Rate limiter or RPC circuit breaker on verify endpoint | 🟠 High | Send 50 concurrent verify requests with fake hashes | ⬜ |
| SEC-S7-06 | Creator sends mass message to 10,000 subscribers → server-side memory/time exhaustion | `sendMassMessage` processes async; no timeout guard documented | 🟡 Medium | Trigger mass message with large subscriber count; measure response time | ⬜ |
| SEC-S7-07 | `POST /messages` flooded by fan → spam conversation | Rate limit on message send per user | 🟡 Medium | 100 rapid message sends from same fan | ⬜ |
| SEC-S7-08 | `POST /contests/:id/enter` submitted multiple times by same fan | Idempotency check: duplicate entry returns 409 | 🟡 Medium | Enter same contest twice; expect 409 on second | ⬜ |

> [!NOTE]
> **SEC-S7-03 — Moderated by human review.** Three distinct accounts can move content to `flagged` status, but a human admin reviews every flag before taking any action — content is not automatically removed or hidden from the creator. The practical impact is limited to generating admin queue noise. Per-reporter deduplication (one report per user per content) remains a worthwhile hardening measure to reduce queue spam, but this is not a P0 item given the human-review backstop.

---

## S8: Data Exposure

**OWASP**: A02 — Cryptographic Failures; sensitive data exposure

| ID | Attack Vector | Expected Defense | Severity | Test Method | Status |
|---|---|---|---|---|---|
| SEC-S8-01 | `GET /users/me` response includes password hash or Supabase auth metadata | Response shaped by `reshapeUserForApp()`; no password fields in `User` type | 🔴 Critical | Inspect response for `password`, `encrypted_password`, `auth_metadata` | ⬜ |
| SEC-S8-02 | Creator's `crypto_wallet_address` exposed in API response to other Audience members | Wallet address not included in public profile response | 🟠 High | Fan calls creator profile endpoint; check for wallet field | ⬜ |
| SEC-S8-03 | Transaction details of fan A visible to fan B via `GET /transactions/:id` | `findTransactionsByUser` filters by `fan_id OR creator_id = req.user.id` | 🟠 High | Fan B guesses fan A's transaction ID; expects 404 or filtered result | ⬜ |
| SEC-S8-04 | Admin analytics endpoints expose PII in raw transaction data | Analytics responses aggregate by creator/period; no individual fan PII | 🟡 Medium | Inspect `GET /admin/analytics` response for individual fan data | ⬜ |
| SEC-S8-05 | `GET /content/creator/:username` returns signed R2 URLs for locked content | Locked content fields replaced with placeholder; no signed URL returned for non-authorized content | 🔴 Critical | Unsubscribed fan requests creator profile; verify no R2 signed URLs in locked posts | ✅ |
| SEC-S8-06 | Error responses expose stack traces or internal file paths in production | Express error handler strips stack in production (`NODE_ENV === 'production'`) | 🟠 High | Trigger 500 error in prod-like env; verify no stack trace in response | ⬜ |
| SEC-S8-07 | `X-Powered-By: Express` header fingerprints the server | `app.disable('x-powered-by')` or Helmet middleware | 🟢 Low | Inspect response headers for `X-Powered-By` | ⬜ |
| SEC-S8-08 | R2 signed URL from a cached API response reused after TTL | Signed URLs expire at configured TTL; R2 rejects requests after expiry | 🟡 Medium | Capture signed URL; wait for TTL; re-request | ⬜ |

---

## S9: Admin & Impersonation

**OWASP**: A01 — Broken Access Control

| ID | Attack Vector | Expected Defense | Severity | Test Method | Status |
|---|---|---|---|---|---|
| SEC-S9-01 | Non-admin sets `X-Impersonating-User-Id` header → attempts to impersonate another user | `protect` middleware only sets `req.originalUser` if `req.user.role === 'admin'`; non-admin header is silently ignored | 🔴 Critical | Authenticate as fan; send `X-Impersonating-User-Id: <creator_id>` | ⬜ |
| SEC-S9-02 | Creator sets `X-Impersonating-User-Id` → attempts to access another creator's routes | Same guard — `req.user.role` is `creator`, not `admin`; header ignored | 🟠 High | Authenticate as creator A; impersonate creator B | ⬜ |
| SEC-S9-03 | Admin impersonates creator → accesses `GET /admin/dashboard` in same request | `adminOnly` checks `req.user.role === 'admin'`; when impersonating, `req.user.role = 'creator'` → 403 | 🟠 High | Admin impersonates creator; call admin route | ⬜ |
| SEC-S9-04 | Admin impersonates suspended user | `protect` still attaches suspended user profile; service-layer status checks apply | 🟡 Medium | Admin impersonates suspended creator; verify service blocks apply | ⬜ |
| SEC-S9-05 | Admin calls `PUT /admin/users/:id/commission` for Enclave member to override 10% rate | Service must reject override; `ENCLAVE_COMMISSION_RATE` is invariant | 🔴 Critical | Admin sets commission = 5% for Enclave creator; verify effective rate remains 10% | ⬜ |
| SEC-S9-06 | Admin approves content that was flagged by user who was subsequently banned | Dismissed reports are bulk-updated regardless of reporter status | 🟡 Medium | Flag content; ban reporter; admin approves; verify reports dismissed | ⬜ |
| SEC-S9-07 | Admin `updateUserStatus` to `suspended` for own admin account | No self-suspension guard documented | 🟡 Medium | Admin suspends own account; verify access lost | ⬜ |
| SEC-S9-08 | Creator generates referral code that an Audience member somehow redeems | Referral redemption only creates `referral_applications` for `role='creator'` signups; fan signup ignores referral | 🟠 High | Audience member signs up with a creator referral code; verify no benefit accrued | ⬜ |

---

## S10: Infrastructure & Configuration

**OWASP**: A05, A09 — Security Misconfiguration, Security Logging & Monitoring Failures

| ID | Attack Vector | Expected Defense | Severity | Test Method | Status |
|---|---|---|---|---|---|
| SEC-S10-01 | CORS: cross-origin POST from `evil.com` sends authenticated cookies | `SameSite=Strict` on cookies + CORS allowlist rejects `evil.com` | 🟠 High | Send cross-origin AJAX with `withCredentials: true` from disallowed origin | ⬜ |
| SEC-S10-02 | Missing `Content-Security-Policy` header → XSS can load external scripts | CSP header set by Helmet or manually in Express | 🟡 Medium | Inspect response headers for `Content-Security-Policy` | ⬜ |
| SEC-S10-03 | Missing `X-Frame-Options` → clickjacking | `X-Frame-Options: DENY` or `frame-ancestors` CSP directive | 🟡 Medium | Inspect response headers | ⬜ |
| SEC-S10-04 | `BASE_RPC_URL` env var not set → verification crashes with unhandled error | Startup check or graceful 500 with configured error message | 🟠 High | Remove env var; call `/crypto-payments/verify` | ⬜ |
| SEC-S10-05 | `BASE_CONTRACT_ADDRESS` not set → any contract address in logs matches | `require(contractAddress)` check at verification time → 500 | 🟠 High | Remove env var; submit tx with arbitrary log address | ⬜ |
| SEC-S10-06 | Supabase service key (`SUPABASE_SERVICE_KEY`) exposed in client-side bundle | Frontend uses Supabase anon key only; service key server-side only | 🔴 Critical | Inspect frontend JS bundle for service key pattern | ⬜ |
| SEC-S10-07 | Server logs contain sensitive data (wallet addresses, tx hashes) in production | Log sanitization or structured logging with PII scrubbing | 🟢 Low | Inspect production server logs for wallet addresses | ⬜ |
| SEC-S10-08 | `npm audit` finds critical vulnerabilities in dependencies | CI pipeline runs `npm audit --audit-level=high`; no unpatched critical CVEs | 🟡 Medium | Run `npm audit` in `PoDM_project/` and `podm-frontend/` | ⬜ |

---

## Risk Heat Map

```
Severity vs. Coverage:

             UNTESTED ◄──────────────────────────► TESTED
Critical  │ S3-01 S3-04 S3-05 S3-11 S3-15        │ S2-05 S2-06
          │ S6-01 S6-06 S6-13 S9-01 S9-05         │
          │ S10-06                                  │
          │                                         │
High      │ S2-07 S2-08 S2-12 S2-13 S3-02          │ (partial) S1-01 S1-02
          │ S3-14 S4-01 S5-04 S6-03 S6-04          │
          │ S7-01 S8-01 S8-02 S8-06                │
          │                                         │
Medium    │ S1-07 S1-09 S1-11 S4-04 S4-06          │
          │ S5-07 S7-03 S7-04 S7-06 S8-04 S8-08   │
          │                                         │
Low       │ S1-14 S4-09 S4-10 S5-08 S8-07          │
          │ S10-07                                  │
          └─────────────────────────────────────────┘
```

---

## Prioritized Remediation Recommendations

### P0 — Fix Before Any Production Traffic

| Finding | Risk | Recommendation |
|---|---|---|

| No rate limit on auth endpoints | SEC-S7-01 | Implement `express-rate-limit` on `POST /auth/login`, `/auth/signup`, `/auth/refresh` |
| Wallet no-treasury-fallback not tested | SEC-S3-11 | Add unit test WAL-001 (D4); add runtime assertion to `getCryptoWalletForUser` |
| ERC-4337 UserOp verification unverified | SEC-S3-15 | Add Hardhat test SOL scenario + integration test B4-06 |
| Enclave commission override not guarded | SEC-S3-12 | Add service-level guard + test ADM-004 (D4) |
| No cookie security attribute audit | SEC-S1-05/06/07 | Verify `HttpOnly`, `Secure`, `SameSite=Lax` on all auth cookies |

### P1 — Address in Next Sprint

| Finding | Risk | Recommendation |
|---|---|---|
| Duplicate tx hash not integration-tested | SEC-S3-01 | Implement PAY-002 (D4) |
| Non-participant message access | SEC-S2-03 | Implement MSG-008 (D4) |
| Non-admin impersonation silently ignored but untested | SEC-S9-01 | Add negative test B1-09 |
| Stack traces in production | SEC-S8-06 | Verify error middleware strips `err.stack` in production |
| Supabase service key bundle audit | SEC-S10-06 | Bundle analysis: `REACT_APP_*` vs service key; automated grep in CI |

### P2 — Hardening Pass

| Finding | Recommendation |
|---|---|
| Missing security headers | Add Helmet.js to Express middleware stack |
| `X-Powered-By` exposed | `app.disable('x-powered-by')` |
| FFmpeg binary hardcoded path | Make configurable via `FFMPEG_PATH` env var |
| `npm audit` not in CI | Add `npm audit --audit-level=high` to GitHub Actions workflow |
| Report queue spam (SEC-S7-03) | Optional: add `UNIQUE(reporter_id, content_id)` to reduce admin queue noise; human review already provides the safety backstop |

---

## Test Implementation Notes

### Tools

| Domain | Recommended Tool |
|---|---|
| API security tests (S1–S4, S7–S9) | Jest + Supertest against running Express server |
| Smart contract security (S6) | Hardhat + ethers.js with custom attack contracts |
| File upload security (S5) | Multipart form requests via Supertest |
| Cookie attribute audit (S1-05/06/07) | Playwright header inspection or `set-cookie-parser` |
| Rate limit verification (S7) | Autocannon or custom loop scripts |
| Bundle secret scan (S10-06) | `grep -r "SUPABASE_SERVICE_KEY" podm-frontend/dist/` in CI |
| Dependency audit (S10-08) | `npm audit --audit-level=high` in CI |

### Quick Wins (One-Line Defenses)

```typescript
// SEC-S7-01: Add to auth router
import rateLimit from 'express-rate-limit';
const authLimiter = rateLimit({ windowMs: 60_000, max: 10, message: 'Too many attempts' });
router.post('/login', authLimiter, loginHandler);

// SEC-S1-05/06/07: Cookie flags (verify these are already set)
res.cookie('authToken', token, {
    httpOnly: true,   // SEC-S1-05
    secure: process.env.NODE_ENV === 'production',  // SEC-S1-06
    sameSite: 'lax',  // SEC-S1-07
    maxAge: 15 * 60 * 1000
});

// SEC-S7-03 (optional hardening — reduces admin queue noise)
// Human review already backstops this; apply if report spam becomes operationally disruptive
// ALTER TABLE content_reports ADD CONSTRAINT unique_report_per_user_content UNIQUE (reporter_id, content_id);

// SEC-S8-07: Disable fingerprinting
app.disable('x-powered-by');
```

---

## Coverage Summary

| Domain | Cases | 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low | Covered (✅) |
|---|---|---|---|---|---|---|
| S1 — Auth & Session | 14 | 3 | 3 | 6 | 2 | 2 |
| S2 — Authorization & IDOR | 16 | 7 | 5 | 3 | 1 | 2 |
| S3 — Payment Integrity | 18 | 8 | 7 | 3 | 0 | 0 |
| S4 — Input Validation | 10 | 0 | 2 | 6 | 2 | 0 |
| S5 — File Upload | 8 | 1 | 3 | 2 | 2 | 0 |
| S6 — Smart Contract | 15 | 6 | 5 | 2 | 2 | 0 |
| S7 — Rate Limiting | 8 | 1 | 2 | 5 | 0 | 0 |
| S8 — Data Exposure | 8 | 2 | 3 | 2 | 1 | 1 |
| S9 — Admin & Impersonation | 8 | 3 | 3 | 2 | 0 | 0 |
| S10 — Infrastructure | 8 | 1 | 3 | 3 | 1 | 0 |
| **Total** | **97** | **32** | **36** | **34** | **11** | **5** |

> [!CAUTION]
> **5 of 97 security tests pass. 33 Critical and 36 High severity cases are completely untested.** The highest combined risk is in S3 (Payment Integrity) — all 18 cases untested, 8 of which are Critical. A determined attacker with access to any valid blockchain transaction could potentially claim content, subscriptions, or manipulate the referral system without these controls verified.

---

*Status: Complete.*
