## G-02: Admin Moderation Workflow

Sequence diagram for content moderation from user report through admin action (approve or remove).

```mermaid
sequenceDiagram
    participant U as User (Fan)
    participant CS as Content Service
    participant DB as Supabase DB
    participant AS as Admin Service
    participant A as Admin

    U->>CS: POST /api/v1/content/:id/report { reason }
    CS->>DB: INSERT into reports table<br/>{ contentId, reporterId, reason, created_at }
    CS->>DB: SELECT COUNT(*) FROM reports<br/>WHERE content_id = ?
    DB->>CS: Report count
    CS->>CS: If count >= 3 →<br/>Update content status to 'flagged'
    DB->>CS: Acknowledged
    CS->>U: Report submitted

    Note over U,A: Admin opens moderation panel

    A->>AS: GET /api/v1/admin/content/flagged
    AS->>DB: SELECT FROM content<br/>WHERE status = 'flagged'<br/>Enriched with reportCount and creator info
    DB->>AS: Flagged content list
    AS->>A: Flagged content with metadata

    Note over A,DB: Admin action — approve
    A->>AS: POST /api/v1/admin/content/:id/approve
    AS->>DB: UPDATE content status → 'published'
    AS->>DB: DELETE all reports for this content<br/>(auto-dismiss)
    AS->>A: Content restored

    Note over A,DB: Admin action — remove
    A->>AS: POST /api/v1/admin/content/:id/remove
    AS->>DB: UPDATE content status → 'removed'
    AS->>A: Content removed<br/>(No notification to creator)
```

Three issues are flagged: 🟡 **No creator notification** — creator is not notified when their content is flagged or removed; 🟡 **Auto-dismiss on approve** — all reports are deleted so there is no audit trail of past reports; 🔴 **No appeal mechanism** — the creator cannot appeal a removal decision.
