## G-04: Verification Document Access Flow

Sequence diagram for admin access to creator verification documents via Cloudflare R2 signed URLs.

```mermaid
sequenceDiagram
    participant A as Admin
    participant AC as Admin Controller
    participant AS as Admin Service
    participant SS as Storage Service
    participant R2 as Cloudflare R2
    participant DB as Supabase DB

    A->>AC: GET /api/v1/admin/users/:id/verification-docs
    AC->>AS: getVerificationDocs(userId)
    AS->>DB: SELECT verification_data<br/>FROM profiles WHERE id = ?
    DB->>AS: JSONB { idFilePath, selfieFilePath, ... }
    AS->>AS: Check idFilePath and selfieFilePath exist
    AS->>SS: getPrivateSignedUrl(idFilePath, 60)
    SS->>R2: s3.getSignedUrl('getObject',<br/>{ Bucket, Key, Expires: 60 })
    R2->>SS: Signed URL for ID document
    AS->>SS: getPrivateSignedUrl(selfieFilePath, 60)
    SS->>R2: s3.getSignedUrl('getObject',<br/>{ Bucket, Key, Expires: 60 })
    R2->>SS: Signed URL for selfie
    SS->>AS: Both signed URLs
    AS->>AC: { idDocumentUrl, selfieUrl }<br/>Valid for 60 seconds
    AC->>A: Admin views ID and selfie<br/>in VerificationDetailPanel
```

Three issues are flagged: 🔴 **PII sensitivity** — ID documents contain full name, date of birth, address, and ID number transmitted via temporary URL; 🟡 **60-second window** — URLs expire quickly but are logged in browser history / network tab; 🟡 **No access audit** — no record of who viewed whose verification docs or when.
