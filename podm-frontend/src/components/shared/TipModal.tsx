import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { X, Send, CheckCircle } from 'lucide-react';

// --- Import Shared Types ---
import { Creator } from '@common/types/Creator';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { CARD_ELEMENT_OPTIONS } from '../../lib/constants';

interface TipModalProps {
    /**
     * Controls whether the modal is visible or not.
     */
    isOpen: boolean;
    /**
     * A function to be called when the modal is requested to be closed.
     */
    onClose: () => void;
    /**
     * The creator object who will receive the tip.
     */
    creator: Creator;
    /**
     * An async function that calls the backend to create a PaymentIntent.
     * It must return an object containing the `clientSecret`.
     */
    onSubmit: (amount: number, message: string) => Promise<{ clientSecret: string }>;
}

const TipModal = ({ isOpen, onClose, creator, onSubmit }: TipModalProps) => {
    const stripe = useStripe();
    const elements = useElements();

    const [amount, setAmount] = useState(10);
    const [customAmount, setCustomAmount] = useState('');
    const [message, setMessage] = useState('');
    const [step, setStep] = useState(1); // 1 for input form, 2 for success screen
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSendTip = async () => {
        const cardElement = elements?.getElement(CardElement);
        if (!stripe || !cardElement) {
            setError("Payment form is not ready. Please try again in a moment.");
            return;
        }

        const finalAmount = customAmount ? parseFloat(customAmount) : amount;
        if (finalAmount <= 0) {
            setError("Please enter a valid tip amount.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Step 1: Call our backend to create the PaymentIntent.
            // The `onSubmit` prop is the `handleTipSubmit` function from PostCard.tsx.
            const { clientSecret } = await onSubmit(finalAmount, message);

            // Step 2: Use the clientSecret to confirm the card payment on the frontend.
            const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                },
            });

            if (stripeError) {
                // Show an error from Stripe (e.g., "Your card was declined.")
                throw new Error(stripeError.message);
            }
            
            console.log("Payment confirmed! PaymentIntent:", paymentIntent);
            // If we get here, the payment is successful. Stripe will now send the
            // `payment_intent.succeeded` webhook, and our backend will save the transaction.
            setStep(2); // Move to the success screen

        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    // Resets the modal's state when it's closed, ensuring it's fresh for the next use.
    const handleClose = () => {
        setStep(1);
        setAmount(10);
        setCustomAmount('');
        setMessage('');
        setError(null);
        setIsLoading(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            {step === 1 && (
                <>
                    <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Send a Tip</h2>
                        <button onClick={handleClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </header>
                    <main className="p-6 space-y-4">
                        <div className="text-center">
                            <img src={creator.profile.avatar} alt={creator.profile.name} className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-purple-400" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                You are tipping <span className="font-bold text-gray-800 dark:text-white">{creator.profile.name}</span>
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[5, 10, 20].map(val => (
                                <button 
                                    key={val} 
                                    onClick={() => { setAmount(val); setCustomAmount(''); }} 
                                    className={`py-2 rounded-lg font-bold transition-colors ${amount === val && !customAmount ? 'bg-pink-500 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                >
                                    ${val}
                                </button>
                            ))}
                        </div>
                        <input
                            type="number"
                            placeholder="Custom amount"
                            value={customAmount}
                            onChange={(e) => { setCustomAmount(e.target.value); setAmount(0); }}
                            className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-lg p-2 text-center focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                         <div className="p-3 bg-slate-800 rounded-md border border-slate-700">
                            <CardElement options={CARD_ELEMENT_OPTIONS} />
                        </div>
                        <textarea
                            rows={3}
                            placeholder="Add an optional message..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    </main>
                    <footer className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <Button 
                            onClick={handleSendTip} 
                            isLoading={isLoading}
                            disabled={!stripe || isLoading}
                            className="w-full flex items-center justify-center space-x-2 bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-lg transition-colors"
                        >
                            <Send className="w-4 h-4" />
                            <span>Send Tip of ${customAmount || amount}</span>
                        </Button>
                    </footer>
                </>
            )}
            {step === 2 && (
                 <div className="p-8 text-center">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tip Sent!</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        You sent <span className="font-bold text-gray-800 dark:text-white">${customAmount || amount}</span> to <span className="font-bold text-gray-800 dark:text-white">{creator.profile.name}</span>. Thank you for your support!
                    </p>
                    <Button onClick={handleClose} className="mt-6 w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700">
                        Done
                    </Button>
                </div>
            )}
        </Modal>
    );
};

export default TipModal;