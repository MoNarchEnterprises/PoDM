# Deliverable 2: PoDM Feature Inventory

**Project**: PoDM Creator-Fan Platform  
**Scope**: Complete System Feature Index & Component/Endpoint Mapping  
**Date**: August 9, 2026  

---

## 1. Feature Taxonomy by User Role & System Domain

### 1.1 Unauthenticated / Guest Features
- **Public Profile Viewing**: Browse creator public profiles, public posts, subscription tier options.
- **Authentication & Onboarding**:
  - Email & password registration with role selection (Audience / Creator).
  - Login via JWT issuance (`authToken` & `authRefreshToken` cookies / Bearer token).
  - Silent token refresh (`POST /api/v1/auth/refresh`).
  - Forgot password / Password reset flow.

### 1.2 Audience Features (User Role: Fan/Audience)
- **Subscription Management**:
  - Tiered monthly subscription purchase via USDC on Base (`paySubscription`).
  - Active subscription dashboard, status monitoring, auto-renewal settings.
- **Pay-Per-View (PPV) Content**:
  - One-time PPV post unlock (`payPPV`).
  - Paid message attachment unlock in direct messages.
- **Vault & Personal Gallery**:
  - Deduplicated item addition (`addItemToGallery` & `addToUserGallery`).
  - View purchased and saved media in Audience Gallery view.
- **Tipping & Direct Creator Support**:
  - One-time tipping with optional message attachment (`payTip`).
- **Real-Time Direct Chat**:
  - Send/receive real-time messages via Socket.IO.
  - View attachable creator vault content and unlock PPV attachments.
- **Contest Participation**:
  - Browse active creator contests, submit entries, view winner announcements.
- **Profile & Crypto Wallet Configuration**:
  - Manual wallet address text input entry.
  - Web3 browser wallet connect (MetaMask / Coinbase Wallet).

### 1.3 Creator Features (User Role: Creator)
- **Content Creation & Vault Management**:
  - Post creation across 5 media types: Text, Image (Sharp resized), Video (FFmpeg thumbnail), Audio, Downloadable File.
  - Visibility controls: Public, Subscriber Only, Tier Specific, Unlisted Vault Content.
- **Attachable Vault Content for Chat**:
  - Query unlisted vault content eligible for attachments (`GET /api/v1/messages/fans/:fanId/attachable-content`).
- **Direct Messaging & Monetized Messaging**:
  - Broadcast and 1-on-1 real-time messaging with Audience members.
  - Attach PPV price tags to direct message attachments.
- **Contest Management**:
  - Create contests, set prize content/amount, review Audience submissions, select winners.
- **Analytics & Earnings Dashboard**:
  - Real-time revenue metrics, subscriber count, content view counts, payout history.
  - CEX Fiat Cashout guidance modal & setup instructions.
- **Creator Referral Program**:
  - Generate creator invite referral links (`{USERNAME}-PERCENT`, `{USERNAME}-CASH`) for referring other creators.
  - Track 1% gross revenue share split on-chain & milestone cash bonus eligibility.
- **Enclave Membership & Commission Perks**:
  - Display Enclave member badge and fixed 10% platform commission rate status.

### 1.4 Admin & Moderation Features
- **Platform Analytics & KPI Dashboard**:
  - System-wide revenue, top creators breakdown, custom date range filtering, export reports (`saved_reports` table).
- **User & Moderation Management**:
  - User role management, account suspension/activation.
  - Moderation queue for flagged content (`content_reports` table; auto-flagged on 3 reports, admin approval/dismissal).
- **Commission Rate Overrides**:
  - Dynamic commission rate updates per creator (validated against Enclave 10% minimum lock).
- **AI Settings & Multi-Provider Config**:
  - Model selection (OpenAI, OpenRouter, NVIDIA) and prompt system updates.
- **Feature Flag Management**:
  - DB-backed feature flag system with global kill switches, percentage rollouts, and user overrides.

---

