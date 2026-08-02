> **Note**: All Stripe references in this document are historical. PoDM uses crypto-only payments (USDC on Base) as of v2.

# Architecture Diagrams

This directory contains Mermaid diagram source files for the PoDM platform architecture.

## Diagram Index

| File | Diagram Type | Content |
|---|---|---|
| `01-system-architecture.md` | C4 Container | System context — all containers and external integrations |
| `02-database-entity-relationships.md` | ER Diagram | All 12+ database tables with relationships and columns |
| `03-auth-sequence.md` | Sequence | Login flow + authenticated/unauthenticated request flows |
| `04-payment-flow.md` | Sequence | Stripe tip/PPV flow + crypto subscription flow |
| `05-request-lifecycle.md` | Sequence | Full POST /api/v1/content lifecycle (middleware→controller→service→model→DB) |
| `06-real-time-messaging.md` | Sequence | Socket.IO connect, join room, send message, delete, disconnect |
| `07-impersonation-flow.md` | Sequence | Admin impersonation start → request → stop |
| `08-frontend-component-tree.md` | Graph | Full component hierarchy (layout, UI primitives, shared, features, admin) |
| `09-deployment-cicd.md` | Graph | CI pipeline + deployment targets + external services |
| `10-service-dependency-matrix.md` | Graph | All 11 services with inter-service edges and external integrations |

## Rendering

These diagrams use [Mermaid](https://mermaid.js.org/) syntax. To render:

- **GitHub**: Mermaid renders natively in `.md` files on GitHub
- **VS Code**: Install the "Markdown Preview Mermaid Support" extension
- **CLI**: Use `npx @mermaid-js/mermaid-cli mmdc -i file.md -o file.png`
