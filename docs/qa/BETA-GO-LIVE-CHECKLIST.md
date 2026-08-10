# PoDM Beta Go-Live Deployment Checklist

This practical checklist must be executed before, during, and immediately following the deployment of PoDM for testnet production beta testing.

---

## 1. Before Deployment (Pre-Flight Verification)

- [ ] **Network Configuration Guard**:
  - Verify `BLOCKCHAIN_NETWORK=testnet` or `BASE_TESTNET_CONTRACT_ADDRESS=0xa8f480C42C6216a35a435424409d8e0932ee66e9` in `PoDM_project/server/.env`.
  - Confirm `BASE_CONTRACT_ADDRESS` is NOT set to a mainnet address.
- [ ] **Frontend Secrets Scrub**:
  - Remove `SUPABASE_SERVICE_ROLE_KEY` and `JWT_SECRET` from `podm-frontend/.env`.
  - Confirm `VITE_BASE_TESTNET_CONTRACT_ADDRESS=0xa8f480C42C6216a35a435424409d8e0932ee66e9`.
- [ ] **Database & Migrations**:
  - Verify all 25 SQL migrations in `PoDM_project/migrations/` have been executed on the target Supabase project.
  - Verify Supabase RLS security policies are active.
- [ ] **Secrets & API Keys**:
  - Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (backend server only).
  - Verify `PIMLICO_API_KEY`, `PRIVY_APP_ID`, and `PRIVY_APP_SECRET`.
  - Verify `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`.
- [ ] **Code Fix Verification**:
  - Verify `creatorOnly` checks `status === 'active'`.
  - Verify `sendTip` requires explicit `txHash`.

---

## 2. Deployment Phase

- [ ] **Backend Server Deployment**:
  - Run TypeScript build: `npm run build` in `PoDM_project/`.
  - Start server process: `npm start` or Docker container deployment.
  - Verify health check endpoint returns 200 OK: `GET https://<api-domain>/health`.
- [ ] **Frontend Application Deployment**:
  - Run Vite production build: `npm run build` in `podm-frontend/`.
  - Deploy static output (`dist/`) to Netlify / Cloudflare Pages.
  - Verify SPA routing fallback (`/*` -> `/index.html`).

---

## 3. Immediately After Deployment (Smoke Test Sequence)

- [ ] **Health & Status Smoke Test**:
  - Execute `GET /health` and confirm database latency < 100ms and Base Sepolia RPC response `healthy`.
- [ ] **Authentication & User Profile**:
  - Register new Audience account.
  - Register new Creator account.
  - Log in and verify HttpOnly cookies (`authToken`, `authRefreshToken`) are set.
- [ ] **Wallet Connection**:
  - Connect MetaMask / Coinbase Wallet on Base Sepolia (Chain ID 84532).
  - Verify wallet status in settings shows manual address input + Web3 address.
- [ ] **Testnet Transaction Verification**:
  - Execute a testnet USDC tip ($1.00) using Base Sepolia testnet USDC (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`).
  - Verify transaction log in Supabase `transactions` table transitions to `status = 'Cleared'`.
  - Verify fee split: 87.5% Creator, 12.5% Platform (or 10% Enclave / 1% Referrer).

---

## 4. During Beta Monitoring

- [ ] Monitor Sentry error dashboard for unhandled exceptions.
- [ ] Monitor server logs for `[VerificationService] On-chain receipt not found` or `RPC connection failed`.
- [ ] Monitor Supabase database connection pool metrics.

---

## 5. Emergency Pause / Cut-off Procedures

If a critical issue occurs during beta (e.g. state corruption or unexpected behavior):
1. **Disable Payments**: Set `VITE_ENABLE_EMBEDDED_WALLET=false` or disable payment routes via feature flag.
2. **Revoke Impersonation**: Temporarily set `ALLOW_ADMIN_IMPERSONATION=false`.
3. **Rollback Deployment**: Revert frontend/backend host to previous stable commit.
