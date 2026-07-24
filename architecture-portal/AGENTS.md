# Architecture Portal

## Purpose

Interactive web-based browser for the PoDM architecture knowledge graph. Loads the 15 knowledge graph JSON files from `docs/knowledge/` and presents them in a browsable, searchable, graph-visualized interface.

## Ownership

- All source files under `architecture-portal/src/`
- Knowledge data loaded from `docs/knowledge/` at runtime
- Build config: `vite.config.ts`, `tsconfig*.json`, `package.json`

## Local Contracts

- **Stack**: Vite 6 + React 19 + TypeScript
- **Routing**: react-router-dom v7
- **Graph visualization**: @xyflow/react v12 (React Flow)
- **Diagram rendering**: mermaid v11 (lazy-loaded on Diagrams page)
- **Data**: 15 JSON knowledge files from `docs/knowledge/` imported at build time via `@knowledge` Vite alias; 71 Mermaid source files (`docs/flowcharts/` + `docs/diagrams/`) loaded raw via `import.meta.glob` for inline rendering
- **Styling**: Plain CSS with dark theme CSS variables
- **No state management library** — data flows through component props
- All components are functional with hooks

## Work Guidance

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server (runs on localhost:5173) |
| `npm run build` | TypeScript check + production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | TypeScript type check only |

- Run `npm run dev` from the `architecture-portal/` directory
- Knowledge JSON data is imported at build time via Vite alias — no runtime fetch needed
- For production, build with `npm run build` and serve `dist/` from any HTTP server

## Verification

- `npm run lint` — TypeScript compilation check (no emit)
- `npm run build` — Full production build

## Child DOX Index

No child directories with AGENTS.md files.
