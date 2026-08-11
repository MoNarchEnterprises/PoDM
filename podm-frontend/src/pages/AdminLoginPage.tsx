import React, { useState } from 'react';
import { Shield, Mail, KeyRound, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as apiClient from '../lib/apiClient';

// --- Import Reusable Components & Hooks ---
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import AuthLayout from '../components/layout/AuthLayout';
import { useAuth } from '../hooks/useAuth';

// --- Main Admin Login Page Component ---
const AdminLoginPage = () => {
    const [mode, setMode] = useState<'login' | 'forgot' | 'forgotSuccess'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login, logout } = useAuth();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const loggedInUser = await login(email, password);
            console.log("Logged in user:", loggedInUser.role);
            // CRITICAL: Check if the user has the 'admin' role
            if (loggedInUser && loggedInUser.role === 'admin') {
                // Use the navigate function to redirect the user
                navigate('/admin/dashboard');
            } else {
                // If the user is not an admin, log them out immediately and show an error
                logout();
                setError('Access denied. This account does not have admin privileges.');
            }

        } catch (err: unknown) {
            const errObj = err as { response?: { data?: { message?: string } } };
            setError(errObj.response?.data?.message || 'Invalid credentials. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await apiClient.forgotPassword(email);
            setMode('forgotSuccess');
        } catch (err: unknown) {
            const errObj = err as { response?: { data?: { message?: string } } };
            setError(errObj.response?.data?.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="w-full max-w-md mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <Shield className="w-12 h-12 mx-auto text-purple-500" />
                        <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
                            {mode === 'login' ? 'Admin Portal' : mode === 'forgot' ? 'Reset Password' : 'Check Your Email'}
                        </h1>
                        {mode === 'forgot' && <p className="text-sm text-gray-500 mt-2">Enter your email to receive a reset link.</p>}
                    </div>

                    {mode === 'login' && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <Input
                                id="email"
                                type="email"
                                label="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                leftIcon={Mail}
                                required
                                disabled={isLoading}
                            />
                            <Input
                                id="password"
                                type="password"
                                label="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                leftIcon={KeyRound}
                                required
                                disabled={isLoading}
                            />

                            <div className="text-right text-sm">
                                <button type="button" onClick={() => setMode('forgot')} className="font-medium text-purple-600 dark:text-purple-400 hover:underline">
                                    Forgot password?
                                </button>
                            </div>

                            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                isLoading={isLoading}
                                leftIcon={LogIn}
                            >
                                Sign In
                            </Button>
                        </form>
                    )}

                    {mode === 'forgot' && (
                        <form onSubmit={handleForgotPassword} className="space-y-6">
                            <Input
                                id="email"
                                type="email"
                                label="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                leftIcon={Mail}
                                required
                                disabled={isLoading}
                            />

                            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                isLoading={isLoading}
                            >
                                Send Reset Link
                            </Button>
                            <div className="text-center text-sm">
                                <button type="button" onClick={() => setMode('login')} className="font-medium text-purple-600 dark:text-purple-400 hover:underline">
                                    Back to Login
                                </button>
                            </div>
                        </form>
                    )}

                    {mode === 'forgotSuccess' && (
                        <div className="text-center">
                            <p className="text-gray-500 mb-6">
                                A password reset link has been sent to <strong>{email}</strong> if an account with that email exists.
                            </p>
                            <Button onClick={() => setMode('login')} className="w-full">
                                Back to Login
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </AuthLayout>
    );
};

export default AdminLoginPage;
