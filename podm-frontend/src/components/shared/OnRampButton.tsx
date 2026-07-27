import { useState } from 'react';
import { CreditCard, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

interface OnRampButtonProps {
    amount: number;
    destinationWallet: string;
    fanId: string;
    onComplete?: () => void;
    className?: string;
}

export const OnRampButton = ({ amount, destinationWallet, fanId, onComplete, className = '' }: OnRampButtonProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [sessionUrl, setSessionUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [completed, setCompleted] = useState(false);

    const handleBuyWithCard = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            const response = await fetch('/api/v1/payments/onramp/session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    amount,
                    destinationWallet,
                }),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Failed to create on-ramp session.');
            }

            setSessionUrl(result.data.hostUrl);
            window.open(result.data.hostUrl, '_blank', 'noopener,noreferrer');
        } catch (err: any) {
            setError(err.message || 'Failed to start card purchase.');
        } finally {
            setIsLoading(false);
        }
    };

    if (completed) {
        return (
            <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>On-Ramp session created. Complete the purchase in the opened tab, then return here.</span>
            </div>
        );
    }

    return (
        <div className={`space-y-2 ${className}`}>
            <button
                onClick={handleBuyWithCard}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50"
            >
                {isLoading ? (
                    <span className="animate-pulse">Creating session...</span>
                ) : (
                    <>
                        <CreditCard className="w-5 h-5" />
                        <span>Buy ${amount} USDC with Card</span>
                        <ExternalLink className="w-4 h-4 ml-1" />
                    </>
                )}
            </button>

            {sessionUrl && (
                <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 p-2.5 rounded-lg border border-blue-500/20">
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    <span>
                        Session ready. <a href={sessionUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold">Open Coinbase On-Ramp</a> if the tab didn't open.
                    </span>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <p className="text-2xs text-gray-500 text-center">
                Powered by Coinbase On-Ramp. Visa, Mastercard, Apple Pay, and Google Pay accepted.
            </p>
        </div>
    );
};

export default OnRampButton;
