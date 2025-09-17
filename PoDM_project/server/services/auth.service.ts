import { createClient } from '@supabase/supabase-js';
import { createProfile,findUserById } from '../models/user.model';
import { AppError } from '../middleware/error.middleware';
import { User, UserRole } from '@common/types/User';
import {reshapeUserForApp} from "../utils/user.utils";
import supabase from '../config/supabaseClient';
import { getOrCreateStripeCustomer } from '../utils/stripe.utils';
import * as SubscriptionService from './subscription.service';
import * as UserModel from '../models/user.model';


// --- Local Supabase Client for Authentication ---
// This client uses the public ANON key and is ONLY used for signup/login flows.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided for the auth service.");
}
const authSupabase = createClient(supabaseUrl, supabaseAnonKey);


export const signupAndSubscribe = async (
    email: string, 
    password: string, 
    fullName: string,
    creatorId: string, 
    tierId: string, 
    paymentMethodId: string
) => {
    console.log(`[AuthService] Starting signupAndSubscribe for email: ${email}`);
    
    // --- Step 1: Create the Supabase Auth user ---
    const { data: authData, error: authError } = await authSupabase.auth.signUp({ email, password });
    let existingUser: User | null = null;
    if (authError) {
        // If the user already exists, then find the user and get the user ID
        if (authError.message.includes('User already registered')) {
            console.log('[AuthService] User already registered. Attempting to find existing user.');
            existingUser = await UserModel.findUserByEmail(email);
            if (existingUser) {
                console.log(`[AuthService] Existing user found with ID: ${existingUser.id}`);
            }
            else{
                // This will catch "User already registered" and other auth errors
                console.error('[AuthService] Supabase signUp Error:', authError.message);
                throw new AppError(authError.message, 400);
            }
        }
    }
    if (!existingUser && !authData.user) {
        throw new AppError('User could not be created in Auth system.', 500);
    }
    
    const userId = authData.user?.id ? authData.user.id : existingUser!.id;
    console.log(`[AuthService] Auth user created successfully with ID: ${userId}`);

    // --- Transaction-like Block with Cleanup ---
    try {
        // --- Step 2: Create the user's profile in our public table ---
        if (existingUser) {
            console.log('[AuthService] Skipping profile creation, using existing user profile.');
        } 
        else {
            const username = `user_${Date.now()}`; 
            const profileData = { 
                id: userId, 
                username, 
                email, 
                full_name: fullName, // <-- Save it to the database
                role: 'fan' as const, 
                status: 'active' as const 
            };
        const newProfile = await UserModel.createProfile(profileData);
        if (!newProfile) {
            // This is the critical failure point we need to catch
            throw new AppError('Database error: Failed to create user profile.', 500);
        }
        console.log(`[AuthService] Public profile created for user: ${userId}`);
        }
        
        // --- Step 4: Create the Stripe Subscription ---
        await SubscriptionService.createSubscriptionForUser(
            userId, 
            creatorId, 
            tierId, 
            paymentMethodId
        );
        console.log('[AuthService] Subscription process completed.');

        // --- Success ---
        const fullUser = await UserModel.findUserById(userId);
        if (!fullUser) throw new AppError('Could not retrieve final user profile.', 500);

        return { user: reshapeUserForApp(fullUser), token: authData.session?.access_token };

    } catch (error) {
        // --- CRITICAL CLEANUP ---
        // If any step after auth user creation fails, we must delete the auth user
        // to prevent orphan accounts that can never log in.
        console.error(`[AuthService] ERROR during signupAndSubscribe for ${userId}. Initiating cleanup.`, error);
        await supabase.auth.admin.deleteUser(userId);
        console.log(`[AuthService] Cleanup complete. Deleted orphan auth user: ${userId}`);
        
        // Re-throw the original error to be sent to the client
        throw error;
    }
};

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

