# Architecture Intelligence Platform

## Purpose

Interactive architecture exploration portal for the PoDM application. Enables developers, architects, and AI assistants to browse, search, visualize, and query all architecture documentation, diagrams, workflows, modules, services, and dependencies.

## Ownership

- All `architecture-portal/` source code
- Vite + React 19 + TypeScript application shell
- MUI theme, layout, routing, and global state
- Knowledge Graph service (loads JSON from `docs/knowledge/`)
- Embedding service (`embeddingService.ts`) + chunker (`chunker.ts`) — Ollama embeddings RAG pipeline
- Mermaid renderer, React Flow graph, Markdown renderer
- AI Assistant with Ollama RAG integration (semantic + keyword fallback)
- Fuse.js global search
- Settings management (Ollama config, theme, model selection, embedding model)

## Local Contracts

- **React 19**, **TypeScript**, **Vite 6**, **Material UI 6**, **React Router 7**
- **Zustand** with `persist` middleware for settings and chat state
- **@xyflow/react** for interactive dependency graphs
- **mermaid** for diagram rendering
- **react-markdown** + **remark-gfm** for markdown with custom MUI components
- **fuse.js** for fuzzy search (Ctrl+K)
- **framer-motion** for page transitions and animations
- **TanStack Query** for async data fetching (knowledge graph loading)
- **AI Assistant RAG**: Ollama embeddings (`/api/embeddings`) for semantic search, keyword fallback (`rag.ts`); lazy index on first query; `localStorage` persistence for embeddings cache
- **New services**: `embeddingService.ts` (indexer + retriever), `chunker.ts` (entity + markdown chunking), `rag.ts` (orchestration + fallback)

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

**Embedding model:** The AI Assistant requires `nomic-embed-text` in Ollama (`ollama pull nomic-embed-text`). If missing, the AI Assistant auto-prompts to download it on first query. The keyword fallback works without it (no semantic search).

## Verification

- `npm run build` must pass with zero errors before committing
- Build output goes to `architecture-portal/dist/` (128+ files)
- After `npm run dev`, verify `public/docs/knowledge/modules.json` exists
- Check browser DevTools Network tab for 404s on `/docs/` requests
- AI Assistant: ask "Where does the fee amount get calculated?" — should return fee-service + fee calculation section from markdown docs as context sources

## Child DOX Index

No child directories with AGENTS.md exist under this subtree.

## Knowledge Source Integration

The portal loads its content from `docs/` at runtime (copied to `public/docs/`):
- `docs/knowledge/` — 15 normalized JSON files (the canonical knowledge graph)
- `docs/architecture/` — Architecture markdown documents
- `docs/flowcharts/` — Mermaid flowchart markdown files
- `docs/diagram-specifications/` — 59 JSON diagram specs
- `docs/api/` — API route reference markdown

## AI Assistant RAG Pipeline

The AI Assistant uses a two-tier retrieval strategy:

### Tier 1: Semantic Search (via Ollama Embeddings)
- **Service**: `src/services/embeddingService.ts` — indexes all knowledge graph entities + architecture markdown docs into vector embeddings
- **Default model**: `nomic-embed-text` (configurable via Settings panel)
- **Chunking**: `src/services/chunker.ts` — converts each knowledge graph entity (module, service, workflow, etc.) into a flat text chunk; splits architecture markdown by `##` headers into focused sections
- **Indexing**: Lazy on first query — all chunks are embedded via Ollama `/api/embeddings` and cached to `localStorage` (keyed by `podm-architecture-embeddings`). Unchanged chunks are reused on reload via content-hash comparison
- **Retrieval**: Query is embedded and cosine-similarity compared against all stored chunks; top 8 matches (min 0.12 score) are returned as context
- **Auto-pull**: If the embedding model is not available in Ollama, the user is prompted to download it via Ollama's `/api/pull` (with status progress)

### Tier 2: Keyword Fallback (Tokenized Substring)
- **Service**: `src/services/rag.ts` — when embeddings are not yet indexed or return zero results, falls back to keyword extraction
- **Keywords** are extracted from the query (stop words removed) and matched against entity name/description/method/step fields
- **Coverage**: modules, services, workflows, diagrams, entities, routes, agents, architecture overview
- No markdown doc content is available in fallback mode

### Infrastructure
- **Embedding model settings** pre-defined in `src/types/settings.ts` (`embeddingModel`, defaults to `nomic-embed-text`), configurable in AI Assistant settings panel
- **Ollama client** (`src/services/ollamaClient.ts`) extended with `embed()`, `isModelAvailable()`, and `pullModel()` methods using Ollama's `/api/embeddings` and `/api/pull` endpoints
- **Status indicator** in the AI Assistant toolbar shows index state (model available, indexing progress, indexed chunk count) with colors (warning/info/success)
