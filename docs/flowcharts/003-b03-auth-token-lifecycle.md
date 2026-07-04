## B-03: Auth Token Lifecycle

Shows the full JWT token lifecycle in the PoDM platform from creation through storage, transmission, verification, expiry handling, and logout.

```mermaid
sequenceDiagram
    participant F as Frontend (React)
    participant SA as Supabase Auth
    participant AM as Auth Middleware
    participant DB as Supabase DB
    participant AS as Auth Service

    Note over F,SA: 1. Creation
    F->>SA: supabase.auth.signInWithPassword(email, password)
    SA-->>F: { user, session } with access_token + refresh_token

    Note over F: 2. Storage<br/>localStorage / sessionStorage via useAuth.tsx

    Note over F,AM: 3. Transmission
    F->>AM: Authorization: Bearer token via apiClient.ts interceptor

    Note over AM: 4. Verification
    AM->>SA: supabase.auth.getUser(token)
    SA-->>AM: user payload

    Note over AM: 5. Session continuation<br/>Token reused for subsequent requests

    Note over F: 6. Expiry<br/>401 response intercepted by apiClient.ts<br/>clears token, redirects to login

    Note over F: 7. Logout<br/>supabase.auth.signOut() clears storage, redirects

    Note over F,SA: Refresh token gap<br/>No token rotation implemented<br/>User logged out mid-session with no silent refresh
    Note over F: localStorage XSS risk<br/>Token stored in plaintext
```

Traces the 7 lifecycle stages: creation via Supabase Auth sign-in, client-side storage, API transmission, middleware verification, session continuation, 401-based expiry handling, and logout cleanup. Annotations highlight the missing refresh token rotation and plaintext localStorage XSS vulnerability.
