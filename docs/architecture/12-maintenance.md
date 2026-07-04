# Documentation Maintenance Guide

**File:** `docs/architecture/12-maintenance.md`
**Purpose:** Which documentation artifacts to regenerate after common codebase changes, how to do it incrementally, and what to check per PR.
**Related Documents:** [09-quality-report.md](09-quality-report.md), [08-diagram-index.md](08-diagram-index.md), [00-session-notes.md](00-session-notes.md)

---

## 1. Artifact Dependency Graph

```
Source Code
  │
  ├─ Backend (.ts)
  │   ├──► 01-repository-inventory.md   (file counts, LOC)
  │   ├──► 02-dependency-map.md         (routes, middleware, services, bypasses)
  │   ├──► 03-architecture-kb.md        (module specs: inputs, outputs, failures)
  │   ├──► 04-business-capabilities.md  (capability→module mapping)
  │   ├──► 05-user-journeys.md          (endpoint-level flow steps)
  │   ├──► 08-crypto-deep-dive.md       (smart contract + crypto service)
  │   ├──► 10-internal-workflows.md     (28+ service workflow sequences)
  │   ├──► 11-data-flow.md              (14 feature lifecycles × 10 steps)
  │   └──► flowcharts/ (49 generated diagrams, prompt files)
  │
  ├─ Frontend (.tsx, .ts)
  │   ├──► 01-repository-inventory.md
  │   ├──► 05-user-journeys.md          (UI-side journey steps)
  │   ├──► 06-frontend-architecture.md  (components, hooks, routes, API layer)
  │   ├──► 07-cross-cutting-concerns.md (API integration, error handling)
  │   └──► flowcharts/ (H-category diagrams)
  │
  ├─ Database (migrations)
  │   ├──► 01-repository-inventory.md   (migration count)
  │   ├──► 02-dependency-map.md         (model schema references)
  │   ├──► 03-architecture-kb.md        (model query interfaces)
  │   └──► flowcharts/ (040-i03 migration timeline)
  │
  ├─ Smart Contract (.sol)
  │   ├──► 08-crypto-deep-dive.md       (contract structure, events, gaps)
  │   ├──► 03-architecture-kb.md        (contract reference in Layer 9)
  │   └──► flowcharts/ (013-c08, 046-j05)
  │
  ├─ Test Files
  │   ├──► 09-testing-monitoring.md     (coverage maps, gap analysis)
  │   └──► flowcharts/ (047-k01, 048-k02)
  │
  ├─ Config / Infra (Docker, CI, Netlify, .env)
  │   ├──► 07-cross-cutting-concerns.md (§8–9 deployment, CI)
  │   ├──► 02-dependency-map.md         (external integration configs)
  │   └──► flowcharts/ (002-a05, 039-i02, 041-i04)
  │
  └─ Generated Diagrams (docs/diagrams/ + docs/flowcharts/)
      └──► 08-diagram-index.md          (status, IDs, module references)
```

**Doc-to-doc dependencies:**
- `01-repository-inventory.md` ← foundational, referenced by all
- `02-dependency-map.md` → `03-architecture-kb.md` (layer structure), `07-cross-cutting-concerns.md` (smells)
- `03-architecture-kb.md` → `04-business-capabilities.md`, `05-user-journeys.md`, `06-frontend-architecture.md`, `07-cross-cutting-concerns.md`, `10-internal-workflows.md`, `11-data-flow.md`
- `04-business-capabilities.md` → `05-user-journeys.md` (capability→journey mapping)
- `05-user-journeys.md` → `10-internal-workflows.md` (journeys reference workflow IDs)
- `06-frontend-architecture.md` → `07-cross-cutting-concerns.md`, `05-user-journeys.md`
- `07-cross-cutting-concerns.md` → `11-data-flow.md` (risks, data categories)
- `08-crypto-deep-dive.md` → `07-cross-cutting-concerns.md`, `10-internal-workflows.md`, `11-data-flow.md`
- `09-testing-monitoring.md` → `05-user-journeys.md` (E2E coverage gaps)
- `10-internal-workflows.md` → `11-data-flow.md` (workflow steps)
- `08-diagram-index.md` → all diagrams
- `09-quality-report.md` → all docs (audit)

