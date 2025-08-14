import supabase from '../config/supabaseClient';
import { createProfile } from '../models/user.model';
import { generateToken } from '../utils/token.utils';
import { AppError } from '../middleware/error.middleware';
import { UserRole } from '@common/types/User';

/**
 * Handles the business logic for registering a new user.
 * @param email - The user's email.
 * @param password - The user's password.
 * @param username - The user's chosen username.
 * @param role - The user's role ('fan' or 'creator').
 * @returns An object containing the new user and a JWT.
 */
export const signupUser = async (email: string, password: string, username: string, role: UserRole) => {
    // Step 1: Create the user in Supabase's secure auth schema
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        throw new AppError(authError.message, 400);
    }
    if (!authData.user) {
        throw new AppError('User could not be created in authentication system.', 500);
    }

    // Step 2: Create the corresponding public profile in your 'profiles' table
    const profileData = {
        id: authData.user.id,
        username,
        role,
        email, // You might want to store the email here for easier access
    };

    const newProfile = await createProfile(profileData);

    if (!newProfile) {
        // In a real app, you would want to handle this case by deleting the auth user
        // to prevent orphaned authentication accounts.
        throw new AppError('Failed to create user profile after authentication.', 500);
    }

    // Step 3: Generate a JWT for the new user's session
    const token = generateToken(authData.user.id);

    return { user: newProfile, token };
};

/**
 * Handles the business logic for logging in a user.
 * @param email - The user's email.
 * @param password - The user's password.
 * @returns An object containing the user and a JWT.
 */
export const loginUser = async (email: string, password: string) => {
    // Step 1: Authenticate the user with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        throw new AppError('Invalid credentials.', 401);
    }
    if (!data.user) {
        throw new AppError('Could not retrieve user after login.', 500);
    }

    // Step 2: Generate a JWT for the user's session
    const token = generateToken(data.user.id);

    return { user: data.user, token };
};
