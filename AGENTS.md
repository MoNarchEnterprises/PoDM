# DOX framework

- DOX is highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits

## Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it

## Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

## Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:
- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

## User Preferences

When the user requests a durable behavior change, record it here or in the relevant child AGENTS.md

- Platform users are referred to as **Audience** (not "Fans") in all user-facing text
- `getCryptoWallet` must never fallback to platform treasury address — returns empty string when no wallet is configured
- Wallet linking in settings must always provide a manual address text input (not only browser wallet connect)

## Child DOX Index

| Path | AGENTS.md | Scope |
|---|---|---|
| `PoDM_project/` | [PoDM_project/AGENTS.md](PoDM_project/AGENTS.md) | Backend — Express API, business logic, database, payments, storage, real-time, auth, smart contracts |
| `podm-frontend/` | [podm-frontend/AGENTS.md](podm-frontend/AGENTS.md) | Frontend — React UI, features, routing, styling, E2E tests |

### Non-code directories (indexed here, no child AGENTS.md)

| Path | Contents |
|---|---|
| `.github/workflows/` | CI/CD pipeline — GitHub Actions (build + test backend, lint + build frontend) |
| `.agent/` | AI agent workflow specifications |
| `.idx/` | Google Project IDX workspace config |
| `docs/qa/` | QA specification documents (Deliverables 1–12, IMPLEMENTATION.md, FINAL-BETA-READINESS-AUDIT.md, FINAL-BETA-READINESS-SUMMARY.md, FINAL-BETA-GO-LIVE-CHECKLIST.md, REMAINING-BLOCKERS.md) |
| `tests/autonomous/` | Autonomous QA Test Suite (domain test suites, test helpers, runner) |
| `qa-results/` | Generated QA test run reports, summary, coverage, failures, and evidence (git-ignored) |

### Git-ignored workspaces (not versioned, local-only)

- `PoDM_Marketing/` — marketing strategy, target creator leads, outreach scripts, agency one-pagers, and campaign artifacts. Git-ignored; local-only.
- `security/` — blockchain security assessment workspace (recon, static analysis, invariants, findings triage, reports) plus the executable adversarial suites and hostile fixtures: `hardhat.config.ts` (security-scoped, fixtures merged via subtask override), `fixtures/` (`MaliciousV2.sol`, `ReentrantToken.sol`), `tests/hardhat/` (`attackTests.test.ts` 36 tests, `findingsReproduction.test.ts` 19 tests, `propertyTests.test.ts` deterministic stateful fuzz + reachability suite — invariants G1..G6 + R-A01..R-A06; knobs `PROPERTY_ITERS`/`PROPERTY_CALLS`/`PROPERTY_SEED`), `invariants/` (Foundry placeholders mirroring the runnable G1..G6 suite), `results/` (generated run output), `reports/invariant-testing.md` (property-testing method + invariant results), and the `contracts/` + `node_modules/` junctions to the PoDM contracts workspace. Run with `.\security\run-hardhat-tests.ps1` (`-Suite attack|reproduction|all`); `all` auto-includes the property suite. Git-ignored wholesale; stays on disk but is never pushed. Not indexed as a child DOX because nothing there is versioned.
- `Blockchain Security Findings/` — root-level blockchain security test plan, attack surface, attack scenarios, contract security matrix, wallet security, security invariants, and remediation verification documents. Git-ignored; local-only.
- Security assessment build/test outputs (`PoDM_project/contracts/artifacts/`, `PoDM_project/contracts/cache/`, `PoDM_project/contracts/typechain-types/`, frontend `test-results/`, `playwright-report/`) are git-ignored; the hostile fixtures and Hardhat attack/reproduction suites now live under the git-ignored `security/` workspace, not in the project tree.

### Root-owned scope

The root AGENTS.md owns project-wide rules that apply across all subtrees:

- DOX framework and hierarchy enforcement
- Docker Compose orchestration (root `docker-compose.yml`)
- Netlify deployment config (`netlify.toml`)
- Root-level tools and assets (CSV data, Instagram scripts, database reference docs, `cookies.json`, `secret.txt`, `debug-login.ps1`, `get-token.ps1`, `test-notifications.ps1`, `scripts/run-autonomous-suite.ts`)
- Planning documents (MVP_Checklist.md, PoDM Planning Document.txt, GEMINI.md, RPC_permanent_fix.md, content_and_gallery_fix.md, ppv_attach_modal_fix.md, creator_views_fix.md, session_refresh_fix.md, crypto_payment_fix_plan.md, TYPESCRIPT_ERRORS_SOLUTION.md, report_content_fix.md, production_network_trap_fix_plan.md, client_fake_hash_fix_plan.md, ffmpeg_path_fix.md, `PoDM_project/contracts/GOVERNANCE.md` — H-05/M-03 trust-model decision record: 5-role AccessControl split + upgrade-timelock; closeout criteria; storage-incompatibility with the legacy single-owner proxy)
- Verification reports (DATABASE_MIGRATION_REPORT.md — live-DB migration application evidence for blocker R-07; DEPLOYMENT_RECONCILIATION.md lives in the git-ignored `security/reports/`)
- Root `package.json` & `tsconfig.json`
- `.gitignore`, `.git/`, `.github/`
