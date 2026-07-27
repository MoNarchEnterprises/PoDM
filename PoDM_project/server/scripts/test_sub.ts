import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import supabase from '../config/supabaseClient';

async function checkSubscriptionsSchema() {
    const { data, error } = await supabase.from('subscriptions').select('*').limit(1);
    if (error) {
        console.error("Error querying subscriptions:", error);
    } else {
        console.log("Sample subscription row keys:", data.length > 0 ? Object.keys(data[0]) : "Table is empty");
    }
}

checkSubscriptionsSchema().then(() => process.exit(0));
