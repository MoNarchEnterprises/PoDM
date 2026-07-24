## C-11: Payout Balance Lock Flow

Concurrent payout lock mechanism — shows the balance computation, DB-level locking with `FOR UPDATE`, pending payout record as mutex, external transfer, and the race window without idempotency.

```mermaid
sequenceDiagram
    participant CR as Creator
    participant BE as Backend
    participant PS as Payout Service
    participant DB as Database
    participant EXT as External Transfer (Mocked)

    CR->>BE: Request payout { amount }
    BE->>PS: processPayout(creatorId, amount)
    PS->>PS: getPayoutBalance()
    PS->>DB: SELECT COALESCE(SUM(cleared_amount), 0) FROM transactions WHERE creator_id = ? AND status = 'cleared'
    DB-->>PS: total_cleared
    PS->>DB: SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE creator_id = ? AND type = 'payout' AND status = 'pending'
    DB-->>PS: total_pending
    PS->>PS: available_balance = total_cleared - total_pending
    alt Available balance < requested amount
        PS-->>BE: Error: insufficient funds
        BE-->>CR: Payout rejected
    end
    PS->>DB: BEGIN TRANSACTION
    PS->>DB: SELECT available ... FOR UPDATE (row-level lock)
    PS->>PS: Re-verify balance sufficiency
    PS->>DB: INSERT transaction (type: payout, status: pending, amount) — acts as lock
    PS->>EXT: Execute external transfer (mocked off-ramp)
    alt Transfer success
        EXT-->>PS: { transferId: "tr_offramp_..." }
        PS->>DB: UPDATE transaction SET status = 'completed', external_id = ?
    else Transfer failure
        EXT-->>PS: { error: "insufficient liquidity" }
        PS->>DB: UPDATE transaction SET status = 'failed'
        Note over PS: Failed status releases the lock — balance available again
    end
    PS->>DB: COMMIT
    PS-->>BE: { payoutId, status, transferId }
    Note over PS: Race window: no idempotency key — duplicate request could create two pending locks
    Note over EXT: Off-ramp is MOCKED: always returns fake transfer ID — no real liquidity check
```

Shows the payout balance lock flow with DB-level locking (`FOR UPDATE`), the pending payout record serving as a mutex, the mocked off-ramp external transfer, and the commitment/rollback paths. Annotations flag the missing idempotency key and the mocked off-ramp.
