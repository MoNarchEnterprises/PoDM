import { createClient } from '@supabase/supabase-js';

// --- Supabase Client Initialization ---

const supabaseUrl = process.env.SUPABASE_URL;
// This key has elevated privileges required for admin tasks.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;



if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase URL and Service Role Key must be provided in the environment variables.");
}

/**
 * The Supabase client instance for server-side operations.
 * Initialized with the Service Role Key to perform admin-level actions.
 */
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        // It's good practice to disable auto-refreshing tokens on the server
        autoRefreshToken: false,
        persistSession: false
    }
});

export default supabase;
