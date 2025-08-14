import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from a .env file into process.env
dotenv.config();

// --- Supabase Client Initialization ---

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided in the environment variables.");
}

/**
 * The Supabase client instance.
 * This is the primary object you will use to interact with your Supabase project,
 * including authentication, database queries, and storage operations.
 */
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
