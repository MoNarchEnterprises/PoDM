import React, { useState } from 'react';
import { X, CheckCircle, Zap, ShieldCheck, Loader2, ExternalLink } from 'lucide-react';
import { Creator } from '@common/types/Creator';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useEmbeddedWallet } from '../../context/EmbeddedWalletContext';
import { signPaymentOperation, PaymentIntent } from '../../lib/embeddedWalletApi';

interface EmbeddedPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'Tip' | 'Subscription' | 'PPV Post' | 'PPV Message';
    amount: number; // in dollars
    creator: Creator;
    contentTitle?: string;
    relatedId?: string;
    tierName?: string;
    onSuccess?: (txHash?: string) => void;
}

const EmbeddedPaymentModal: React.FC<EmbeddedPaymentModalProps> = ({
    isOpen,
    onClose,
    type,
    amount,
    creator,
    contentTitle,
    relatedId,
    tierName,
    onSuccess
}) => {
    const { usdcBalance, isReady, isLoading: walletLoading, refreshBalance } = useEmbeddedWallet();
    const [step, setStep] = useState<1 | 2>(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);

    const hasSufficientBalance = usdcBalance >= amount;

    const handleConfirm = async () => {
        if (!hasSufficientBalance) {
            setError('Insufficient USDC balance.');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const intent: PaymentIntent = {
                type,
                amountInCents: Math.round(amount * 100),
                creatorId: creator.id,
                relatedId,
            };

            const result = await signPaymentOperation(intent);

            if (result.data.success) {
                setTxHash(result.data.txHash || result.data.transactionId || null);
                setStep(2);
                await refreshBalance();
                if (onSuccess) {
                    onSuccess(result.data.txHash);
                }
            } else {
                setError(result.data.error || 'Payment failed.');
            }
        } catch (err: any) {
            console.error('Payment error:', err);
            setError(err.response?.data?.message || err.response?.data?.error || err.message || 'An unexpected error occurred.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        if (isProcessing) return;
        setStep(1);
        setError(null);
        setTxHash(null);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            {step === 1 && (
                <>
                    <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Payment</h2>
                        <button 
                            onClick={handleClose} 
                            disabled={isProcessing}
                            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </header>
                    <main className="p-6 space-y-6">
                        <div className="flex flex-col items-center justify-center space-y-2">
                            <img 
                                src={creator.profile?.avatar || (creator as any).avatar_url || '/placeholder-avatar.png'} 
                                alt={creator.profile?.name || (creator as any).username} 
                                className="w-16 h-16 rounded-full border-2 border-purple-400" 
                            />
                            <div className="text-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Paying {creator.profile?.name || (creator as any).username || 'Creator'}</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">${amount.toFixed(2)} <span className="text-sm font-normal text-gray-500">USDC</span></p>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Payment Type</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{type}</span>
                            </div>
                            {tierName && (
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Tier</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{tierName}</span>
                                </div>
                            )}
                            {contentTitle && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Content</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{contentTitle}</span>
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Your Wallet Balance</span>
                                {walletLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                ) : (
                                    <span className={`text-sm font-bold ${hasSufficientBalance ? 'text-green-500' : 'text-red-500'}`}>
                                        ${usdcBalance.toFixed(2)} USDC
                                    </span>
                                )}
                            </div>
                            {!hasSufficientBalance && !walletLoading && (
                                <p className="text-xs text-red-500 mt-1">Insufficient balance. Please add funds to your wallet.</p>
                            )}
                        </div>

                        <div className="flex items-center justify-center space-x-1 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 py-2 rounded-full">
                            <Zap className="w-3 h-3" />
                            <span>Gas-free • Powered by Base</span>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                                <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
                            </div>
                        )}
                    </main>
                    <footer className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <Button 
                            onClick={handleConfirm} 
                            disabled={isProcessing || !hasSufficientBalance || !isReady} 
                            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-lg transition-all"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="w-5 h-5" />
                                    <span>Confirm Payment</span>
                                </>
                            )}
                        </Button>
                    </footer>
                </>
            )}
            
            {step === 2 && (
                <div className="p-8 text-center">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Successful!</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6">
                        You've successfully paid <span className="font-bold text-gray-800 dark:text-white">${amount.toFixed(2)}</span> to <span className="font-bold text-gray-800 dark:text-white">{creator.profile?.name || (creator as any).username}</span>.
                    </p>
                    
                    {txHash && (
                        <a 
                            href={`https://basescan.org/tx/${txHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-sm text-purple-600 dark:text-purple-400 hover:underline mb-6"
                        >
                            <span>View transaction on BaseScan</span>
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                    
                    <Button 
                        onClick={handleClose} 
                        className="w-full px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700"
                    >
                        Close
                    </Button>
                </div>
            )}
        </Modal>
    );
};

export default EmbeddedPaymentModal;
