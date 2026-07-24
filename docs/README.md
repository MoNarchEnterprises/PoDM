# PoDM Documentation Map

## Directory Structure

| Directory | Contents |
|---|---|
| `docs/architecture/` | Core architecture knowledge base — 16 files covering all platform aspects |
| `docs/diagrams/` | 10 Mermaid C4/ER/sequence/flowchart diagrams (high-level overviews) |
| `docs/flowcharts/` | 55 Mermaid diagrams (detailed deep-dives) + 4 prompt files |
| `docs/api/` | API route reference |
| `docs/future-features/` | Planned feature specs |
| `docs/marketing/` | Marketing collateral |
| `docs/references/` | Reference materials (planned) |

## Diagram Cross-Reference

All 59 diagrams are indexed in `docs/architecture/08-diagram-index.md` across 11 categories (A–K). Below is the mapping from diagram file to source and category.

### Existing Diagrams (`docs/diagrams/`)

| File | Category IDs | Type |
|---|---|---|
| `01-system-architecture.md` | A-01 | C4 Container |
| `02-database-entity-relationships.md` | F-01 | ER |
| `03-auth-sequence.md` | B-01 | Sequence |
| `04-payment-flow.md` | C-01 | Sequence |
| `05-request-lifecycle.md` | D-01 | Sequence |
| `06-real-time-messaging.md` | E-01 | Sequence |
| `07-impersonation-flow.md` | B-02 | Sequence |
| `08-frontend-component-tree.md` | H-01 | Graph (flowchart) |
| `09-deployment-cicd.md` | A-03 / I-01 | Graph (flowchart) |
| `10-service-dependency-matrix.md` | A-02 | Graph (flowchart) |

### Generated Diagrams (`docs/flowcharts/`)

| File | Category | Type |
|---|---|---|
| `001-a04-internal-workflow-dependency-map.md` | A-04 | Graph |
| `002-a05-environment-configuration-map.md` | A-05 | Graph |
| `003-b03-auth-token-lifecycle.md` | B-03 | Sequence |
| `004-b04-route-authentication-matrix.md` | B-04 | Graph |
| `005-b05-auth-orphan-cleanup-flow.md` | B-05 | Sequence |
| `006-b06-password-reset-flow.md` | B-06 | Sequence |
| `007-c02-crypto-verification-sequence.md` | C-02 | Sequence |
| `008-c03-subscription-state-diagram.md` | C-03 | State |
| `009-c04-tipping-and-ppv-payment-flow.md` | C-04 | Sequence |
| `010-c05-payout-and-earnings-flow.md` | C-05 | Sequence |
| `011-c06-platform-fee-calculation-flow.md` | C-06 | Flowchart |
| `012-c07-referral-bonus-awarding-flow.md` | C-07 | Flowchart |
| `013-c08-smart-contract-structure.md` | C-08 | Class |
| `014-d02-content-access-control-decision-tree.md` | D-02 | Flowchart |
| `015-d03-content-upload-pipeline.md` | D-03 | Sequence |
| `016-d04-dynamic-watermarking-sequence.md` | D-04 | Sequence |
| `017-d05-ai-caption-generation-flow.md` | D-05 | Sequence |
| `018-d06-content-lifecycle-state-diagram.md` | D-06 | State |
| `019-d07-bulk-upload-pipeline.md` | D-07 | Sequence |
| `020-d08-content-signed-url-generation-flow.md` | D-08 | Sequence |
| `021-e02-websocket-event-catalog.md` | E-02 | Graph |
| `022-e03-support-ticket-dm-sync-sequence.md` | E-03 | Sequence |
| `023-e04-creator-broadcast-delivery.md` | E-04 | Sequence |
| `024-e05-subscriber-notification-delivery.md` | E-05 | Flowchart |
| `025-f02-data-flow-layer-architecture.md` | F-02 | Flowchart |
| `026-f03-analytics-pipeline.md` | F-03 | Flowchart |
| `027-f04-support-ticket-state-diagram.md` | F-04 | State |
| `028-f05-contest-lifecycle-state-diagram.md` | F-05 | State |
| `029-f06-contest-winner-selection-flow.md` | F-06 | Flowchart |
| `030-g01-admin-dashboard-data-flow.md` | G-01 | Flowchart |
| `031-g02-admin-moderation-workflow.md` | G-02 | Sequence |
| `032-g03-admin-panel-structure.md` | G-03 | Graph |
| `033-g04-verification-document-access-flow.md` | G-04 | Sequence |
| `034-h02-business-capability-dependency-graph.md` | H-02 | Graph |
| `035-h03-user-journey-map-fan.md` | H-03 | Journey |
| `036-h04-user-journey-map-creator.md` | H-04 | Journey |
| `037-h05-role-based-access-boundaries.md` | H-05 | Graph |
| `038-h06-feature-maturity-radar.md` | H-06 | Graph |
| `039-i02-docker-local-development-architecture.md` | I-02 | Graph |
| `040-i03-database-migration-timeline.md` | I-03 | Gantt |
| `041-i04-build-and-deploy-pipeline-frontend.md` | I-04 | Flowchart |
| `042-j01-error-handling-layer-architecture.md` | J-01 | Flowchart |
| `043-j02-security-boundary-and-trust-diagram.md` | J-02 | Graph |
| `044-j03-sensitive-data-flow-map.md` | J-03 | Graph |
| `045-j04-architectural-risk-matrix.md` | J-04 | Graph |
| `046-j05-crypto-security-gap-heatmap.md` | J-05 | Graph |
| `047-k01-test-coverage-gap-map.md` | K-01 | Graph |
| `048-k02-end-to-end-test-journey-coverage.md` | K-02 | Graph |
| `049-k03-monitoring-and-observability-gap-diagram.md` | K-03 | Graph |
| `050-b07-admin-impersonation-internal-flow.md` | B-07 | Sequence |
| `051-c09-fiat-to-crypto-on-ramp-flow.md` | C-09 | Sequence |
| `052-c10-subscription-renewal-batch-processing.md` | C-10 | Flowchart |
| `053-c11-payout-balance-lock-flow.md` | C-11 | Flowchart |
| `054-d09-fan-feed-generation-pipeline.md` | D-09 | Sequence |
| `055-d10-gallery-jsonb-operations.md` | D-10 | Sequence |

## Quick Links

- [Session Notes](architecture/00-session-notes.md) — what was discovered and when
- [Maintenance Guide](architecture/12-maintenance.md) — how to keep docs current
- [Quality Report](architecture/09-quality-report.md) — audit findings and recommendations
