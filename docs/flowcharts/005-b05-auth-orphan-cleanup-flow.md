## B-05: Auth Orphan Cleanup Flow

Shows the signup flow with the fragile orphan cleanup mechanism when profile creation fails after auth user creation, leading to permanent orphan states.

```mermaid
sequenceDiagram
    participant F as Frontend
    participant AS as Auth Service
    participant SA as Supabase Auth
    participant DB as Supabase DB

    F->>AS: POST /api/v1/auth/signup { email, password, username, role }
    AS->>SA: supabase.auth.signUp({ email, password })
    SA-->>AS: { user, session }

    AS->>DB: INSERT INTO profiles (id, username, role, ...)

    alt Profile creation succeeds
        AS-->>F: Return success
    else Profile creation fails (DB error)
        AS->>SA: supabase.admin.deleteUser(authUser.id)
        alt Delete succeeds
            AS-->>F: Return error (orphan avoided)
        else Delete fails
            Note over AS,SA: ORPHAN CREATED<br/>Auth user exists without profile<br/>User can never log in
            AS-->>F: Return error
        end
    end

    Note over AS,DB: No DB transaction - profile INSERT not wrapped in Supabase transaction
    Note over AS,DB: Race window between auth user creation and profile insert
    Note over AS,SA: If cleanup fails: permanent orphan auth user, login succeeds but profile fetch fails
```

Traces the signup flow through auth service, Supabase Auth user creation, and profile table insert. Annotations highlight the missing DB transaction, race window exposure, and irreversible orphan state when cleanup fails.
