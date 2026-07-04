## D-06: Content Lifecycle State Diagram

Shows the content lifecycle with 4 states (draft, published, flagged, removed) and all transitions including auto-flagging on 3 reports and admin bypass paths.

```mermaid
stateDiagram-v2
    [*] --> draft : Creator POSTs content with status: 'draft'
    draft --> published : Creator publishes or scheduled date reached
    published --> flagged : 3 user reports received (auto-flag via content.service.ts:reportContent)
    flagged --> published : Admin approves content (reports auto-dismissed)
    flagged --> removed : Admin removes content
    published --> removed : Admin directly removes (bypasses flagging)
    removed --> published : Admin restores content

    note right of draft
        Content visible only to creator in dashboard
    end note

    note right of published
        Content visible to audience based on access control rules
        Set via status: 'published'
    end note

    note right of flagged
        Content hidden pending admin review
        Auto-triggered after 3 reports
    end note

    note right of removed
        Content permanently inaccessible to all users
        Admin action only
    end note

    note left of draft
        No deleted state - hard delete only (DELETE endpoint removes permanently)
        No scheduled state - scheduling uses scheduled_date column, content stays in draft
        No archived state - no soft-delete mechanism
    end note
```

Shows the 4 content states and 7 transitions including creator actions (publish), automatic flagging (3 reports), admin actions (approve, remove, restore), and the direct admin removal bypass. Annotations note the missing deleted, scheduled, and archived states.
