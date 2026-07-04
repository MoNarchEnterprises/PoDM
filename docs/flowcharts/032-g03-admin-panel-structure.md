## G-03: Admin Panel Structure & Data Sources

Mapping of all 8 admin panels to their backend routes, services, models, and DB tables.

```mermaid
flowchart TD
    subgraph Dashboard["1. Dashboard"]
        D_Route["GET /admin/dashboard"]
        D_Service["admin.getDashboardStats()"]
        D_Tables["Tables: profiles,<br/>transactions,<br/>support_tickets"]
        D_Mode["Read-only"]
    end

    subgraph Users["2. Users"]
        U_Route["GET /admin/users<br/>GET /admin/users/:id"]
        U_Service["admin.getAllUsers()<br/>admin.getUserDetails()"]
        U_Tables["Tables: profiles,<br/>transactions,<br/>subscriptions"]
        U_Mode["Read-only"]
    end

    subgraph Analytics["3. Analytics"]
        A_Route["GET /admin/analytics"]
        A_Service["admin.getAnalytics()"]
        A_Tables["Tables: transactions,<br/>analytics_events"]
        A_Mode["Read-only"]
    end

    subgraph Moderation["4. Content Moderation"]
        M_Route["GET /admin/content/flagged<br/>POST /admin/content/:id/approve<br/>POST /admin/content/:id/remove"]
        M_Service["admin.getFlaggedContent()<br/>admin.approveContent()<br/>admin.removeContent()"]
        M_Tables["Tables: content,<br/>reports"]
        M_Mode["Read-Write"]
    end

    subgraph Tickets["5. Support Tickets"]
        T_Route["GET /admin/support/tickets<br/>POST /admin/support/tickets/:id/reply<br/>POST /admin/support/tickets/:id/resolve"]
        T_Service["admin.getAllTickets()<br/>admin.replyToTicket()<br/>admin.resolveTicket()"]
        T_Tables["Tables: support_tickets"]
        T_Mode["Read-Write"]
    end

    subgraph Reports["6. Reports"]
        R_Route["GET /admin/reports"]
        R_Service["admin.getCustomReport()"]
        R_Tables["Tables: multiple<br/>(custom query builder)"]
        R_Mode["Read-only"]
    end

    subgraph Settings["7. Settings"]
        S_Route["GET /admin/settings<br/>PUT /admin/settings"]
        S_Service["admin.getSettings()<br/>admin.updateSettings()"]
        S_Tables["Tables: platform_settings"]
        S_Mode["Read-Write"]
    end

    subgraph Verification["8. Verification Docs"]
        V_Route["GET /admin/users/:id/verification-docs"]
        V_Service["admin.getVerificationDocs()<br/>storage.getPrivateSignedUrl()"]
        V_Source["Source: R2<br/>(profile.verification_data JSONB<br/>has file paths)"]
        V_Mode["Read-only"]
    end

    subgraph Middleware["Common Middleware"]
        MW["protectAndAdmin — required for all panels"]
    end

    MW --> Dashboard
    MW --> Users
    MW --> Analytics
    MW --> Moderation
    MW --> Tickets
    MW --> Reports
    MW --> Settings
    MW --> Verification

    style MW fill:#f44336,color:#fff
```

All panels require the `protectAndAdmin` middleware. 🔴 **No admin audit trail** — there is no `admin_action_log` table recording admin operations.
