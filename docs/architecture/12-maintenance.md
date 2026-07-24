# Documentation Maintenance Guide

**File:** `docs/architecture/12-maintenance.md`
**Purpose:** Which documentation artifacts to regenerate after common codebase changes, how to do it incrementally, and what to check per PR.
**Related Documents:** [09-quality-report.md](09-quality-report.md), [08-diagram-index.md](08-diagram-index.md), [00-session-notes.md](00-session-notes.md)
**Current counts:** 16 architecture docs, 55 generated flowcharts, 11 existing diagrams, 59 diagram-spec JSON, 149 total doc files, 39 internal workflows, 46 user journeys, 22 business capabilities, 15 data-flow features

---

## 1. Artifact Dependency Graph

```
Source Code
  │
  ├─ Backend (.ts, .sol)  ← 16 routes, 16 controllers, 17 services, 13 models, 4 middleware, 12 utils, 1 job, 1 contract
  │   │
  │   ├──► 01-repository-inventory.md   (file counts, LOC per directory)
  │   ├──► 02-dependency-map.md         (route tables, middleware chains, inter-service edges, bypasses)
  │   ├──► 03-architecture-kb.md        (17-section module specs for all layers)
  │   ├──► 04-business-capabilities.md  (22 capabilities → module/endpoint mapping)
  │   ├──► 05-user-journeys.md          (46 journeys, 5 actor types — endpoint-level steps)
  │   ├──► 08-crypto-deep-dive.md       (smart contract, crypto service, on-chain verification)
  │   ├──► 10-internal-workflows.md     (39 service-level workflow sequences, 7-section format)
  │   ├──► 07-data-flow.md              (15 features × 10-step lifecycle, sensitivity markers)
  │   ├──► 07-cross-cutting-concerns.md (12 cross-cutting areas, 14-item risk matrix)
  │   └──► flowcharts/ (001–055 covering categories C–G, I–K)
  │
  ├─ Frontend (.tsx, .ts)  ← 101 source files, 46 feature files, 30 components, 9 hooks
  │   │
  │   ├──► 01-repository-inventory.md   (file counts, LOC per feature directory)
  │   ├──► 05-user-journeys.md          (UI-side journey steps per actor)
  │   ├──► 06-frontend-architecture.md  (component tree, route table, hooks, API client, state layers)
  │   ├──► 07-cross-cutting-concerns.md (API integration patterns, error handling, auth context)
  │   └──► flowcharts/ (H-category: journeys, RBAC, maturity)
  │
  ├─ Database (migrations)  ← 17 migration files (11 root + 6 in scripts/)
  │   │
  │   ├──► 01-repository-inventory.md   (migration count, table/enum inventory)
  │   ├──► 02-dependency-map.md         (model-to-table mapping, raw query sites)
  │   ├──► 03-architecture-kb.md        (model query interfaces per table)
  │   ├──► docs/diagrams/02-database-entity-relationships.md
  │   └──► flowcharts/040-i03-database-migration-timeline.md
  │
  ├─ Smart Contract (.sol)  ← PoDMPaymentProtocol (147 lines, Solidity 0.8.20)
  │   │
  │   ├──► 08-crypto-deep-dive.md       (contract structure, 5 events, 3 payment functions, security)
  │   ├──► 03-architecture-kb.md        (Layer 9 — smart contract reference)
  │   └──► flowcharts/013-c08-smart-contract-structure.md, 046-j05-crypto-security-gap-heatmap.md
  │
  ├─ Test Files  ← 3 backend Jest, 1 frontend Jest, 5 Playwright E2E = 9 total
  │   │
  │   ├──► 09-testing-monitoring.md     (coverage maps, gap analysis by layer)
  │   └──► flowcharts/047-k01-test-coverage-gap-map.md, 048-k02-e2e-test-journey-coverage.md
  │
  ├─ Config / Infra (Docker, CI, Netlify, .env, 20+ env vars)
  │   │
  │   ├──► 07-cross-cutting-concerns.md (§8 deployment, §9 CI/CD, §11 config management)
  │   ├──► 02-dependency-map.md         (external integration configs, inline Stripe init sites)
  │   └──► flowcharts/002-a05-env-config-map.md, 039-i02-docker-architecture.md, 041-i04-build-deploy.md
  │
  └─ Generated Diagrams (docs/diagrams/ + docs/flowcharts/)
      └──► 08-diagram-index.md          (status tracking, category counts, module references)

Doc-to-doc dependency order (rebuild in this direction):
  01-repository-inventory        foundational — feeds all
       ↓
  02-dependency-map              layer structure → 03-architecture-kb, 07-cross-cutting-concerns
       ↓
  03-architecture-kb             feeds 04, 05, 06, 07, 10, 07-data-flow
  04-business-capabilities ─────→ 05-user-journeys (capability-to-journey mapping)
  05-user-journeys ─────────────→ 10-internal-workflows (journeys reference workflow IDs)
  06-frontend-architecture ─────→ 07-cross-cutting-concerns, 05-user-journeys
       ↓
  07-cross-cutting-concerns ────→ 07-data-flow (risks, data categories)
  08-crypto-deep-dive ─────────→ 07-cross-cutting-concerns, 10-internal-workflows, 07-data-flow
       ↓
  10-internal-workflows ────────→ 07-data-flow (workflow steps inform data lifecycle)
  09-testing-monitoring ────────→ 05-user-journeys (E2E coverage gaps)
       ↓
  08-diagram-index               aggregates all diagram statuses
  09-quality-report              audits all docs against source
```

