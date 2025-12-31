
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import * as UserService from '../services/user.service';
import * as UserModel from '../models/user.model';
import supabase from '../config/supabaseClient';

async function testSettings() {
    console.log('Starting settings test...');

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
        const newSettings = {
            profile: { name: user.username, bio: 'Test bio' },
            preferences: {
                notifications: {
                    newContent: true,
                    testTimestamp: Date.now()
                },
                privacy: {
                    showInSearch: true
                }
            }
        };

        console.log('Updating settings to:', JSON.stringify(newSettings, null, 2));

        // 3. Update settings
        const updatedResult = await UserService.updateFanSettings(user.id, newSettings);
        console.log('Update result settings:', JSON.stringify(updatedResult.settings, null, 2));

        // 4. Fetch from DB again to verify persistence
        const { data: userRefetched, error: error2 } = await supabase
            .from('profiles')
            .select('preferences')
            .eq('id', user.id)
            .single();

        if (error2) {
            console.error('Error refetching user:', error2);
            return;
        }

        console.log('Refetched preferences from DB:', JSON.stringify(userRefetched.preferences, null, 2));

        if (userRefetched.preferences?.notifications?.newContent === true) {
            console.log('SUCCESS: Setting stuck!');
        } else {
            console.log('FAILURE: Setting did not stick.');
        }

    } catch (err) {
        console.error('Test failed with error:', err);
    }
}

testSettings();
