## C-10: Subscription Renewal Batch Processing

Scheduled batch job that processes expired auto-renew subscriptions — queries expired records, determines payment method (crypto vs stripe), attempts renewal, and handles success/failure per subscriber.

```mermaid
sequenceDiagram
    participant CR as Cron Scheduler
    participant JS as Job (renewSubscriptions.ts)
    participant CP as Crypto Payment Service
    participant SP as Stripe SDK
    participant BC as Blockchain (Ethers RPC)
    participant DB as Database

    CR->>JS: Trigger: process expired auto-renew subscriptions
    JS->>DB: SELECT * FROM subscriptions WHERE status = 'active' AND end_date < NOW() AND auto_renew = true
    DB-->>JS: List of expired subscriptions
    loop Each expired subscription
        JS->>JS: Determine payment method from subscription record
        alt Crypto (USDC on Base)
            JS->>BC: Query blockchain for USDC transfer to contract address within grace period
            BC-->>JS: { txFound: true, amount, blockNumber }
            alt Sufficient transfer found
                JS->>DB: UPDATE subscription SET end_date = end_date + interval, updated_at = NOW()
                JS->>DB: INSERT transaction record (renewal)
            else Insufficient or no transfer
                JS->>DB: UPDATE subscription SET status = 'past_due'
                Note over JS: Grace period: subscriber can still renew within window
            end
        else Stripe card
            JS->>SP: Charge saved payment method for subscription amount
            alt Charge succeeded
                SP-->>JS: { chargeId, status: succeeded }
                JS->>DB: UPDATE subscription SET end_date = end_date + interval
                JS->>DB: INSERT transaction record (stripe_renewal)
            else Charge failed
                SP-->>JS: { error: card_declined }
                JS->>DB: UPDATE subscription SET status = 'past_due'
            end
        end
    end
    Note over JS: Per-subscriber error isolation: one renewal failure does not stop the batch
    Note over JS: No idempotency key — risk of double-charge if job re-runs
```

Shows the scheduled batch renewal job querying expired auto-renew subscriptions, branching on crypto-vs-stripe payment method, attempting the renewal on-chain or via Stripe charge, and updating the subscription status on success or failure. Annotations note the per-subscriber isolation, grace period, and missing idempotency key.
