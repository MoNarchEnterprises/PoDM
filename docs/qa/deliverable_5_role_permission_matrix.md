# Deliverable 5: Role / Permission Matrix

**Project**: PoDM Creator-Audience Platform  
**Date**: August 9, 2026  
**Grounded in**: Live code audit — `auth.middleware.ts`, all route files, service-layer guards

---

## Role Definitions

| Role | `role` column | `status` column | Sub-attribute | Notes |
|---|---|---|---|---|
| **Guest** | — | — | — | No token; `optionalProtect` routes only |
| **Audience** | `fan` | `active` | — | Platform term for fans |
| **Creator (Pending)** | `creator` | `pending verification` | — | Route-level access passes; service blocks core actions |
| **Creator (Active)** | `creator` | `active` | — | Full creator capability |
| **Enclave Creator** | `creator` | `active` | `is_enclave_member = true` | Same routes as Active; locked 10% commission |
| **Admin** | `admin` | any | — | `protectAndAdmin` gates; can impersonate creators |
| **Admin (Impersonating)** | `admin` (original) | — | `X-Impersonating-User-Id` header | `req.originalUser` = admin, `req.user` = target creator |

---

## Middleware Primitives

```
protect             → validates Supabase JWT → attaches req.user → 401 if no/invalid token
optionalProtect     → same as protect; never blocks — continues as guest on missing/invalid token
creatorOnly         → req.user.role === 'creator'
                      OR (req.originalUser.role === 'admin' AND req.user.role === 'creator')
                      → 403 otherwise
adminOnly           → req.user.role === 'admin' → 403 otherwise
requireRole(...r)   → req.user.role in roles[] → 403 otherwise

protectAndCreator   = [protect, creatorOnly]
protectAndAdmin     = [protect, adminOnly]
```

> [!IMPORTANT]  
> `protectAndCreator` enforces **role only — not `status`**. A creator with `status='pending verification'` passes the route guard. Service-layer code applies the status check (e.g., `sendDirectMessage` blocks pending creators with 403 `account must be verified`).

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ | Full access |
| 🔒 | Blocked at route layer (401 / 403) |
| ⚠️ | Route passes; partially blocked at service layer |
| 👁️ | Read-only / limited view |
| 🔑 | Requires additional condition (ownership, subscription, cleared tx, etc.) |
| — | Not applicable |

---

## Section 1 — Authentication & Session

| Action | Endpoint | Guard | Guest | Audience | Creator (Pending) | Creator (Active) | Admin |
|---|---|---|---|---|---|---|---|
| Sign up (fan or creator) | `POST /auth/signup` | public | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sign up + subscribe | `POST /auth/signup-and-subscribe` | public | ✅ | ✅ | ✅ | ✅ | ✅ |
| Log in | `POST /auth/login` | public | ✅ | ✅ | ✅ | ✅ | ✅ |
| Log out | `POST /auth/logout` | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| Refresh tokens | `POST /auth/refresh` | public (cookie) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Change password | `POST /auth/change-password` | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| Forgot password | `POST /auth/forgot-password` | public | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reset password | `POST /auth/reset-password` | public | ✅ | ✅ | ✅ | ✅ | ✅ |
| Get own profile (`/me`) | `GET /users/me` | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| Impersonate user | `protect` + `X-Impersonating-User-Id` header | `protect` → `adminOnly` check in middleware | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |

---

## Section 2 — User / Profile Management

| Action | Endpoint | Guard | Guest | Audience | Creator (Pending) | Creator (Active) | Admin |
|---|---|---|---|---|---|---|---|
| View public creator profile | `GET /users/:username/profile` | `optionalProtect` | 👁️ | 👁️ | 👁️ | 👁️ | ✅ |
| Update own profile | `PUT /users/profile` | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| Update wallet / payout config | `PUT /users/wallet` (on user routes) | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| Upload avatar | `POST /users/avatar` | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| Get own subscription list | `GET /subscriptions/my` | `protect` | 🔒 | ✅ | — | — | ✅ |
| Get own transaction history | `GET /transactions/my` | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| Get notification preferences | `GET /users/preferences` | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| Update notification preferences | `PUT /users/preferences` | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |

---

## Section 3 — Content (Viewing)

