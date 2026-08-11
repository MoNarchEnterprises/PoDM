// src/features/profile/SubscriptionAuthModal.tsx

import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { Creator, SubscriptionTier } from '@common/types/Creator';
import { Mail, KeyRound, User as UserIcon } from 'lucide-react';

interface SubscriptionAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    creator: Creator;
    selectedTier: SubscriptionTier;
    onLoginSuccess: () => void;
}

const SubscriptionAuthModal = ({ isOpen, onClose, creator, selectedTier, onLoginSuccess }: SubscriptionAuthModalProps) => {
    const { login, signup } = useAuth();
    const [mode, setMode] = useState<'signup' | 'login'>('signup');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (mode === 'signup') {
                // Generate a unique username from full name or email split
                const usernameBase = fullName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
                const username = `${usernameBase || 'fan'}_${Math.random().toString(36).substring(2, 6)}`;
                
                // Sign up using the useAuth hook
                await signup(username, email, password, 'fan');
                // Automatically log them in
                await login(email, password);
                onLoginSuccess();
            } else { // Mode is 'login'
                await login(email, password);
                onLoginSuccess();
            }
        } catch (err: unknown) {
            const errObj = err as { response?: { data?: { message?: string } }; message?: string };
            setError(errObj.response?.data?.message || errObj.message || "An authentication error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <header className="p-6 border-b border-gray-700 bg-gradient-to-r from-purple-900/30 to-pink-900/30">
                <h2 className="text-xl font-bold text-white">Subscribe to {creator.profile.name}</h2>
                <p className="text-xs text-gray-400 mt-1">
                    You're getting the <span className="font-semibold text-purple-400">{selectedTier.name}</span> for <span className="font-semibold text-purple-400">{Number(selectedTier.price).toFixed(2)} USDC/month</span>.
                </p>
            </header>

            {/* TABS TO SWITCH BETWEEN MODES */}
            <div className="grid grid-cols-2 text-center font-semibold border-b border-gray-800 bg-slate-900/40">
                <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className={`py-3 text-sm ${mode === 'signup' ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/5' : 'text-gray-400 hover:text-gray-300'}`}
                >
                    New Fan Account
                </button>
                <button
                    type="button"
                    onClick={() => setMode('login')}
                    className={`py-3 text-sm ${mode === 'login' ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/5' : 'text-gray-400 hover:text-gray-300'}`}
                >
                    Log In
                </button>
            </div>

            <form onSubmit={handleSubmit} className="bg-slate-900">
                <main className="p-6 space-y-6">
                    <div>
                        <h3 className="text-sm font-semibold text-purple-300 mb-3 uppercase tracking-wider">
                            {mode === 'signup' ? '1. Create Your Fan Profile' : '1. Sign In To Your Account'}
                        </h3>
                        <div className="space-y-4">
                            {mode === 'signup' && (
                                <Input
                                    id="fullName"
                                    type="text"
                                    placeholder="Full Name"
                                    leftIcon={UserIcon}
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    required
                                    className="bg-slate-800 border-slate-700 text-white placeholder-gray-500"
                                />
                            )}
                            <Input
                                id="email"
                                type="email"
                                placeholder="Email Address"
                                leftIcon={Mail}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                className="bg-slate-800 border-slate-700 text-white placeholder-gray-500"
                            />
                            <Input
                                id="password"
                                type="password"
                                placeholder="Password"
                                leftIcon={KeyRound}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                className="bg-slate-800 border-slate-700 text-white placeholder-gray-500"
                            />
                        </div>
                    </div>

                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-800 text-xs text-gray-400">
                        <p className="leading-relaxed">
                            💡 **What's Next?** After creating or logging into your account, you will connect your crypto wallet to authorize the autopilot monthly USDC recurring payment.
                        </p>
                    </div>

                    {error && <p className="text-sm text-red-400 text-center font-medium">{error}</p>}
                </main>
                <footer className="p-6 bg-slate-950 border-t border-gray-800 flex justify-end">
                    <Button type="submit" isLoading={isLoading} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-6 shadow-md border-none">
                        {mode === 'signup' ? 'Sign Up & Continue' : 'Log In & Continue'}
                    </Button>
                </footer>
            </form>
        </Modal>
    );
};

export default SubscriptionAuthModal;