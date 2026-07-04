## F-05: Contest Lifecycle State Diagram

State diagram for the contest lifecycle from draft through active, completed, or canceled.

```mermaid
stateDiagram-v2
    [*] --> draft: Creator creates contest<br/>status: 'draft'<br/>sets start_date + end_date
    draft --> active: Creator publishes contest<br/>status: 'active'
    draft --> canceled: Creator cancels before publishing
    active --> completed: Creator finalizes →<br/>winner selected<br/>status: 'completed'
    active --> canceled: Creator cancels<br/>during entry period
    active --> active: end_date passes<br/>(no auto-transition —<br/>creator must manually finalize)

    note right of draft
        Not yet visible to fans
    end note

    note right of active
        Fans can view and enter
        during entry period
    end note

    note right of completed
        No further entries accepted
    end note

    note right of canceled
        No mechanism to refund
        entry fees in current
        implementation
    end note
```

Two gaps are flagged: ⚠️ **No auto-complete** — when `end_date` passes the contest stays `active` and the creator must manually finalize; ⚠️ **No `canceled` entry refund** — if canceled during the active period, there is no mechanism to refund entry fees (entries are free with subscription check in the current implementation).