| Action | Endpoint | Guard | Guest | Audience | Creator (Pending) | Creator (Active) | Admin |
|---|---|---|---|---|---|---|---|
| Browse creator's public feed | `GET /content/creator/:username` | `optionalProtect` | 👁️ public only | 👁️ unlocked view | 👁️ unlocked view | ✅ own content | ✅ |
| View `public` content | `GET /content/:id` | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| View `subscribers_only` content | `GET /content/:id` | `protect` + service subscription check | 🔒 | 🔑 active subscription required | 🔑 | ✅ own content | ✅ |
| View `pay_per_view` content | `GET /content/:id` | `protect` + service PPV tx check | 🔒 | 🔑 cleared PPV tx required | 🔑 | ✅ own content | ✅ |
| View `unlisted` (vault) content | `GET /content/:id` | `protect` + ownership check | 🔒 | 🔒 | 🔒 | ✅ own only | ✅ |
| Get secure signed URL | `GET /content/:id/secure-url` | `protect` + subscriber/owner check | 🔒 | 🔑 subscribed or purchased | ⚠️ | ✅ own content | ✅ |
| Get viewer data | `GET /content/:id/viewer-data` | `protect` | 🔒 | ✅ (locked fields if no access) | ✅ | ✅ | ✅ |
| Get full view URL | `GET /content/:id/view` | `protect` | 🔒 | 🔑 access check in service | 🔑 | ✅ own content | ✅ |

> [!NOTE]
> `subscribers_only` content: unsubscribed Audience receives metadata with `isUnlocked: false` and a placeholder image URL (`placehold.co/600x400`). They are not hard-blocked — they see the post exists but cannot view the media.  
> Creator (own content): always bypasses subscription/PPV checks. Owner returns full un-watermarked content.  
> Audience (non-owner): photo content is watermarked with `@username` SVG overlay via Sharp (tiled, 5-min cached in R2 `temp/` path).

---

## Section 4 — Content (Management)

| Action | Endpoint | Guard | Guest | Audience | Creator (Pending) | Creator (Active) | Admin |
|---|---|---|---|---|---|---|---|
| Create/upload content | `POST /content` | `protectAndCreator` + upload | 🔒 | 🔒 | ⚠️ route passes | ✅ | 🔒 (unless impersonating) |
| Edit own content | `PUT /content/:id` | `protectAndCreator` + ownership | 🔒 | 🔒 | ⚠️ route passes, 🔑 ownership | ✅ own only | 🔒 |
| Delete own content | `DELETE /content/:id` | `protectAndCreator` + ownership | 🔒 | 🔒 | ⚠️ route passes, 🔑 ownership | ✅ own only | 🔒 |
| View own content list | `GET /content/my-content` | `protectAndCreator` | 🔒 | 🔒 | ✅ | ✅ | 🔒 |
| Schedule content | `POST /content` with `schedule.isScheduled=true` | `protectAndCreator` | 🔒 | 🔒 | ⚠️ | ✅ | 🔒 |
| Report content | `POST /content/:id/report` | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |

> [!WARNING]
> **Creator (Pending) content creation gap**: `protectAndCreator` passes at the route layer for pending creators (`role='creator'` check only). There is no service-layer status guard on content creation. A pending creator **can** successfully create and upload content. This may be intentional (allow pre-verification content drafting) but is worth confirming.

---

## Section 5 — Gallery

| Action | Guard | Guest | Audience | Creator (Pending) | Creator (Active) | Admin |
|---|---|---|---|---|---|---|
| Add content to gallery | `protect` (via content/message service) | 🔒 | ✅ | — | — | ✅ |
| View own gallery | `protect` | 🔒 | ✅ | — | — | ✅ |
| Duplicate add attempt (same contentId) | Service: `addItemToGallery` dedup check | — | `{ added: false }` no-op | — | — | — |
| Get attachable vault items (for DM) | `protectAndCreator` + conversation/sub check | 🔒 | 🔒 | ⚠️ route passes | 🔑 fan is subscriber or in conversation | 🔒 |

---

## Section 6 — Messaging

