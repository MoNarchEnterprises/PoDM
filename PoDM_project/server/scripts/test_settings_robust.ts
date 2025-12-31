
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Robust .env loading
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading .env manually from:', envPath);

if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
    console.log('.env loaded successfully.');
} else {
    console.error('.env file NOT found at:', envPath);
    process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase keys.');
    process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function testSettings() {
    console.log('Starting settings test...');
    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, username, preferences')
            .eq('role', 'fan')
            .limit(1);

        if (error || !users || users.length === 0) {
            console.error('No fan user found.');
            return;
        }

        const user = users[0];
        console.log(`User: ${user.username}`);
        console.log('Current preferences:', JSON.stringify(user.preferences));

        const newPreferences = {
            notifications: { newContent: true, ts: Date.now() },
            privacy: { showInSearch: true }
        };

        const { data: updatedUser, error: updateError } = await supabase
            .from('profiles')
            .update({ preferences: newPreferences })
            .eq('id', user.id)
            .select()
            .single();

        if (updateError) {
            console.error('Update failed:', updateError);
            return;
        }

        console.log('Update success. Saved:', JSON.stringify(updatedUser.preferences));

        // Re-read to be absolutely sure
        const { data: reread } = await supabase.from('profiles').select('preferences').eq('id', user.id).single();
        console.log('Reread from DB:', JSON.stringify(reread.preferences));

        if (reread.preferences?.notifications?.newContent === true) {
            console.log('PASS: Setting stuck.');
        } else {
            console.log('FAIL: Setting lost.');
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

testSettings();
