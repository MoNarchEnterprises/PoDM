## D-04: Dynamic Watermarking Sequence

Shows the on-the-fly dynamic watermarking flow for photo content using sharp to composite a tiled @username SVG watermark, with temp upload and 60-second signed URL delivery.

```mermaid
sequenceDiagram
    participant F as Frontend
    participant CS as Content Service
    participant SS as Storage Service
    participant R2 as Cloudflare R2

    F->>CS: GET /api/v1/content/:id/watermarked

    Note over CS: Access control check (see D-02)
    Note over CS: If fan is creator -> skip watermark, serve original
    Note over CS: If photo + not creator -> proceed with watermark

    CS->>SS: downloadFromPrivate(originalKey)
    SS->>R2: s3.getObject({ Bucket, Key })
    R2-->>SS: File buffer
    SS-->>CS: Original full-resolution file buffer

    Note over CS: sharp(buffer) composite SVG text @{username}<br/>tiled diagonally across image, 25% opacity
    Note over CS: Convert result to WebP format

    CS->>SS: uploadToPrivate(tempKey, watermarkedBuffer, 'image/webp')
    SS->>R2: Upload to temp/wm-{fanId}-{timestamp}
    R2-->>SS: Upload success

    CS->>SS: getPrivateSignedUrl(tempKey, 60)
    SS->>R2: s3.getSignedUrl('getObject', { Key, Expires: 60 })
    R2-->>SS: Signed URL (60-second expiry)
    SS-->>CS: Signed URL

    CS-->>F: 302 redirect or return signed URL to watermarked image

    Note over CS: Security degradation: if ANY watermarking step fails (sharp error, R2 download failure, etc.),<br/>the original unwatermarked file is served instead
    Note over R2: Temp files in temp/ prefix are never cleaned up - no TTL mechanism
    Note over CS,SS: 60-second signed URL vs 3600-second for regular content (D-08) - no documented reason
```

Traces the watermark pipeline: access control check, original download from private R2, sharp-based SVG watermark composition (tiled @username at 25% opacity), temp upload, 60-second signed URL generation, and delivery. Annotations highlight the security degradation fallback and uncleaned temp files.
