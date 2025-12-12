import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';

// --- Import Reusable Components ---
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Creator, SubscriptionTier } from '@common/types/Creator';

// --- Stripe Card Element Styling ---
import { CARD_ELEMENT_OPTIONS } from '../../lib/constants';
// --- Component Props Interface ---
interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    creator: Creator;
    selectedTier: SubscriptionTier;
    onSubscriptionComplete: (result: any) => void;
}

const SubscriptionModal = ({ isOpen, onClose, creator, selectedTier, onSubscriptionComplete }: SubscriptionModalProps) => {
    const stripe = useStripe();
    const elements = useElements();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!stripe || !elements) {
            // Stripe.js has not yet loaded.
            setError("Stripe is not ready. Please wait a moment and try again.");
            return;
        }

        setIsLoading(true);
        setError(null);

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
            setError("Payment form is not available. Please refresh the page.");
            setIsLoading(false);
            return;
        }

        // 1. Create a Payment Method from the Card Element
        const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
            type: 'card',
            card: cardElement,
        });

        if (paymentMethodError || !paymentMethod) {
            setError(paymentMethodError?.message || "Failed to create payment method.");
            setIsLoading(false);
            return;
        }

        // 2. Call the onSubscriptionComplete handler passed from the parent
        // This keeps the API logic in the main page component
        try {
            await onSubscriptionComplete({
                creatorId: creator.id,
                tierId: selectedTier.id,
                paymentMethodId: paymentMethod.id,
            });
            onClose(); // Close the modal on success
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred during subscription.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <header className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Complete Subscription</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    You are subscribing to the <span className="font-semibold text-purple-400">{selectedTier.name}</span> for <span className="font-semibold text-purple-400">${selectedTier.price.toFixed(2)}/month</span>.
                </p>
            </header>

            <form onSubmit={handleSubmit}>
                <main className="p-6 space-y-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Enter your payment details below.
                    </p>
                    <div className="p-3 bg-slate-800 rounded-md border border-slate-700">
                        <CardElement options={CARD_ELEMENT_OPTIONS} />
                    </div>
                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                </main>
                <footer className="p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <Button type="submit" isLoading={isLoading} disabled={!stripe}>
                        Confirm & Pay ${selectedTier.price.toFixed(2)}
                    </Button>
                </footer>
            </form>
        </Modal>
    );
};

export default SubscriptionModal;