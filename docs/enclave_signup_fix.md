# Enclave Signup: Include Referral Code in Email Link

## Problem

When an enclave applicant used a referral code (`?ref=CODE`) on the `/enclave` landing page, the code is correctly stored in `enclave_applications.referral_code` on submission. But when the admin approves the application and the welcome email is sent, the signup link doesn't include the referral code:

```
/signup?email=vegaclaw26@gmail.com&enclave=true
```

The user lands on the signup form and the referral code field is blank — no visual confirmation that their referral was captured. (The backend does award the bonus during signup via `auth.service.ts:144-176`, but the user doesn't see it on their end.)

---

## Flow

| Step | Where | What Happens |
|---|---|---|
| 1 | `EnclaveApplicationForm.tsx:44-55` | Captures `?ref=CODE` from URL, stores in form state |
| 2 | `EnclaveApplicationForm.tsx:104` | Submits `referralCode` to `POST /enclave/applications` |
| 3 | `enclave.controller.ts` (submit handler) | Saves `referral_code` in the DB row |
| 4 | `enclave.controller.ts:205` | Admin approves → generates signup link — **missing `&ref=`** |
| 5 | `AuthModal.tsx:51-53` | Already reads `?ref=CODE` from URL → pre-fills + disables input |
| 6 | `auth.service.ts:144-176` | Reads `enclave_applications.referral_code` after signup and calls `awardReferralBonus` |

Step 4 is the gap. Step 5 already works. Step 6 is a safety net (already works).

---

## Fix

**One line** in `PoDM_project/server/controllers/enclave.controller.ts`.

### Current (line 205):

```typescript
const signupLink = `${process.env.CLIENT_URL}/signup?email=${encodeURIComponent(application.email)}&enclave=true`;
```

### New:

```typescript
const baseLink = `${process.env.CLIENT_URL}/signup?email=${encodeURIComponent(application.email)}&enclave=true`;
const signupLink = application.referral_code
  ? `${baseLink}&ref=${encodeURIComponent(application.referral_code)}`
  : baseLink;
```

When `referral_code` is present (e.g. `VEGACLAW-CASH`), the email link becomes:

```
/signup?email=vegaclaw26@gmail.com&enclave=true&ref=VEGACLAW-CASH
```

---

## What Happens After

1. User clicks link → lands on signup form (via `/signup` route or `/` redirect)
2. `AuthModal.tsx:42-53` runs on mount:
   - `emailParam` → pre-fills email field
   - `enclaveParam === 'true'` → forces creator role + signup mode
   - `refParam` → pre-fills referral code + disables the input (already works)
3. User sees the referral code filled in and greyed out with "Referral code applied from link" text
4. User submits → `auth.service.ts:144-176` also reads `referral_code` from the DB record as a safety net (double-apply is guarded by `referral_applications` uniqueness)

---

## Files Changed

| File | Change |
|---|---|
| `PoDM_project/server/controllers/enclave.controller.ts:205` | Append `&ref=...` to signup link when `application.referral_code` is set |

No frontend changes needed. No new files.

---

## Backend Safety Net (Already Works)

`auth.service.ts:144-176` reads `enclave_applications.referral_code` by email during signup and calls `awardReferralBonus` unconditionally. This means even if the URL param is accidentally dropped (email client mangling, manual URL edit), the referral bonus is still awarded on the backend. The `ref` URL param is purely for frontend UX — the user sees their code pre-filled.