| Action | Endpoint | Guard | Guest | Audience | Creator (Pending) | Creator (Active) | Admin |
|---|---|---|---|---|---|---|---|
| Get conversation list | `GET /messages/conversations` | `protect` | 🔒 | ✅ (fan view) | ✅ (creator view) | ✅ (sorted by fan spend) | ✅ |
| Get messages in conversation | `GET /messages/conversations/:id` | `protect` + participant check | 🔒 | 🔑 must be participant | 🔑 | 🔑 | ✅ |
| Send direct message | `POST /messages` | `protect` + status check in service | 🔒 | ✅ | 🔒 service: `status !== 'active'` → 403 | ✅ | ✅ |
| Unlock PPV message content | `PATCH /messages/:id/unlock` | `protect` + tx check | 🔒 | 🔑 cleared `PPV Message` tx required | 🔑 | ✅ own content | ✅ |
| Delete own message | `DELETE /messages/:id` | `protect` + ownership | 🔒 | 🔑 own only | 🔑 | 🔑 own only | ✅ |
| Mark conversation as read | `PUT /messages/conversations/:id/read` | `protect` + participant check | 🔒 | 🔑 participant | 🔑 | 🔑 | ✅ |
| Send voice message | `POST /messages/voice` | `protectAndCreator` | 🔒 | 🔒 | ⚠️ route passes | ✅ | 🔒 |
| Send mass message | `POST /messages/mass-message` | `protectAndCreator` | 🔒 | 🔒 | ⚠️ route passes | ✅ | 🔒 |
| Get vault items to attach | `GET /messages/fans/:fanId/attachable-content` | `protectAndCreator` + fan access check | 🔒 | 🔒 | ⚠️ route passes | 🔑 fan subscribed or in conversation | 🔒 |

> [!NOTE]
> Creator conversation list sorts by **fan total spend DESC**, then by `updatedAt DESC`. Audience conversation list shows creator profile data only.

---

## Section 7 — Payments & Transactions

| Action | Endpoint | Guard | Guest | Audience | Creator (Pending) | Creator (Active) | Admin |
|---|---|---|---|---|---|---|---|
| Initiate subscription payment | `POST /subscriptions/subscribe` | `protect` | 🔒 | ✅ | ✅ (as payer) | — | — |
| Verify on-chain subscription tx | `POST /crypto-payments/verify` | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| Verify on-chain PPV tx | `POST /crypto-payments/verify-ppv` | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| Verify on-chain tip tx | `POST /crypto-payments/verify-tip` | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| Cancel subscription | `POST /subscriptions/cancel` | `protect` + fan ownership | 🔒 | 🔑 own subscription | 🔒 | 🔒 | ✅ |
| Get payment info (referrer wallet + fees) | `GET /crypto-payments/payment-info/:creatorId` | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| Get creator's subscriber list | `GET /subscriptions/subscribers` | `protectAndCreator` | 🔒 | 🔒 | ⚠️ | ✅ | 🔒 |
| View own transaction history | `GET /transactions/my` | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |

---

## Section 8 — Subscriptions (Tier & Renewal)

| Action | Guard | Guest | Audience | Creator (Pending) | Creator (Active) | Admin |
|---|---|---|---|---|---|---|
| Create subscription tier | `protectAndCreator` | 🔒 | 🔒 | ⚠️ | ✅ | 🔒 |
| Update subscription tier | `protectAndCreator` + ownership | 🔒 | 🔒 | ⚠️ own only | ✅ own only | 🔒 |
| Delete subscription tier | `protectAndCreator` + ownership | 🔒 | 🔒 | ⚠️ | ✅ | 🔒 |
| Trigger on-chain renewal (keeper) | Smart contract `onlyKeeper` modifier | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 (keeper wallet only) |
| View subscriptions due for renewal | Internal service | — | — | — | — | ✅ |

---

## Section 9 — Referrals

| Action | Endpoint | Guard | Guest | Audience | Creator (Pending) | Creator (Active) | Admin |
|---|---|---|---|---|---|---|---|
| Generate referral code (PERCENT path) | `POST /referrals/generate` | `protectAndCreator` | 🔒 | 🔒 | ⚠️ | ✅ | 🔒 |
| Generate referral code (CASH path) | `POST /referrals/generate` | `protectAndCreator` | 🔒 | 🔒 | ⚠️ | ✅ | 🔒 |
| Get own referral info | `GET /referrals/my` | `protectAndCreator` | 🔒 | 🔒 | ⚠️ | ✅ | 🔒 |
| Redeem referral code (at signup) | `POST /auth/signup` (body param) | public | ✅ (creator only) | — | — | — | — |
| View referral earnings | `GET /referrals/earnings` | `protectAndCreator` | 🔒 | 🔒 | ⚠️ | ✅ | 🔒 |

> [!IMPORTANT]  
> **Referral codes are for creators only.** Audience members have no referral program. No referral route exists under audience-facing paths.

---

## Section 10 — Contests

