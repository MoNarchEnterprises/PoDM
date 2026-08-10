# PoDM Mainnet Readiness Backlog (Deferred From Beta)

The items listed below are non-blocking for controlled testnet beta, but MUST be addressed before deploying to Base Mainnet with real funds.

---

### 1. Lack of Multi-Step ACID Database Transactions
- **Category**: Data Integrity
- **Description**: Service-level operations (e.g. `verifyAndRecordBasePayment` updating transactions, referrals, and content stats) run as isolated HTTP REST calls. Must be refactored to PostgreSQL atomic RPC transactions or Supabase database triggers before mainnet.

### 2. Multi-Region RPC Fallback & Circuit Breaker
- **Category**: Reliability
- **Description**: Current RPC calls in `cryptoPayment.service.ts` and `verification.service.ts` use a single `rpcUrl` string. Mainnet deployment requires RPC fallback rotation (e.g., Alchemy -> Infura -> QuickNode).

### 3. Automated Database Point-in-Time Recovery (PITR) Strategy
- **Category**: Operational / Backup
- **Description**: Backup retention relies on cloud provider defaults. Formalized automated snapshot verification scripts must be established.

### 4. Smart Contract Audit & Formal Verification
- **Category**: Security / Smart Contracts
- **Description**: `PoDMPaymentProtocol.sol` should undergo an independent third-party smart contract audit prior to mainnet value transfer.

### 5. Automated E2E Regression Pipeline in CI/CD
- **Category**: QA Automation
- **Description**: Frontend Playwright E2E tests and contract Hardhat tests should be fully integrated into GitHub Actions (`.github/workflows/ci.yml`).
