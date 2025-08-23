import { createClient } from '@supabase/supabase-js';
import { findUserById } from '../models/user.model';
import { generateToken } from '../utils/token.utils';
import { AppError } from '../middleware/error.middleware';
import { User, UserRole } from '@common/types/User';
import e from 'express';
import {reshapeUserForApp} from "../utils/user.utils";

// --- Local Supabase Client for Authentication ---
// This client uses the public ANON key and is ONLY used for signup/login flows.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided for the auth service.");
}
const authSupabase = createClient(supabaseUrl, supabaseAnonKey);



/**
 * Handles the business logic for registering a new user.
 */
export const signupUser = async (email: string, password: string, username: string, role: UserRole) => {
    const { data: authData, error: authError } = await authSupabase.auth.signUp({
        email,
        password,
        options: {
            data: { username, role }
        }
    });

    if (authError) throw new AppError(authError.message, 400);
    if (!authData.user) throw new AppError('User could not be created.', 500);

    await new Promise(resolve => setTimeout(resolve, 500)); 
    const newProfile = await findUserById(authData.user.id);
    
    if (!newProfile) throw new AppError('Database error creating profile.', 400);

    // **FIX:** Use the session token directly from Supabase
    const token = authData.session?.access_token;
    if (!token) {
        throw new AppError('Could not create a session token for the new user.', 500);
    }
    
    const userForFrontend = reshapeUserForApp(newProfile, authData.user);

    return { user: userForFrontend, token };
};

/**
 * Handles the business logic for logging in a user.
 */
export const loginUser = async (email: string, password: string) => {
    const { data, error } = await authSupabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw new AppError('Invalid credentials.', 401);
    if (!data.user || !data.session) throw new AppError('Could not retrieve user session after login.', 500);

    const userProfile = await findUserById(data.user.id);
    if (!userProfile) throw new AppError('Could not find user profile.', 404);
    // **FIX:** Use the session token directly from Supabase instead of generating a custom one.
    const token = data.session.access_token;

    const userForFrontend = reshapeUserForApp(userProfile, data.user);
    console.log(`auth.service: User logged in: ${userForFrontend.username} email: ${userForFrontend.email} role: ${userForFrontend.role}`);

    return { user: userForFrontend, token };
};
