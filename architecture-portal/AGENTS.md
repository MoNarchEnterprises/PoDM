# Architecture Intelligence Platform

## Purpose

Interactive architecture exploration portal for the PoDM application. Enables developers, architects, and AI assistants to browse, search, visualize, and query all architecture documentation, diagrams, workflows, modules, services, and dependencies.

## Ownership

- All `architecture-portal/` source code
- Vite + React 19 + TypeScript application shell
- MUI theme, layout, routing, and global state
- Knowledge Graph service (loads JSON from `docs/knowledge/`)
- Mermaid renderer, React Flow graph, Markdown renderer
- AI Assistant with Ollama RAG integration
- Fuse.js global search
- Settings management (Ollama config, theme, model selection)

## Local Contracts

- **React 19**, **TypeScript**, **Vite 6**, **Material UI 6**, **React Router 7**
- **Zustand** with `persist` middleware for settings and chat state
- **@xyflow/react** for interactive dependency graphs
- **mermaid** for diagram rendering
- **react-markdown** + **remark-gfm** for markdown with custom MUI components
- **fuse.js** for fuzzy search (Ctrl+K)
- **framer-motion** for page transitions and animations
- **TanStack Query** for async data fetching (knowledge graph loading)

### Naming Conventions

- Pages: PascalCase, one component per file, default export
- Components: PascalCase, one component per file, default export
- Services: camelCase, singleton exported as named const
- Hooks: camelCase prefixed with `use`, named export
- Types: PascalCase interfaces/types in `src/types/`
- Store: camelCase with `Store` suffix, default export from zustand `create()`

## Work Guidance

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run build` | TypeScript check + Vite production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint check |

## Verification

- `npm run build` must pass with zero errors before committing
- Build output goes to `architecture-portal/dist/` (128+ files)

## Child DOX Index

No child directories with AGENTS.md exist under this subtree.

## Knowledge Source Integration

The portal loads its content from `docs/` at runtime:
- `docs/knowledge/` — 15 normalized JSON files (the canonical knowledge graph)
- `docs/architecture/` — Architecture markdown documents
- `docs/flowcharts/` — Mermaid flowchart markdown files
- `docs/diagram-specifications/` — 59 JSON diagram specs
- `docs/api/` — API route reference markdown
