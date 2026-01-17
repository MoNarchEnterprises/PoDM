const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from current directory
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Env Variables");
    console.log("URL:", supabaseUrl);
    console.log("Key:", supabaseServiceKey ? "Present" : "Missing");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    try {
        const { count: profilesCount, error: profilesError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        if (profilesError) console.error("Profiles Error:", profilesError);

        const { data, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) console.error("Auth Error:", authError);

        console.log('--- Data Check ---');
        console.log('Profiles Count:', profilesCount);
        console.log('Auth Users Count:', data ? data.users.length : 'N/A');

        // Check transactions
        const { count: txCount, error: txError } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true });
        console.log('Transactions Count:', txCount);
        if (txError) console.error("Tx Error:", txError);

    } catch (e) {
        console.error("Script Error:", e);
    }
}

check();
