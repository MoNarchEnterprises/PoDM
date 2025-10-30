import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabaseClient';

// --- Import Shared Types ---
import { User, UserRole } from '@common/types/User';

// --- Import API Client ---
import * as api from '../lib/apiClient';

// --- Local Types ---
interface AuthContextType {
    user: User | null;
    impersonatedUser: User | null;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<User>;
    signup: (username: string, email: string, password: string, userType: UserRole) => Promise<void>;
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
    setUser: () => {},
    isLoading: true,
    login: async () => Promise.reject(),
    signup: async () => {},
    logout: () => {},
    startImpersonation: async () => {},
    stopImpersonation: () => {},
});

// --- This is the internal component that can safely use router hooks ---
const AuthProviderContent = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const initializeAuth = async () => {
            setIsLoading(true);
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
                if (session) {
                    setUser(session.user);
                    localStorage.setItem('authToken', session.access_token);

                    // Check for impersonation after regular user is set
                    const impersonatingUserId = localStorage.getItem('impersonating_user_id');
                    if (impersonatingUserId && session.user?.role === 'admin') {
                        try {
                            const { data: impersonatedUserData } = await api.getUserById(impersonatingUserId);
                            setImpersonatedUser(impersonatedUserData);
                        } catch (error) {
                            console.error("Failed to restore impersonated user:", error);
                            localStorage.removeItem('impersonating_user_id');
                        }
                    }
                } else {
                    setUser(null);
                    setImpersonatedUser(null); // Clear impersonated user on logout
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('impersonating_user_id');
                }
                setIsLoading(false);
            });

            return () => {
                subscription.unsubscribe();
            };
        };

        initializeAuth();
    }, []);

    const login = async (email: string, password: string): Promise<User> => {
        try {
            const { data } = await api.login(email, password);
            localStorage.setItem('authToken', data.token);
            setUser(data.user);
            return data.user;
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const signup = async (username: string, email: string, password: string, userType: UserRole) => {
        try {
            const { data } = await api.signup(username, email, password, userType);
            localStorage.setItem('authToken', data.token);
            setUser(data.user);
        } catch (error) {
            console.error("Signup failed:", error);
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('authToken');
    };
    
    const startImpersonation = async (targetUser: User) => {
        if (!user || user.role !== 'admin') {
            throw new Error("Only admins can start an impersonation session.");
        }
        localStorage.setItem('impersonating_user_id', targetUser._id);
        console.log('[useAuth] Stored impersonating_user_id in localStorage:', targetUser._id);
        setImpersonatedUser(targetUser);
        if (targetUser.role === 'creator') {
            navigate('/hub/dashboard');
        } else if (targetUser.role === 'fan') {
            navigate('/fan/feed');
        } else {
            // Default or error case
            navigate('/');
        }
    };

    const stopImpersonation = () => {
        localStorage.removeItem('impersonating_user_id');
        setImpersonatedUser(null);
        navigate('/admin/users');
    };

    const value = {
        user,
        impersonatedUser,
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