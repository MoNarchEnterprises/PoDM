import React, { useState } from 'react';
import { payFromWallet } from '../../lib/cryptoPayments';
import { getCryptoWallet } from '../../lib/wallet';
import { X, Lock, CheckCircle, Wallet } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useEmbeddedWalletEnabled } from '../../shared/hooks/useFeatureFlag';
import EmbeddedPaymentModal from './EmbeddedPaymentModal';

interface UnlockModalProps {
    isOpen: boolean;
    onClose: () => void;
    contentId: string;
    title: string;
    price: number;
    onUnlockSuccess: () => void;
    creatorWalletAddress?: string;
    creatorId?: string;
}

const UnlockModal = ({ isOpen, onClose, contentId, title, price, onUnlockSuccess, creatorWalletAddress, creatorId }: UnlockModalProps) => {
    const { user: currentFan } = useAuth();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { enabled: useEmbeddedWallet } = useEmbeddedWalletEnabled();

    const formattedPrice = (price / 100).toFixed(2);
    const recipientWallet = creatorWalletAddress || getCryptoWallet({ id: creatorId });
    const fanWalletAddress = getCryptoWallet(currentFan);
    const hasCreatorWallet = !!recipientWallet;
    const hasFanWallet = !!fanWalletAddress;

    const handleUnlock = async () => {
        setIsLoading(true);
        setError(null);

        const result = await payFromWallet({
            fromAddress: fanWalletAddress,
            toAddress: recipientWallet,
            creatorId: creatorId || '',
            amountInCents: price,
            transactionType: 'PPV Post',
            relatedId: contentId,
        });

        setIsLoading(false);

        if (result.success) {
            setStep(2);
            onUnlockSuccess();
        } else {
            setError(result.error || 'Unlock payment failed.');
        }
    };

    const handleClose = () => {
        setStep(1);
        setError(null);
        setIsLoading(false);
        onClose();
    };

    if (useEmbeddedWallet && creatorId) {
        return (
            <EmbeddedPaymentModal
                isOpen={isOpen}
                onClose={handleClose}
                type="PPV Post"
                amount={price / 100}
                creator={{ id: creatorId, profile: { name: 'Creator' } } as any}
                contentTitle={title}
                relatedId={contentId}
                onSuccess={onUnlockSuccess}
            />
        );
    }

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
                                Unlock this exclusive content for <span className="font-bold text-gray-800 dark:text-white">${formattedPrice}</span> USDC
                            </p>
                        </div>

                        {!hasCreatorWallet ? (
                            <div className="p-3 bg-yellow-900/30 rounded-md border border-yellow-700 text-center">
                                <p className="text-sm text-yellow-400">This creator has not set up their crypto wallet for payments.</p>
                            </div>
                        ) : !hasFanWallet ? (
                            <div className="p-3 bg-slate-800 rounded-md border border-slate-700">
                                <p className="text-sm text-gray-400 mb-2">Connect your wallet to unlock this content via USDC on Base.</p>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                        const eth = window.ethereum;
                                        if (eth) eth.request({ method: 'eth_requestAccounts' });
                                        else setError('No wallet detected.');
                                    }}
                                >
                                    <Wallet className="w-4 h-4 mr-2" /> Connect Wallet
                                </Button>
                            </div>
                        ) : (
                            <div className="p-3 bg-slate-800 rounded-md border border-slate-700 text-center">
                                <p className="text-sm text-gray-400">Paying from:</p>
                                <p className="font-semibold text-white text-xs truncate">{fanWalletAddress}</p>
                            </div>
                        )}

                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    </main>
                    <footer className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <Button onClick={handleUnlock} isLoading={isLoading} disabled={!hasCreatorWallet || !hasFanWallet || isLoading} className="w-full flex items-center justify-center space-x-2 bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-lg transition-colors">
                            <span>Pay ${formattedPrice} USDC & Unlock</span>
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
