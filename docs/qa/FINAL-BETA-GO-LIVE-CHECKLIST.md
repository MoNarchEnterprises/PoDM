# PoDM Final Production Beta Go-Live Checklist (Base Sepolia)

**Target Network**: Base Sepolia Testnet (Chain ID 84532)  
**Deployment Scope**: Production Beta Release  

---

## Pre-Deployment Code & Environment Checklist

- [x] **Decoupled Network Configuration**: Verify `CHAIN_NETWORK=testnet` in server environment file (`PoDM_project/.env` & deployment env).
- [x] **Node Runtime Environment**: Set `NODE_ENV=production` on hosting server.
- [x] **Smart Contract Configuration**: Verify contract address is set to `0xa8f480C42C6216a35a435424409d8e0932ee66e9` (Base Sepolia Proxy).
- [x] **USDC Contract Configuration**: Verify USDC contract address is set to `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia USDC).
- [x] **RPC Configuration**: Verify RPC URL points to `https://sepolia.base.org` or authorized Base Sepolia RPC.
- [x] **Frontend Environment Sanitation**: Verify `podm-frontend/.env` contains ONLY public `VITE_` variables. No service role or JWT secrets present.
- [x] **Pending Creator Access Control**: Verify `creatorOnly` middleware enforces `status === 'active'`.
- [x] **Client Random Hash Fallback Cleanup**: Verify `sendTip` and `createSubscription` in `podm-frontend/src/lib/apiClient.ts:616-635` require a non-empty `txHash`. Verified server enforces strict 64-hex format at `cryptoPayment.service.ts:124-126`.

---

## Build & Test Pipeline Checklist

- [x] **Backend Unit Test Execution**: Run `npm test` in `PoDM_project/` (100% Pass across 10 test suites / 48 tests).
- [x] **Smart Contract Bytecode Gate**: Run `npm run check:contract` in `PoDM_project/` (Verified ABI sync).
- [x] **Frontend Production Build**: Run `npm run build` in `podm-frontend/` (Completed cleanly without TypeScript or bundler errors).
- [x] **Backend Production Compilation**: Run `npm run build` in `PoDM_project/` (Compiles `tsc` clean to `dist/`).
- [x] **Autonomous QA Suite Execution**: Run `npx tsx scripts/run-autonomous-suite.ts` against live server.

---

## Deployment & Operational Verification Checklist

- [ ] **Database Migration Execution**: Verify Supabase schema is up to date with `add_crypto_fields.sql` and `referral_codes` table.
- [ ] **Server Process Startup**: Start server using `npm start` (`node dist/server/Server.js`).
- [ ] **Health Check Endpoint**: Query `GET /api/v1/health` and verify `status: "ok"`, `network: "testnet"`, `chainId: 84532`.
- [ ] **Audience Registration & Login Smoke Test**: Register new Audience account, log in, verify HttpOnly auth cookie / JWT token issuance.
- [ ] **Creator Onboarding & Approval Smoke Test**: Register new Creator, complete onboarding (`/users/me/onboarding`), verify pending status blocks `/creator/dashboard` access, approve creator in admin panel, verify active status grants full creator access.
- [ ] **Base Sepolia Payment Smoke Test**: Perform testnet USDC tip/subscription payment via MetaMask/Coinbase Wallet on Base Sepolia. Capture transaction hash on `sepolia.basescan.org`, call `/api/v1/payments/crypto/verify`, confirm `Cleared` transaction record in database.
- [ ] **Embedded ERC-4337 Wallet Smoke Test**: Create Privy embedded wallet, execute sponsored testnet transaction, verify receipt.
- [ ] **Monitoring & Logging Verification**: Verify Sentry error tracking and Winston logging are active.

---

## Emergency Protocol & Operational Safeguards

- **Rollback Plan**: In the event of a critical error during beta deployment, revert server environment to previous container revision or stop node process.
- **Base Sepolia Isolation Guarantee**: If `CHAIN_NETWORK` is accidentally modified or omitted, `getChainNetwork()` defaults to `'testnet'`. The application cannot silently execute Base Mainnet transactions.
