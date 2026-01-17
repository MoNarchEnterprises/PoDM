import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Mimic Server.ts loading
const envPath = path.resolve(__dirname, './.env');
console.log("Loading env from:", envPath);
dotenv.config({ path: envPath });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("URL:", url);
console.log("Key Exists:", !!key);
if (key) console.log("Key Prefix:", key.substring(0, 5));

if (!url || !key) {
    console.error("FAIL: Missing Config");
    process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
    const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    console.log("Profile Count:", count);
    if (error) console.error("Error:", error);
}

run();
