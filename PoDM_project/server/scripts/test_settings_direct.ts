
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from correct location
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Skip invalid check by only importing supabase
// We need to verify we have supabase keys
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase keys in environment variables.');
    process.exit(1);
}

// We can't easily import supabaseClient because it might be transpiled or paths issues.
// Let's just create a local client instance to be safe and independent.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function testSettings() {
    console.log('Starting settings test (direct Supabase)...');

    try {
        // 1. Find a fan user
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, username, preferences')
            .eq('role', 'fan')
            .limit(1);

        if (error || !users || users.length === 0) {
            console.error('No fan user found to test with.');
            return;
        }

        const user = users[0];
        console.log(`Found user: ${user.username} (${user.id})`);
        console.log('Current preferences:', JSON.stringify(user.preferences, null, 2));

        // 2. Define new settings
        const newPreferences = {
            notifications: {
                newContent: true, // Force true
                testTimestamp: Date.now()
            },
            privacy: {
                showInSearch: true
            }
        };

        const dbUpdates = {
            preferences: newPreferences
        };

        console.log('Updating "preferences" column directly to:', JSON.stringify(dbUpdates.preferences, null, 2));

        // 3. Update settings
        const { data: updatedUser, error: updateError } = await supabase
            .from('profiles')
            .update(dbUpdates)
            .eq('id', user.id)
            .select()
            .single();

        if (updateError) {
            console.error('Update failed:', updateError);
            return;
        }

        console.log('Update successful. Updated row preferences:', JSON.stringify(updatedUser.preferences, null, 2));

        // 4. Verify match
        if (updatedUser.preferences?.notifications?.newContent === true) {
            console.log('SUCCESS: Setting stuck in DB!');
        } else {
            console.log('FAILURE: Setting did not stick in DB.');
        }

    } catch (err) {
        console.error('Test failed with error:', err);
    }
}

testSettings();
