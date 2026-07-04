## D-07: Bulk Upload Pipeline

Shows the reusable bulk upload flow from the Drag & Drop zone through individual DraftCards with AI captioning to sequential publish-all.

```mermaid
sequenceDiagram
    participant U as User (Creator)
    participant BUP as BulkUploadPage
    participant DZ as DropZone
    participant DC as DraftCard
    participant API as apiClient
    participant BE as Backend API

    U->>BUP: Opens BulkUploadPage (empty state with DropZone)
    BUP->>DZ: Renders Drag & Drop zone (react-dropzone, accepts image/* + video/*)
    U->>DZ: Drops files or clicks to select
    DZ->>BUP: onDrop(acceptedFiles[]) - multiple files

    Note over BUP: For each file:<br/>- Generate local UUID<br/>- URL.createObjectURL(file) for preview
    BUP->>DC: Creates DraftCard per file (thumbnail preview + caption input + AI button)

    U->>DC: Clicks "AI Caption" on a draft
    DC->>API: generateCaption(file) -> POST /api/v1/ai/caption
    API->>BE: Forward request
    BE-->>API: Caption response
    API-->>DC: Caption displayed in textarea

    Note over DC: 5s delay between AI caption requests<br/>30s delay on 429 rate limit response

    U->>BUP: Clicks "Publish All"
    BUP->>DC: Iterates all DraftCards

    loop For each draft sequentially
        DC->>API: createContent(FormData) -> POST /api/v1/content
        API->>BE: Forward multipart upload (see D-03)
        BE-->>API: Content record
        API-->>DC: Content created - update status to "Published"
    end

    BUP-->>U: Shows final status per draft (success/failure)

    Note over BUP,DC: Sequential per-draft upload - long wait times for many files
    Note over BUP: No background queue - all processing happens in browser
    Note over BUP: No retry on individual draft failure - "Publish All" fails at first error unless error-handled
```

Traces the full user journey: DropZone file selection, per-file DraftCard creation, optional AI caption generation, and sequential "Publish All" execution. Annotations highlight the sequential upload bottleneck, lack of background queue, and single-failure vulnerability.
