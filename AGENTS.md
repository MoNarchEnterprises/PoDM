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
| `architecture-portal/` | [architecture-portal/AGENTS.md](architecture-portal/AGENTS.md) | Architecture Intelligence Platform — Vite + React + TypeScript interactive knowledge graph browser, module/service/entity explorer, React Flow dependency graph, search |

### Non-code directories (indexed here, no child AGENTS.md)

| Path | Contents |
|---|---|
| `docs/` | Project documentation — future-features specs, marketing collateral, maintenance guides, **architecture knowledge base** |
| `docs/legal/` | Legal documentation and policies — DMCA, Terms of Service brainstorm, data retention |
| `docs/architecture/` | 00-session-notes, 01-documentation-plan, 01-repository-inventory, 02-dependency-map, 03-architecture-kb, 04-business-capabilities, 05-user-journeys, 06-frontend-architecture, 07-cross-cutting-concerns, 08-crypto-deep-dive, 08-diagram-index, 09-testing-monitoring, 09-quality-report, 10-internal-workflows, 07-data-flow, 12-maintenance |
| `docs/diagrams/` | 11 Mermaid diagrams: C4 system context, ER diagram, auth seq, payment flow, request lifecycle, real-time messaging, impersonation, component tree, deployment/CI, service deps + README |
| `docs/diagram-specifications/` | 59 JSON diagram specification files (001–059): structured machine-readable specs for all architecture diagrams across 8+ categories — system, auth, payments, content, real-time, data, admin, frontend, infrastructure, crypto, testing, monitoring |
| `docs/flowcharts/` | 4 Mermaid prompt files + 55 generated Mermaid diagrams (`001`–`055` covering categories A–K): architecture context, auth token lifecycle, route auth matrix, orphan cleanup, password reset, crypto verification, subscription state, tipping/PPV, payout, fee calc, referral bonus, smart contract, content access control, upload pipeline, watermarking, AI captions, content lifecycle state, bulk upload, signed URLs, WebSocket events, ticket↔DM sync, broadcast, notifications, data flow pipeline, analytics, support ticket state, contest lifecycle, contest winner, admin dashboard, moderation, panel structure, verification docs, capability dependencies, fan journey, creator journey, role boundaries, feature maturity, Docker, migration timeline, build/deploy, error handling, security boundaries, sensitive data flow, risk matrix, crypto heatmap, test coverage, E2E coverage, monitoring gaps, admin impersonation, fiat-to-crypto on-ramp, subscription renewal batch, payout balance lock, feed generation pipeline, gallery JSONB ops |
| `docs/knowledge/` | 15 knowledge graph JSON files — architecture, modules, services, entities, routes, pages, components, workflows, diagrams, relationships, externalSystems, events, queues, agents |
| `docs/api/` | API route reference (74 endpoints across 15 route files) |
| `docs/references/` | Reference materials |
| `.github/workflows/` | CI/CD pipeline — GitHub Actions (build + test backend, lint + build frontend) |
| `.agent/` | AI agent workflow specifications |
| `.idx/` | Google Project IDX workspace config |

### Root-owned scope

The root AGENTS.md owns project-wide rules that apply across all subtrees:

- DOX framework and hierarchy enforcement
- Docker Compose orchestration (root `docker-compose.yml`)
- Netlify deployment config (`netlify.toml`)
- Root-level tools and assets (CSV data, Instagram scripts, database reference docs)
- Planning documents (MVP Checklist, PoDM Planning Document, GEMINI.md, RPC_permanent_fix.md, content_and_gallery_fix.md, ppv_attach_modal_fix.md, creator_views_fix.md, session_refresh_fix.md)
- Root `package.json` (minimal — shared deps like puppeteer, csv-parser)
- `.gitignore`, `.git/`, `.github/`