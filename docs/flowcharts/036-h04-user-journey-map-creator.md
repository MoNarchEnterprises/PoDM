## H-04: User Journey Map (Creator)

Journey diagram showing the creator's experience through 7 key milestones with emotional scoring and friction annotations.

```mermaid
journey
    title Creator User Journey
    section Signup
      Signup + verification – Select role → upload docs → wait: 2: Creator
    section Upload
      First content upload – Drag file → caption → publish: 3: Creator
    section Notify
      Subscriber notification – Content published → notified: 3: Creator
    section Earnings
      Earnings dashboard – View earnings → see balance: 4: Creator
    section Payout
      Payout request – Enter amount → submit → off-ramp: 2: Creator
    section Messaging
      Message fans – View conversations → DM → broadcast: 4: Creator
    section Contest
      Run contest – Create → set prize → select winner → announce: 4: Creator
```

Key friction points: 🔴 **Payout** — off-ramp is fully mocked, no real money received; 🟡 **Signup** — verification process is manual with no status updates; 🟡 **Upload** — synchronous thumbnail generation slows upload, 1GB memory buffer per file; 🟡 **Notify** — no real-time push to subscribers (see E-05); 🟡 **Messaging** — broadcast has N+1 query pattern (see E-04); 🟡 **Contest** — `Math.random()` winner selection with no verifiable fairness.
