# Silent Session Refresh — Implementation Plan

## Problem

The application loses the session without being graceful. If the user leaves a tab idle, the Supabase access token expires (~1h JWT) and any later API call returns 401. The axios interceptor then wipes the token, toasts *"Your session has expired. Please log in again."*, and redirects to `/` after 2 seconds (`apiClient.ts:103-124`). Returning to an idle tab therefore surfaces confusing errors and an unwanted logout.

## Findings

- **No refresh token is retained.** Backend gets `data.session` (which includes `refresh_token`) from Supabase on login/signup but only forwards `access_token` (`auth.service.ts:236`). Nothing can silently renew once the access JWT expires.
- **401 UX is the "weird error".** `apiClient.ts:103-124` wipes tokens, toasts the expired-session message, redirects to `/` after 2s.
- **Cookie precedence bug.** `auth.middleware.ts:61-67` reads the cookie token before the Bearer header; the 30-day HttpOnly cookie holds a 1h token (`auth.controller.ts:13`), so even a fresh header token can 401. With the cookie-refresh approach this self-heals (server re-issues both cookies on refresh), but we will prefer the header when present as a cheap safety net.
- **Production is cross-site.** Netlify SPA ↔ separate API with `credentials: true` (`Server.ts:72-90`). HttpOnly cookies need `SameSite=None; Secure` in prod to be sent cross-site; dev is same-origin via the Vite proxy (`vite.config.ts:15-20`) so `lax` is fine there.
- **Decisions (user-confirmed):**
  - Store refresh token in an **HttpOnly cookie** + add a `/auth/refresh` endpoint (not client-side storage).
  - **Renew only on 401** — no proactive keep-alive timer.
  - **Also handle Socket.IO re-auth** after refresh.

## Plan

### Backend

1. **`server/controllers/auth.controller.ts`**
   - Extend `COOKIE_OPTIONS` / `setAuthCookie` to also set an `authRefreshToken` HttpOnly cookie.
     - Prod: `SameSite='none'`, `Secure=true`.
     - Dev: `SameSite='lax'` (same-origin via proxy).
   - `logout` also clears the refresh cookie.

2. **`server/services/auth.service.ts`**
   - `loginUser`, `signupUser`, `signupAndSubscribe`: return `refresh_token` from `data.session` alongside `token`.

3. **New `POST /api/v1/auth/refresh`** (route + controller + service)
   - Read refresh token from the `authRefreshToken` cookie (fallback: request body).
   - `authSupabase.auth.refreshSession({ refresh_token })` → new session (Supabase rotates the refresh token).
   - Re-set both cookies; return `{ token, refreshToken }` (rotated refresh token exposed for client-side storage if needed).
   - Invalid/expired refresh → 401 (client then performs the real logout).

### Frontend

4. **`podm-frontend/src/lib/apiClient.ts`**
   - Rework the 401 branch:
     - Shared, single-flight refresh promise (concurrent 401s coalesce into one refresh).
     - On 401 (not `skipAuthRedirect`): call `/auth/refresh`; on success update the stored token in the same storage tier it came from (`localStorage` vs `sessionStorage`), then retry the original request **once**.
     - Only if refresh fails → current wipe + toast + redirect behavior.
   - Expose the refresh helper for use by auth init and socket.

5. **`podm-frontend/src/hooks/useAuth.tsx`**
   - `initializeAuth` keeps calling `getMe()`; the interceptor's refresh-retry makes page-load restore work automatically (expired token → silent refresh → `getMe` succeeds → session restored).
   - `logout` clears the refresh cookie via the backend.

6. **`podm-frontend/src/lib/socket.ts`**
   - Add `refreshSocketToken()` helper: after a successful refresh, update the stored token, then `socket.disconnect(); socket.connect()` so the existing `auth` callback (`socket.ts:14-16`) picks up the fresh token and re-authenticates.

### Docs (DOX pass)

- Update `docs/api/README.md` (+ new endpoint).
- Update `docs/architecture/03-architecture-kb.md`, `06-frontend-architecture.md`, `07-cross-cutting-concerns.md` (auth flow).
- Update auth diagram specs / flowcharts under `docs/diagram-specifications/` and `docs/flowcharts/` if they depict the login/refresh flow.

## Verification

- Backend: `npm run build` + `npm test`.
- Frontend: `npx tsc --noEmit -p tsconfig.json`.
- Manual:
  1. Login (remember + session variants).
  2. Let the access token expire (or shorten Supabase Auth JWT TTL in the dashboard).
  3. Return to the idle tab → no toast, page data reloads seamlessly.
  4. Verify Socket.IO reconnects with the fresh token.
  5. Verify logout clears both cookies.

## Notes / Out of Scope

- Session duration stays Supabase-default (1h access / long refresh TTL) — configurable later in the Supabase dashboard without code changes.
- `useCryptoPayment` deferred selector work and `RPC_permanent_fix.md` are untouched by this plan.
- This plan changes no code yet — pending review.
