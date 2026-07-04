## D-05: AI Caption Generation Flow

Shows the AI-powered caption generation flow from image upload through base64 encoding, OpenRouter API call, caption return, and later save as content.description.

```mermaid
sequenceDiagram
    participant F as Frontend (BulkUploadPage / DraftCard)
    participant AC as AI Controller (ai.controller.ts)
    participant AS as AI Service (ai.service.ts)
    participant AI as OpenRouter / OpenAI (gemma-3-27b-it:free)
    participant DB as Supabase DB

    F->>AC: POST /api/v1/ai/caption (image file multipart + optional context)
    Note over AC: Multer middleware - stores image in memory buffer
    AC->>AS: generateCaption(imageBuffer, context?)
    Note over AS: Base64 encode: imageBuffer.toString('base64')

    AS->>AI: OpenAI SDK call with model gemma-3-27b-it:free
    Note over AS,AI: Content: { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,...' } }<br/>System prompt: "Generate a short engaging caption for this image"
    AI-->>AS: Generated caption text (synchronous HTTP wait)
    AS-->>AC: Caption text
    AC-->>F: { caption: "Generated caption text..." }

    Note over F: Caption appears in textarea<br/>Creator can edit, accept, or regenerate

    F->>AC: POST /api/v1/content (caption saved as content.description)
    AC->>DB: INSERT content with description
    DB-->>AC: Content record
    AC-->>F: Content saved

    Note over AS,AI: No NSFW pre-check - image sent to third-party API without any content moderation pre-scan
    Note over AS: No audit trail - no record of what was sent to AI or what was generated
    Note over AS: No retry / idempotency - 429 or 5xx errors propagate directly to user
    Note over AS: Synchronous - frontend shows loading spinner until API responds; no streaming or background processing
```

Covers the caption generation flow: multipart upload, base64 encoding, OpenRouter API call with the gemma-3-27b-it model, caption return, and later save. Annotations highlight the missing NSFW pre-check, absent audit trail, no retry mechanism, and synchronous blocking nature.
