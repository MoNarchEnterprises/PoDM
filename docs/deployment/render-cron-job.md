# Render Cron Job Configuration — Subscription Renewal

## Overview

The subscription renewal job (`server/jobs/renewSubscriptions.ts`) runs as a **Render Cron Job** — a separate service from the main API server. This ensures renewals are isolated, have their own logs, and don't block API requests.

## Render Dashboard Configuration

Create a new **Cron Job** service in the Render dashboard:

| Setting | Value |
|---|---|
| **Name** | `podm-renewal-cron` |
| **Region** | Same as API server (e.g., Oregon) |
| **Branch** | `main` |
| **Root Directory** | `PoDM_project` |
| **Build Command** | `npm install && npx tsc` |
| **Command** | `node dist/server/jobs/renewSubscriptions.js` |
| **Schedule** | `0 6 * * *` (daily at 6:00 AM UTC) |
| **Plan** | Starter ($1/mo — 512 MB RAM, 0.1 CPU) |

## Required Environment Variables

The cron job needs these env vars (same as the API server):

| Variable | Description |
|---|---|
| `KEEPER_PRIVATE_KEY` | Dedicated keeper wallet private key (NOT deployer key) |
| `BASE_RPC_URL` | Base mainnet RPC URL (e.g., Alchemy, Infura, or public) |
| `BASE_CONTRACT_ADDRESS` | PoDMPaymentProtocol proxy address |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `NODE_ENV` | `production` |

## Keeper Wallet Setup

1. Generate a new wallet (e.g., via MetaMask → Create Account)
2. Fund it with ~0.01 ETH on Base for gas (should last months for daily renewals)
3. Register it as a keeper on-chain:
   ```
   // Using Hardhat console or etherscan
   await contract.setKeeper("0xKEEPER_ADDRESS", true);
   ```
4. Set `KEEPER_PRIVATE_KEY` in Render env vars

## Gas Cost Estimation

Each `processRenewal` call costs ~100,000-150,000 gas. At Base L2 gas prices (~0.001 gwei):
- **Per renewal**: ~$0.001 (fractions of a cent)
- **50 creators × avg 10 subscribers = 500 renewals/month**: ~$0.50/month gas

## Monitoring

- Render provides logs for each cron job execution
- Failed runs are visible in the Render dashboard
- Consider adding Sentry DSN to the cron job env for error tracking

## Alternative: render.yaml (Infrastructure as Code)

If using `render.yaml` for deployment:

```yaml
services:
  - type: cron
    name: podm-renewal-cron
    runtime: node
    schedule: "0 6 * * *"
    buildCommand: npm install && npx tsc
    startCommand: node dist/server/jobs/renewSubscriptions.js
    rootDir: PoDM_project
    envVars:
      - key: KEEPER_PRIVATE_KEY
        sync: false
      - key: BASE_RPC_URL
        sync: false
      - key: BASE_CONTRACT_ADDRESS
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: NODE_ENV
        value: production
```
