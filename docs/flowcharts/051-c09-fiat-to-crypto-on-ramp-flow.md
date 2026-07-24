## C-09: Fiat-to-Crypto On-Ramp Flow

Complete Coinbase On-Ramp lifecycle — fan purchases USDC via card, from session creation through webhook confirmation and subscription activation.

```mermaid
sequenceDiagram
    participant F as Fan
    participant FE as Frontend
    participant BE as Backend (Onramp Service)
    participant CA as Coinbase On-Ramp API
    participant CW as Coinbase Widget
    participant DB as Database

    F->>FE: Clicks "Buy USDC"
    FE->>BE: POST /api/v1/onramp/session { amount, walletAddress }
    BE->>CA: Coinbase On-Ramp API create session
    CA-->>BE: { session_url, session_id }
    BE->>DB: INSERT pending_transaction (type: onramp, status: pending)
    BE-->>FE: { session_url }
    FE->>CW: Opens Coinbase widget in iframe
    CW-->>FE: Fan completes card purchase
    CW->>CA: Transaction settled on-chain
    CA->>BE: Webhook: charge:confirmed
    BE->>BE: HMAC signature verification
    alt Invalid HMAC signature
        BE-->>CA: 401 Unauthorized
        Note over BE: No retry — webhook discarded
    end
    BE->>DB: UPDATE transaction SET status = 'confirmed'
    alt Transaction linked to subscription
        BE->>DB: Activate or extend subscription
    end
    BE-->>CA: 200 OK (webhook acknowledged)
    Note over BE,CA: Balance race window: webhook may arrive after manual form resubmission
    Note over BE: HMAC secret loaded from env var, not configurable at runtime
```

Shows the complete Coinbase On-Ramp lifecycle from the fan clicking "Buy USDC" through session creation, widget interaction, webhook callback with HMAC verification, transaction status update, and conditional subscription activation. Annotations note the HMAC failure path and the balance race window.
