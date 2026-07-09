# PoDM Architecture Intelligence Platform

Interactive architecture exploration platform for the PoDM application.

## Quick Start

```bash
# Prerequisite: pull the default embedding model (for AI Assistant semantic search)
ollama pull nomic-embed-text

npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
npm run preview
```

## Deploy

The platform is configured for Netlify deployment. Push the `architecture-portal/` folder and set build command to `npm run build` with publish directory `dist/`.

## Features

- **Architecture Dashboard** — Real-time overview of all architecture assets
- **Module Explorer** — Detailed module pages with services, entities, routes, workflows, and diagrams
- **Workflow Viewer** — Interactive workflow detail with main flow, alternatives, error paths, and diagrams
- **Mermaid Renderer** — Zoom, pan, fullscreen, export SVG/PNG/print
- **Interactive Graph** — React Flow dependency graph with filterable node types
- **Global Search** — Fuzzy search across all architecture artifacts (Ctrl+K)
- **AI Assistant** — RAG-powered chat using Ollama, context-aware architecture Q&A
- **Settings** — Ollama configuration, model selection, theme toggle

## Tech Stack

React 19, TypeScript, Vite, Material UI, React Flow, Mermaid, Fuse.js, Zustand, TanStack Query, Framer Motion