---

## 2. Change Impact Matrix

### 2.1 Adding a Feature

| If you add… | Regenerate these docs | Update these | Verify |
|---|---|---|---|
| New backend route group | `02-dependency-map.md` (route table + middleware chain), `03-architecture-kb.md` (new route + controller + service §) | `01-repository-inventory.md` (file count), `05-user-journeys.md` (add journeys), `10-internal-workflows.md` (add workflows), `07-data-flow.md` (add feature lifecycle) | Endpoint count, middleware assignments, response shapes |
| New controller + service | `02-dependency-map.md` (layer table, inter-service edges, controller bypasses), `03-architecture-kb.md` (full 17-section module spec) | `01-repository-inventory.md` (count), `10-internal-workflows.md` (workflows from new service), `07-data-flow.md` (data lifecycle) | Controller→service→model chain, error handling, failure modes |
| New model / table | `02-dependency-map.md` (model table, service→model edges), `03-architecture-kb.md` (model query interface in affected layer) | `01-repository-inventory.md` (model count), `docs/diagrams/02-database-entity-relationships.md` (ER diagram), `flowcharts/040-i03` (if new migration) | Foreign keys, enum additions, column types, migration order |
| New frontend feature module | `06-frontend-architecture.md` (component table, routes, API functions, LOC), `05-user-journeys.md` (new journeys) | `01-repository-inventory.md` (file count), `07-cross-cutting-concerns.md` (if new integration or error pattern) | Route guard consistency, lazy loading, API function count |
| New page / route | `06-frontend-architecture.md` (route table, lazy-loading count, LOC) | `05-user-journeys.md` (add steps), `docs/diagrams/08-frontend-component-tree.md` (if new layout) | Role guard, layout wrapper, import correctness |

### 2.2 Removing a Feature

| If you remove… | Regenerate these docs | Update these | Verify |
|---|---|---|---|
| Backend endpoint(s) | `02-dependency-map.md` (route table count), `05-user-journeys.md` (remove/truncate affected journeys) | `03-architecture-kb.md` (strike handler from module spec), `10-internal-workflows.md` (remove or deprecate workflow), `07-data-flow.md` (deprecate feature) | No remaining imports, controller cleanup |
| Entire service | `02-dependency-map.md` (layer table, edges, bypasses), `04-business-capabilities.md` (remove or reassign capability) | `01-repository-inventory.md` (file count, LOC), `07-cross-cutting-concerns.md` (remove integration refs), `08-crypto-deep-dive.md` (if crypto-related) | Controller referencing removed service, dead code |
| Frontend module | `06-frontend-architecture.md` (component list, route table, LOC, API function list) | `01-repository-inventory.md` (file count), `05-user-journeys.md` (remove affected journeys) | Dead API calls, orphaned imports, stale routes |
| E2E test(s) | `09-testing-monitoring.md` (coverage table, file count, gap analysis) | `08-diagram-index.md` (if K-category diagram affected) | CI workflow remains valid |
| Solidity function | `08-crypto-deep-dive.md` (contract spec, event signatures, gap analysis) | `03-architecture-kb.md` (Layer 9), `flowcharts/013-c08`, `flowcharts/046-j05` | Backend parsing code aligned |

### 2.3 Database Changes

