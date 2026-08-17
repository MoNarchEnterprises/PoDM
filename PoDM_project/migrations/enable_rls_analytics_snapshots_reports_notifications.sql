-- Migration: enable_rls_analytics_snapshots_reports_notifications.sql
-- Description: Enable Row Level Security (RLS) and apply appropriate policies for:
--              1. analytics_events
--              2. catalog_price_snapshots
--              3. content_reports
--              4. notifications

-- ============================================================================
-- 1. ANALYTICS_EVENTS
-- ============================================================================
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Creators can view analytics events for their own profile/content
DROP POLICY IF EXISTS "Creators can view their own analytics events" ON public.analytics_events;
CREATE POLICY "Creators can view their own analytics events"
    ON public.analytics_events
    FOR SELECT
    TO authenticated
    USING (creator_id = auth.uid());

-- Authenticated users can insert analytics events when viewing (viewer_id is self or null)
DROP POLICY IF EXISTS "Authenticated users can insert analytics events" ON public.analytics_events;
CREATE POLICY "Authenticated users can insert analytics events"
    ON public.analytics_events
    FOR INSERT
    TO authenticated
    WITH CHECK (viewer_id = auth.uid() OR viewer_id IS NULL);

-- Anonymous users can insert public view analytics events (viewer_id is null)
DROP POLICY IF EXISTS "Anonymous users can insert analytics events" ON public.analytics_events;
CREATE POLICY "Anonymous users can insert analytics events"
    ON public.analytics_events
    FOR INSERT
    TO anon
    WITH CHECK (viewer_id IS NULL);

-- Admins have full access to analytics events
DROP POLICY IF EXISTS "Admins have full access to analytics events" ON public.analytics_events;
CREATE POLICY "Admins have full access to analytics events"
    ON public.analytics_events
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- ============================================================================
-- 2. CATALOG_PRICE_SNAPSHOTS
-- ============================================================================
ALTER TABLE public.catalog_price_snapshots ENABLE ROW LEVEL SECURITY;

-- Catalog price snapshots are readable by all users (for checking content pricing & PPV)
DROP POLICY IF EXISTS "Anyone can view catalog price snapshots" ON public.catalog_price_snapshots;
CREATE POLICY "Anyone can view catalog price snapshots"
    ON public.catalog_price_snapshots
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Admins have full access to manage catalog price snapshots
DROP POLICY IF EXISTS "Admins have full access to catalog price snapshots" ON public.catalog_price_snapshots;
CREATE POLICY "Admins have full access to catalog price snapshots"
    ON public.catalog_price_snapshots
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- ============================================================================
-- 3. CONTENT_REPORTS
-- ============================================================================
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can file content moderation reports in their own name
DROP POLICY IF EXISTS "Users can report content as themselves" ON public.content_reports;
CREATE POLICY "Users can report content as themselves"
    ON public.content_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (reporter_id = auth.uid());

-- Reporters can view their own submitted reports
DROP POLICY IF EXISTS "Users can view their own content reports" ON public.content_reports;
CREATE POLICY "Users can view their own content reports"
    ON public.content_reports
    FOR SELECT
    TO authenticated
    USING (reporter_id = auth.uid());

-- Admins have full access to manage/review all content reports
DROP POLICY IF EXISTS "Admins have full access to content reports" ON public.content_reports;
CREATE POLICY "Admins have full access to content reports"
    ON public.content_reports
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- ============================================================================
-- 4. NOTIFICATIONS
-- ============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can insert their own notifications
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
CREATE POLICY "Users can insert their own notifications"
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own notifications (e.g., mark as read)
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
    ON public.notifications
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Admins have full access to notifications
DROP POLICY IF EXISTS "Admins have full access to notifications" ON public.notifications;
CREATE POLICY "Admins have full access to notifications"
    ON public.notifications
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
