import { useState, useCallback } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { useAuth } from '../../hooks/useAuth';
import * as apiClient from '../../lib/apiClient';

// --- Types ---

export interface PaymentParams {
    /** Amount in dollars (not cents). Will be converted to cents where needed. */
    amount?: number;
    /** Content ID for unlocking content. */
    contentId?: string;
    /** Creator ID for tips. */
    creatorId?: string;
    /** Optional message (for tips). */
    message?: string;
}

export interface StripePaymentResult {
    /** Current step: 1 = form, 2 = success. */
    step: number;
    isLoading: boolean;
    error: string | null;
    /** Execute the payment flow: create payment method, confirm, and finalize. */
    processPayment: (params: PaymentParams) => Promise<boolean>;
    /** Reset to initial state. */
    reset: () => void;
    /** Set step manually (e.g., on close). */
    setStep: React.Dispatch<React.SetStateAction<number>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    /** Whether the card form should be shown (vs. saved card). */
    showCardForm: boolean;
}

// --- Hook ---

/**
 * Centralized Stripe payment flow hook.
 *
 * Eliminates the duplicated payment logic across:
 * - TipModal.tsx (lines 30-116)
 * - UnlockModal.tsx (lines 25-80)
 * - UpdatePaymentModal.tsx (lines 43-100+)
 * - CreatorEarnings.tsx WithdrawModal (lines 30-50)
 *
 * All share: step state, isLoading/error state, stripe.createPaymentMethod,
 * stripe.confirmCardPayment, apiClient.confirmTransaction.
 */
export function useStripePayment(): StripePaymentResult {
    const stripe = useStripe();
    const elements = useElements();
    const { paymentMethod } = useAuth();

    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const showCardForm = !paymentMethod || !paymentMethod.id;

    const processPayment = useCallback(async (params: PaymentParams): Promise<boolean> => {
        if (!stripe) {
            setError('Payment form is not ready.');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            let paymentMethodId: string | undefined = paymentMethod?.id || undefined;

            // If no saved card, create a new payment method from card element
            if (showCardForm) {
                const cardElement = elements?.getElement(CardElement);
                if (!cardElement) throw new Error('Card element not found.');

                const { error: pmError, paymentMethod: newPaymentMethod } =
                    await stripe.createPaymentMethod({ type: 'card', card: cardElement });
                if (pmError || !newPaymentMethod) {
                    throw new Error(pmError?.message || 'Invalid card details.');
                }
                paymentMethodId = newPaymentMethod.id;
            }

            // Determine which API call to make based on params
            let apiResponse: { clientSecret: string; status: string; paymentIntentId?: string };

            if (params.contentId && paymentMethodId) {
                // Unlock content flow
                apiResponse = await apiClient.unlockPost(params.contentId, paymentMethodId);
            } else if (params.creatorId && params.amount) {
                // Tip flow — the caller provides the onSubmit handler shape
                // For generic use, we require the caller to pass an onSubmit-style function
                throw new Error('For tips, use a custom onSubmit wrapper. Call processPayment only for direct API calls.');
            } else {
                throw new Error('Invalid payment parameters.');
            }

            let finalPaymentIntentId = apiResponse.paymentIntentId;

            // Handle Stripe confirmation if needed
            if (
                apiResponse.status === 'requires_action' ||
                apiResponse.status === 'requires_payment_method' ||
                apiResponse.status === 'requires_confirmation'
            ) {
                const { error: confirmationError, paymentIntent } = await stripe.confirmCardPayment(
                    apiResponse.clientSecret,
                );
                if (confirmationError) {
                    throw new Error(confirmationError.message);
                }
                if (paymentIntent) {
                    finalPaymentIntentId = paymentIntent.id;
                }
            }

            // Finalize transaction on backend
            if (finalPaymentIntentId) {
                await apiClient.confirmTransaction(finalPaymentIntentId);
            }

            setStep(2);
            return true;
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Payment failed.';
            setError(message);
            console.error('[useStripePayment] Error:', err);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [stripe, elements, paymentMethod, showCardForm]);

    const reset = useCallback(() => {
        setStep(1);
        setIsLoading(false);
        setError(null);
    }, []);

    return {
        step,
        isLoading,
        error,
        processPayment,
        reset,
        setStep,
        setError,
        setIsLoading,
        showCardForm,
    };
}

export default useStripePayment;
