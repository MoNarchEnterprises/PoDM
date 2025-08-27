import { createClient } from '@supabase/supabase-js';
import { findUserById } from '../models/user.model';
import { generateToken } from '../utils/token.utils';
import { AppError } from '../middleware/error.middleware';
import { User, UserRole } from '@common/types/User';
import e from 'express';
import {reshapeUserForApp} from "../utils/user.utils";
import supabase from '../config/supabaseClient';

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
    
    // Use the same simple reshaping here
    const userForFrontend = reshapeUserForApp(newProfile);
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

    // This now returns the complete, flat user object from our RPC
    const userProfile = await findUserById(data.user.id);
    if (!userProfile) throw new AppError('Could not find user profile.', 404);
    
    const token = data.session.access_token;

    // Reshaping is still needed, but it's now a single, clean step
    const userForFrontend = reshapeUserForApp(userProfile);

    return { user: userForFrontend, token };
};

/**
 * Handles the business logic for changing a user's password.
 */
export const changeUserPassword = async (userId: string, currentPassword: string, newPassword: string) => {
    // Step 1: Get the user's email to verify their current password
    // We must use the admin client to fetch user data by ID from the auth schema
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user || !user.email) {
        throw new AppError('Could not find user to update.', 404);
    }

    // Step 2: Verify the current password by trying to sign in with it.
    // We use the public (anon key) client for this, as it's a standard user operation.
    const { error: signInError } = await authSupabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
    });

    if (signInError) {
        throw new AppError('Incorrect current password.', 401);
    }

    // Step 3: If the current password was correct, update the user with the new password.
    // We use the admin client again for this privileged operation.
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
    });

    if (updateError) {
        throw new AppError('Failed to update password.', 500);
    }

    return { success: true, message: 'Password updated successfully.' };
};