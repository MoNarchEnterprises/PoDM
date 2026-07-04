## Database Migration Timeline

**Diagram ID:** I-03

This Gantt chart presents the chronological sequence of over 15 SQL migrations run against the Supabase PostgreSQL database, grouped by feature area. Post-launch patches are distinguished from original migrations.

```mermaid
gantt
    dateFormat YYYY-MM-DD
    title Database Migration Timeline

    section Foundation
    create_profiles_and_auth.sql           :a1, 2024-01-01, 7d
    create_content_table.sql               :a2, after a1, 5d

    section Payments
    create_transactions.sql                :a3, after a2, 5d
    create_subscriptions.sql               :a4, after a3, 4d
    add_platform_fee_fields.sql            :a5, after a4, 3d

    section Messaging
    create_messages_conversations.sql      :a6, after a5, 7d
    add_voice_message_support.sql          :a7, after a6, 3d

    section Analytics
    create_analytics_events.sql            :a8, after a7, 5d
    create_analytics_summary.sql           :a9, after a8, 5d

    section Admin and Settings
    create_platform_settings.sql           :a10, after a9, 5d
    create_support_tickets.sql             :a11, after a10, 5d

    section Content
    create_content_related.sql             :a12, after a11, 5d
    update_content_schema.sql              :crit, a13, after a12, 3d

    section Engagement
    create_contests.sql                    :a14, after a13, 7d
    update_contests_schema.sql             :crit, a15, after a14, 3d
    create_referrals.sql                   :a16, after a15, 5d

    section Premium
    create_enclave_table.sql               :a17, after a16, 5d
```

The migrations are ordered chronologically within each feature area. The `update_content_schema.sql` and `update_contests_schema.sql` (marked with `crit`) are post-launch patches. The smallest migrations are `add_voice_message_support.sql` and the two schema patches.
