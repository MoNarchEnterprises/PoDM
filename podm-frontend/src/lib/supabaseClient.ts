// src/lib/supabaseClient.ts

import { createClient } from '@supabase/supabase-js';

// 1. Get the Supabase URL and Anon Key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Error handling to ensure the variables are set
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided in your frontend .env file.");
}

/**
 * The Supabase client instance for client-side (browser) operations.
 * It uses the public ANON key, which is safe to expose.
 * This client is essential for handling auth flows like password resets.
 */
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;