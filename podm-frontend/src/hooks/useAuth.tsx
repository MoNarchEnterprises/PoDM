// src/hooks/useAuth.tsx

import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabaseClient';
import { User, UserRole } from '@common/types/User';
import * as api from '../lib/apiClient';

// --- Local Types ---
interface PaymentMethod {
    id: string | null;
    brand: string;
    last4: string;
}

interface AuthContextType {
    user: User | null;
    impersonatedUser: User | null;
    paymentMethod: PaymentMethod | null;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    isLoading: boolean;
    login: (email: string, password: string, rememberMe?: boolean) => Promise<User>;
    signup: (username: string, email: string, password: string, userType: UserRole, referralCode?: string) => Promise<void>;
    logout: () => void;
    startImpersonation: (targetUser: User) => Promise<void>;
    stopImpersonation: () => void;
}

interface AuthProviderProps {
    children: ReactNode;
}

// --- Auth Context ---
const AuthContext = createContext<AuthContextType>({
    user: null,
    impersonatedUser: null,
    paymentMethod: null,
    setUser: () => { },
    isLoading: true,
    login: async () => Promise.reject(),
    signup: async () => { },
    logout: () => { },
    startImpersonation: async () => { },
    stopImpersonation: () => { },
});

// --- This is the internal component that can safely use router hooks ---
const AuthProviderContent = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const fetchFanSettings = async () => {
        try {
            const response = await api.getFanSettings();
            setPaymentMethod(response.data.settings.paymentMethod);
        } catch (error) {
            console.warn("Could not fetch fan payment settings:", error);
            setPaymentMethod(null);
        }
    };

    useEffect(() => {
        const initializeAuth = async () => {
            setIsLoading(true);

            // 1. Check for an existing token in localStorage (Remember Me) or sessionStorage (Session only)
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

            if (token) {
                try {
                    // Verify the token by fetching the user profile
                    const userProfile = await api.getMe();
                    const fetchedUser = userProfile.data.user;
                    setUser(fetchedUser);

                    if (fetchedUser.role === 'fan') {
                        await fetchFanSettings();
                    } else {
                        setPaymentMethod(null);
                    }

                    // Restore impersonation if active
                    const impersonatingUserId = localStorage.getItem('impersonating_user_id') || sessionStorage.getItem('impersonating_user_id');
                    if (impersonatingUserId && fetchedUser?.role === 'admin') {
                        try {
                            const { data: impersonatedUserData } = await api.getUserById(impersonatingUserId);
                            setImpersonatedUser(impersonatedUserData);
                        } catch (error) {
                            console.error("Failed to restore impersonated user:", error);
                            localStorage.removeItem('impersonating_user_id');
                            sessionStorage.removeItem('impersonating_user_id');
                        }
                    }
                } catch (error) {
                    console.error("Failed to restore session from token:", error);
                    // Token is invalid or expired
                    setUser(null);
                    setImpersonatedUser(null);
                    setPaymentMethod(null);
                    localStorage.removeItem('authToken');
                    sessionStorage.removeItem('authToken');
                    localStorage.removeItem('impersonating_user_id');
                    sessionStorage.removeItem('impersonating_user_id');
                }
            }

            // 2. Listen to Supabase auth changes (Optional, for future OAuth)
            // We do NOT clear the session here if it's null, because we might be using backend auth.
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
                if (session) {
                    // If Supabase reports a session (e.g. after OAuth), sync it to localStorage by default
                    localStorage.setItem('authToken', session.access_token);
                    const userProfile = await api.getMe();
                    setUser(userProfile.data.user);
                }
                // We intentionally omit the 'else' block to prevent clearing the token
                // when the frontend Supabase client initializes as signed out.
            });

            setIsLoading(false);

            return () => {
                subscription.unsubscribe();
            };
        };

        initializeAuth();
    }, []);

    const login = async (email: string, password: string, rememberMe: boolean = false): Promise<User> => {
        try {
            // The API returns { success, data: { user, token } }
            const response = await api.login(email, password);

            // Clear any old tokens first
            localStorage.removeItem('authToken');
            sessionStorage.removeItem('authToken');

            if (rememberMe) {
                localStorage.setItem('authToken', response.data.token);
            } else {
                sessionStorage.setItem('authToken', response.data.token);
            }

            setUser(response.data.user);

            if (response.data.user.role === 'fan') {
                await fetchFanSettings();
            }

            return response.data.user;
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const signup = async (username: string, email: string, password: string, userType: UserRole, referralCode?: string) => {
        try {
            // The API returns { success, data: { user, token } }
            const response = await api.signup(username, email, password, userType, referralCode);
            localStorage.setItem('authToken', response.data.token);
            setUser(response.data.user);
        } catch (error) {
            console.error("Signup failed:", error);
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        setImpersonatedUser(null);
        setPaymentMethod(null);
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        localStorage.removeItem('impersonating_user_id');
        sessionStorage.removeItem('impersonating_user_id');
        // Clear server-side HttpOnly cookies
        api.logout().catch((err) => console.warn("Backend logout cookie clear failed:", err));
        supabase.auth.signOut();
        navigate('/');
    };

    const startImpersonation = async (targetUser: User) => {
        if (!user || user.role !== 'admin') {
            throw new Error("Only admins can start an impersonation session.");
        }
        localStorage.setItem('impersonating_user_id', targetUser.id);
        setImpersonatedUser(targetUser);
        if (targetUser.role === 'creator') {
            navigate('/hub/dashboard');
        } else if (targetUser.role === 'fan') {
            navigate('/fan/feed');
        } else {
            navigate('/');
        }
    };

    const stopImpersonation = () => {
        localStorage.removeItem('impersonating_user_id');
        setImpersonatedUser(null);
        navigate('/admin/dashboard');
    };

    const value = {
        user,
        impersonatedUser,
        paymentMethod,
        setUser,
        isLoading,
        login,
        signup,
        logout,
        startImpersonation,
        stopImpersonation,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// --- Auth Provider Wrapper Component ---
export const AuthProvider = ({ children }: AuthProviderProps) => {
    return <AuthProviderContent>{children}</AuthProviderContent>;
};

// --- Custom Hook ---
export const useAuth = () => {
    return useContext(AuthContext);
};