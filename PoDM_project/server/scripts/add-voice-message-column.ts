/**
 * Migration: Add voiceMessageUrl column to messages table
 * 
 * This migration adds support for voice messages by adding a voiceMessageUrl column
 * to store signed URLs for voice message audio files.
 */

import supabase from '../config/supabaseClient';

async function addVoiceMessageUrlColumn() {
    console.log('Starting migration: Add voiceMessageUrl column to messages table...');

    try {
        // Add voiceMessageUrl column to messages table
        const { error } = await supabase.rpc('exec_sql', {
            sql: `
                ALTER TABLE messages 
                ADD COLUMN IF NOT EXISTS voice_message_url TEXT;
            `
        });

        if (error) {
            console.error('Error adding voiceMessageUrl column:', error);
            throw error;
        }

        console.log('✅ Successfully added voiceMessageUrl column to messages table');
        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration
addVoiceMessageUrlColumn()
    .then(() => {
        console.log('All done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
