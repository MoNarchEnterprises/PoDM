-- SQL Script to Fix Mislabeled Content Types
-- Run this directly in Supabase SQL Editor
-- This fixes content where the 'type' field doesn't match the actual file mimeType

-- Step 1: Check what needs to be fixed (preview)
SELECT 
    id,
    title,
    type as current_type,
    files->0->>'mimeType' as file_mimetype,
    CASE 
        WHEN files->0->>'mimeType' LIKE 'video/%' THEN 'video'
        WHEN files->0->>'mimeType' LIKE 'image/%' THEN 'photo'
        WHEN files->0->>'mimeType' LIKE 'audio/%' THEN 'audio'
        ELSE type
    END as correct_type
FROM content
WHERE 
    files IS NOT NULL 
    AND jsonb_array_length(files) > 0
    AND type != CASE 
        WHEN files->0->>'mimeType' LIKE 'video/%' THEN 'video'
        WHEN files->0->>'mimeType' LIKE 'image/%' THEN 'photo'
        WHEN files->0->>'mimeType' LIKE 'audio/%' THEN 'audio'
        ELSE type
    END;

-- Step 2: Fix the mislabeled content
-- Uncomment the lines below to execute the fix
/*
UPDATE content
SET type = CASE 
    WHEN files->0->>'mimeType' LIKE 'video/%' THEN 'video'
    WHEN files->0->>'mimeType' LIKE 'image/%' THEN 'photo'
    WHEN files->0->>'mimeType' LIKE 'audio/%' THEN 'audio'
    ELSE type
END
WHERE 
    files IS NOT NULL 
    AND jsonb_array_length(files) > 0
    AND type != CASE 
        WHEN files->0->>'mimeType' LIKE 'video/%' THEN 'video'
        WHEN files->0->>'mimeType' LIKE 'image/%' THEN 'photo'
        WHEN files->0->>'mimeType' LIKE 'audio/%' THEN 'audio'
        ELSE type
    END;
*/

-- Step 3: Verify the fix (run after uncommenting and executing Step 2)
-- This should return 0 rows if everything is fixed
/*
SELECT 
    id,
    title,
    type,
    files->0->>'mimeType' as file_mimetype
FROM content
WHERE 
    files IS NOT NULL 
    AND jsonb_array_length(files) > 0
    AND type != CASE 
        WHEN files->0->>'mimeType' LIKE 'video/%' THEN 'video'
        WHEN files->0->>'mimeType' LIKE 'image/%' THEN 'photo'
        WHEN files->0->>'mimeType' LIKE 'audio/%' THEN 'audio'
        ELSE type
    END;
*/
