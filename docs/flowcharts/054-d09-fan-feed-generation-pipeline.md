## D-09: Fan Feed Generation Pipeline

Fan requests their personalized feed — shows auth, subscription query, content fetch with pagination, enrichment with unlock status and signed URLs, and the empty-feed edge case.

```mermaid
sequenceDiagram
    participant FN as Fan
    participant FE as Frontend
    participant BE as Backend Server
    participant CS as Content Service
    participant DB as Database

    FN->>FE: Opens feed page
    FE->>BE: GET /api/v1/feed?page=1&limit=20 with Bearer token
    BE->>BE: Auth middleware: verify JWT, load user profile
    BE->>DB: SELECT creator_id FROM subscriptions WHERE fan_id = ? AND status = 'active'
    DB-->>BE: [creatorId1, creatorId2, ...]
    alt No active subscriptions
        BE-->>FE: { posts: [], hasMore: false, total: 0 }
        FE-->>FN: Empty feed state with "Subscribe to creators" prompt
    end
    BE->>DB: SELECT * FROM content WHERE creator_id = ANY(?) AND status = 'published' ORDER BY created_at DESC LIMIT 21
    DB-->>BE: Content rows (21 to detect hasMore)
    BE->>CS: enrichContentWithUnlockStatus(posts, fanId)
    CS->>CS: For each post: check subscription tier access, PPV purchase status
    CS->>CS: Generate signed URLs for accessible content (thumbnails + full files)
    CS->>CS: Check gallery inclusion status
    CS-->>BE: Enriched posts with unlock status, URLs, gallery info
    BE->>BE: Truncate to 20, set hasMore = length > 20
    BE-->>FE: { posts: [...], hasMore: boolean, total: count }
    FE-->>FN: Renders feed with locked/unlocked indicators
    Note over CS: enrichContentWithUnlockStatus makes N+1 queries per post — no batch enrichment
```

Shows the fan feed generation pipeline from request through auth, subscription discovery, paginated content query, enrichment with unlock status and signed URLs, and the empty-feed edge case when the fan has no active subscriptions. Annotations note the N+1 query pattern in enrichment.
