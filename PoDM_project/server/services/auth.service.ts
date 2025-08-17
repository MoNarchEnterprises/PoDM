import supabase from '../config/supabaseClient';
import { findUserById, createProfile } from '../models/user.model';
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
    // Step 1: Create the user in Supabase's secure auth schema.
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username: username,
                role: role
            }
        }
    });

    if (authError) {
        throw new AppError(authError.message, 400);
    }
    if (!authData.user) {
        throw new AppError('User could not be created in authentication system.', 500);
    }

    // Step 2: The database trigger should have created the profile.
    // We fetch it here to confirm and return it to the client.
    await new Promise(resolve => setTimeout(resolve, 500)); 
    const newProfile = await findUserById(authData.user.id);
    
    if (!newProfile) {
        throw new AppError('Database error saving new user. The username may already be taken.', 400);
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

    // Step 2: Fetch the public profile from your 'profiles' table.
    // This is the crucial step that gets the correct role.
    const userProfile = await findUserById(data.user.id);
    if (!userProfile) {
        throw new AppError('Could not find user profile.', 404);
    }

    // Step 3: Generate a JWT for the user's session
    const token = generateToken(data.user.id);

    // Step 4: Return the public profile object, not the auth object.
    return { user: userProfile, token };
};
