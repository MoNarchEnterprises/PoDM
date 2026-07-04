## C-05: Payout and Earnings Flow

Shows the creator payout request flow with earnings aggregation, balance validation, mocked off-ramp processing, and payout recording.

```mermaid
sequenceDiagram
    participant F as Frontend (Creator Dashboard)
    participant CC as Creator Controller
    participant CS as Creator Service
    participant DB as Supabase DB
    participant CPS as Crypto Payment Service
    participant O as Off-ramp Service (MOCKED)

    F->>CC: POST /api/v1/creators/payout { amount }
    CC->>CS: requestPayout(creatorId, amount)
    CS->>DB: SELECT SUM(creator_payout) FROM transactions WHERE creator_id = ? AND status = 'completed'
    DB-->>CS: totalEarnings
    CS->>DB: SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE creator_id = ? AND type = 'payout'
    DB-->>CS: totalPayouts

    Note over CS: Balance check<br/>availableBalance = totalEarnings - totalPayouts<br/>Reject if amount > availableBalance

    CS->>CPS: processPayout(creatorWallet, amount)
    CPS->>O: Convert platform balance to fiat/crypto and send
    O-->>CPS: { success: true, offRampTransferId: 'tr_offramp_<random>' }
    CPS->>DB: INSERT { type: 'payout', amount: -amount, creator_id, ... }
    DB-->>CPS: recorded
    CPS-->>CS: offRampTransferId
    CS-->>CC: Payout success with transfer ID
    CC-->>F: Payout confirmed

    Note over CS,O: Off-ramp is fully mocked - no real money movement
    Note over CS: Balance race condition - no DB-level locking between step 3 and 6; concurrent requests could double-spend
    Note over CS: No minimum payout threshold - any amount can be requested (even $0.01)
```

Traces the payout lifecycle: earnings aggregation, balance validation, mocked off-ramp processing, and payout recording. Annotations highlight the fully mocked off-ramp, race condition risk from missing DB-level locking, and absent minimum payout threshold.
