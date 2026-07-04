## F-03: Analytics Pipeline

The analytics event lifecycle from user action to data consumption, highlighting scalability gaps.

```mermaid
flowchart TD
    A["User action triggers event:<br/>view content, visit profile,<br/>add to gallery, send tip"] --> B["Frontend request<br/>POST /api/v1/analytics/log<br/>{ eventType, targetId, metadata? }"]
    B --> C["Middleware: optionalProtect<br/>nullable req.user (can be anonymous)"]
    C --> D["Analytics Controller<br/>Validates event type against known enum"]
    D --> E["Analytics Service"]
    E --> F["Skip if admin or self<br/>(optionalProtect + filter)"]
    F --> G["INSERT into analytics_events<br/>{ viewer_id, event_type,<br/>  target_id, metadata_json, created_at }"]
    G --> H{"Is post_view?"}
    H -->|"Yes"| I["Postgres RPC:<br/>increment_content_view_count(contentId)<br/>→ updates content.stats.views JSONB"]
    H -->|"No"| J["Done"]
    I --> J

    subgraph Consumers["Data Consumers"]
        K["Creator dashboard:<br/>countEventsForCreator(creatorId, eventType, period)<br/>COUNT(*) query"]
        L["Admin dashboard:<br/>getDashboardStats()<br/>5 parallel queries (see G-01)"]
    end

    J --> K
    J --> L

    style A fill:#2196f3,color:#fff
    style G fill:#4caf50,color:#fff
```

Three issues are flagged: 🔴 **No data aggregation/caching** — every dashboard load runs raw `COUNT(*)` on the full table; 🔴 **Unbounded table growth** — `analytics_events` has no TTL, archive, or deletion policy; 🟡 **Guest tracking** works with nullable `viewer_id` but no privacy consideration is documented.
