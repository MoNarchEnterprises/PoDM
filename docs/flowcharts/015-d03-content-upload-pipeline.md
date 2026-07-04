## D-03: Content Upload Pipeline (Media Processing)

Shows the detailed content upload pipeline from frontend multipart upload through MIME filtering, R2 storage with retry, thumbnail generation, DB recording, and cleanup on failure.

```mermaid
sequenceDiagram
    participant F as Frontend
    participant UM as Upload Middleware (Multer)
    participant CS as Content Service
    participant SS as Storage Service
    participant R2 as Cloudflare R2
    participant DB as Supabase DB
    participant NS as Notification Service

    F->>UM: POST /api/v1/content (multipart/form-data: file + metadata)
    Note over UM: Multer parses multipart - stores file in memory buffer (1GB limit)
    Note over UM: MIME type filter - only image/* and video/* allowed
    UM->>CS: req.file (buffer) + req.body (metadata)

    CS->>SS: uploadToPrivate(originalKey, buffer, mimeType)
    Note over CS,SS: 3 retries with exponential backoff (only workflow with retry)
    SS->>R2: s3.putObject({ Bucket, Key, Body, ContentType })
    R2-->>SS: ETag
    SS-->>CS: Upload result

    alt Image file
        Note over CS: sharp(buffer).resize(400,400).webp({ quality: 80 })
    else Video file
        Note over CS: ffmpeg(buffer).seek(1).frames(1).size('400x?')
    end

    CS->>SS: uploadToPrivate(thumbnailKey, thumbnailBuffer, 'image/webp')
    SS->>R2: Upload thumbnail
    R2-->>SS: ETag
    SS-->>CS: Thumbnail upload result

    Note over CS: Assemble file URLs: originalUrl, thumbnailUrl, contentType
    CS->>DB: INSERT into content { status: 'published', ... }

    alt DB insert fails
        CS->>SS: Cleanup - delete original and thumbnail from R2
    end

    CS->>NS: notifySubscribersOfNewContent(creatorId, contentId)
    Note over CS,NS: Fire-and-forget (.catch())
    CS-->>F: Return created content record

    Note over UM: 1GB memory buffer - entire file loaded in RAM before upload; OOM risk for large files
    Note over CS: Synchronous thumbnail generation - blocks request until both upload and thumbnail complete
    Note over R2: No CDN cache layer - signed URLs generated per-request
```

Covers the per-file pipeline: multipart parsing, MIME filtering, R2 upload with 3-retry exponential backoff, sharp/ffmpeg thumbnail generation, DB insert with cleanup on failure, and fire-and-forget subscriber notification. Annotations highlight the 1GB memory buffer risk, synchronous blocking, and missing CDN cache layer.
