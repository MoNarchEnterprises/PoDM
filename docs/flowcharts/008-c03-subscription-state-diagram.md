## C-03: Subscription State Diagram

Shows the subscription lifecycle with its minimal state machine -- only two states exist with no expiry, pause, or renewal mechanisms.

```mermaid
stateDiagram-v2
    [*] --> active : Crypto payment verified, transaction recorded
    active --> canceled : Fan requests cancellation via subscription.service.ts
    active --> [*] : Permanent access (one-time payment, no expiry)
    canceled --> [*] : Terminal state

    note right of active
        Initial state after crypto payment
        Fan has access to subscriber-only content
        stripe_subscription_id repurposed for crypto tx hash
    end note

    note right of canceled
        status set to 'canceled'
        canceled_at timestamped
    end note

    note left of active
        No expired state
        No paused state
        No billing renewal
        One-time crypto payment grants permanent access
    end note
```

Only two states exist (active and canceled) with no expired, paused, or renewal states. Subscriptions are permanent one-time crypto payments -- the `stripe_subscription_id` column is repurposed to store the crypto transaction hash.