---

## 2. Change Impact Matrix

### 2.1 Adding a Feature

| If you add... | Regenerate these docs | Update these | Verify |
|---|---|---|---|
| New backend route group | `02-dependency-map.md` (route table), `03-architecture-kb.md` (new §), `04-business-capabilities.md` (if new capability) | `05-user-journeys.md` (add journeys), `10-internal-workflows.md` (add workflows), `11-data-flow.md` (add feature lifecycles) | Route table count, middleware chain accuracy, endpoint numbers |
| New controller + service | `02-dependency-map.md` (layer table, edges, bypasses), `03-architecture-kb.md` (new module spec) | `01-repository-inventory.md` (file count, LOC), `10-internal-workflows.md` (workflows from new service), `11-data-flow.md` (data lifecycle) | Controller→service→model chain, error handling patterns |
| New model / table | `02-dependency-map.md` (model table, edges), `03-architecture-kb.md` (model reference in affected layer) | `01-repository-inventory.md` (model count), `docs/diagrams/02-database-entity-relationships.md` (ER diagram), `flowcharts/040-i03` (migration timeline if new migration) | Foreign keys, enum additions, column types |
| New frontend feature module | `06-frontend-architecture.md` (components, routes, API functions), `05-user-journeys.md` (new journeys) | `01-repository-inventory.md` (file count, LOC), `07-cross-cutting-concerns.md` (if new integration or error pattern) | Route guard consistency, lazy loading, API function count |
| New page / route | `06-frontend-architecture.md` (route table, lazy-loading) | `05-user-journeys.md` (add journey steps), `08-diagram-index.md` (if diagram needs update) | Role guard, layout wrapper, import correctness |

### 2.2 Removing a Feature

| If you remove... | Regenerate these docs | Update these | Verify |
|---|---|---|---|
| Backend endpoint(s) | `02-dependency-map.md` (route table count), `05-user-journeys.md` (remove affected journey steps) | `03-architecture-kb.md` (strike route from module spec), `10-internal-workflows.md` (remove or mark workflow), `11-data-flow.md` (remove feature or mark deprecated) | Remove dead code references, verify no remaining imports |
| Entire service | `02-dependency-map.md` (layer table, edges), `04-business-capabilities.md` (remove or reassign capability) | `01-repository-inventory.md` (file count, LOC), `07-cross-cutting-concerns.md` (remove integration refs), `08-crypto-deep-dive.md` (if crypto-related), `09-testing-monitoring.md` (test file count) | Controller referencing removed service, import cleanup |
| Frontend module | `06-frontend-architecture.md` (component list, route table, LOC) | `01-repository-inventory.md` (file count, LOC), `05-user-journeys.md` (remove affected journeys) | Dead API functions, orphaned imports |
| E2E test(s) | `09-testing-monitoring.md` (coverage table, test file count) | `08-diagram-index.md` (K-category diagram updates) | Remaining CI workflow references |
| Solidity function | `08-crypto-deep-dive.md` (contract spec, event signatures) | `03-architecture-kb.md` (Layer 9), `flowcharts/013-c08`, `flowcharts/046-j05` | Backend parsing code alignment |

### 2.3 Database Changes

| If you change... | Regenerate these docs | Update these | Verify |
|---|---|---|---|
| New migration | `01-repository-inventory.md` (migration count) | `docs/diagrams/02-database-entity-relationships.md` (ER diagram), `flowcharts/040-i03` (Gantt timeline), `03-architecture-kb.md` (model query layer if new table) | Column types, foreign key naming, enum additions |
| Column rename / type change | `03-architecture-kb.md` (affected model specs), `08-crypto-deep-dive.md` (if transaction/subscription fields), `11-data-flow.md` (affected feature steps) | All docs referencing the changed field name | All query references in service files |
| Table drop | `02-dependency-map.md` (model table), `03-architecture-kb.md` (strike module spec), `04-business-capabilities.md` (if capability removed), `10-internal-workflows.md` (affected workflows) | `01-repository-inventory.md` (model count), `08-diagram-index.md` (if diagram references dropped table) | Cascade deletes, removed model imports |
| Enum value change | `03-architecture-kb.md` (enum references), `10-internal-workflows.md` (if workflow branches on enum) | `11-data-flow.md` (state transitions that depend on enum values) | Middleware role checks, frontend enum equality |

