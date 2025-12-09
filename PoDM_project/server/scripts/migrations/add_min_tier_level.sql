-- Add min_tier_level to content table if it doesn't exist
ALTER TABLE content
ADD COLUMN IF NOT EXISTS min_tier_level INTEGER DEFAULT 1;

-- Backfill existing content to be accessible by Tier 1 (defaults)
UPDATE content
SET min_tier_level = 1
WHERE min_tier_level IS NULL;

COMMENT ON COLUMN content.min_tier_level IS 'The minimum subscription tier level required to view this content (default 1)';
