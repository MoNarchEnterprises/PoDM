import React, { useState } from 'react';
import { useCryptoPayment } from '../../shared/hooks/useCryptoPayment';
import { X, Send, CheckCircle, Wallet } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Creator } from '@common/types/Creator';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

interface TipModalProps {
    isOpen: boolean;
    onClose: () => void;
    creator: Creator;
    onSubmit: (amount: number, message: string) => Promise<void>;
}

const TipModal = ({ isOpen, onClose, creator, onSubmit }: TipModalProps) => {
    const { user: currentFan } = useAuth();
    const { processPayment, isLoading, error, step, setStep, setError, setIsLoading } = useCryptoPayment();
    const [amount, setAmount] = useState(10);
    const [customAmount, setCustomAmount] = useState('');
    const [message, setMessage] = useState('');

    const recipientAddress = creator.profile?.crypto_wallet_address;
    const hasWallet = !!recipientAddress;

    const handleSendTip = async () => {
        const finalAmount = customAmount ? parseFloat(customAmount) : amount;
        if (finalAmount <= 0) {
            setError('Please enter a valid tip amount.');
            return;
        }

        const success = await processPayment({
            amount: finalAmount,
            recipientAddress,
            creatorId: creator.id,
            message,
        });

        if (success) {
            try {
                await onSubmit(finalAmount, message);
            } catch { }
        }
    };

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
                                <button key={val} onClick={() => { setAmount(val); setCustomAmount(''); }} className={`py-2 rounded-lg font-bold transition-colors ${amount === val && !customAmount ? 'bg-pink-500 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                                    ${val}
                                </button>
                            ))}
                        </div>
                        <input type="number" placeholder="Custom amount" value={customAmount} onChange={(e) => { setCustomAmount(e.target.value); setAmount(0); }} className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-lg p-2 text-center focus:outline-none focus:ring-2 focus:ring-pink-500" />

                        {!hasWallet ? (
                            <div className="p-3 bg-yellow-900/30 rounded-md border border-yellow-700 text-center">
                                <p className="text-sm text-yellow-400">This creator has not set up their crypto wallet yet.</p>
                            </div>
                        ) : !currentFan?.profile?.crypto_wallet_address ? (
                            <div className="p-3 bg-slate-800 rounded-md border border-slate-700">
                                <p className="text-sm text-gray-400 mb-2">Connect your wallet to send a tip via USDC on Base.</p>
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
                                <p className="text-sm text-gray-400">Sending from:</p>
                                <p className="font-semibold text-white text-xs truncate">{currentFan.profile.crypto_wallet_address}</p>
                            </div>
                        )}

                        <textarea rows={3} placeholder="Add an optional message..." value={message} onChange={(e) => setMessage(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    </main>
                    <footer className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <Button onClick={handleSendTip} isLoading={isLoading} disabled={!hasWallet || !currentFan?.profile?.crypto_wallet_address || isLoading} className="w-full flex items-center justify-center space-x-2 bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-lg transition-colors">
                            <Send className="w-4 h-4" />
                            <span>Send Tip of ${customAmount || amount} (USDC)</span>
                        </Button>
                    </footer>
                </>
            )}
            {step === 2 && (
                <div className="p-8 text-center">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tip Sent!</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        You sent <span className="font-bold text-gray-800 dark:text-white">${customAmount || amount}</span> USDC to <span className="font-bold text-gray-800 dark:text-white">{creator.profile.name}</span>. Thank you for your support!
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
