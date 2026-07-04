## E-04: Creator Broadcast Message Delivery

Sequence diagram for creator broadcast (mass message) delivery to all active subscribers.

```mermaid
sequenceDiagram
    participant C as Creator
    participant MC as Message Controller
    participant MS as Message Service
    participant SM as Subscription Model
    participant DB as Supabase DB
    participant SK as Socket.IO
    participant F as Subscribers (Fan Group)

    C->>MC: POST /api/v1/messages/mass-message { subject, body }
    MC->>MS: sendMassMessage(creatorId, { subject, body })
    MS->>SM: SubscriptionModel.findActiveByCreator(creatorId)
    SM->>DB: SELECT FROM subscriptions<br/>WHERE creator_id=? AND status='active'
    DB->>SM: Array of subscriber records (with preferences)
    SM->>MS: Subscriber list

    loop For each subscriber
        MS->>MS: Check preferences.notifications.massMessages<br/>Skip if opted out
        MS->>MS: sendDirectMessage(creatorId, subscriberId, { subject, body })
        MS->>DB: INSERT into messages table
        MS->>SK: Broadcast new_message to subscriber's room
    end

    MS->>MC: { success: true, deliveredCount: N, skippedCount: M }
    MC->>C: Broadcast result
```

Three issues are flagged: 🔴 **N+1 query pattern** — one query fetches subscribers then N individual `sendDirectMessage` calls; 🟡 **Fire-and-forget** — no retry on individual message failure; 🟡 **No rate limiting** — creator could send unlimited broadcasts.
