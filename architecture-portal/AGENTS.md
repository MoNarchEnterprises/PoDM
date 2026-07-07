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

## Data Serving (Critical)

The portal fetches all data from `docs/` at runtime via `fetch('/docs/...')`. Vite only serves files under `public/` at the root URL, so `docs/` must be copied into `public/docs/` before dev or build.

`scripts/copy-docs.mjs` copies `../docs/` → `public/docs/` and runs automatically before `vite` and `vite build` via package.json scripts. `public/docs/` is gitignored.

If data appears missing, run `node scripts/copy-docs.mjs` manually or check that `public/docs/` exists.

## Work Guidance

| Command | Description |
|---|---|
| `npm run dev` | Copy docs + start Vite dev server (port 5173) |
| `npm run build` | Copy docs + TypeScript check + Vite production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint check |

## Verification

- `npm run build` must pass with zero errors before committing
- Build output goes to `architecture-portal/dist/` (128+ files)
- After `npm run dev`, verify `public/docs/knowledge/modules.json` exists
- Check browser DevTools Network tab for 404s on `/docs/` requests

## Child DOX Index

No child directories with AGENTS.md exist under this subtree.

## Knowledge Source Integration

The portal loads its content from `docs/` at runtime (copied to `public/docs/`):
- `docs/knowledge/` — 15 normalized JSON files (the canonical knowledge graph)
- `docs/architecture/` — Architecture markdown documents
- `docs/flowcharts/` — Mermaid flowchart markdown files
- `docs/diagram-specifications/` — 59 JSON diagram specs
- `docs/api/` — API route reference markdown
