-- Migration: Update enclave_applications.current_platform to array type
-- Description: Convert current_platform from VARCHAR to TEXT[] to support multiple platforms

-- Step 1: Add new column with array type
ALTER TABLE enclave_applications 
ADD COLUMN current_platforms TEXT[];

-- Step 2: Migrate existing data (convert single platform to array)
UPDATE enclave_applications 
SET current_platforms = ARRAY[current_platform]
WHERE current_platform IS NOT NULL;

-- Step 3: Drop old column
ALTER TABLE enclave_applications 
DROP COLUMN current_platform;

-- Step 4: Rename new column to original name
ALTER TABLE enclave_applications 
RENAME COLUMN current_platforms TO current_platform;

-- Step 5: Add NOT NULL constraint
ALTER TABLE enclave_applications 
ALTER COLUMN current_platform SET NOT NULL;

-- Add comment
COMMENT ON COLUMN enclave_applications.current_platform IS 'Array of platforms the creator is currently using';
