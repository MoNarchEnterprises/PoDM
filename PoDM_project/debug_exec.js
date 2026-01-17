const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    try {
        // 1. Total Count
        const { count: total } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true });

        // 2. Cleared Count
        const { count: clearedCount } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Cleared');

        // 3. Recent Cleared (6 Months)
        const d = new Date();
        d.setMonth(d.getMonth() - 6);
        const { count: recentCleared } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Cleared')
            .gte('created_at', d.toISOString());

        // 4. Sample Transaction Statuses
        const { data: samples } = await supabase
            .from('transactions')
            .select('status, created_at')
            .limit(10);


        const fs = require('fs');
        const result = {
            total,
            clearedCount,
            recentCleared,
            samples,
            sinceDate: d.toISOString()
        };
        fs.writeFileSync('debug_result.json', JSON.stringify(result, null, 2));
        console.log("Written to debug_result.json");
    } catch (e) {
        console.error("Error:", e);
    }
}
check();
