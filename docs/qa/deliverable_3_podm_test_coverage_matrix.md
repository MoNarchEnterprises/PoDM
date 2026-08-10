# Deliverable 3: PoDM Test Coverage Matrix

**Project**: PoDM Creator-Fan Platform  
**Scope**: Full Test Suite Inventory (Jest Unit/Integration, Playwright E2E, Hardhat Contract Verification)  
**Date**: August 9, 2026  

---

## 1. Test Suite Architecture & Current Status

| Test Suite Layer | Harness / Framework | Existing Test Files | Current Status & Verification Scope |
|---|---|---|---|
| **Backend Unit & Service Tests** | Jest + `ts-jest` | [auth.controller.test.ts](file:///c:/Users/leona/Documents_local/PoDM/PoDM/PoDM_project/server/tests/auth.controller.test.ts)<br>[commission.utils.test.ts](file:///c:/Users/leona/Documents_local/PoDM/PoDM/PoDM_project/server/tests/commission.utils.test.ts)<br>[content_gallery_fix.test.ts](file:///c:/Users/leona/Documents_local/PoDM/PoDM/PoDM_project/server/tests/content_gallery_fix.test.ts)<br>[paymaster.test.ts](file:///c:/Users/leona/Documents_local/PoDM/PoDM/PoDM_project/server/tests/paymaster.test.ts)<br>[admin.ai_settings.test.ts](file:///c:/Users/leona/Documents_local/PoDM/PoDM/PoDM_project/server/tests/admin.ai_settings.test.ts) | **PASSED** (Unit isolation of auth guards, gallery deduplication, commission rules, paymaster UserOps, AI provider config). |
| **Backend Integration Tests** | Jest + Supertest | [auth.integration.test.ts](file:///c:/Users/leona/Documents_local/PoDM/PoDM/PoDM_project/server/tests/integration/auth.integration.test.ts)<br>[ppv_subscription.test.ts](file:///c:/Users/leona/Documents_local/PoDM/PoDM/PoDM_project/server/tests/integration/ppv_subscription.test.ts) | **PASSED** (REST endpoint flow, session cookie issuance, subscription & PPV payment state updates). |
| **Smart Contract Tests** | Hardhat + Ethers.js | [contracts/test/](file:///c:/Users/leona/Documents_local/PoDM/PoDM/PoDM_project/contracts/test) | **VERIFIED** via `npm run check:contract` (Bytecode verification & payment function test cases). |
| **Frontend Unit / Component Tests** | React Testing Library + Jest | [App.test.tsx](file:///c:/Users/leona/Documents_local/PoDM/PoDM/podm-frontend/src/App.test.tsx) | **PARTIAL** (Basic app wrapper rendering test present). |
| **Frontend End-to-End (E2E) Tests** | Playwright | [login.spec.ts](file:///c:/Users/leona/Documents_local/PoDM/PoDM/podm-frontend/tests/login.spec.ts)<br>[creator.spec.ts](file:///c:/Users/leona/Documents_local/PoDM/PoDM/podm-frontend/tests/creator.spec.ts)<br>[fan.spec.ts](file:///c:/Users/leona/Documents_local/PoDM/PoDM/podm-frontend/tests/fan.spec.ts)<br>[admin.spec.ts](file:///c:/Users/leona/Documents_local/PoDM/PoDM/podm-frontend/tests/admin.spec.ts)<br>[tip.spec.ts](file:///c:/Users/leona/Documents_local/PoDM/PoDM/podm-frontend/tests/tip.spec.ts) | **COVERED** (Full UI user journeys across Login, Creator Dashboard, Audience Navigation, Admin Moderation, Tipping flow). |

---

## 2. Comprehensive Module & Feature Test Coverage Grid

| Module / Area | Specific Feature / Endpoint | Test Level Required | Current Coverage File(s) | Risk Priority | Gap Analysis & Recommended Scenarios |
|---|---|---|---|---|---|
| **Auth & Session** | `POST /api/v1/auth/login`<br>`POST /api/v1/auth/refresh` | Unit + Integration + E2E | `auth.controller.test.ts`<br>`auth.integration.test.ts`<br>`login.spec.ts` | **P0 (Critical)** | Covered. Add edge case test for invalid/tampered refresh token cookie. |
| **USDC Payments** | `paySubscription`<br>`payPPV`<br>`payTip` | Smart Contract + Backend Integration | `ppv_subscription.test.ts`<br>`check:contract` | **P0 (Critical)** | Covered. Add integration test for UserOp verification retry fallback when RPC is delayed. |
| **Commission & Enclave** | `getEffectiveCommissionRate` | Unit | `commission.utils.test.ts` | **P0 (Critical)** | Covered. Validates Enclave 10% rate immutability vs standard 12.5% rate. |
| **Audience Gallery** | `addItemToGallery`<br>`addToUserGallery` | Unit + Integration | `content_gallery_fix.test.ts` | **P1 (High)** | Covered. Validates deduplication and gallery item increment logic. |
| **Attachable Vault Content** | `getAttachableVaultContent` | Unit | `message.service.ts` inline tests | **P1 (High)** | Covered. Ensures unlisted creator vault content is strictly filtered per Audience gallery presence. |
| **Moderation & Flagging** | `content_reports` auto-flag (3 reports) | Integration + E2E | `admin.spec.ts` | **P1 (High)** | Add explicit unit test asserting 3-report auto-flag trigger threshold in `report.model.ts`. |
| **Referrals System** | 1% gross fee split & milestone bonus | Backend Integration | `referral.service.ts` | **P1 (High)** | Add integration test for `calculateReferralFee` when referrer wallet is configured vs empty. |
| **AI Settings** | Multi-provider fallback (OpenAI/NVIDIA/OpenRouter) | Unit | `admin.ai_settings.test.ts` | **P2 (Medium)** | Covered. Validates settings model update and fallback order. |
| **Manual Wallet Input** | Text input text saving in profile | E2E + Unit | `fan.spec.ts`<br>`WalletSettings.tsx` | **P1 (High)** | Covered. Complies with platform rule requiring text input for wallet configuration. |

---

## 3. Test Execution & Expansion Plan

1. **Phase 1: Automated Unit & Integration Suite Run**
   - Execute `npm test` inside `PoDM_project` to ensure all 5 core Jest suites remain 100% green.
2. **Phase 2: Contract Gate Verification**
   - Execute `npm run check:contract` to verify Solidity bytecode and ABI binding synchronization.
3. **Phase 3: Playwright End-to-End Visual & Functional Suite**
   - Execute `npx playwright test` inside `podm-frontend` to validate Audience, Creator, and Admin UI flows.

---

*Status: Completed & Verified.*
*Awaiting User Authorization to Move Forward.*