## 2. Feature Component & Endpoint Mapping Matrix

| Feature | Backend Endpoint(s) | Service / Model | DB Table(s) / Smart Contract | Frontend Component / View |
|---|---|---|---|---|
| **User Register & Login** | `POST /api/v1/auth/register`<br>`POST /api/v1/auth/login` | `auth.service.ts`<br>`user.model.ts` | `profiles` | [LoginModal.tsx](file:///c:/Users/leona/Documents_local/PoDM/PoDM/podm-frontend/src/features/auth/LoginModal.tsx)<br>[RegisterModal.tsx](file:///c:/Users/leona/Documents_local/PoDM/PoDM/podm-frontend/src/features/auth/RegisterModal.tsx) |
| **Token Refresh** | `POST /api/v1/auth/refresh` | `auth.service.ts` | `profiles` | `apiClient.ts` interceptor |
| **Creator Feed & Posts** | `GET /api/v1/content`<br>`POST /api/v1/content` | `content.service.ts`<br>`content.model.ts` | `content` | [CreatorDashboard.tsx](file:///c:/Users/leona/Documents_local/PoDM/PoDM/podm-frontend/src/features/creator/CreatorDashboard.tsx)<br>[ContentViewer.tsx](file:///c:/Users/leona/Documents_local/PoDM/PoDM/podm-frontend/src/features/viewer/ContentViewer.tsx) |
| **USDC Base Payment** | `POST /api/v1/payments/crypto/pay` | `cryptoPayment.service.ts`<br>`userOperation.service.ts` | `transactions`<br>`PoDMPaymentProtocol.sol` | [PaymentModal.tsx](file:///c:/Users/leona/Documents_local/PoDM/PoDM/podm-frontend/src/features/fan/PaymentModal.tsx)<br>`useCryptoPayment.ts` |
| **Audience Gallery** | `GET /api/v1/content/gallery`<br>`POST /api/v1/content/gallery` | `content.service.ts`<br>`gallery.model.ts` | `gallery_items` | [FanGallery.tsx](file:///c:/Users/leona/Documents_local/PoDM/PoDM/podm-frontend/src/features/fan/FanGallery.tsx) |
| **Attachable Messaging Content** | `GET /api/v1/messages/fans/:fanId/attachable-content` | `message.service.ts`<br>`message.model.ts` | `content`, `messages` | [AttachmentModal.tsx](file:///c:/Users/leona/Documents_local/PoDM/PoDM/podm-frontend/src/features/messages/AttachmentModal.tsx) |
| **Content Moderation Reporting** | `POST /api/v1/content/:id/report`<br>`GET /api/v1/admin/reports` | `content.service.ts`<br>`report.model.ts` | `content_reports` | [ModerationQueue.tsx](file:///c:/Users/leona/Documents_local/PoDM/PoDM/podm-frontend/src/features/admin/ModerationQueue.tsx) |
| **Referral Program** | `GET /api/v1/referrals/stats`<br>`POST /api/v1/referrals/claim` | `referral.service.ts`<br>`referral.model.ts` | `referrals`, `transactions` | [ReferralDashboard.tsx](file:///c:/Users/leona/Documents_local/PoDM/PoDM/podm-frontend/src/features/creator/ReferralDashboard.tsx) |
| **Enclave Commission Enforcement** | `PUT /api/v1/admin/creators/:id/commission` | `admin.service.ts`<br>`commission.utils.ts` | `profiles` | [AdminCreators.tsx](file:///c:/Users/leona/Documents_local/PoDM/PoDM/podm-frontend/src/features/admin/AdminCreators.tsx) |
| **Wallet Settings & Manual Input** | `PUT /api/v1/users/profile` | `user.service.ts`<br>`user.model.ts` | `profiles` | [WalletSettings.tsx](file:///c:/Users/leona/Documents_local/PoDM/PoDM/podm-frontend/src/features/fan/WalletSettings.tsx) |

---

*Status: Completed & Verified.*
