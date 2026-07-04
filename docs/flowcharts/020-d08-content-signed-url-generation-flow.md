## D-08: Content Signed URL Generation Flow

Shows the signed URL generation flow for content files, iterating over the content.files array, skipping public URLs, and generating 3600-second S3 signed URLs for private files.

```mermaid
sequenceDiagram
    participant Caller as Caller (e.g., Content Service)
    participant CU as Content Utils (content.utils.ts)
    participant SS as Storage Service (storage.service.ts)
    participant R2 as Cloudflare R2

    Caller->>CU: generateSignedUrlsForContent(content)
    Note over CU: Iterate over content.files[] array

    loop For each file in content.files[]
        Note over CU: Check if URL already starts with 'http' (already public)
        alt URL is already public
            Note over CU: Skip - return URL as-is
        else File is private
            CU->>SS: getPrivateSignedUrl(path, 3600)
            SS->>R2: s3.getSignedUrl('getObject', { Bucket, Key, Expires: 3600 })
            R2-->>SS: Signed URL (valid for 3600 seconds = 1 hour)
            SS-->>CU: { signedUrl, contentType }
        end
    end

    Note over CU: Collect all signed URLs into array
    CU-->>Caller: { files: [{ signedUrl, contentType }, ...] }

    Note over CU,R2: 60-second vs 3600-second discrepancy: watermarked images use 60s (D-04), content files use 3600s. No documented reason.
    Note over R2: Signed URLs generated per-request - no caching layer; every page load triggers n S3 calls for n files
```

Shows the iteration over content files, public URL detection, S3 `getSignedUrl` call with 3600-second expiry, and response assembly. Annotations highlight the inconsistent expiry times with the watermarking flow and the per-request generation without caching.
