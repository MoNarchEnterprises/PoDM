import { createClient } from '@supabase/supabase-js';
import { createProfile,findUserById } from '../models/user.model';
import { AppError } from '../middleware/error.middleware';
import { User, UserRole } from '@common/types/User';
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
        }
    });

    if (authError) {
        // Pass the original Supabase error object for better debugging
        const appErr = new AppError(authError.message, 400);
        (appErr as any).originalError = authError; // Attach original error
        throw appErr;
    }
    if (!authData.user) throw new AppError('User could not be created.', 500);

    // Step 2: Manually create the corresponding profile in the public.profiles table
    const profileData = {
        id: authData.user.id, // Link to the auth.users table
        username,
        email,
        role,
        status: role === 'creator' ? 'pending verification' : 'active'
    };
    const newProfile = await createProfile(profileData);
    
    if (!newProfile){
        // If profile creation fails, we must delete the auth user to prevent orphans
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new AppError('Database error creating profile.', 400);
    } 

    // **FIX:** Use the session token directly from Supabase
    const token = authData.session?.access_token;
    if (!token) {
        throw new AppError('Could not create a session token for the new user.', 500);
    }
    const fullProfile = await findUserById(newProfile.id); // Fetch the full profile via RPC
    if (!fullProfile) {
        throw new AppError('Could not retrieve newly created profile.', 500);
    }

    const userForFrontend = reshapeUserForApp(fullProfile);
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

/**
 * Handles the business logic for requesting a password reset.
 */
export const requestPasswordReset = async (email: string) => {
    // This is the URL your user will be sent to *after* they click the link in the email.
    // It must match a route in your frontend application.
    const redirectTo = `${process.env.CLIENT_URL}/reset-password`;

    const { error } = await authSupabase.auth.resetPasswordForEmail(email, {
        redirectTo,
    });

    if (error) {
        // We log the error on the server but don't throw it to the user,
        // to prevent them from knowing if an email exists in the system or not.
        console.error('Password reset request error:', error.message);
    }

    // The function resolves successfully regardless of whether the email existed.
    return;
};

