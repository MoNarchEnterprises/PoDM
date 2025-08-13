import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';

// --- Import Shared Types ---
import { User, UserRole } from '@common/types/User';

// --- Local Types ---
interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (username: string, email: string, password: string, userType: UserRole) => Promise<void>;
    logout: () => void;
}

// --- Auth Context ---
const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    login: async () => {},
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
            try {
                // In a real app, you'd make an API call to your backend
                // to verify the user's token and get their data.
                setUser(null);
            } catch (error) {
                console.error("No active session found", error);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        checkUserSession();
    }, []);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        // Simulate API call to log in
        console.log("Logging in with:", email, password);
        // const loggedInUser = await api.post('/auth/login', { email, password });
        // setUser(loggedInUser);
        setIsLoading(false);
    };

    const signup = async (username: string, email: string, password: string, userType: UserRole) => {
        setIsLoading(true);
        // Simulate API call to sign up
        console.log("Signing up as", userType, "with:", { username, email, password });
        // const newUser = await api.post('/auth/signup', { username, email, password, role: userType });
        // setUser(newUser);
        setIsLoading(false);
    };

    const logout = () => {
        // Simulate API call to log out
        console.log("Logging out");
        setUser(null);
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
/**
 * A custom hook to access authentication state and actions.
 * Must be used within an AuthProvider.
 */
export const useAuth = () => {
    return useContext(AuthContext);
};