| If you change… | Regenerate these docs | Update these | Verify |
|---|---|---|---|
| New migration | `01-repository-inventory.md` (migration count) | `docs/diagrams/02-database-entity-relationships.md` (ER diagram), `flowcharts/040-i03` (Gantt timeline), `03-architecture-kb.md` (new model spec if new table) | Column types, foreign key naming, enum additions |
| Column rename / type change | `03-architecture-kb.md` (affected model specs), `08-crypto-deep-dive.md` (if transaction/subscription), `07-data-flow.md` (affected feature steps) | All docs referencing the changed field name | All query references in service files |
| Table drop | `02-dependency-map.md` (model table), `03-architecture-kb.md` (strike spec), `04-business-capabilities.md` (if capability affected), `10-internal-workflows.md` (affected workflows) | `01-repository-inventory.md` (model count), `08-diagram-index.md` (if references table) | Cascade deletes, removed imports |
| Enum value change | `03-architecture-kb.md` (enum references in affected layers), `10-internal-workflows.md` (if workflow branches on enum) | `07-data-flow.md` (state transitions depending on enum values) | Middleware role checks, frontend equality comparisons |

### 2.4 New API

| If you add… | Regenerate these docs | Update these | Verify |
|---|---|---|---|
| New route endpoint | `02-dependency-map.md` (route table, middleware chain), `03-architecture-kb.md` (route module spec) | `01-repository-inventory.md` (endpoint count), `05-user-journeys.md` (add journey steps), `10-internal-workflows.md` (add workflow), `07-data-flow.md` (add lifecycle steps) | Middleware correctness, response shape, error codes |
| New external API integration | `02-dependency-map.md` (edges table, integration list), `03-architecture-kb.md` (new config module), `07-cross-cutting-concerns.md` (new integration section) | `08-diagram-index.md` (A-category refresh), `docs/diagrams/01-system-architecture.md` (C4), `docs/diagrams/10-service-dependency-matrix.md` | API key handling, error propagation, timeout config |
| New API route in frontend | `06-frontend-architecture.md` (apiClient functions, route table) | `05-user-journeys.md` (UI-side steps), `07-cross-cutting-concerns.md` (if new error pattern) | Response type alignment with backend |

### 2.5 UI Changes

| If you change… | Regenerate these docs | Update these | Verify |
|---|---|---|---|
| Add / remove component | `06-frontend-architecture.md` (component table, LOC) | `01-repository-inventory.md` (file count), `docs/diagrams/08-frontend-component-tree.md` | Import chain, prop interface, layout nesting |
| Add / remove route | `06-frontend-architecture.md` (route table, lazy-loading count) | `05-user-journeys.md` (add/remove journey), `07-cross-cutting-concerns.md` (if route guard changes) | Role guard assignment, layout wrapper, App.tsx |
| Add / remove hook | `06-frontend-architecture.md` (hook list, LOC, usage call graph) | `09-testing-monitoring.md` (if test added for hook) | Hook interface, return type, re-render impact |
| Change API client layer | `06-frontend-architecture.md` (apiClient function list, interceptor chain) | `07-cross-cutting-concerns.md` (error handling, 401 clearing), `05-user-journeys.md` (if visible error handling changes) | Axios interceptor chain, error toast integration |

### 2.6 Authentication Changes

