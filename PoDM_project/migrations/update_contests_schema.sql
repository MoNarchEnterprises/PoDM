-- Migration to add enhanced configuration fields to contests table

ALTER TABLE public.contests
ADD COLUMN IF NOT EXISTS spend_threshold INTEGER DEFAULT 100, -- in cents, default $1.00
ADD COLUMN IF NOT EXISTS additional_entries INTEGER DEFAULT 1; -- entries granted per threshold

COMMENT ON COLUMN public.contests.spend_threshold IS 'Amount in cents required to earn additional entries';
COMMENT ON COLUMN public.contests.additional_entries IS 'Number of entries granted for every spend_threshold amount';
