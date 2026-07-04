## B-06: Password Reset Flow

Shows the forgot password and password reset flow with email-enumeration prevention, redirect-based token delivery, and admin API password update.

```mermaid
sequenceDiagram
    participant F as Frontend
    participant AS as Auth Service
    participant SA as Supabase Auth
    participant E as SMTP / Supabase Email

    F->>AS: POST /api/v1/auth/forgot-password { email }
    AS->>SA: supabase.auth.resetPasswordForEmail(email)
    SA->>E: Sends password reset email with redirect link
    SA-->>AS: Returns success (always, even if email not found)
    AS-->>F: { message: "If account exists, reset email sent" }

    Note over F: User clicks link in email

    F->>SA: Redirect to reset page with access token in URL
    F->>AS: POST /api/v1/auth/reset-password { password }
    AS->>SA: supabase.admin.updateUserById(userId, { password })
    SA-->>AS: Success
    AS-->>F: Password reset confirmed

    Note over AS,SA: Email-enumeration prevention: always returns success regardless of email existence
    Note over F: Existing sessions not invalidated - other logged-in devices remain active
    Note over AS: Requires Supabase service_role key for admin API password update
```

Covers the forgot-password request, email sending via Supabase, always-success response for enumeration prevention, the redirect with access token, and the admin-API password update. Annotations note the lack of session invalidation and the service_role key requirement.
