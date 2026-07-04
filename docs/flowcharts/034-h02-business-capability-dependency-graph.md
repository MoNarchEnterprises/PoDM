## H-02: Business Capability Dependency Graph

Dependency graph among all 20 business capabilities, organized into color-coded layers.

```mermaid
flowchart TD
    subgraph Enabling["Enabling Capabilities (Root)"]
        IAM["Identity & Access Management"]
        UP["User Profiles"]
        PS["Platform Settings"]
    end

    subgraph Core["Core Commerce Capabilities (Hub)"]
        PP["Payment Processing"]
        SC["Subscription Commerce"]
        TIP["Tipping"]
        PPV["PPV"]
    end

    subgraph Engagement["Engagement Capabilities"]
        CF["Content Feed"]
        CG["Content Gallery"]
        RTM["Real-Time Messaging"]
        NOT["Notifications"]
        CONT["Contests"]
    end

    subgraph Growth["Growth Capabilities"]
        REF["Referral System"]
        ENC["Enclave (Premium Tier)"]
    end

    subgraph Governance["Governance Capabilities"]
        AD["Admin Dashboard"]
        CM["Content Moderation"]
        ST["Support Tickets"]
        AN["Analytics"]
    end

    subgraph Productivity["Productivity Capabilities"]
        AIC["AI Captions"]
        BU["Bulk Upload"]
    end

    IAM --> PP
    IAM --> SC
    IAM --> TIP
    IAM --> PPV
    IAM --> CF
    IAM --> CG
    IAM --> RTM
    IAM --> NOT
    IAM --> CONT
    IAM --> REF
    IAM --> ENC
    IAM --> AD
    IAM --> CM
    IAM --> ST
    IAM --> AN
    IAM --> AIC
    IAM --> BU

    PP --> SC
    PP --> TIP
    PP --> PPV
    PP --> REF

    SC --> CF
    SC --> CONT

    RTM --> ST
    RTM --> NOT

    CF --> CM
    CG --> CM

    AD --> AN
    ST --> AD

    style IAM fill:#3f51b5,color:#fff
    style PP fill:#f44336,color:#fff
    style ENC fill:#9c27b0,color:#fff
```

**Payment Processing** is the most depended-on capability (5 dependents). **Content Feed** and **Content Gallery** share an identical data source (Content service). **Enclave** is the most isolated — it depends only on IAM.
