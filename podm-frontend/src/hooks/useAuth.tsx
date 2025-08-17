import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';

// --- Import Shared Types ---
import { User, UserRole } from '@common/types/User';

// --- Import API Client ---
import * as api from '../lib/apiClient';

// --- Local Types ---
interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<User>; // Updated return type
    signup: (username: string, email: string, password: string, userType: UserRole) => Promise<void>;
    logout: () => void;
}

// --- Auth Context ---
const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    login: async () => Promise.reject(),
    signup: async () => {},
    logout: () => {},
});

// --- Auth Provider Component ---
interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for an existing session on initial app load
        const checkUserSession = async () => {
            setIsLoading(true);
            const token = localStorage.getItem('authToken');
            if (token) {
                try {
                    // In a real app, you'd have an endpoint like /auth/me to verify the token
                    // const response = await api.getMe(); 
                    // setUser(response.data.user);
                } catch (error) {
                    console.error("Session token is invalid, logging out.", error);
                    localStorage.removeItem('authToken');
                    setUser(null);
                }
            }
            setIsLoading(false);
        };

        checkUserSession();
    }, []);

    const login = async (email: string, password: string): Promise<User> => {
        try {
            const { data } = await api.login(email, password);
            localStorage.setItem('authToken', data.token);
            setUser(data.user);
            return data.user; // Return the user object on success
        } catch (error) {
            console.error("Login failed:", error);
            // Re-throw the error so the component can display a message
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

    const value = {
        user,
        isLoading,
        login,
        signup,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// --- Custom Hook ---
export const useAuth = () => {
    return useContext(AuthContext);
};
