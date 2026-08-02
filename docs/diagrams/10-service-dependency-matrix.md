> **Note**: All Stripe references in this document are historical. PoDM uses crypto-only payments (USDC on Base) as of v2.

# Service Dependency Matrix

> Phase 7 — Diagram Generation
> Generated: 2026-07-02

```mermaid
graph TD
  subgraph "Services with external deps"
    CP["cryptoPayment.service"]
    SS["subscription.service"]
    CS["content.service"]
    CRS["creator.service"]
    ADS["admin.service"]
    US["user.service"]
    SPS["support.service"]
    NS["notification.service"]
    AS["analytics.service"]
    AIS["ai.service"]
    EMS["email.service"]
    STS["storage.service"]
    MGS["message.service"]
  end

  subgraph "External Integrations"
    STRIPE["Stripe"]
    R2["Cloudflare R2"]
    SUPABASE["Supabase DB"]
    OPENAI["OpenAI"]
    SOCKET["Socket.IO"]
    SMTP["SMTP"]
    ETH["Ethereum RPC + BaseScan"]
  end

  subgraph "No-service modules (controller→model bypass)"
    ENCLAVE["enclave.controller → raw supabase"]
    REFERRAL["referral.controller → ReferralModel"]
    USER_C["user.controller → ContentModel"]
    NOTIF_C["notification.controller → NotificationModel"]
  end

  %% Inter-service edges
  SS --> CP
  SS --> MGS
  CS --> NS
  CS --> STS
  CRS --> AS
  CRS --> CP
  CRS --> STS
  ADS --> STS
  ADS --> EMS
  SPS -.->|"dynamic require()"| MGS
  US --> STS

  %% External deps
  CP --> STRIPE
  CP --> ETH
  STS --> R2
  AIS --> OPENAI
  MGS --> SOCKET
  EMS --> SMTP
  SS --> STRIPE

  %% All services use Supabase DB
  CP -.-> SUPABASE
  SS -.-> SUPABASE
  CS -.-> SUPABASE
  CRS -.-> SUPABASE
  ADS -.-> SUPABASE
  US -.-> SUPABASE
  SPS -.-> SUPABASE
  NS -.-> SUPABASE
  AS -.-> SUPABASE
```
