# PoDM Production Beta — Mandatory Blockers List

The following issues MUST be resolved prior to launching the controlled testnet beta.

---

### 1. `[BLOCKER-01]` Production Environment Node Network Fallback Trap
- **Location**: [`PoDM_project/server/utils/contract.utils.ts`](file:///c:/Users/leona/Documents_local/PoDM/PoDM/PoDM_project/server/utils/contract.utils.ts#L19-L27)
- **Problem**: Setting `NODE_ENV=production` causes `contract.utils.ts` to switch default `chainId` to Base Mainnet (8453) and default RPC to `https://mainnet.base.org`.
- **Remediation**:
  Modify `contract.utils.ts` to inspect an explicit `BLOCKCHAIN_NETWORK` environment variable:
  ```typescript
  const isProd = process.env.NODE_ENV === 'production' && process.env.BLOCKCHAIN_NETWORK === 'mainnet';
  ```

---

### 2. `[BLOCKER-02]` Unverified Integration Claims Due to Test Harness Mocking
- **Location**: [`tests/autonomous/helpers/runner.helper.ts`](file:///c:/Users/leona/Documents_local/PoDM/PoDM/tests/autonomous/helpers/runner.helper.ts)
- **Problem**: The autonomous test suite executes in-memory mocks rather than live HTTP requests against the backend REST API, database, and smart contract.
- **Remediation**:
  Run backend Jest integration suite (`auth.integration.test.ts`, `ppv_subscription.test.ts`) against a running Express backend and database instance before declaring live test readiness.