### 2.4 New API

| If you add... | Regenerate these docs | Update these | Verify |
|---|---|---|---|
| New route endpoint | `02-dependency-map.md` (route table, middleware chain), `03-architecture-kb.md` (route module spec) | `01-repository-inventory.md` (endpoint count), `05-user-journeys.md` (add journey or steps), `10-internal-workflows.md` (add workflow), `11-data-flow.md` (add lifecycle steps) | Middleware correctness, response shape, error codes |
| New external API integration | `02-dependency-map.md` (edges table, integration list), `03-architecture-kb.md` (new config module), `07-cross-cutting-concerns.md` (new integration section) | `08-diagram-index.md` (A-01 refresh), `docs/diagrams/01-system-architecture.md` (C4 diagram), `docs/diagrams/10-service-dependency-matrix.md` | API key handling, error propagation, timeout config |
| New API route in frontend | `06-frontend-architecture.md` (apiClient function list, route count) | `05-user-journeys.md` (UI-side steps), `07-cross-cutting-concerns.md` (if new error pattern) | Response type alignment with backend |

### 2.5 UI Changes

| If you change... | Regenerate these docs | Update these | Verify |
|---|---|---|---|
| Add / remove component | `06-frontend-architecture.md` (component table, LOC) | `01-repository-inventory.md` (file count, LOC), `docs/diagrams/08-frontend-component-tree.md` (component tree diagram) | Import chain, prop interface, layout nesting |
| Add / remove route | `06-frontend-architecture.md` (route table, lazy-loading count) | `05-user-journeys.md` (add/remove journey), `07-cross-cutting-concerns.md` (if route guard changes) | Role guard assignment, layout wrapper, `App.tsx` |
| Add / remove hook | `06-frontend-architecture.md` (hook list, LOC) | `09-testing-monitoring.md` (if test added for hook) | Hook interface, return type, re-render impact |
| Change API client layer | `06-frontend-architecture.md` (apiClient function list, response interceptor) | `07-cross-cutting-concerns.md` (error handling layer, 401 clearing logic), `05-user-journeys.md` (if error handling changes visible behavior) | Axios interceptor chain, error toast integration |

### 2.6 Authentication Changes

