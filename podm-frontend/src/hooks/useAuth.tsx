import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';

// --- Import Shared Types ---
import { User, UserRole } from '@common/types/User';

// --- Import API Client ---
import * as api from '../lib/apiClient';

// --- Local Types ---
interface AuthContextType {
    user: User | null;
    setUser: React.Dispatch<React.SetStateAction<User | null>>; // Expose setter
    isLoading: boolean;
    login: (email: string, password: string) => Promise<User>;
    signup: (username: string, email: string, password: string, userType: UserRole) => Promise<void>;
    logout: () => void;
}

// --- Auth Context ---
const AuthContext = createContext<AuthContextType>({
    user: null,
    setUser: () => {}, // Default empty function
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
        const checkUserSession = async () => {
            setIsLoading(true);
            const token = localStorage.getItem('authToken');
            if (token) {
                try {
                    const response = await api.getMe(); 
                    setUser(response.data);
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

    const value = {
        user,
        setUser, // Provide the setter function to the context
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