| Action | Endpoint | Guard | Guest | Audience | Creator (Pending) | Creator (Active) | Admin |
|---|---|---|---|---|---|---|---|
| View active contest feed | `GET /contests/feed` | `protect` or public | 👁️ | ✅ | ✅ | ✅ | ✅ |
| Create contest | `POST /contests` | `protectAndCreator` | 🔒 | 🔒 | ⚠️ | ✅ | 🔒 |
| Publish contest (draft → active) | `PUT /contests/:id/publish` | `protectAndCreator` + ownership | 🔒 | 🔒 | ⚠️ | 🔑 own contest | 🔒 |
| Enter contest | `POST /contests/:id/enter` | `protect` + subscription check | 🔒 | 🔑 subscribed to creator | 🔒 | 🔒 | 🔒 |
| Pick winner | `POST /contests/:id/winner` | `protectAndCreator` + ownership | 🔒 | 🔒 | ⚠️ | 🔑 own contest | 🔒 |
| View own contest entries | `GET /contests/my-entries` | `protect` | 🔒 | ✅ | 🔒 | 🔒 | ✅ |

---

## Section 11 — Notifications

| Action | Endpoint | Guard | Guest | Audience | Creator (Pending) | Creator (Active) | Admin |
|---|---|---|---|---|---|---|---|
| Get notification list | `GET /notifications` | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| Get unread count | `GET /notifications/unread-count` | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| Mark single notification read | `PUT /notifications/:id/read` | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| Mark all notifications read | `PUT /notifications/read-all` | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| Delete notification | `DELETE /notifications/:id` | `protect` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| Receive `new_content` notification | Internal (on content publish) | — | — | ✅ (if enabled in prefs) | — | — | — |
| Receive `new_subscriber` notification | Internal (on subscription) | — | — | — | — | ✅ | — |
| Receive `tip_received` notification | Internal (on tip verified) | — | — | — | — | ✅ | — |
| Receive `ppv_unlocked` notification | Internal (on PPV verified) | — | — | — | — | ✅ | — |

---

## Section 12 — Admin Panel

| Action | Endpoint | Guard | Guest | Audience | Creator (Pending) | Creator (Active) | Admin |
|---|---|---|---|---|---|---|---|
| View platform dashboard | `GET /admin/dashboard` | `protectAndAdmin` | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |
| View platform analytics | `GET /admin/analytics` | `protectAndAdmin` | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |
| List all users | `GET /admin/users` | `protectAndAdmin` | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |
| Get user by ID | `GET /admin/users/:id` | `protectAndAdmin` | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |
| Update user status (suspend/activate) | `PUT /admin/users/:id/status` | `protectAndAdmin` | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |
| Set creator commission rate | `PUT /admin/users/:id/commission` | `protectAndAdmin` | 🔒 | 🔒 | 🔒 | 🔒 | ✅ (non-Enclave only) |
| View flagged content queue | `GET /admin/content/flagged` | `protectAndAdmin` | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |
| Approve flagged content | `PUT /admin/content/:id/approve` | `protectAndAdmin` | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |
| Dismiss flagged content | `PUT /admin/content/:id/dismiss` | `protectAndAdmin` | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |
| Update platform AI settings | `PUT /admin/settings/ai` | `protectAndAdmin` | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |
| View saved analytics reports | `GET /admin/reports` | `protectAndAdmin` | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |
| Save analytics report | `POST /admin/reports` | `protectAndAdmin` | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |
| Impersonate creator | `protect` + `X-Impersonating-User-Id` header | `protect` (admin check in middleware) | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |

> [!IMPORTANT]
> **Enclave commission lock (Admin constraint)**: `setCreatorCommission` for an Enclave member (`is_enclave_member = true`) must be rejected server-side. Admin cannot override Enclave's locked 10% rate even via the admin panel.

---

## Section 13 — Smart Contract (On-Chain)

| Function | Modifier | Non-wallet | Audience wallet | Creator wallet | Keeper wallet | Owner wallet |
|---|---|---|---|---|---|---|
| `paySubscription` | `whenNotPaused nonReentrant` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| `payTip` | `whenNotPaused nonReentrant` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| `payPPV` | `whenNotPaused nonReentrant` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| `approveRecurringSubscription` | `whenNotPaused` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| `revokeRecurringSubscription` | none | 🔒 | ✅ own only | ✅ own only | ✅ own only | ✅ |
| `processRenewal` | `whenNotPaused nonReentrant onlyKeeper` | 🔒 | 🔒 | 🔒 | ✅ | ✅ (owner is keeper) |
| `processPayout` | `onlyOwner whenNotPaused nonReentrant` | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |
| `setPlatformTreasury` | `onlyOwner` | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |
| `setPlatformFeeBps` | `onlyOwner` (≤ 3000 bps) | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |
| `setReferralFeeBps` | `onlyOwner` (≤ platformFeeBps) | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |
| `setKeeper` | `onlyOwner` | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |
| `pause` / `unpause` | `onlyOwner` | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |
| `getAllowance` | view (public) | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Section 14 — Commission & Fee Rules by Role

