import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { X, Lock, CheckCircle, CreditCard } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { CARD_ELEMENT_OPTIONS } from '../../lib/constants';
import * as apiClient from '../../lib/apiClient';

interface UnlockModalProps {
    isOpen: boolean;
    onClose: () => void;
    contentId: string;
    title: string;
    price: number; // Price in cents
    onUnlockSuccess: () => void;
}

const UnlockModal = ({ isOpen, onClose, contentId, title, price, onUnlockSuccess }: UnlockModalProps) => {
    const stripe = useStripe();
    const elements = useElements();
    const { paymentMethod } = useAuth();

    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const showCardForm = !paymentMethod || !paymentMethod.id;
    const formattedPrice = (price / 100).toFixed(2);

    const handleUnlock = async () => {
        if (!stripe) {
            setError("Payment form is not ready.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            let unlockPaymentMethodId: string | undefined = paymentMethod?.id || undefined;

            if (showCardForm) {
                const cardElement = elements?.getElement(CardElement);
                if (!cardElement) throw new Error("Card element not found.");

                const { error: pmError, paymentMethod: newPaymentMethod } = await stripe.createPaymentMethod({ type: 'card', card: cardElement });
                if (pmError || !newPaymentMethod) throw new Error(pmError?.message || "Invalid card details.");
                unlockPaymentMethodId = newPaymentMethod.id;
            }

            const { clientSecret, status, paymentIntentId } = await apiClient.unlockPost(contentId, unlockPaymentMethodId);

            let finalPaymentIntentId = paymentIntentId;

            if (status === 'requires_action' || status === 'requires_payment_method' || status === 'requires_confirmation') {
                const { error: confirmationError, paymentIntent } = await stripe.confirmCardPayment(clientSecret);
                if (confirmationError) {
                    throw new Error(confirmationError.message);
                }
                if (paymentIntent) {
                    finalPaymentIntentId = paymentIntent.id;
                }
            }

            if (finalPaymentIntentId) {
                await apiClient.confirmTransaction(finalPaymentIntentId);
            }

            setStep(2);
            onUnlockSuccess();

        } catch (err: any) {
            console.error('Error unlocking content:', err);
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setError(null);
        setIsLoading(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            {step === 1 && (
                <>
                    <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Unlock Content</h2>
                        <button onClick={handleClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </header>
                    <main className="p-6 space-y-4">
                        <div className="text-center">
                            <Lock className="w-12 h-12 mx-auto text-pink-500 mb-2" />
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{title}</h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                Unlock this exclusive content for <span className="font-bold text-gray-800 dark:text-white">${formattedPrice}</span>
                            </p>
                        </div>

                        {showCardForm ? (
                            <div className="p-3 bg-slate-800 rounded-md border border-slate-700">
                                <CardElement options={CARD_ELEMENT_OPTIONS} />
                            </div>
                        ) : (
                            <div className="p-3 bg-slate-800 rounded-md border border-slate-700 text-center">
                                <p className="text-sm text-gray-400">Using your saved card:</p>
                                <div className="flex items-center justify-center space-x-2 font-semibold text-white mt-1">
                                    <CreditCard className="w-5 h-5" />
                                    <span>{paymentMethod?.brand} **** {paymentMethod?.last4}</span>
                                </div>
                            </div>
                        )}

                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    </main>
                    <footer className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <Button onClick={handleUnlock} isLoading={isLoading} disabled={!stripe || isLoading} className="w-full flex items-center justify-center space-x-2 bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-lg transition-colors">
                            <span>Pay ${formattedPrice} & Unlock</span>
                        </Button>
                    </footer>
                </>
            )}
            {step === 2 && (
                <div className="p-8 text-center">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Unlocked!</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        You now have access to this content.
                    </p>
                    <Button onClick={handleClose} className="mt-6 w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700">
                        View Content
                    </Button>
                </div>
            )}
        </Modal>
    );
};

export default UnlockModal;
