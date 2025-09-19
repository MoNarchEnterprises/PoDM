// src/features/profile/SubscriptionAuthModal.tsx

import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { Creator, SubscriptionTier } from '@common/types/Creator';
import * as apiClient from '../../lib/apiClient';
import { Mail, KeyRound, User as UserIcon } from 'lucide-react';
import { CARD_ELEMENT_OPTIONS } from '../../lib/constants';



interface SubscriptionAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    creator: Creator;
    selectedTier: SubscriptionTier;
    onLoginSuccess: () => void;
}

const SubscriptionAuthModal = ({ isOpen, onClose, creator, selectedTier, onLoginSuccess }: SubscriptionAuthModalProps) => {
    const stripe = useStripe();
    const elements = useElements();
    const navigate = useNavigate();
    const { login } = useAuth();
    const [mode, setMode] = useState<'signup' | 'login'>('signup');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!stripe || !elements) {
        setError("Payment form is not ready. Please try again.");
        return;
    }
        setIsLoading(true);
        setError(null);

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
            setError("Payment form is not available. Please refresh.");
            setIsLoading(false);
            return;
        }

        const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({ type: 'card', card: cardElement });
        if (pmError || !paymentMethod) {
            setError(pmError?.message || "Invalid card details.");
            setIsLoading(false);
            return;
        }
        
        try {
            if (mode === 'signup') {
                // --- THIS IS THE FIX ---
                await apiClient.signupAndSubscribe({
                    email,
                    password,
                    fullName,
                    creatorId: creator._id,
                    tierId: selectedTier.id,
                    // The key must be `paymentMethodId` as the backend expects,
                    // and the value is `paymentMethod.id` from the Stripe call above.
                    paymentMethodId: paymentMethod.id,
                });
                // --- END OF FIX ---
                await login(email, password);
                onClose();
                navigate('/fan/feed');
                
            } else { // Mode is 'login'
                const loggedInUser = await login(email, password);
                await apiClient.createSubscription(
                    creator._id,
                    selectedTier.id,
                    paymentMethod.id
                );
                onClose();
                navigate('/fan/feed');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "An error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <header className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold">Subscribe to {creator.profile.name}</h2>
                <p className="text-sm text-gray-500 mt-1">
                    You're getting the <span className="font-semibold text-purple-400">{selectedTier.name}</span> for <span className="font-semibold text-purple-400">${selectedTier.price.toFixed(2)}/month</span>.
                </p>
            </header>

            {/* --- NEW: TABS TO SWITCH BETWEEN MODES --- */}
            <div className="grid grid-cols-2 text-center font-semibold border-b border-gray-700">
                <button 
                    onClick={() => setMode('signup')}
                    className={`py-3 ${mode === 'signup' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'}`}
                >
                    New Fan
                </button>
                <button 
                    onClick={() => setMode('login')}
                    className={`py-3 ${mode === 'login' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'}`}
                >
                    Existing Fan
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <main className="p-6 space-y-6">
                    <div>
                        <h3 className="text-md font-semibold text-gray-200 mb-2">
                            {mode === 'signup' ? '1. Create Your Account' : '1. Log In To Your Account'}
                        </h3>
                        <div className="space-y-4">
                            {/* --- 3. ADD THE FULL NAME INPUT (only for signup mode) --- */}
                            {mode === 'signup' && (
                                <Input id="fullName" type="text" placeholder="Full Name (on card)" leftIcon={UserIcon} value={fullName} onChange={e => setFullName(e.target.value)} required />
                            )}
                            <Input id="email" type="email" placeholder="Email Address" leftIcon={Mail} value={email} onChange={e => setEmail(e.target.value)} required />
                            <Input id="password" type="password" placeholder="Password" leftIcon={KeyRound} value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-md font-semibold text-gray-200 mb-2">2. Enter Payment Details</h3>
                        <div className="p-3 bg-slate-800 rounded-md border border-slate-700">
                            <CardElement options={CARD_ELEMENT_OPTIONS} />
                        </div>
                    </div>
                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                </main>
                <footer className="p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <Button type="submit" isLoading={isLoading} disabled={!stripe || isLoading}>
                        {mode === 'signup' ? 'Sign Up & Pay' : 'Log In & Pay'} ${selectedTier.price.toFixed(2)}
                    </Button>
                </footer>
            </form>
        </Modal>
    );
};

export default SubscriptionAuthModal;