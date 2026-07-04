## Build and Deploy Pipeline (Frontend)

**Diagram ID:** I-04

This flowchart traces the frontend build pipeline from TypeScript source through type checking, bundling, and deployment to both production (Netlify) and preview (Cloudflare Pages) environments.

```mermaid
flowchart LR
    SRC["Source: TypeScript + React in podm-frontend/src/"]
    TSC["Type Checking: tsc"]
    BUILD["Build: vite build"]
    CSS["PostCSS + autoprefixer"]
    JS["Rollup bundler (code splitting with React.lazy())"]
    ASSETS["Content hashing for cache busting"]
    DIST["Output: podm-frontend/dist/ (HTML, JS, CSS, assets)"]
    NETLIFY["Netlify Deploy (production)"]
    CLOUD["Cloudflare Pages (preview branches)"]
    N1["Build: cd podm-frontend && npm run build"]
    N2["Publish dir: podm-frontend/dist/"]
    N3["SPA redirect: /* to /index.html"]
    N4["Security headers via netlify.toml (CSP, HSTS, X-Frame-Options)"]
    C1["Same build process as production"]
    C2["Deploys preview branches"]
    E1["Env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY"]
    E2["Env: VITE_API_URL, VITE_STRIPE_PUBLISHABLE_KEY"]
    E3["WARNING: JWT_SECRET in frontend .env (server secret exposed to client)"]
    W1["WARNING: No E2E tests run before deployment"]

    SRC --> TSC
    TSC --> BUILD
    BUILD --> CSS
    BUILD --> JS
    BUILD --> ASSETS
    CSS --> DIST
    JS --> DIST
    ASSETS --> DIST
    DIST --> NETLIFY
    DIST --> CLOUD
    NETLIFY --> N1
    NETLIFY --> N2
    NETLIFY --> N3
    NETLIFY --> N4
    CLOUD --> C1
    CLOUD --> C2
    SRC -.-> E1
    SRC -.-> E2
    SRC -.-> E3
    DIST -.-> W1

    style SRC fill:#e3f2fd,stroke:#1565c0
    style DIST fill:#c8e6c9,stroke:#2e7d32
    style NETLIFY fill:#d1c4e9,stroke:#4527a0
    style CLOUD fill:#ffe0b2,stroke:#e65100
    style E3 fill:#ffcdd2,stroke:#c62828
    style W1 fill:#fff3cd,stroke:#856404
```

The build pipeline runs TypeScript type checking followed by Vite bundling with PostCSS and Rollup. Output lands in `dist/` and is deployed to either Netlify (production, with SPA redirects and security headers) or Cloudflare Pages (preview branches). Notable issues include `JWT_SECRET` exposed in the frontend bundle and the absence of E2E tests before deployment.
