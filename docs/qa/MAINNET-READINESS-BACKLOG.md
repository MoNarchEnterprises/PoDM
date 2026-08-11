# PoDM Mainnet Readiness Backlog (Base Mainnet Deployment Requirements)

The items listed below do NOT block the controlled Base Sepolia testnet production beta, but MUST be addressed before deploying PoDM to Base Mainnet (Chain ID 8453) with real funds.

---

### 1. PostgreSQL Atomic RPC Transactions for Multi-Step Payment Writes
- **Category**: Data Integrity
- **Description**: Service-level operations (e.g. `verifyAndRecordBasePayment` updating transactions, referrals, and content stats) currently execute as sequential database calls. Before Base Mainnet release, refactor these multi-step operations into atomic PostgreSQL functions (RPC) or database triggers to guarantee ACID compliance.

### 2. Multi-Region RPC Fallback & Circuit Breaker
- **Category**: Reliability
- **Description**: The server currently connects to a single Base RPC URL. Mainnet deployment requires automatic failover and RPC node rotation (e.g., Alchemy -> Infura -> QuickNode).

### 3. Smart Contract Independent Audit & Formal Verification
- **Category**: Security / Smart Contracts
- **Description**: `PoDMPaymentProtocol.sol` (UUPS Proxy contract at `0xa8f480C42C6216a35a435424409d8e0932ee66e9`) must undergo a formal third-party smart contract audit prior to processing mainnet value transfers.

### 4. Automated Point-in-Time Recovery (PITR) & Snapshot Restoration Drills
- **Category**: Operational / Disaster Recovery
- **Description**: Formalize automated database snapshot procedures and conduct periodic restoration drills for high-availability mainnet operation.

### 5. Automated End-to-End Regression Pipeline in CI/CD
- **Category**: QA Automation
- **Description**: Integrate full Playwright UI end-to-end regression tests and contract deployment tests into GitHub Actions (`.github/workflows/ci.yml`).

### 6. Base Mainnet Liquidity & Gas Sponsorship Management
- **Category**: Smart Accounts / ERC-4337
- **Description**: Configure Pimlico Base Mainnet paymaster API keys, establish monthly sponsorship spending caps, and fund the mainnet platform treasury address.
