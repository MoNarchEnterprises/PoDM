## G-01: Admin Dashboard Data Flow

Flowchart showing how the admin dashboard aggregates data from 5 parallel queries with `Promise.all()`.

```mermaid
flowchart TD
    A["Admin navigates to dashboard<br/>GET /api/v1/admin/dashboard"] --> B["protectAndAdmin middleware<br/>Ensures admin role"]
    B --> C["Admin Controller<br/>getDashboardStats(req, res)"]
    C --> D["Admin Service<br/>getDashboardStats()"]

    D --> E["Promise.all() — 5 parallel queries"]

    E --> Q1["UserModel.countAllUsers()<br/>SELECT COUNT(*) FROM profiles"]
    E --> Q2["UserModel.countActiveCreators()<br/>SELECT COUNT(*) FROM profiles<br/>WHERE role='creator' AND status='active'"]
    E --> Q3["TransactionModel.sumPlatformFeeForPeriod(30)<br/>SELECT COALESCE(SUM(platform_fee), 0)<br/>FROM transactions<br/>WHERE created_at > NOW() - INTERVAL '30 days'"]
    E --> Q4["SupportTicketModel.countOpenTickets()<br/>SELECT COUNT(*) FROM support_tickets<br/>WHERE status IN ('Open', 'Pending')"]
    E --> Q5["UserModel.getNewUsersOverTime(6)<br/>SELECT DATE_TRUNC('day', created_at), COUNT(*)<br/>FROM profiles<br/>WHERE created_at > NOW() - INTERVAL '6 months'<br/>GROUP BY 1 ORDER BY 1"]

    Q1 --> F
    Q2 --> F
    Q3 --> F
    Q4 --> F
    Q5 --> F

    F["Response:<br/>{ totalUsers, activeCreators,<br/>  platformFees30d, openTickets,<br/>  newUsersOverTime }"] --> G["Frontend: AdminDashboardPanel.tsx<br/>Renders 5 cards/charts"]

    style A fill:#2196f3,color:#fff
    style E fill:#ff9800,color:#fff
```

Three issues are flagged: 🟡 **No caching** — every dashboard page load runs 5 queries against potentially large tables; 🟡 **No error isolation** — if one query fails the entire `Promise.all` rejects and the dashboard shows an error; 🟡 **`sumPlatformFeeForPeriod` scans the transactions table** with no index on `created_at` with a partial `platform_fee IS NOT NULL`.
