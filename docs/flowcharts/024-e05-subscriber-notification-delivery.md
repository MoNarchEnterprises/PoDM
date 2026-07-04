## E-05: Subscriber Notification Delivery Flow

Flowchart showing how new content notifications are delivered to subscribers, with fire-and-forget semantics.

```mermaid
flowchart TD
    A["Trigger: Content published<br/>content.service.ts:298-301"] --> B["notifySubscribersOfNewContent(creatorId, contentId)<br/>Fire-and-forget via .catch()"]
    B --> C["SubscriptionModel.findActiveByCreator(creatorId)<br/>WHERE status = 'active'"]
    C --> D{"For each subscriber"}
    D --> E{"preferences.notifications<br/>.newContent enabled?"}
    E -->|"Disabled"| F["Skip subscriber"]
    E -->|"Enabled"| G["NotificationModel.create({<br/>  userId,<br/>  type: 'new_content',<br/>  referenceId: contentId,<br/>  message<br/>})"]
    G --> H["INSERT into notifications table"]
    H --> I["Failure: each .create() is independent<br/>One failure doesn't affect others"]
    I --> D
    F --> D
    D --> J["Done — No Socket.IO push<br/>Notifications loaded on next page load<br/>REST GET /api/v1/notifications"]

    style A fill:#2196f3,color:#fff
    style J fill:#ff9800,color:#fff
```

Three issues are flagged: 🔴 **No real-time delivery** — notifications are persisted to DB but never pushed via Socket.IO; 🟡 **Fire-and-forget** — the entire method is `.catch()`'d, silently swallowing errors; 🟡 **Per-notification failure isolation** is good — one subscriber failure does not cascade.
