-- Add renewal retry tracking and grace period fields to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS renewal_attempts integer DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS renewal_locked_at timestamptz;

-- renewal_attempts: incremented on each failed renewal attempt, reset on success
-- renewal_locked_at: set when subscription period ends and renewal fails,
--   content access is locked until renewal succeeds
-- After 3 failed attempts across 3 days, status moves to 'expired'

COMMENT ON COLUMN subscriptions.renewal_attempts IS 'Number of consecutive failed renewal attempts. Reset to 0 on success.';
COMMENT ON COLUMN subscriptions.renewal_locked_at IS 'Timestamp when content access was locked due to failed renewal. NULL = not locked.';
