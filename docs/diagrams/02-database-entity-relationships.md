# Database Entity Relationships — ER Diagram

> Phase 7 — Diagram Generation
> Generated: 2026-07-02

```mermaid
erDiagram
  profiles ||--o{ content : "creates"
  profiles ||--o{ subscriptions : "fan subscribes to"
  profiles ||--o{ subscriptions : "creator owns tier"
  profiles ||--o{ transactions : "fan pays"
  profiles ||--o{ transactions : "creator receives"
  profiles ||--o{ messages : "sends"
  profiles ||--o{ conversations : "participates in"
  profiles ||--o{ galleries : "saves content to"
  profiles ||--o{ analytics_events : "generates events"
  profiles ||--o{ referral_codes : "generates"
  profiles ||--o{ referral_redemptions : "uses code"
  profiles ||--o{ enclave_applications : "submits"
  profiles ||--o{ support_tickets : "creates"
  profiles ||--o{ reports : "reports"
  profiles ||--o{ contests : "creates"
  profiles ||--o{ contest_entries : "enters"

  content ||--o{ galleries : "saved in"
  content ||--o{ analytics_events : "viewed"
  content ||--o{ transactions : "PPV payment for"
  content ||--o{ reports : "reported"
  content ||--o{ contest_entries : "entered in"

  subscriptions ||--o{ transactions : "billed through"

  conversations ||--o{ messages : "contains"

  referral_codes ||--o{ referral_redemptions : "redeemed"

  contests ||--o{ contest_entries : "has entries"

  profiles {
    uuid id PK
    text username UK
    text email UK
    text role "fan | creator | admin"
    text status "active | suspended | banned | pending_verification"
    text display_name
    text avatar_url
    text banner_url
    text bio
    text social_links JSONB
    text crypto_wallet_address
    text crypto_wallet_type "none | embedded | custom"
    text crypto_wallet_payout_preference
    timestamp created_at
    timestamp updated_at
  }

  content {
    uuid id PK
    uuid creator_id FK
    text title
    text description
    text file_urls JSONB
    text thumbnail_url
    text media_type "photo | video | audio | text"
    text visibility "subscribers_only | pay_per_view | public"
    int price "PPV price in cents"
    int min_tier_level
    boolean is_scheduled
    timestamp publish_date
    text status "active | deleted | flagged | removed"
    timestamp created_at
    timestamp updated_at
  }

  subscriptions {
    uuid id PK
    uuid fan_id FK
    uuid creator_id FK
    text tier_id FK
    text status "active | cancelled | expired | past_due"
    int amount_in_cents
    timestamp current_period_start
    timestamp current_period_end
    timestamp created_at
  }

  transactions {
    uuid id PK
    uuid fan_id FK
    uuid creator_id FK
    uuid content_id FK
    text type "Tip | Subscription | PPV | Payout | Refund"
    text status "Pending | Completed | Failed | Refunded | Cleared"
    int amount_in_cents
    int platform_fee
    int creator_payout
    text stripe_payment_intent_id
    text blockchain_tx_hash
    text payment_method "stripe | crypto"
    text payment_currency "USD | USDC"
    int chain_id
    timestamp created_at
  }

  messages {
    uuid id PK
    uuid conversation_id FK
    uuid sender_id FK
    text content
    text message_type "text | voice | ppv"
    boolean is_read
    boolean is_deleted
    timestamp created_at
  }

  conversations {
    uuid id PK
    jsonb participants
    timestamp last_message_at
    timestamp created_at
  }

  analytics_events {
    uuid id PK
    uuid fan_id FK
    uuid creator_id FK
    uuid content_id FK
    text event_type
    timestamp created_at
  }

  galleries {
    uuid id PK
    uuid fan_id FK
    uuid content_id FK
    timestamp saved_at
  }
```
