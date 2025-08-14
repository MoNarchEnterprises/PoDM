import { Request, Response } from 'express';
// In a real app, you would import your Supabase client here
// import supabase from '../config/supabaseClient';

/**
 * @desc    Register a new user (fan or creator)
 * @route   POST /api/v1/auth/signup
 * @access  Public
 */
export const signup = async (req: Request, res: Response) => {
    const { email, password, username, role } = req.body;

    // Placeholder logic:
    console.log(`Attempting to sign up user: ${email} as a ${role}`);

    // 1. Use Supabase Auth to create a new user in the private `auth.users` table.
    //    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    //    if (authError) return res.status(400).json({ message: authError.message });

    // 2. If the auth user is created successfully, use their new ID to create a public profile.
    //    const userId = authData.user.id;
    //    const { error: profileError } = await supabase.from('profiles').insert({ id: userId, username, role });
    //    if (profileError) {
    //        // Handle potential error where auth user was created but profile failed.
    //        return res.status(500).json({ message: "Failed to create user profile." });
    //    }

    // 3. Return the session and user data to the client.
    res.status(201).json({ success: true, message: "User registered successfully." /*, data: authData */ });
};

/**
 * @desc    Authenticate a user and get a token
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Placeholder logic:
    console.log(`Attempting to log in user: ${email}`);

    // 1. Use Supabase Auth to sign in the user.
    //    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    //    if (error) return res.status(401).json({ message: "Invalid credentials." });

    // 2. Return the session and user data to the client.
    res.status(200).json({ success: true, message: "User logged in successfully." /*, data */ });
};

/**
 * @desc    Log out a user
 * @route   POST /api/v1/auth/logout
 * @access  Private (requires auth token)
 */
export const logout = async (req: Request, res: Response) => {
    // Placeholder logic:
    console.log("Logging out user.");

    // 1. Use Supabase Auth to sign out the user, invalidating their token.
    //    const { error } = await supabase.auth.signOut();
    //    if (error) return res.status(500).json({ message: "Failed to log out." });

    res.status(200).json({ success: true, message: "User logged out successfully." });
};
