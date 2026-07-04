## Docker Local Development Architecture

**Diagram ID:** I-02

This diagram illustrates the local development environment started via `docker-compose up`, showing the frontend and backend containers, their configurations, and the external cloud services they connect to.

```mermaid
flowchart TB
    subgraph FC["Frontend Container (podm-frontend)"]
        direction TB
        F1["Node 18 Alpine (multi-stage)"]
        F2["Vite Dev Server (port 5173)"]
        F3["Volume: source code mount (hot reload)"]
        F4["Env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY"]
        F5["Vite proxy: /api to http://backend:5000"]
        F1 --> F2
    end

    subgraph BC["Backend Container (PoDM_project)"]
        direction TB
        B1["Node 18 Alpine"]
        B2["ts-node-dev (port 5000:5000)"]
        B3["Volume: source code mount (hot reload)"]
        B4["Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, R2_*, STRIPE_*, RPC_URL"]
        B1 --> B2
    end

    subgraph EXT["External Services (remote, not containerized)"]
        S1[("Supabase PostgreSQL")]
        R2[("Cloudflare R2 Storage")]
        ETH[("Ethereum RPC (Base network)")]
        OAI[("OpenAI / OpenRouter API")]
    end

    FC -->|"/api requests proxied"| BC
    BC -->|"SQL + Auth queries"| S1
    BC -->|"File storage"| R2
    BC -->|"JSON-RPC calls"| ETH
    BC -->|"AI caption gen"| OAI

    W1["WARNING: No local PostgreSQL all DB via remote Supabase"]
    W2["WARNING: No Nginx Vite dev proxy handles routing"]
    W3["Frontend runs npm run dev (not production build)"]

    W1 -.-> BC
    W2 -.-> FC
    W3 -.-> FC

    style FC fill:#d4f1f9,stroke:#2c7da0
    style BC fill:#d4f1f9,stroke:#2c7da0
    style EXT fill:#f9e6d4,stroke:#a0662c
    style W1 fill:#fff3cd,stroke:#856404
    style W2 fill:#fff3cd,stroke:#856404
    style W3 fill:#fff3cd,stroke:#856404
```

The diagram highlights that this is a cloud-dependent development setup with no local PostgreSQL or Nginx. The frontend container runs Vite in development mode, proxying API requests directly to the backend container. Both containers mount source code for hot reload, and all persistent services (database, storage, blockchain, AI) are accessed remotely.