| If you change… | Regenerate these docs | Update these | Verify |
|---|---|---|---|
| New auth middleware / role | `02-dependency-map.md` (middleware chain tables, bypass audits), `03-architecture-kb.md` (middleware module spec) | `07-cross-cutting-concerns.md` (§2 auth/security), `06-frontend-architecture.md` (route guards), `flowcharts/004-b04-route-auth-matrix.md` | All route middleware chains, frontend guard components |
| New JWT claim / token format | `03-architecture-kb.md` (auth module, token format), `07-data-flow.md` (§1 auth data flow) | `07-cross-cutting-concerns.md` (§2 JWT security), `flowcharts/003-b03-auth-token-lifecycle.md` | Backend `protect` middleware, frontend `useAuth.tsx`, apiClient interceptor |
| New auth provider (e.g., OAuth) | `02-dependency-map.md` (external integration list), `05-user-journeys.md` (new auth journeys) | `03-architecture-kb.md` (auth service spec), `07-cross-cutting-concerns.md` (§2, §11 config), `docs/diagrams/03-auth-sequence.md`, `docs/diagrams/01-system-architecture.md` | Provider SDK integration, error handling, token storage |
| Impersonation logic change | `07-cross-cutting-concerns.md` (§2 impersonation), `05-user-journeys.md` (§I-01) | `docs/diagrams/07-impersonation-flow.md`, `flowcharts/050-b07-admin-impersonation-internal-flow.md`, `03-architecture-kb.md` (auth middleware) | X-Impersonating-User-Id header propagation, banner display |
| Email verification / password flow | `05-user-journeys.md` (A-03, A-04 auth journeys), `10-internal-workflows.md` (#23 orphan cleanup, #25 password reset) | `flowcharts/005-b05-auth-orphan-cleanup-flow.md`, `flowcharts/006-b06-password-reset-flow.md`, `03-architecture-kb.md` (auth module) | Email service wiring, redirect URL consistency |

### 2.7 AI Agent Changes

| If you change… | Regenerate these docs | Update these | Verify |
|---|---|---|---|
| AI model / provider | `03-architecture-kb.md` (AI service module spec), `07-cross-cutting-concerns.md` (§4 external integrations) | `07-data-flow.md` (§9 AI caption data flow), `10-internal-workflows.md` (#3 caption generation), `flowcharts/017-d05-ai-caption-generation-flow.md` | API key prefix logic (OpenAI vs OpenRouter), model name, response format |
| AI caption endpoint logic | `10-internal-workflows.md` (#3 caption generation), `07-data-flow.md` (§9) | `03-architecture-kb.md` (AI controller, prompt format), `09-testing-monitoring.md` (if test added) | Input validation, NSFW pre-check, error handling |
| Bulk upload / AI integration | `06-frontend-architecture.md` (BulkUploadPage, DraftCard), `05-user-journeys.md` (#C-34 bulk upload) | `10-internal-workflows.md` (#7 content upload), `flowcharts/019-d07-bulk-upload-pipeline.md`, `flowcharts/017-d05` | Rate limiting, concurrent request handling |

### 2.8 Infrastructure Changes

| If you change… | Regenerate these docs | Update these | Verify |
|---|---|---|---|
| Docker / docker-compose | `07-cross-cutting-concerns.md` (§8 local dev), `flowcharts/039-i02-docker-architecture.md` | `02-dependency-map.md` (if service added/removed), `09-testing-monitoring.md` (if test container added) | Port mappings, volume mounts, environment variables |
| CI/CD pipeline | `07-cross-cutting-concerns.md` (§9 CI/CD), `docs/diagrams/09-deployment-cicd.md` (shared I-01 / A-03) | `09-testing-monitoring.md` (if test stage changes), `08-diagram-index.md` (if job structure changes) | Job dependencies, secret injection, artifact paths |
| Deployment target (add/remove) | `07-cross-cutting-concerns.md` (§8 deployment), `docs/diagrams/01-system-architecture.md` (C4) | `03-architecture-kb.md` (if new config), `02-dependency-map.md` (edges to new platform) | Environment variables, CORS origins, SPA redirect rules |
| Environment variable changes | `07-cross-cutting-concerns.md` (§11 config), `flowcharts/002-a05-env-config-map.md` | `03-architecture-kb.md` (affected module init sections), `08-crypto-deep-dive.md` (RPC URL, contract address) | .env consistency, frontend-vs-backend exposure |
| Monitoring / logging addition | `09-testing-monitoring.md` (§6–7 monitoring), `flowcharts/049-k03-monitoring-gap-diagram.md` | `07-cross-cutting-concerns.md` (§10 logging), `03-architecture-kb.md` (affected module failure modes) | PII leakage, structured log format |
| Database host / Supabase change | `03-architecture-kb.md` (config modules, supabaseClient), `02-dependency-map.md` (external integrations) | `07-cross-cutting-concerns.md` (§11 config), `docs/diagrams/01-system-architecture.md` | Connection pooling, SSL/TLS, migration order |
| Netlify / Cloudflare Pages change | `07-cross-cutting-concerns.md` (§8 deployment), `flowcharts/041-i04-build-deploy.md` | `06-frontend-architecture.md` (§8 build config), `docs/diagrams/09-deployment-cicd.md` | Build command, environment variables, redirects |

---

## 3. Incremental Regeneration Workflow

### 3.1 Principles

1. **Regenerate from source, never guess.** Every doc was derived from reading actual source files. Re-read the changed source, don't patch the doc by memory.
2. **Update dependent docs in order.** Follow the dependency arrows in §1: `01-inventory` → `02-deps` → `03-kb` → ... → `08-index`.
3. **Touch only affected files.** Use §2 to scope the work. Do NOT rewrite an entire doc for a one-line change.
4. **Prove counts.** Anytime you see a number (routes, models, endpoints, LOC, files), recount from source.
5. **Verify after regeneration.** Cross-reference counts, names, routes, and types against the changed source before moving on.

### 3.2 Workflow Steps

```
[1] Identify change type
    └─ Adding/removing a feature? DB change? New API? Auth? UI? Infra?
    ↓
[2] Consult §2 Change Impact Matrix → list affected doc files
    └─ Write the file list down — these are your regeneration targets
    ↓
[3] Order the list by §1 dependency graph (rebuild bottom-up)
    └─ 01 → 02 → 03 → (04,05,06) → (07,08,09,10) → 07-data-flow → 08-diagram-index
    ↓
[4] For each affected doc:
    a. Read the current file
    b. Read the changed source files side by side
    c. Edit only the affected sections (do NOT rewrite the entire doc)
    d. Update metadata: date, version, confidence level if applicable
    ↓
[5] For diagram files (Mermaid in docs/flowcharts/ or docs/diagrams/):
    a. Read the corresponding prompt in flowchart-prompts-*.md (if applicable)
    b. Update the prompt to reflect the source change
    c. Regenerate the Mermaid diagram from the updated prompt or directly
    d. Validate Mermaid syntax (see §3.4 validation rules)
    ↓
[6] Update aggregate / index files:
    a. 01-repository-inventory.md — if file counts, LOC, or migration count changed
    b. 08-diagram-index.md — if diagram status, category totals, or references changed
    c. 09-quality-report.md — if a full audit was needed (see §3.5)
    ↓
[7] Update 00-session-notes.md with:
    a. What changed and why
    b. Which docs were regenerated
    c. Any new findings, assumptions, or technical debt discovered
    ↓
[8] Run DOX pass:
    a. Re-check changed paths against the DOX chain
    b. Update nearest owning AGENTS.md if scope or rules changed
    c. Refresh Child DOX Index entries if files were added/moved/removed
    ↓
[9] Final verification:
    a. Cross-reference endpoint counts, middleware chains, role assignments
    b. Check Mermaid syntax on regenerated diagrams
    c. Verify all cross-document references resolve
    d. Run lint/typecheck if code was also changed
```

### 3.3 Quick Reference: Minimal vs Full Regeneration

| Scenario | Files to touch |
|---|---|
| New endpoint (existing route group) | `02-deps` (update route table count), `03-kb` (add handler to module spec), `10-workflows` (add workflow) |
| New route group | Above + `01-inventory` (file count), `05-journeys` (journeys), `06-frontend` (API functions), `07-data-flow` (new §) |
| New model | `01-inventory` (model count), `02-deps` (model table), `03-kb` (model spec), ER diagram, `08-index` (if referenced) |
| New external integration | `02-deps` (edges), `03-kb` (config module), `07-cross-cutting` (new integration §), C4 diagram, service dep diagram |
| UI component addition | `06-frontend` (component table + LOC), component tree diagram |
| Auth middleware change | `02-deps` (route middleware chains), `07-cross-cutting` (§2 security), auth matrix flowchart |
| Deployment config change | `07-cross-cutting` (§8–9), deployment diagram, Docker diagram, build diagram |
| AI model swap | `03-kb` (AI service spec), `07-cross-cutting` (§4 integration), `10-workflows` (#3), `07-data-flow` (§9), caption diagram |
| Database migration | `01-inventory` (migration count), ER diagram, migration timeline diagram (if new file) |
| Test file change | `09-testing-monitor` (coverage data), test gap diagram, E2E coverage diagram |
| **Full project audit** | Every doc listed in §1, regenerate `09-quality-report.md` (see §3.5) |

### 3.4 Mermaid Syntax Validation Rules

After regenerating any Mermaid diagram, check:

| Rule | Check |
|---|---|
| Subgraphs | Every `subgraph` has a matching `end` |
| Alt/loop blocks | Every `alt`, `loop`, `opt` has a matching `end` |
| Participants | All participants declared with `participant X as "Label"` |
| Arrows (sequence) | `->>` for solid, `-->>` for dotted, no bare `-->` in sequence |
| Arrows (flowchart) | `-->` for solid, `-.-` for dotted, `===` for thick, no `&` multi-target chains |
| Node IDs | No spaces in unquoted node IDs |
| State transitions | `state1 --> state2 : label` with correct colon placement |
| C4 | `C4Context` with proper `Person()`, `System()`, `System_Ext()` nesting |
| Journey | `title`, `section`, and task lines with proper `|label|value|` format |
| Gantt | `title`, `dateFormat`, `section`, and task lines with valid dates |

### 3.5 Triggering a Full Quality Audit

A full audit (regenerating `09-quality-report.md`) is needed when:

- 5+ source files changed across 2+ layers (backend + frontend)
- A database migration alters the schema
- An auth or security boundary changed
- A deployment target or CI pipeline changed
- 3+ months since last full audit

Otherwise: use incremental regeneration (§3.2) with scope from §2.

Full audit process:
1. Re-inventory all source files (count, LOC) → update `01-repository-inventory.md`
2. Cross-reference all 149 doc files against updated source
3. Validate all 65 Mermaid diagram syntax blocks
4. Check for broken references, duplicate files, empty directories
5. Compare all 102 API endpoints against route documentation
6. Update `09-quality-report.md` with new metrics and findings
7. Update session notes with audit results

---

## 4. Pull Request Documentation Checklist

For every PR, the author or reviewer should answer these questions. Keep a running tally of which docs need updating — aggregate them before merge rather than scattering updates across commits.

### 4.1 Required Checks (all PRs)

- [ ] **Does this PR add, remove, or rename a file?** → Update `01-repository-inventory.md` (file count, LOC per directory)
- [ ] **Does this PR add, remove, or rename a route?** → Update `02-dependency-map.md` (route table + count), `03-architecture-kb.md` (route module spec)
- [ ] **Does this PR add, remove, or rename a service / controller / model?** → Update `02-dependency-map.md` (layer table, edges), `03-architecture-kb.md` (full module spec)
- [ ] **Does this PR add, remove, or rename a database table or column?** → Update ER diagram, `01-repository-inventory.md` (migration count), `flowcharts/040-i03` (if new migration)
- [ ] **Does this PR add, remove, or change an API endpoint?** → Update `02-dependency-map.md` (route table), `05-user-journeys.md` (if user-facing), `10-internal-workflows.md` (if service workflow changes), `07-data-flow.md` (if data lifecycle changes)
- [ ] **Does this PR add, remove, or change a frontend component, page, or route?** → Update `06-frontend-architecture.md` (component table, route table, LOC), `docs/diagrams/08-frontend-component-tree.md`
- [ ] **Does this PR change auth middleware, role permissions, or token handling?** → Update `07-cross-cutting-concerns.md` (§2), `flowcharts/004-b04-route-auth-matrix.md`, `docs/diagrams/03-auth-sequence.md`
- [ ] **Does this PR add, remove, or change an external integration?** → Update `02-dependency-map.md` (edges), `07-cross-cutting-concerns.md` (integration section), `docs/diagrams/01-system-architecture.md` (C4)
- [ ] **Does this PR change deployment, Docker, or CI config?** → Update `07-cross-cutting-concerns.md` (§8–9), `docs/diagrams/09-deployment-cicd.md`, `flowcharts/039-i02` or `041-i04` as applicable
- [ ] **Does this PR change the smart contract or crypto verification flow?** → Update `08-crypto-deep-dive.md`, `flowcharts/013-c08-smart-contract-structure.md`, `flowcharts/007-c02-crypto-verification-sequence.md`
- [ ] **Does this PR change the AI model or caption logic?** → Update `10-internal-workflows.md` (#3 caption generation), `07-data-flow.md` (§9), `flowcharts/017-d05-ai-caption-generation-flow.md`
- [ ] **Does this PR add or remove test files?** → Update `09-testing-monitoring.md` (coverage data, file count), `flowcharts/047-k01` or `048-k02` as applicable
- [ ] **Does this PR change the crypto on-ramp integration?** → Update `10-internal-workflows.md` (#32, #35), `flowcharts/051-c09-fiat-to-crypto-on-ramp-flow.md`, `docs/api/README.md` (onramp route table)

### 4.2 Smart Checks (apply when relevant)

- [ ] **Did related user journeys change?** → Update `05-user-journeys.md` (affected journey entries)
- [ ] **Did business capability coverage change?** → Update `04-business-capabilities.md` (add/remove/update capability)
- [ ] **Did a data flow lifecycle change?** → Update `07-data-flow.md` (affected feature's 10-step lifecycle sequence)
- [ ] **Did a cross-cutting concern change?** → Update `07-cross-cutting-concerns.md` (affected area: security, deployment, error handling, config, etc.)
- [ ] **Did an architectural smell or risk change?** → Update `02-dependency-map.md` (smells table), `07-cross-cutting-concerns.md` (§12 risk matrix)
- [ ] **Does the diagram index need updating?** → Update `08-diagram-index.md` (status, counts, category totals)
- [ ] **Did the API route reference become stale?** → Update `docs/api/README.md` (endpoint tables, route file count)
- [ ] **Did the regression risk exceed normal?** → Run full quality audit (see §3.5)
- [ ] **Did any DOX-relevant scope, ownership, or rules change?** → Update nearest `AGENTS.md`

### 4.3 Final Verification (before merge)

- [ ] Cross-reference updated docs against the actual change — do route counts match? Are new functions documented with correct signatures?
- [ ] Mermaid syntax valid on all regenerated diagrams (check: subgraph closure, alt/end, arrow types, participant names)
- [ ] Cross-document references resolve (relative paths correct, diagram index paths valid)
- [ ] `00-session-notes.md` updated with change description and list of regenerated docs
- [ ] AGENTS.md DOX pass complete — update nearest owning AGENTS.md if scope or file structure changed

---

## 5. Doc Issues Status

| Issue | Location | Severity | Status |
|---|---|---|---|
| `docs/flowcharts/` name is misleading (only 55% are flowcharts; 45% are sequence, state, journey, Gantt, etc.) | `docs/flowcharts/` | P3 — naming | ⏳ Open (README documents the mix) |
| `docs/references/` directory is empty | `docs/references/` | P3 — planned but unused | ⏳ Open |
| "17 services" narrative references in some files say "15 services" | `00-session-notes.md` (historical), `08-diagram-index.md` line 856, `09-testing-monitoring.md` line 202 | P2 — minor | ⏳ Open (historical refs kept; fixed in 03-kb, 08-index, 09-testing) |

### Resolved Since Previous Report

| Issue | Resolution |
|---|---|
| 3 missing internal workflows | Added as workflows #29–31 (subscription lifecycle, admin moderation, enclave applications) |
| 3 missing user journeys | Added in P1-6 remediation (admin enclave, fan enclave, custom reports) |
| Stripe Setup Intent mislabeled "legacy/dead" | Corrected to "not yet implemented" (Phase 17), then **ABORTED** — fully removed from codebase. All docs updated (Phase 19) |
| Duplicate `creator-acquisition-strategy.md` | Resolved as cross-reference redirect in `docs/marketing/` |
| Multi-line Mermaid node label in `08-frontend-component-tree.md` | Replaced with single-line `<br/>` syntax |
| Migration count claimed 15 | Corrected to 9 SQL + 3 utility scripts |
| `08-diagram-index.md` summary counts (56/7/73 → 55/0/65) | Corrected (Phase 19) |
| `docs/api/README.md` header (15→16 files, 74→102 endpoints, added Onramp) | Corrected (Phase 19) |
| `048-k02` Mermaid `&` multi-target syntax | Replaced with individual statements (Phase 19) |
| `01-documentation-plan.md` stale deliverable paths | Reconciled (Phase 19) |
| `docs/diagrams/pending/` — 6 orphan `.mmd` files | Deleted (Phase 19) |
| Contest service missing dedicated workflow | Workflow #40 added (Phase 19) |
| `00-session-notes.md` stale `docs/diagrams-generated/` claim | Corrected (Phase 19) |
| `12-maintenance.md` references `flowcharts/I-01` | Fixed (Phase 18) |

---

## 6. Revision History

| Date | Change |
|---|---|
| 2026-07-02 | Initial creation — artifact dependency graph, change impact matrix, incremental workflow, PR checklist |
| 2026-07-19 | Full rewrite — updated counts (39 workflows, 55 diagrams, 15 features, 22 capabilities, 149 doc files), new change impact matrix rows (onramp, impersonation), corrected broken references, updated known issues from quality report v2 |
| 2026-07-19 | Phase 19 fix pass — Stripe Setup Intent ABORTED, P0–P3 issue remediation, known issues table updated with resolved/open status |
