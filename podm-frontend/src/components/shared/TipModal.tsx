import React, { useState } from 'react';
import { PaymentOrchestrator } from '../../shared/lib/PaymentOrchestrator';
import { useCryptoPayment } from '../../shared/hooks/useCryptoPayment';
import { getCryptoWallet } from '../../lib/wallet';
import { X, Send, CheckCircle, Wallet, Zap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Creator } from '@common/types/Creator';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

import { useEmbeddedWallet } from '../../context/EmbeddedWalletContext';
import EmbeddedPaymentModal from './EmbeddedPaymentModal';

interface TipModalProps {
    isOpen: boolean;
    onClose: () => void;
    creator: Creator;
    contentId?: string;
    onSubmit?: (amount: number, message: string) => Promise<void>;
}

const TipModal = ({ isOpen, onClose, creator, contentId, onSubmit }: TipModalProps) => {
    const { user: currentFan } = useAuth();
    const [step, setStep] = useState(1);
    const [amount, setAmount] = useState(10);
    const [customAmount, setCustomAmount] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [_manualAddress, _setManualAddress] = useState('');

    const { smartAccountAddress, usdcBalance, isReady: embeddedReady } = useEmbeddedWallet();

    const recipientAddress = getCryptoWallet(creator);
    const fanWalletAddress = getCryptoWallet(currentFan);
    const resolvedAddress = fanWalletAddress;

    const [showEmbeddedPayment, setShowEmbeddedPayment] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'embedded' | 'browser'>(embeddedReady && smartAccountAddress ? 'embedded' : 'browser');

    const finalAmount = customAmount ? parseFloat(customAmount) : amount;

    const handleStartPayment = () => {
        if (finalAmount <= 0) {
            setError('Please enter a valid tip amount.');
            return;
        }
        if (paymentMethod === 'embedded') {
            setShowEmbeddedPayment(true);
        } else {
            if (!resolvedAddress) {
                setError('Please connect a browser wallet.');
                return;
            }
            handleSendTip();
        }
    };

    const handleEmbeddedSuccess = async () => {
        if (onSubmit) {
            await onSubmit(finalAmount, message);
        }
        setShowEmbeddedPayment(false);
        setStep(2);
    };

    const cryptoPayment = useCryptoPayment();

    const handleSendTip = async () => {
        if (finalAmount <= 0) {
            setError('Please enter a valid tip amount.');
            return;
        }
        if (!resolvedAddress) {
            setError('Please provide your wallet address.');
            return;
        }

        setIsLoading(true);
        setError(null);

        const orchestrator = new PaymentOrchestrator(undefined, cryptoPayment);
        const result = await orchestrator.payWithBrowserWallet({
            paymentType: 'Tip',
            amount: finalAmount,
            creatorId: creator.id,
            creatorWalletAddress: recipientAddress,
            creatorProfile: creator,
            contentId,
            message,
            fromAddress: resolvedAddress,
        });

        setIsLoading(false);

        if (result.success) {
            setStep(2);
        } else {
            setError(result.error || 'Failed to send tip.');
        }
    };

    const handleClose = () => {
        setStep(1);
        setAmount(10);
        setCustomAmount('');
        setMessage('');
        setError(null);
        setIsLoading(false);
        setShowEmbeddedPayment(false);
        onClose();
    };

    if (showEmbeddedPayment) {
        return (
            <EmbeddedPaymentModal
                isOpen={isOpen}
                onClose={() => setShowEmbeddedPayment(false)}
                type="Tip"
                amount={finalAmount}
                creator={creator}
                relatedId={contentId}
                onSuccess={handleEmbeddedSuccess}
            />
        );
    }

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
                            <img src={creator.profile?.avatar || (creator as any).avatar_url || '/placeholder-avatar.png'} alt={creator.profile?.name || (creator as any).username} className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-purple-400" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                You are tipping <span className="font-bold text-gray-800 dark:text-white">{creator.profile?.name || (creator as any).username || 'Creator'}</span>
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[5, 10, 20].map(val => (
                                <button key={val} onClick={() => { setAmount(val); setCustomAmount(''); }} className={`py-2 rounded-lg font-bold transition-colors ${amount === val && !customAmount ? 'bg-pink-500 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                                    ${val}
                                </button>
                            ))}
                        </div>
                        <input type="number" placeholder="Custom amount" value={customAmount} onChange={(e) => { setCustomAmount(e.target.value); setAmount(0); }} className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-lg p-2 text-center focus:outline-none focus:ring-2 focus:ring-pink-500" />

                        {embeddedReady && smartAccountAddress ? (
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Payment Method</p>
                                <button
                                    onClick={() => setPaymentMethod('embedded')}
                                    className={`w-full p-3 rounded-lg border text-left transition-colors ${paymentMethod === 'embedded' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <Zap className="w-4 h-4 text-purple-500" />
                                            <span className="font-medium text-sm text-gray-900 dark:text-white">Embedded Wallet</span>
                                        </div>
                                        <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">Gas-free</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono truncate">{smartAccountAddress}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Balance: <span className="font-semibold text-gray-900 dark:text-white">${(usdcBalance ?? 0).toFixed(2)} USDC</span></p>
                                </button>
                                <button
                                    onClick={() => {
                                        if (!fanWalletAddress) {
                                            const eth = window.ethereum;
                                            if (eth) eth.request({ method: 'eth_requestAccounts' }).then(() => window.location.reload());
                                            else setError('No browser wallet detected.');
                                            return;
                                        }
                                        setPaymentMethod('browser');
                                    }}
                                    className={`w-full p-3 rounded-lg border text-left transition-colors ${paymentMethod === 'browser' ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-pink-300'}`}
                                >
                                    <div className="flex items-center space-x-2">
                                        <Wallet className="w-4 h-4 text-pink-500" />
                                        <span className="font-medium text-sm text-gray-900 dark:text-white">Browser Wallet</span>
                                    </div>
                                    {fanWalletAddress ? (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono truncate">{fanWalletAddress}</p>
                                    ) : (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Click to connect MetaMask or Coinbase Wallet</p>
                                    )}
                                </button>
                            </div>
                        ) : fanWalletAddress ? (
                            <div className="p-3 bg-slate-800 rounded-md border border-slate-700 text-center">
                                <p className="text-sm text-gray-400">Sending from:</p>
                                <p className="font-semibold text-white text-xs truncate">{fanWalletAddress}</p>
                            </div>
                        ) : (
                            <div className="p-3 bg-slate-800 rounded-md border border-slate-700 space-y-3">
                                <p className="text-sm text-gray-400">Connect a wallet to send a tip via USDC on Base:</p>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                        const eth = window.ethereum;
                                        if (eth) eth.request({ method: 'eth_requestAccounts' }).then(() => window.location.reload());
                                        else setError('No wallet detected. Install MetaMask or Coinbase Wallet.');
                                    }}
                                >
                                    <Wallet className="w-4 h-4 mr-2" /> Connect Browser Wallet
                                </Button>
                            </div>
                        )}

                        <textarea rows={3} placeholder="Add an optional message..." value={message} onChange={(e) => setMessage(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    </main>
                    <footer className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <Button onClick={handleStartPayment} isLoading={isLoading} disabled={isLoading} className="w-full flex items-center justify-center space-x-2 bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-lg transition-colors">
                            <Send className="w-4 h-4" />
                            <span>{paymentMethod === 'embedded' ? 'Continue to Payment' : `Send Tip of $${finalAmount} (USDC)`}</span>
                        </Button>
                    </footer>
                </>
            )}
            {step === 2 && (
                <div className="p-8 text-center">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tip Sent!</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        You sent <span className="font-bold text-gray-800 dark:text-white">${finalAmount}</span> USDC to <span className="font-bold text-gray-800 dark:text-white">{creator.profile.name}</span>. Thank you for your support!
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
