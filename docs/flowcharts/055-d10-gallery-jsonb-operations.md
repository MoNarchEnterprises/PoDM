## D-10: Gallery JSONB Operations

Three gallery operations on the `creator_profiles.gallery` JSONB array — add, remove, and reorder content items with ownership validation and error paths.

```mermaid
flowchart TD
    Start(["Gallery Operation Request\n(type, contentId, orderedIds)"])
    Type{"Operation Type"}
    
    Type -->|Add| AddPath
    Type -->|Remove| RemovePath
    Type -->|Reorder| ReorderPath
    
    subgraph Add["Add Operation"]
        direction TB
        A1["Verify content ownership:\ncontent.creator_id === currentUser.id"]
        A2{"Gallery max limit?\n(current array length >= 50)"}
        A3{"Content already in\ngallery JSONB array?"}
        A4["Append content ID\nto JSONB array:\ngallery || contentId"]
        A5["UPDATE creator_profiles\nSET gallery = new_array\nWHERE id = currentUser.id"]
        
        A1 --> A2
        A2 -->|Yes: at limit| A2No["Reject: gallery full\n(max 50 items)"]
        A2 -->|No: under limit| A3
        A3 -->|Yes: already present| A3No["Reject:\nalready in gallery"]
        A3 -->|No: not present| A4 --> A5
    end
    
    subgraph Remove["Remove Operation"]
        direction TB
        R1["Read current gallery JSONB array\nSELECT gallery FROM creator_profiles"]
        R2["Filter out content ID:\narray_filter(gallery, id != targetId)"]
        R3["UPDATE creator_profiles\nSET gallery = filtered_array\nWHERE id = currentUser.id"]
        
        R1 --> R2 --> R3
    end
    
    subgraph Reorder["Reorder Operation"]
        direction TB
        O1["Validate all content IDs\nbelong to this creator:\nSELECT id FROM content WHERE\nid = ANY(orderedIds) AND creator_id = ?\n(count should match orderedIds length)"]
        O2{"All IDs belong\nto creator?"}
        O3["Set ordered array:\norderedIds as JSONB"]
        O4["UPDATE creator_profiles\nSET gallery = ordered_array\nWHERE id = currentUser.id"]
        
        O1 --> O2
        O2 -->|No| O2No["Reject:\ninvalid content IDs in request"]
        O2 -->|Yes| O3 --> O4
    end
    
    A5 --> Done(["Operation Complete"])
    R3 --> Done
    O4 --> Done
    
    style A2No fill:#ffe0e0,stroke:#333
    style A3No fill:#ffe0e0,stroke:#333
    style O2No fill:#ffe0e0,stroke:#333
    
    Note over Add,Reorder: All operations are fully reversible — no cascading effects
```

Shows the three gallery operations on the `creator_profiles.gallery` JSONB array: Add (ownership check, max 50 limit, dedup), Remove (filter by ID), and Reorder (ownership validation, ordered array set). Error paths highlighted in red. All operations are fully reversible.
