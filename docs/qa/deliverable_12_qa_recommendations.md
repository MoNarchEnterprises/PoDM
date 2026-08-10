# Deliverable 12: QA Recommendations

**Project**: PoDM Creator-Audience Platform  
**Date**: August 9, 2026  
**Role**: Capstone synthesis of Deliverables 1–11  
**Audience**: Engineering lead, tech lead, QA owner

---

## Diagnosis (Three Sentences)

PoDM has a functional application with ~6% verified test coverage across 317 identified gaps — not because the code is wrong, but because no systematic testing infrastructure was built alongside it. The highest-risk surface (payment verification, smart contract access control, referral fee integrity) has zero automated evidence of correctness, meaning the platform's financial guarantees rest entirely on manual review and deployment luck. The recommendations below describe the QA system — toolchain, process, architecture, and policy — needed to make that evidence exist and stay current.

---

## Domain Index

| # | Domain | Priority | Effort |
|---|---|---|---|
| [R1](#r1-structural-testability) | Structural Testability | 🔴 P0 | 2–3 days |
| [R2](#r2-toolchain) | Toolchain | 🔴 P0 | 1–2 days |
| [R3](#r3-cicd-pipeline-gates) | CI/CD Pipeline Gates | 🔴 P0 | 1 day |
| [R4](#r4-test-data--fixture-strategy) | Test Data & Fixtures | 🟠 P1 | 3–4 days |
| [R5](#r5-invariant-enforcement) | Invariant Enforcement | 🟠 P1 | 1–2 days |
| [R6](#r6-coverage-policy) | Coverage Policy | 🟠 P1 | 1 day |
| [R7](#r7-process--workflow) | Process & Workflow | 🟡 P2 | Ongoing |

---

## R1: Structural Testability

> The hardest thing to test is a service that owns its own dependencies. The following changes make the existing service layer testable without rewriting it.

### R1-1: Environment Guard on Startup

Several services silently fail or behave incorrectly when env vars are absent (D11/S14). Add a startup check:

```typescript
// PoDM_project/server/config/validateEnv.ts
const REQUIRED_ENV_VARS = [
    "BASE_RPC_URL",
    "BASE_CONTRACT_ADDRESS",
    "PLATFORM_TREASURY_ADDRESS",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_KEY",
    "R2_ENDPOINT",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
];

export function validateEnv(): void {
    const missing = REQUIRED_ENV_VARS.filter(k => !process.env[k]);
    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(", ")}\n` +
            `Refusing to start. Set these in .env or deployment config.`
        );
    }
}

// In server.ts — before any route registration
validateEnv();
```

**Why this matters**: D11 identified 7 config-dependent code paths with no CI check. A missing `BASE_CONTRACT_ADDRESS` means any contract address in tx logs passes validation — one misconfigured deployment away from payment fraud (D10/#30).

---

### R1-2: Wallet Service Runtime Assertion

The no-treasury-fallback rule (root AGENTS.md) has zero enforcement mechanism. Add a runtime assertion to `getCryptoWalletForUser`:

```typescript
// PoDM_project/server/services/wallet.service.ts
export async function getCryptoWalletForUser(userId: string): Promise<string> {
    try {
        const { data, error } = await supabase
            .from("profiles")
            .select("crypto_wallet_address")
            .eq("id", userId)
            .single();

        if (error || !data?.crypto_wallet_address) {
            return "";
        }

        const wallet = data.crypto_wallet_address;

        // INVARIANT: Never return the platform treasury address as a user wallet.
        // If this assertion fires, it indicates a data integrity issue (user was
        // assigned the treasury address). Fail safe: return empty string.
        if (
            process.env.PLATFORM_TREASURY_ADDRESS &&
            wallet.toLowerCase() === process.env.PLATFORM_TREASURY_ADDRESS.toLowerCase()
        ) {
            console.error(
                `[INVARIANT VIOLATION] getCryptoWalletForUser: user ${userId} ` +
                `has treasury address as wallet. Returning empty string.`
            );
            return "";
        }

        return wallet;
    } catch {
        return "";
    }
}
```

**Why this matters**: D9/WAL-01, D10/#4. The AGENTS.md rule has been in place; this makes it impossible to violate silently.

---

### R1-3: Make FFmpeg Path Configurable

D11/B9 identified a hardcoded WinGet FFmpeg path that breaks in Linux CI/CD containers:

```typescript
// Before (hardcoded, breaks on Linux):
ffmpeg.setFfmpegPath("C:\\Users\\...\\ffmpeg.exe");

// After (configurable, testable):
const ffmpegPath = process.env.FFMPEG_PATH;
if (!ffmpegPath) {
    throw new AppError(500, "FFMPEG_PATH environment variable not configured");
}
ffmpeg.setFfmpegPath(ffmpegPath);
```

Add `FFMPEG_PATH` to `validateEnv()` required vars. In CI, set `FFMPEG_PATH=$(which ffmpeg)`.

---

### R1-4: Enclave Commission Guard at Service Boundary

D8/S3-12 identified that admin can call the commission PATCH route for an Enclave creator with no hard rejection — only `getEffectiveCommissionRate()` silently overrides. Add an explicit guard:

```typescript
// PoDM_project/server/services/admin.service.ts → setCreatorCommission()
export async function setCreatorCommission(
    creatorId: string,
    commissionRate: number
): Promise<void> {
    const profile = await UserModel.findUserById(creatorId);
    if (!profile) throw new AppError(404, "Creator not found");

    if (profile.is_enclave_member) {
        throw new AppError(
            400,
            "Commission rate cannot be manually set for Enclave creators. " +
            "The Enclave rate is fixed at 10%."
        );
    }

    await UserModel.updateProfile(creatorId, { commission_rate: commissionRate });
}
```

This converts a silent override into an explicit rejection, making ADM-004 (D4) trivially testable.

---

### R1-5: Content Report Deduplication (Optional Hardening)

D8/S7-03 (downgraded to Medium — human review backstop). If admin queue noise becomes a problem operationally, add the constraint:

```sql
-- Migration: add_unique_report_per_user_content.sql
ALTER TABLE content_reports
    ADD CONSTRAINT unique_report_per_user_content
    UNIQUE (reporter_id, content_id);
```

**Do not treat this as P0** — the human review pipeline already provides the safety net. Apply only if report spam is observed at scale.

---

## R2: Toolchain

### R2-1: Hardhat (Smart Contract Testing)

D9 provides the full test suite. Wire it up:

```bash
# In PoDM_project/contracts/package.json (if not already present):
{
    "devDependencies": {
        "@nomicfoundation/hardhat-toolbox": "^5.0.0",
        "@openzeppelin/hardhat-upgrades": "^3.0.0"
    },
    "scripts": {
        "test": "hardhat test",
        "test:gas": "REPORT_GAS=true hardhat test",
        "test:coverage": "hardhat coverage"
    }
}
```

```javascript
// hardhat.config.ts — add coverage reporter
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";

export default {
    solidity: "0.8.20",
    networks: {
        hardhat: { forking: { url: process.env.BASE_MAINNET_RPC_URL } }  // optional: mainnet fork
    },
};
```

**Covers**: D10 Ranks #5–9 (all smart contract P0 items), D9/File 1 (45 test cases).

---

### R2-2: Jest Coverage Reporter

```json
// PoDM_project/jest.config.ts — add coverage config
{
    "collectCoverageFrom": [
        "server/**/*.ts",
        "!server/**/*.d.ts",
        "!server/tests/**"
    ],
    "coverageReporters": ["text", "lcov", "html"],
    "coverageDirectory": "coverage/",
    "coverageThresholds": {
        // Start low; ratchet up each sprint
        "global": {
            "branches": 20,
            "functions": 30,
            "lines": 30,
            "statements": 30
        },
        // Per-module overrides for highest-risk files
        "./server/services/wallet.service.ts": {
            "branches": 100,
            "functions": 100
        },
        "./server/services/cryptoPayment.service.ts": {
            "branches": 80,
            "functions": 100
        },
        "./server/services/referral.service.ts": {
            "branches": 80,
            "functions": 100
        }
    }
}
```

Run with: `npm test -- --coverage`

---

### R2-3: Solidity Coverage

```bash
# After Hardhat toolbox installed:
npx hardhat coverage
# Outputs: coverage/index.html with branch/line/function report
# Add to CI: if branch coverage < 90% for PoDMPaymentProtocol → fail
```

---

### R2-4: Security Scanning

```bash
# Dependency audit (backend + frontend):
npm audit --audit-level=high

# Slither (Solidity static analysis — catches reentrancy, access control):
pip install slither-analyzer
slither contracts/contracts/PoDMPaymentProtocol.sol \
    --exclude-dependencies \
    --print human-summary

# Key checks Slither runs automatically:
#   - Reentrancy (D8/S6-06)
#   - Unprotected functions (D8/S6-01–05)
#   - Integer overflow (Solidity 0.8.20 — not applicable but validates)
#   - Unchecked return values
```

---

### R2-5: Bundle Secret Scanning

```bash
# Install truffleHog or use grep:
# In CI, after frontend build:
grep -rE "(SUPABASE_SERVICE_KEY|service_role|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9+/])" \
    podm-frontend/dist/ \
    && echo "SECRET FOUND IN BUNDLE — FAIL" && exit 1 \
    || echo "Bundle clean"
```

Covers D10/#30, D8/S10-06.

---

## R3: CI/CD Pipeline Gates

> Every gate is a quality signal that runs without human intervention. The goal is: a broken test in CI is cheaper than a broken payment in production.

### Recommended Pipeline Structure

```yaml
# .github/workflows/ci.yml

jobs:
  # ── Gate 1: Fast feedback (< 2 min) ─────────────────────────────────────
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd PoDM_project && npm ci && npm run lint && npm run typecheck
      - run: cd podm-frontend && npm ci && npm run lint && npm run build

  # ── Gate 2: Unit + Integration tests (< 5 min) ──────────────────────────
  backend-tests:
    runs-on: ubuntu-latest
    env:
      BASE_RPC_URL: ${{ secrets.BASE_RPC_URL_TEST }}
      BASE_CONTRACT_ADDRESS: ${{ secrets.BASE_CONTRACT_ADDRESS }}
      # ... other required env vars
    steps:
      - run: cd PoDM_project && npm ci && npm test -- --coverage
      - name: Enforce coverage thresholds
        run: cd PoDM_project && npm test -- --coverage --ci  # fails if below threshold

  # ── Gate 3: Smart contract tests (< 3 min) ──────────────────────────────
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - run: cd PoDM_project/contracts && npm ci && npx hardhat test
      - name: Solidity coverage
        run: cd PoDM_project/contracts && npx hardhat coverage --solcoverjs .solcover.js

  # ── Gate 4: Security audit (< 1 min) ────────────────────────────────────
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - run: cd PoDM_project && npm audit --audit-level=high
      - run: cd podm-frontend && npm audit --audit-level=high
      - name: Bundle secret scan
        run: |
          cd podm-frontend && npm ci && npm run build
          grep -rE "service_role" dist/ && exit 1 || echo "Clean"
      - name: Env var validation (dry run)
        run: cd PoDM_project && node -e "require('./dist/config/validateEnv').validateEnv()"
        env:
          # All required vars must be present in CI secrets for this to pass

  # ── Gate 5: E2E tests (< 10 min, staging only) ──────────────────────────
  e2e-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.base_ref == 'staging'
    steps:
      - run: cd podm-frontend && npx playwright install --with-deps chromium
      - run: cd podm-frontend && npx playwright test --project=chromium

  # ── Gate 6: Slither (on PR to main) ─────────────────────────────────────
  solidity-static-analysis:
    runs-on: ubuntu-latest
    if: github.base_ref == 'main'
    steps:
      - uses: crytic/slither-action@v0.3.2
        with:
          target: PoDM_project/contracts/contracts/
          fail-on: high
```

### Gate Failure Policy

| Gate | Failure Response |
|---|---|
| Lint / typecheck | PR blocked — no merge |
| Backend unit tests | PR blocked |
| Coverage threshold decrease | PR blocked (ratchet: can only go up) |
| Smart contract tests | PR blocked |
| Solidity coverage < 90% | PR blocked on `main` merges |
| Security audit (critical/high CVE) | PR blocked |
| Bundle secret scan found | PR blocked + immediate alert |
| E2E failure | Merge to `main` blocked; `staging` advisory |
| Slither high-severity | PR blocked on `main` merges |

---

## R4: Test Data & Fixture Strategy

> Without reproducible test state, integration tests are non-deterministic. This section defines how test data is created, isolated, and cleaned up.

### R4-1: Supabase Shadow Database

Do not run integration tests against the production or staging Supabase project. Use a dedicated test project or local Supabase:

```bash
# Option A: Local Supabase (recommended for CI)
npx supabase start   # Spins up local PostgreSQL + Auth + API
npx supabase db reset --local  # Apply all migrations from scratch
# Set SUPABASE_URL=http://localhost:54321 in test env

# Option B: Supabase test project (separate project, separate anon/service keys)
# Stored in CI secrets as SUPABASE_TEST_URL, SUPABASE_TEST_SERVICE_KEY
```

---

### R4-2: Shared Test Fixtures

Create a `server/tests/fixtures/` directory with seeded data builders:

```typescript
// server/tests/fixtures/users.fixture.ts
export async function createTestFan(overrides = {}) {
    const { data: { user } } = await supabase.auth.admin.createUser({
        email: `fan-${Date.now()}@test.podm.app`,
        password: "TestPass123!",
        email_confirm: true,
    });
    await supabase.from("profiles").insert({
        id: user.id,
        email: user.email,
        username: `testfan_${Date.now()}`,
        role: "fan",
        status: "active",
        ...overrides,
    });
    return user;
}

export async function createTestCreator(overrides = {}) {
    // ... same pattern with role: 'creator', status: 'active'
}

export async function createEnclaveCreator(overrides = {}) {
    return createTestCreator({
        status: "active",
        is_enclave_member: true,
        enclave_joined_at: new Date().toISOString(),
        ...overrides,
    });
}

export async function cleanupUser(userId: string) {
    await supabase.auth.admin.deleteUser(userId);
    // Cascade cleans profiles, subscriptions, etc.
}
```

```typescript
// server/tests/fixtures/transactions.fixture.ts
export function buildClearedTxPayload(overrides = {}) {
    return {
        blockchain_tx_hash: "0x" + "a".repeat(64),
        status: "Cleared",
        type: "Subscription",
        amount_cents: 10_000,
        fan_id: "fan-test-id",
        creator_id: "creator-test-id",
        ...overrides,
    };
}

export function buildRPCReceipt(overrides = {}) {
    // Uses the buildReceipt() helper from D9/File 2
}
```

---

### R4-3: Blockchain Test Fixtures

```typescript
// contracts/test/fixtures/index.ts
export async function deployProtocol() {
    const [owner, treasury, keeper] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);

    const Protocol = await ethers.getContractFactory("PoDMPaymentProtocol");
    const protocol = await upgrades.deployProxy(Protocol, [treasury.address, 1250]);

    await protocol.setKeeper(keeper.address, true);
    return { protocol, usdc, owner, treasury, keeper };
}

export async function fundAndApprove(usdc, fan, protocolAddress, amount) {
    await usdc.mint(fan.address, amount);
    await usdc.connect(fan).approve(protocolAddress, amount);
}
```

---

### R4-4: Test Isolation Pattern

```typescript
// server/tests/helpers/dbIsolation.ts
export function withCleanDatabase(suite: () => void) {
    const createdUserIds: string[] = [];

    afterEach(async () => {
        // Clean up in reverse creation order
        for (const id of createdUserIds.reverse()) {
            await supabase.auth.admin.deleteUser(id).catch(() => {});
        }
        createdUserIds.length = 0;
    });

    return {
        trackUser: (id: string) => { createdUserIds.push(id); },
        suite,
    };
}
```

---

## R5: Invariant Enforcement

> Platform-level business rules from AGENTS.md must be enforced automatically, not just documented. Each invariant needs a test that fails if the rule is broken.

### The Three AGENTS.md Invariants That Need Tests

#### Invariant 1: Wallet No-Treasury-Fallback

```typescript
// server/tests/invariants/wallet.invariant.test.ts
describe("[INVARIANT] getCryptoWalletForUser never returns treasury address", () => {
    const TREASURY = process.env.PLATFORM_TREASURY_ADDRESS!;

    it("returns '' when wallet is null — not treasury", async () => {
        const result = await WalletService.getCryptoWalletForUser("no-wallet-user");
        expect(result).toBe("");
        expect(result).not.toBe(TREASURY);
    });

    it("returns '' on DB error — not treasury", async () => {
        supabase.from = jest.fn().mockImplementation(() => ({ 
            select: () => ({ eq: () => ({ single: () => ({ error: new Error("DB down"), data: null }) }) }) 
        }));
        const result = await WalletService.getCryptoWalletForUser("any-user");
        expect(result).not.toBe(TREASURY);
    });

    // Run this invariant check in EVERY test that calls WalletService
    // Use a global afterEach spy to catch treasury substitution
});
```

#### Invariant 2: Referral Fee Never Reduces Creator Payout

```typescript
// server/tests/invariants/referral.invariant.test.ts
describe("[INVARIANT] referral fee is carved from platform fee only", () => {
    it("creator payout is identical with and without referrer", async () => {
        const amountCents = 10_000;
        const platformFeeBps = 1250;

        const withoutReferrer = computeCreatorPayout(amountCents, platformFeeBps, 0);
        const withReferrer = computeCreatorPayout(amountCents, platformFeeBps, 100);

        expect(withReferrer).toBe(withoutReferrer);
    });
});
```

#### Invariant 3: Enclave Commission Always 10%

```typescript
// server/tests/invariants/enclave.invariant.test.ts
describe("[INVARIANT] Enclave creator effective commission is always 10%", () => {
    it("admin cannot override Enclave commission below 10%", async () => {
        await expect(
            AdminService.setCreatorCommission(enclaveCreatorId, 0.05)
        ).rejects.toThrow("Commission rate cannot be manually set for Enclave creators");
    });

    it("getEffectiveCommissionRate returns 10% regardless of stored rate", async () => {
        const rate = await getEffectiveCommissionRate(enclaveCreator);
        expect(rate).toBe(0.10);
    });
});
```

### Running Invariants in CI

```yaml
# Add to ci.yml as a separate job that always runs — not part of coverage thresholds
invariant-tests:
  runs-on: ubuntu-latest
  steps:
    - run: cd PoDM_project && npm test -- --testPathPattern="invariants" --verbose
  # These tests must ALWAYS pass — no exceptions, no exclusions
```

---

## R6: Coverage Policy

### Ratchet Strategy (Never Go Backwards)

```typescript
// jest.config.ts — coverage thresholds start where you are and increase
// Sprint 1: set to current baseline (approximately 6%)
// Sprint 2: increase after D9 tests are added (target ~35%)
// Sprint 3: increase after integration tests (target ~60%)
// Sprint 4: target 80%+ on critical paths

// NEVER lower a threshold once set. If a PR would lower it, the author
// must either add covering tests or explicitly justify the exception.
```

### Per-Module Targets (14-week horizon)

| Module | Current | 4-week | 14-week | Priority |
|---|---|---|---|---|
| `wallet.service.ts` | 0% | **100%** | 100% | P0 — invariant file |
| `cryptoPayment.service.ts` | 0% | **80%** | 95% | P0 — financial |
| `verification.service.ts` | 0% | **80%** | 95% | P0 — financial |
| `referral.service.ts` | 0% | **80%** | 90% | P0 — financial |
| `auth.middleware.ts` | 20% | 60% | 85% | P1 |
| `auth.service.ts` | 30% | 60% | 85% | P1 |
| `content.service.ts` | 0% | 30% | 75% | P1 |
| `subscription.service.ts` | 20% | 60% | 85% | P1 |
| `message.service.ts` | 0% | 30% | 70% | P1 |
| `contest.service.ts` | 0% | 40% | 80% | P2 |
| `notification.service.ts` | 0% | 40% | 75% | P2 |
| `admin.service.ts` | 0% | 30% | 70% | P2 |
| `PoDMPaymentProtocol.sol` | 0% | **90%** | 95% | P0 — financial |
| **Overall** | ~6% | ~35% | ~80% | — |

### Test Type Ratio Target

| Type | Current | Target (14-week) | Rationale |
|---|---|---|---|
| Unit (service logic) | ~15% of tests | **55%** | Service layer is highest risk; cheapest to write |
| Integration (DB/RPC/Storage) | ~20% of tests | **30%** | Verify contracts between components |
| E2E (Playwright) | ~65% of tests | **15%** | Expensive, slow; reserve for critical user flows only |

---

## R7: Process & Workflow

### R7-1: Definition of Done (Add to PR Template)

```markdown
## Test Checklist
- [ ] New service functions have unit tests covering happy path AND error/null return
- [ ] Any financial calculation has an invariant assertion (creator payout unchanged, etc.)
- [ ] Any state transition has a test for the transition AND the guard that prevents invalid transitions
- [ ] Any new env var is added to `validateEnv()` and CI secrets
- [ ] Coverage thresholds not decreased
- [ ] If touching `wallet.service.ts`, referral fee calculation, or commission logic:
      run `npm test -- --testPathPattern="invariants"` locally before pushing
```

---

### R7-2: Pre-Commit Hooks

```bash
# Install husky
npm i -D husky lint-staged
npx husky init

# .husky/pre-commit
#!/bin/sh
npx lint-staged

# package.json (root)
"lint-staged": {
    "PoDM_project/server/**/*.ts": [
        "eslint --fix",
        "jest --passWithNoTests --findRelatedTests"  # Run only tests related to changed files
    ],
    "podm-frontend/src/**/*.tsx": [
        "eslint --fix"
    ],
    "contracts/**/*.sol": [
        "npx solhint"  # Solidity linter
    ]
}
```

---

### R7-3: Security Review Trigger

Any PR touching the following files requires a second-reviewer security pass:

```
PoDM_project/server/middleware/auth.middleware.ts
PoDM_project/server/services/cryptoPayment.service.ts
PoDM_project/server/services/verification.service.ts
PoDM_project/server/services/referral.service.ts
PoDM_project/server/services/wallet.service.ts
PoDM_project/contracts/contracts/PoDMPaymentProtocol.sol
```

Add to `.github/CODEOWNERS`:
```
PoDM_project/server/services/cryptoPayment.service.ts @tech-lead @security-reviewer
PoDM_project/contracts/                               @tech-lead @security-reviewer
```

---

### R7-4: Production Monitoring Signals

Until test coverage reaches 80%, use these production signals as substitute coverage indicators:

| Signal | What It Detects | Action Threshold |
|---|---|---|
| Transaction `status='Pending'` older than 20 minutes | Async verification stuck or broken | Alert + manual review |
| Transaction `status='Failed'` spike | RPC connectivity or validation regression | Alert |
| Subscription count decrease without corresponding cancellations | Renewal filter bug or access revocation regression | Alert |
| Creator commission variance from expected (Enclave should be exactly 10%) | Enclave lock broken | Immediate alert |
| `crypto_wallet_address` field in notification containing treasury address | Wallet fallback violation | Immediate alert + incident |
| Report queue size grows faster than 3× normal rate | Report abuse spike | Advisory |
| Error rate spike on `/crypto-payments/verify` | Payment verification regression | Alert |

```typescript
// Add to admin analytics or a cron monitor:
// server/jobs/invariantMonitor.ts
export async function runInvariantMonitor() {
    // Check 1: No Enclave creator has effective commission ≠ 10%
    const enclaveCreators = await supabase
        .from("profiles")
        .select("id, commission_rate")
        .eq("is_enclave_member", true);

    for (const creator of enclaveCreators.data ?? []) {
        if (creator.commission_rate !== 0.10) {
            console.error(`[INVARIANT VIOLATION] Enclave creator ${creator.id} has commission ${creator.commission_rate}`);
            // Alert
        }
    }

    // Check 2: No subscription with fan_wallet_address = null is in active renewal queue
    // Check 3: Stale Pending transactions (> 20 min old)
}
```

---

## One-Page Quick Reference Card

```
╔══════════════════════════════════════════════════════════════════════════════╗
║              PoDM QA Quick Reference — Post D12                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  DO THIS NOW (Week 0-1):                                                     ║
║  1. Copy D9 test files → run npx hardhat test (covers Ranks #1–11)           ║
║  2. npm i express-rate-limit → 3 middleware lines (covers Rank #19)          ║
║  3. Add validateEnv() startup check (covers Rank #30 + 7 config gaps)        ║
║  4. Add wallet.service.ts runtime assertion (covers Rank #4 invariant)       ║
║  5. Add CI bundle secret grep (covers Rank #30)                              ║
║                                                                              ║
║  NEVER BREAK THESE (invariants):                                             ║
║  • getCryptoWalletForUser → always returns '' when null, never treasury      ║
║  • Referral fee → carved from platform fee only, never from creator payout   ║
║  • Enclave creators → effective commission always exactly 10%                ║
║  • processRenewal → only callable by registered keeper wallet                ║
║                                                                              ║
║  CI GATES (all must pass to merge):                                          ║
║  ✓ npm run lint && npm run typecheck                                          ║
║  ✓ npm test (backend) — coverage thresholds enforced                         ║
║  ✓ npx hardhat test (contracts)                                               ║
║  ✓ npm audit --audit-level=high (backend + frontend)                         ║
║  ✓ Bundle secret scan (no service key in dist/)                              ║
║  ✓ npm test -- --testPathPattern="invariants" (always)                       ║
║                                                                              ║
║  COVERAGE TARGETS:                                                           ║
║  4 weeks:  35% overall | wallet/payment/referral: 80%+ | contract: 90%+     ║
║  14 weeks: 80% overall | all financial services: 95%+  | contract: 95%+     ║
║                                                                              ║
║  SECURITY REVIEW REQUIRED FOR:                                               ║
║  auth.middleware.ts | cryptoPayment.service.ts | verification.service.ts    ║
║  referral.service.ts | wallet.service.ts | PoDMPaymentProtocol.sol           ║
║                                                                              ║
║  TEST FILES TO WRITE (in order):                                             ║
║  ① contracts/test/PoDMPaymentProtocol.test.ts        (D9/File 1 — 45 cases) ║
║  ② server/tests/payment.verification.test.ts         (D9/File 2 — 28 cases) ║
║  ③ server/tests/referral.fee.test.ts                 (D9/File 3 — 16 cases) ║
║  ④ server/tests/invariants/wallet.invariant.test.ts  (3 cases — always run) ║
║  ⑤ server/tests/content.access.test.ts               (D10 Ranks #13,14,20,21)║
║  ⑥ server/tests/idor.test.ts                         (D10 Ranks #15,16)     ║
║  ⑦ server/tests/rateLimit.test.ts                    (D10 Rank #19)         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Deliverable Series Complete

| Deliverable | Title | Status |
|---|---|---|
| D1 | Knowledge Confidence Report | ✅ |
| D2 | PoDM Feature Inventory | ✅ |
| D3 | Test Coverage Matrix | ✅ |
| D4 | Autonomous Test Scenario Suite | ✅ |
| D5 | Role/Permission Matrix | ✅ |
| D6 | State Transition Coverage | ✅ |
| D7 | Integration Test Matrix | ✅ |
| D8 | Security Test Suite | ✅ |
| D9 | Payment/Blockchain Test Suite | ✅ |
| D10 | Risk-Based Test Priority | ✅ |
| D11 | Coverage Gaps | ✅ |
| D12 | QA Recommendations | ✅ |

---

*Status: All 12 deliverables complete.*