| Scenario | Audience Pays | Commission Applied | Creator Receives |
|---|---|---|---|
| Subscribe to standard creator (no custom rate) | Price | 12.5% platform | 87.5% |
| Subscribe to standard creator (custom rate) | Price | custom% platform | (100 - custom)% |
| Subscribe to **Enclave creator** | Price | **10% platform (locked)** | **90%** |
| PPV unlock (any creator) | Price | same commission as subscription | same |
| Tip (any creator) | Amount | same commission | same |
| With active PERCENT referral | Any above | 1% deducted from platform cut, sent to referrer | Unchanged |
| With no referrer or no referrer wallet | Any above | no referral deduction | Unchanged |

> [!NOTE]
> The referral fee is carved from the **platform's share**, never from the creator's payout. `creatorAmount = amount - platformFee` regardless of whether a referrer is paid.

---

## Section 15 — Content Visibility Access Rules (Data Layer)

| Content Visibility | Guest | Audience (unsubscribed) | Audience (subscribed) | Audience (PPV paid) | Creator (owner) | Admin |
|---|---|---|---|---|---|---|
| `public` | 👁️ metadata only (no signed URL) | ✅ signed URL | ✅ | ✅ | ✅ unwatermarked | ✅ |
| `subscribers_only` | 🔒 | 👁️ placeholder image, `isUnlocked: false` | ✅ watermarked image | ✅ watermarked | ✅ unwatermarked | ✅ |
| `pay_per_view` | 🔒 | 👁️ placeholder, `isUnlocked: false` | 👁️ locked unless also paid | ✅ | ✅ unwatermarked | ✅ |
| `unlisted` (vault) | 🔒 | 🔒 | 🔒 | 🔒 | ✅ unwatermarked | ✅ |
| `scheduled` | 🔒 | 🔒 | 🔒 | 🔒 | ✅ | ✅ |

> [!NOTE]
> Tier gating applies within subscriptions: `min_tier_level` must be ≤ fan's current tier level. A subscribed fan on a lower tier may still be blocked from `subscribers_only` content above their tier.

---

## Section 16 — Admin Impersonation Rules

| Condition | Result |
|---|---|
| Admin sends `X-Impersonating-User-Id` header | `req.user` = target user, `req.originalUser` = admin |
| Target user not found | Impersonation skipped; continues as admin |
| `creatorOnly` check when impersonating creator | ✅ passes — `req.originalUser.role === 'admin'` AND `req.user.role === 'creator'` |
| `adminOnly` check when impersonating | 🔒 blocked — `req.user.role` is now `'creator'`, not `'admin'` |
| Impersonating a fan | `creatorOnly` routes blocked; `protect` routes pass |
| Non-admin attempts impersonation | Header ignored — `req.originalUser` never set |

> [!CAUTION]
> When admin impersonates a creator, `adminOnly` routes (e.g., admin panel) become **inaccessible** in the same request context. This is by design — impersonation is scoped to creator-level actions only.

---

## Risk Summary

| Risk | Severity | Detail |
|---|---|---|
| **Pending creator content upload** | Medium | `protectAndCreator` passes on `role='creator'`; no status guard in content creation service. Pending creators can upload content before approval. |
| **Pending creator route access** | Low-Medium | All `protectAndCreator` routes accessible to pending creators at the route layer. Only service-layer checks in DM sending and mass messaging block them. |
| **No referral program for Audience** | ✅ Confirmed correct | Referral routes are `protectAndCreator` only. No Audience-facing referral endpoint exists. |
| **Enclave commission override** | High | Service must reject admin commission overrides for Enclave members. Route guard does not prevent the attempt; the service check is the only protection. No test exists for this scenario (ADM-004). |
| **Wallet fallback to treasury** | Critical | `getCryptoWalletForUser` must return `''` when no wallet configured — **never** fall back to `PLATFORM_TREASURY_ADDRESS`. Enforced only by application code convention, no route guard. |
| **Impersonation header spoofing** | Low | Non-admin requests with `X-Impersonating-User-Id` are silently ignored (the middleware only sets `req.originalUser` if `req.user.role === 'admin'`). No security risk, but should be tested. |

---

*Status: Complete — All 6 research data sets synthesized.*
