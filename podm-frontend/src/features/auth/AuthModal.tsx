// src/features/auth/AuthModal.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as apiClient from '../../lib/apiClient';
import { Mail, KeyRound, User as UserIcon, CheckCircle } from 'lucide-react';

// --- Import Shared Types ---
import { UserRole } from '@common/types/User';
import { Creator } from '@common/types/Creator';

// --- Import Reusable UI Components & Hooks ---
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'login' | 'signup';
}

const AuthModal = ({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) => {
    const navigate = useNavigate();
    const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'forgotSuccess'>(initialMode);
    const [userType, setUserType] = useState<UserRole>('fan');

    // Form state
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [referralCode, setReferralCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { login, signup } = useAuth();

    // Check for email and enclave parameters in URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const emailParam = urlParams.get('email');
        const enclaveParam = urlParams.get('enclave');
        const refParam = urlParams.get('ref');

        if (emailParam) {
            setEmail(decodeURIComponent(emailParam));
        }

        if (refParam) {
            setReferralCode(refParam.toUpperCase());
        }

        if (enclaveParam === 'true') {
            setUserType('creator'); // Enclave members are creators
            setMode('signup'); // Force signup mode
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            setError('');
            // Only reset fields if not coming from Enclave link
            const urlParams = new URLSearchParams(window.location.search);
            const enclaveParam = urlParams.get('enclave');

            if (enclaveParam !== 'true') {
                setEmail('');
                setPassword('');
                setUsername('');
            }
        }
    }, [initialMode, isOpen]);

    const handleClose = () => {
        setUserType('fan');
        setUsername('');
        setEmail('');
        setPassword('');
        setReferralCode('');
        setError('');
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            if (mode === 'login') {
                const loggedInUser = await login(email, password, rememberMe);

                switch (loggedInUser.role) {
                    case 'admin': navigate('/admin/dashboard'); break;
                    case 'creator':
                        if ((loggedInUser as Creator).onboarding_complete) {
                            navigate('/hub/dashboard');
                        } else {
                            navigate('/onboarding');
                        }
                        break;
                    case 'fan': default: navigate('/fan/feed'); break;
                }
            } else {
                await signup(username, email, password, userType, referralCode);
                if (userType === 'creator') {
                    navigate('/onboarding');
                } else {
                    navigate('/fan/feed');
                }
            }
            handleClose();
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
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
        } catch (err: any) {
            setError(err.response?.data?.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            <div className="p-8">
                {(mode === 'login' || mode === 'signup') && (
                    <>
                        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
                            {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
                        </h2>
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                            {mode === 'login' ? 'Log in to continue your journey.' : 'Join the community of creators and your audience.'}
                        </p>

                        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                            {mode === 'signup' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">I am a...</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button type="button" variant={userType === 'fan' ? 'primary' : 'secondary'} onClick={() => setUserType('fan')}>Fan</Button>
                                        <Button type="button" variant={userType === 'creator' ? 'primary' : 'secondary'} onClick={() => setUserType('creator')}>Creator</Button>
                                    </div>
                                </div>
                            )}

                            {mode === 'signup' && (
                                <Input id="username" type="text" label="Username" placeholder="Username" leftIcon={UserIcon} value={username} onChange={e => setUsername(e.target.value)} required disabled={isLoading} />
                            )}

                            <Input id="email" type="email" label="Email" placeholder="Email Address" leftIcon={Mail} value={email} onChange={e => setEmail(e.target.value)} required disabled={isLoading} />

                            <Input id="password" type="password" label="Password" placeholder="Password" leftIcon={KeyRound} value={password} onChange={e => setPassword(e.target.value)} required disabled={isLoading} />

                            {mode === 'signup' && (
                                <div>
                                    <label htmlFor="referralCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Referral Code (Optional)
                                    </label>
                                    <input
                                        id="referralCode"
                                        type="text"
                                        value={referralCode}
                                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                                        disabled={isLoading || new URLSearchParams(window.location.search).get('ref') !== null}
                                        className={`w-full px-4 py-3 rounded-lg border ${new URLSearchParams(window.location.search).get('ref') !== null
                                            ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 cursor-not-allowed'
                                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                                            } focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all`}
                                        placeholder="Enter referral code"
                                    />
                                    {new URLSearchParams(window.location.search).get('ref') && (
                                        <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">
                                            ✓ Referral code applied from link
                                        </p>
                                    )}
                                </div>
                            )}

                            {mode === 'login' && (
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center">
                                        <input
                                            id="remember-me"
                                            name="remember-me"
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="remember-me" className="ml-2 block text-gray-700 dark:text-gray-300">
                                            Remember me
                                        </label>
                                    </div>
                                    <button type="button" onClick={() => setMode('forgot')} className="font-medium text-purple-600 dark:text-purple-400 hover:underline">Forgot password?</button>
                                </div>
                            )}

                            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                                {mode === 'login' ? 'Log In' : 'Sign Up'}
                            </Button>

                            <div className="text-center text-sm">
                                {mode === 'login' ? (
                                    <p className="text-gray-500 dark:text-gray-400">
                                        Don't have an account? <button type="button" onClick={() => setMode('signup')} className="font-medium text-purple-600 dark:text-purple-400 hover:underline">Sign Up</button>
                                    </p>
                                ) : (
                                    <p className="text-gray-500 dark:text-gray-400">
                                        Already have an account? <button type="button" onClick={() => setMode('login')} className="font-medium text-purple-600 dark:text-purple-400 hover:underline">Log In</button>
                                    </p>
                                )}
                            </div>
                        </form>
                    </>
                )}

                {mode === 'forgot' && (
                    <>
                        <h2 className="text-2xl font-bold text-center">Reset Password</h2>
                        <p className="text-center text-sm text-gray-500 mt-2">Enter your email and we'll send you a link to reset your password.</p>
                        <form onSubmit={handleForgotPassword} className="mt-8 space-y-6">
                            <Input id="email" type="email" label="Email" placeholder="Email Address" leftIcon={Mail} value={email} onChange={e => setEmail(e.target.value)} required disabled={isLoading} />
                            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>Send Reset Link</Button>
                            <div className="text-center text-sm">
                                <button type="button" onClick={() => setMode('login')} className="font-medium text-purple-600 dark:text-purple-400 hover:underline">Back to Login</button>
                            </div>
                        </form>
                    </>
                )}

                {mode === 'forgotSuccess' && (
                    <div className="text-center">
                        <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                        <h2 className="text-2xl font-bold">Check Your Email</h2>
                        <p className="text-gray-500 mt-2">A password reset link has been sent to <strong>{email}</strong> if an account with that email exists.</p>
                        <Button onClick={handleClose} className="mt-6 w-full">Done</Button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default AuthModal;