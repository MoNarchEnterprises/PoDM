-- Migration: Add voice_message_url column to messages table
-- This enables support for voice messages in the messaging system

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS voice_message_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN messages.voice_message_url IS 'Signed URL for voice message audio file (creator-only feature)';
