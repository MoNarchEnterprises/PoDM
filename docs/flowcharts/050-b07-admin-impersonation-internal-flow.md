## B-07: Admin Impersonation Internal Flow

Server-side impersonation header processing within the `protect` middleware — shows JWT validation, role check, user swap, audit log write, and failure paths.

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Frontend
    participant BE as Backend Server
    participant MW as Auth Middleware (protect)
    participant DB as Database

    A->>FE: Clicks impersonate user
    FE->>BE: API request with X-Admin-Impersonate header (userId)
    BE->>MW: protect middleware invoked
    MW->>MW: Validate JWT from Authorization header
    MW->>MW: Verify admin role from decoded token
    MW->>DB: Query target user by ID
    DB-->>MW: User record found
    alt Target user not found
        DB-->>MW: null
        MW-->>BE: 404 response — admin continues as self
    end
    MW->>MW: Store original admin in req.originalUser
    MW->>MW: Swap req.user to impersonated user
    MW->>MW: Write audit log entry (adminId, targetId, timestamp)
    MW-->>BE: Request proceeds with swapped identity
    BE-->>FE: Response as impersonated user
    Note over MW,DB: Fallback: on DB query error, admin continues as self without impersonation
    Note over MW: No structured audit trail — log is console-only
```

Shows the 5-step impersonation flow inside the `protect` middleware: JWT validation, role check, target user lookup, identity swap with `req.originalUser`, and audit log write. Annotations note the 404 fallback and the missing structured audit trail.