| If you change... | Regenerate these docs | Update these | Verify |
|---|---|---|---|
| New auth middleware / role | `02-dependency-map.md` (middleware chain tables, bypasses), `03-architecture-kb.md` (middleware module spec) | `07-cross-cutting-concerns.md` (§2 security boundaries), `06-frontend-architecture.md` (route guards), `flowcharts/004-b04` (auth matrix diagram) | All route middleware chains, frontend guard components |
| New JWT claim / token format | `03-architecture-kb.md` (auth module, token format), `11-data-flow.md` (§1 auth data flow) | `07-cross-cutting-concerns.md` (§2 JWT security), `flowcharts/003-b03` (token lifecycle diagram) | Backend `protect` middleware, frontend `useAuth.tsx`, apiClient interceptor |
| New auth provider (e.g., OAuth) | `02-dependency-map.md` (external integration list), `05-user-journeys.md` (new auth journeys) | `03-architecture-kb.md` (auth service spec), `07-cross-cutting-concerns.md` (§2, §11 config), `docs/diagrams/03-auth-sequence.md`, `docs/diagrams/01-system-architecture.md` | Provider SDK integration, error handling, token storage |
| Impersonation logic change | `07-cross-cutting-concerns.md` (§2 impersonation), `05-user-journeys.md` (§M impersonation meta-journey) | `docs/diagrams/07-impersonation-flow.md`, `03-architecture-kb.md` (auth middleware) | `X-Impersonating-User-Id` header propagation, banner display |
| Email verification / password flow | `05-user-journeys.md` (A-03, A-04 auth journeys), `10-internal-workflows.md` (workflow #24 password reset) | `flowcharts/006-b06` (password reset diagram), `03-architecture-kb.md` (auth module) | Email service wiring, redirect URL consistency |

### 2.7 AI Agent Changes

| If you change... | Regenerate these docs | Update these | Verify |
|---|---|---|---|
| AI model / provider | `03-architecture-kb.md` (AI service module spec), `07-cross-cutting-concerns.md` (§4 external integrations) | `11-data-flow.md` (§9 AI caption data flow), `10-internal-workflows.md` (workflow #3), `flowcharts/017-d05` | API key prefix logic, model name, response format |
| AI caption endpoint logic | `10-internal-workflows.md` (workflow #3 caption generation), `11-data-flow.md` (§9) | `03-architecture-kb.md` (AI controller, prompt format), `09-testing-monitoring.md` (if test added) | Input validation, NSFW check, error handling |
| Bulk upload / AI integration | `06-frontend-architecture.md` (BulkUploadPage, DraftCard), `05-user-journeys.md` (C-05 bulk upload) | `10-internal-workflows.md` (workflow #7 bulk upload), `flowcharts/019-d07`, `flowcharts/017-d05` | Rate limiting, concurrent request handling |

### 2.8 Infrastructure Changes

| If you change... | Regenerate these docs | Update these | Verify |
|---|---|---|---|
| Docker / docker-compose | `07-cross-cutting-concerns.md` (§8 local dev), `flowcharts/039-i02` (Docker diagram) | `02-dependency-map.md` (if service added/removed), `09-testing-monitoring.md` (if test container added) | Port mappings, volume mounts, environment variables |
| CI/CD pipeline | `07-cross-cutting-concerns.md` (§9 CI/CD), `docs/diagrams/09-deployment-cicd.md`, `flowcharts/I-01` | `09-testing-monitoring.md` (if test stage changes), `08-diagram-index.md` (if job structure changes) | Job dependencies, secret injection, artifact paths |
| Deployment target (add/remove) | `07-cross-cutting-concerns.md` (§8 deployment), `docs/diagrams/01-system-architecture.md` (C4 diagram) | `03-architecture-kb.md` (if new config module), `02-dependency-map.md` (edges to new platform) | Environment variables, CORS origins, SPA redirect rules |
| Environment variable changes | `07-cross-cutting-concerns.md` (§11 config management), `flowcharts/002-a05` (config map diagram) | `03-architecture-kb.md` (affected module init sections), `08-crypto-deep-dive.md` (RPC URL, contract address) | `.env` file consistency, frontend-vs-backend exposure |
| Monitoring / logging addition | `09-testing-monitoring.md` (§6–7 monitoring), `flowcharts/049-k03` (observability gap diagram) | `07-cross-cutting-concerns.md` (§10 logging), `03-architecture-kb.md` (affected module failure modes) | PII leakage in logs, structured log format |
| Database host / Supabase changes | `03-architecture-kb.md` (config modules, supabaseClient), `02-dependency-map.md` (external integration list) | `07-cross-cutting-concerns.md` (§11 config), `docs/diagrams/01-system-architecture.md` | Connection pooling, SSL/TLS, migration order |
| Netlify / Cloudflare Pages changes | `07-cross-cutting-concerns.md` (§8 deployment), `flowcharts/041-i04` (build pipeline) | `06-frontend-architecture.md` (§8 build config), `docs/diagrams/09-deployment-cicd.md` | Build command, environment variables, redirects |

---

## 3. Incremental Regeneration Workflow

### 3.1 Principles

1. **Regenerate from source, never guess.** If a doc was generated by analyzing source files, regenerate it from the updated source.
2. **Update dependent docs in order.** Follow the dependency arrows in the artifact graph (Section 1).
3. **Touch only affected files.** Use the change impact matrix (Section 2) to scope the work.
4. **Verify after regeneration.** Cross-reference counts, names, routes, and types against the changed source.

### 3.2 Workflow Steps

```
[1] Identify change type
    ↓
[2] Consult Change Impact Matrix → list affected docs
    ↓
[3] Identify doc dependency order from Section 1 graph
    ↓
[4] For each affected doc:
      a. Read current file
      b. Read changed source files side by side
      c. Edit only the affected sections (do NOT rewrite the entire doc)
      d. Update metadata: date, revision history, confidence level
    ↓
[5] For diagram files (Mermaid):
      a. Read the corresponding prompt in flowchart-prompts-*.md
      b. Update the prompt to reflect the source change
      c. Regenerate the Mermaid diagram from the updated prompt
      d. Validate Mermaid syntax (manual or automated)
    ↓
[6] Update aggregate / index files:
      a. 01-repository-inventory.md — if file counts changed
      b. 08-diagram-index.md — if diagram status changed
      c. 09-quality-report.md — update affected metric entries
    ↓
[7] Update 00-session-notes.md with:
      a. What changed and why
      b. Which docs were regenerated
      c. Any new findings, assumptions, or technical debt discovered
    ↓
[8] Run DOX pass:
      a. Re-check changed paths against the DOX chain
      b. Update nearest owning AGENTS.md if scope or rules changed
    ↓
[9] Verify:
      a. Cross-reference endpoint counts, middleware chains, role assignments
      b. Check Mermaid syntax on regenerated diagrams
      c. Verify all cross-document references resolve
```

### 3.3 Quick Reference: Minimal vs Full Regeneration

| Scenario | Files to touch |
|---|---|
| New endpoint (existing route group) | `02-dep-map` (count), `03-kb` (add handler), `10-workflows` (add workflow) |
| New route group | Above + `01-inventory` (count), `05-journeys` (journeys), `06-frontend` (API functions), `11-data-flow` (feature) |
| New model | `01-inventory` (model count), `02-dep-map` (model table), `03-kb` (model spec), ER diagram |
| New external integration | `02-dep-map` (edges), `03-kb` (config module), `07-cross-cutting` (integration), C4 diagram, service dep matrix |
| UI component addition | `06-frontend` (component table + LOC), component tree diagram |
| Auth middleware change | `02-dep-map` (route middleware chains), `07-cross-cutting` (security), auth matrix diagram |
| Deployment config change | `07-cross-cutting` (§8–9), deployment diagram, Docker diagram |
| AI model swap | `03-kb` (AI service), `07-cross-cutting` (§4 integration), `10-workflows` (#3), `11-data-flow` (§9), caption diagram |
| Database migration | `01-inventory` (count), ER diagram, migration timeline diagram (if new file) |
| Test file addition/removal | `09-testing-monitor` (coverage data), test gap diagram, E2E coverage diagram |
| **Full project audit** | Every doc listed in Section 1, run quality report process (see 3.4) |

### 3.4 Triggering a Quality Audit

A full quality audit (like `09-quality-report.md`) is needed when:
- 5+ source files changed across 2+ layers
- A database migration alters the schema
- An auth or security boundary changed
- A deployment target or CI pipeline changed
- **Otherwise**: use incremental regeneration (Section 3.2) with scope from Section 2

Full audit process:
1. Catalog all source files (count, LOC) → update `01-repository-inventory.md`
2. Cross-reference all 97 doc files against updated source
3. Validate all 59 Mermaid diagrams syntax
4. Check for broken references, duplicate files, empty directories
5. Update `09-quality-report.md` with new metrics
6. Update session notes

---

## 4. Pull Request Documentation Checklist

For every PR, the author or reviewer should answer these questions:

### 4.1 Required Checks (all PRs)

- [ ] **Does this PR add, remove, or rename a file?** → Update `01-repository-inventory.md` (file count, LOC)
- [ ] **Does this PR add, remove, or rename a route?** → Update `02-dependency-map.md` (route table + count), `03-architecture-kb.md` (route module spec)
- [ ] **Does this PR add, remove, or rename a service / controller / model?** → Update `02-dependency-map.md` (layer table), `03-architecture-kb.md` (module spec)
- [ ] **Does this PR add, remove, or rename a database table or column?** → Update ER diagram, `01-repository-inventory.md` (migration count)
- [ ] **Does this PR add, remove, or change an API endpoint?** → Update `02-dependency-map.md` (route table), `05-user-journeys.md` (if user-facing), `10-internal-workflows.md` (if service workflow changes), `11-data-flow.md` (if data lifecycle changes)
- [ ] **Does this PR add, remove, or change a frontend component, page, or route?** → Update `06-frontend-architecture.md` (component table, route table), component tree diagram
- [ ] **Does this PR change auth middleware, role permissions, or token handling?** → Update `07-cross-cutting-concerns.md` (§2), auth matrix diagram
- [ ] **Does this PR add, remove, or change an external integration?** → Update `02-dependency-map.md` (edges), `07-cross-cutting-concerns.md` (integration section), C4 diagram
- [ ] **Does this PR change deployment, Docker, or CI config?** → Update `07-cross-cutting-concerns.md` (§8–9), deployment / Docker / CI diagrams
- [ ] **Does this PR change the smart contract or crypto verification flow?** → Update `08-crypto-deep-dive.md`, relevant flowcharts
- [ ] **Does this PR change the AI model or caption logic?** → Update `10-internal-workflows.md` (workflow #3), `11-data-flow.md` (§9), caption diagram
- [ ] **Does this PR add or remove test files?** → Update `09-testing-monitoring.md` (coverage data)

### 4.2 Smart Checks (apply when relevant)

- [ ] **Did related user journeys change?** → Update `05-user-journeys.md`
- [ ] **Did business capability coverage change?** → Update `04-business-capabilities.md`
- [ ] **Did a data flow lifecycle change?** → Update `11-data-flow.md` (affected feature's 10-step lifecycle)
- [ ] **Did a cross-cutting concern change?** → Update `07-cross-cutting-concerns.md` (affected area)
- [ ] **Did an architectural smell or risk change?** → Update `02-dependency-map.md` (smells table), `07-cross-cutting-concerns.md` (§12 risk matrix)
- [ ] **Does the diagram index need updating?** → Update `08-diagram-index.md` (status, count, category totals)
- [ ] **Did the regression risk exceed normal?** → Run `09-quality-report.md` audit process
- [ ] **Did any DOX-relevant scope, ownership, or rules change?** → Update nearest `AGENTS.md`

### 4.3 Final Verification (before merge)

- [ ] Cross-reference updated docs against the actual change — do route counts match? Are new functions documented?
- [ ] Mermaid syntax valid on all regenerated diagrams
- [ ] Cross-document references resolve (relative paths correct)
- [ ] `00-session-notes.md` updated with change description
- [ ] AGENTS.md DOX pass complete

---

## 5. Known Doc Issues (from Quality Report)

These affect accuracy. Fix before doing regeneration work:

| Issue | Location | Severity |
|---|---|---|
| Diagram index summary claims 10+38=48; actual is 11+49=60 | `08-diagram-index.md` summary table | P0 — counts wrong |
| Multi-line Mermaid label may fail on older parsers | `docs/diagrams/08-frontend-component-tree.md` line 8-9 | P0 — syntax fragility |
| `creator-acquisition-strategy.md` duplicated across two directories | `docs/future-features/` and `docs/marketing/` | P0 — confusion risk |
| 3 internal workflows not documented | services missing from `10-internal-workflows.md` | P1 — gaps |
| 3 data flows not documented | features missing from `11-data-flow.md` | P1 — gaps |
| 2 user journeys not documented | missing from `05-user-journeys.md` | P1 — gaps |
| Migration count claims 15, actual 9 | `01-repository-inventory.md` | P1 — wrong count |

---

## 6. Revision History

| Date | Change |
|---|---|
| 2026-07-02 | Initial creation — artifact dependency graph, change impact matrix, incremental workflow, PR checklist |
