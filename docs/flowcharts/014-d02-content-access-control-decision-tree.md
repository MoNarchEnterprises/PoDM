## D-02: Content Access Control Decision Tree

Shows the content access decision pipeline in content.service.ts (lines 461-502) as a 9-decision-node flowchart from initial request through subscription, tier, PPV, and watermark checks.

```mermaid
flowchart TD
    Start["Access Request: viewer requests content"]
    Start --> Q1{Is viewer the creator?}

    Q1 -->|"Yes"| FullAccess["FULL ACCESS<br/>No restrictions"]
    Q1 -->|"No"| Q2{Is content subscribers_only?}

    Q2 -->|"No"| Q3{Is content PPV?}
    Q3 -->|"No"| FullAccess

    Q2 -->|"Yes"| Q4{Does fan have active subscription?}
    Q4 -->|"No"| LockedSubscribe["LOCKED<br/>Subscribe prompt"]
    Q4 -->|"Yes"| Q5{Is min_tier_level set?}

    Q5 -->|"No"| UnlockedSub["UNLOCKED<br/>Subscriber access granted"]
    Q5 -->|"Yes"| Q6{Does fan's subscription tier meet requirement?}
    Q6 -->|"No"| LockedTier["LOCKED<br/>Tier upgrade prompt"]
    Q6 -->|"Yes"| Q7{Is content PPV?}

    Q3 -->|"Yes"| Q8{Has fan purchased this content?}
    Q7 -->|"No"| UnlockedSub
    Q7 -->|"Yes"| Q8

    Q8 -->|"Yes"| Q9{Is content a photo?}
    Q9 -->|"Yes"| UnlockedWatermark["UNLOCKED<br/>With watermark overlay"]
    Q9 -->|"No"| Unlocked["UNLOCKED"]
    Q8 -->|"No"| LockedPPV["LOCKED<br/>PPV purchase prompt<br/>Blurred preview shown"]

    FullAccess --> End
    LockedSubscribe --> End
    UnlockedSub --> End
    LockedTier --> End
    UnlockedWatermark --> End
    Unlocked --> End
    LockedPPV --> End

    Note1["CSS-blur bypass possible via browser DevTools<br/>Server never serves full content without access check"]
    Note2["Watermark security degradation: if watermarking fails, original unwatermarked file is served"]
```

Traces the 9 decision nodes: creator check (bypass all), subscribers_only flag, subscription validity, min_tier_level requirement, PPV flag, transaction-based purchase check, and watermark overlay for photos. Annotations highlight the CSS-blur bypass risk and watermark security degradation fallback.
