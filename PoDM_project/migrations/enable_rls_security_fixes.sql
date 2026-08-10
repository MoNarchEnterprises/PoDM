-- Enable RLS for monthly_analytics_summary
ALTER TABLE public.monthly_analytics_summary ENABLE ROW LEVEL SECURITY;

-- Allow creators to view their own analytics summary
CREATE POLICY "Creators can view their own analytics summary"
ON public.monthly_analytics_summary
FOR SELECT
TO authenticated
USING (creator_id = auth.uid());

-- Enable RLS for saved_reports
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all saved reports
CREATE POLICY "Admins can view saved reports"
ON public.saved_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow admins to insert saved reports
CREATE POLICY "Admins can insert saved reports"
ON public.saved_reports
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow users to insert their own notifications (needed for some triggers/logic)
-- Note: Often notifications are inserted by triggers/functions with SECURITY DEFINER,
-- but if inserted from client/server logic running as user, this is needed.
CREATE POLICY "Users can insert their own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow users to update their own notifications (e.g. mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow users to delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
