## J-05: Crypto Security Gap Heatmap

Crypto security gap heatmap grouping 12 identified gaps across four architectural layers with severity color coding.

```mermaid
flowchart TD
    subgraph SmartContract["Smart Contract Layer - 3 gaps"]
        direction LR
        SC1["1. Immutable<br/>No upgrade mechanism"]:::med
        SC2["2. No pause<br/>No emergency stop"]:::med
        SC3["3. Missing type fields<br/>PaymentType not stored on-chain"]:::med
    end

    subgraph Backend["Backend Verification Layer - 4 gaps"]
        direction LR
        BE1["4. Sandbox 0x0000 bypass<br/>Skips on-chain verification"]:::crit
        BE2["5. Placeholder event topics<br/>Hardcoded placeholders"]:::crit
        BE3["6. Hardcoded contract addresses<br/>No address validation"]:::crit
        BE4["7. No RPC API keys<br/>Public endpoint, no rate limiting"]:::high
    end

    subgraph Frontend["Frontend Layer - 3 gaps"]
        direction LR
        FE1["8. Mocked wallet<br/>Fake 0x0000 txHash"]:::crit
        FE2["9. Dead Stripe endpoints<br/>Frontend calls return 404"]:::crit
        FE3["10. Raw fetch bypass<br/>Skips apiClient auth headers"]:::high
    end

    subgraph Infra["Infrastructure Layer - 2 gaps"]
        direction LR
        IN1["11. Mocked off-ramp<br/>Fake transfer ID, no real integration"]:::crit
        IN2["12. No webhooks<br/>Poll-based verification only"]:::crit
    end

    SmartContract --> Backend --> Frontend --> Infra

    classDef crit fill:#d32f2f,color:#fff,stroke:#b71c1c
    classDef high fill:#f57c00,color:#fff,stroke:#e65100
    classDef med fill:#fbc02d,color:#000,stroke:#f9a825
```

Twelve crypto security gaps organized by layer: Smart Contract (3 medium), Backend Verification (4 — 3 critical, 1 high), Frontend (3 — 2 critical, 1 high), Infrastructure (2 critical). Critical gaps include the `0x0000` sandbox bypass, placeholder event topics, hardcoded addresses, mocked wallet, dead Stripe endpoints, mocked off-ramp, and missing webhooks.
