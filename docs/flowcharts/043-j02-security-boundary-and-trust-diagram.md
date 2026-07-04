## Security Boundary and Trust Diagram

**Diagram ID:** J-02

This flowchart defines four concentric trust zones from the trusted internal server network to external untrusted actors and maps data flows across each boundary, highlighting risks including XSS, JWT storage, and the sandbox bypass vulnerability.

```mermaid
flowchart TB
    subgraph ZONE1["Zone 1: Trusted Internal (dark green)"]
        direction TB
        Z1_SERVER["Express Server Process"]
        Z1_DB["Supabase PostgreSQL (database)"]
        Z1_ENV["Server-side Environment Variables"]
        Z1_BOUNDARY["Trust boundary: inside the Render/backend network"]
    end

    subgraph ZONE2["Zone 2: Partially Trusted (yellow-green)"]
        direction TB
        Z2_R2["Cloudflare R2 (S3-compatible storage)"]
        Z2_STRIPE["Stripe API (legacy payment intents)"]
        Z2_ETH["Ethereum RPC (Base network, read-only verification)"]
        Z2_AI["OpenRouter/OpenAI API (AI captions)"]
        Z2_RATIONALE["Outbound API calls to known providers over HTTPS with API keys"]
    end

    subgraph ZONE3["Zone 3: Untrusted Client (light red)"]
        direction TB
        Z3_BROWSER["Browser (React SPA)"]
        Z3_STORAGE["localStorage / sessionStorage (JWT stored here)"]
        Z3_MOBILE["Mobile / any HTTP client"]
        Z3_RATIONALE["Client-side code and storage can be inspected or modified by user"]
    end

    subgraph ZONE4["Zone 4: External Actors (red)"]
        direction TB
        Z4_FANS["End users (fans, creators)"]
        Z4_ADMIN["Admin users (elevated privileges but same untrusted client)"]
        Z4_ATTACKERS["Third-party attackers (internet)"]
    end

    Z1_SERVER <-->|"HTTPS encrypted"| Z3_BROWSER
    Z3_STORAGE -->|"JWT in Bearer header on every request"| Z1_SERVER
    Z1_SERVER -->|"R2 signed URLs (generated in Zone 1, consumed in Zone 3)"| Z3_BROWSER
    Z1_SERVER <-->|"JSON-RPC to Base (Zone 1 to Zone 2 and back)"| Z2_ETH
    Z1_SERVER <-->|"Base64 image upload to OpenAI"| Z2_AI
    Z3_BROWSER -->|"WARNING: Sandbox bypass fake 0x0000 txHash skips on-chain verification (weakened boundary)"| Z1_SERVER

    XSS["WARNING: XSS risk if attacker injects JS they can read JWT from localStorage"]
    NOCONSENT["WARNING: AI caption sends base64 image to OpenAI without user consent"]

    XSS -.-> Z3_STORAGE
    NOCONSENT -.-> Z2_AI

    style ZONE1 fill:#c8e6c9,stroke:#2e7d32,stroke-dasharray: 5 5
    style ZONE2 fill:#dcedc8,stroke:#689f38,stroke-dasharray: 5 5
    style ZONE3 fill:#ffcdd2,stroke:#c62828,stroke-dasharray: 5 5
    style ZONE4 fill:#ef9a9a,stroke:#b71c1c,stroke-dasharray: 5 5
    style XSS fill:#fff3cd,stroke:#f57f17
    style NOCONSENT fill:#fff3cd,stroke:#f57f17
```

The four trust zones progress from Trusted Internal (Express server, database, env vars) through Partially Trusted (R2, Stripe, Ethereum, AI APIs) and Untrusted Client (browser, localStorage) to External Actors. Key risk vectors include JWTs in localStorage susceptible to XSS, R2 signed URLs crossing trust boundaries, and the sandbox bypass where a fake transaction hash from an untrusted client skips on-chain verification in the trusted zone.
