## F-04: Support Ticket State Diagram

State diagram for the support ticket lifecycle with three states and implicit transitions in service methods.

```mermaid
stateDiagram-v2
    [*] --> Open: User creates ticket<br/>POST /api/v1/support/tickets
    Open --> Pending: Admin views or replies to ticket
    Pending --> Open: User replies to ticket
    Open --> Resolved: Admin resolves ticket
    Pending --> Resolved: Admin resolves ticket

    note right of Open
        Created by user or
        re-opened when user
        replies to a Pending ticket
    end note

    note right of Pending
        Admin has viewed/replied;
        waiting for user response
    end note

    note right of Resolved
        Terminal state —
        no re-open supported
    end note
```

Three gaps are noted: ⚠️ **No `Closed` state** — only `Resolved` exists; ⚠️ **No re-open from `Resolved`** — once resolved the ticket is terminal; ⚠️ State transitions are implicit in service methods and not enforced at the DB level (no CHECK constraint on status).
