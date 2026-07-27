import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Creator, SubscriptionTier } from '@common/types/Creator';
import { useCryptoWallet } from '../../shared/hooks/useCryptoWallet';
import { useCryptoPayment } from '../../shared/hooks/useCryptoPayment';
import { PaymentOrchestrator } from '../../shared/lib/PaymentOrchestrator';
import { ShieldCheck, Zap, CreditCard, ChevronRight, AlertCircle } from 'lucide-react';
import { getCryptoWallet } from '../../lib/wallet';
import OnRampButton from '../../components/shared/OnRampButton';
import { useEmbeddedWalletEnabled } from '../../shared/hooks/useFeatureFlag';
import EmbeddedPaymentModal from '../../components/shared/EmbeddedPaymentModal';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    creator: Creator;
    selectedTier: SubscriptionTier;
    onSubscriptionComplete: (result: any) => void;
}

const SubscriptionModal = ({ isOpen, onClose, creator, selectedTier, onSubscriptionComplete }: SubscriptionModalProps) => {
    const { isConnected, walletAddress, balance, isLoading: walletLoading, error: walletError, connectWallet } = useCryptoWallet();
    const cryptoPayment = useCryptoPayment();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'connect' | 'approve'>('connect');
    const [manualAddress, setManualAddress] = useState('');
    const [showManualAddress, setShowManualAddress] = useState(false);
    const { enabled: useEmbeddedWallet } = useEmbeddedWalletEnabled();
    const [showEmbeddedModal, setShowEmbeddedModal] = useState(false);

    React.useEffect(() => {
        if (isConnected) {
            setStep('approve');
        } else {
            setStep('connect');
        }
    }, [isConnected]);

    const handleConnect = async (type: 'embedded' | 'custom', customAddress?: string) => {
        try {
            setError(null);
            await connectWallet(type, customAddress);
        } catch (err: any) {
            setError(err.message || 'Failed to connect wallet.');
        }
    };

    const handleManualAddressSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualAddress || !manualAddress.startsWith('0x') || manualAddress.length !== 42) {
            setError('Please enter a valid 42-character 0x... EVM wallet address.');
            return;
        }
        handleConnect('custom', manualAddress);
    };

    const handleConfirmSubscription = async () => {
        setIsLoading(true);
        setError(null);

        try {
            if (!walletAddress) {
                throw new Error('Please enter a wallet address or connect a Web3 wallet.');
            }

            const orchestrator = new PaymentOrchestrator(undefined, cryptoPayment);
            const result = await orchestrator.payWithBrowserWallet({
                paymentType: 'Subscription',
                amount: selectedTier.price,
                creatorId: creator.id,
                creatorWalletAddress: getCryptoWallet(creator),
                creatorProfile: creator,
                tierId: selectedTier.id,
                fromAddress: walletAddress,
            });

            if (!result.success) {
                throw new Error(result.error || 'Transaction failed or rejected by wallet.');
            }

            await onSubscriptionComplete({
                creatorId: creator.id,
                tierId: selectedTier.id,
                paymentMethodId: result.txHash || 'subscription-payment',
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Transaction failed or rejected by wallet.');
        } finally {
            setIsLoading(false);
        }
    };

    if (showEmbeddedModal && useEmbeddedWallet) {
        return (
            <EmbeddedPaymentModal
                isOpen={isOpen}
                onClose={onClose}
                type="Subscription"
                amount={selectedTier.price}
                creator={creator}
                tierName={selectedTier.name}
                onSuccess={(txHash) => {
                    onSubscriptionComplete({
                        creatorId: creator.id,
                        tierId: selectedTier.id,
                        paymentMethodId: txHash || 'embedded-payment',
                    });
                    onClose();
                }}
            />
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <header className="p-6 border-b border-gray-700 bg-gradient-to-r from-purple-900/40 to-pink-900/40">
                <h2 className="text-xl font-bold text-white flex items-center">
                    <ShieldCheck className="w-6 h-6 mr-2 text-pink-500 animate-pulse" />
                    USDC Autopilot Subscription
                </h2>
                <p className="text-xs text-purple-300 mt-1 uppercase tracking-widest font-semibold">
                    Powered by Base Network (USDC)
                </p>
            </header>

            <main className="p-6 space-y-6 bg-slate-900 text-gray-200">
                <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Subscribing to</p>
                    <div className="flex justify-between items-baseline mt-1">
                        <span className="text-lg font-bold text-white">{selectedTier.name} Tier</span>
                        <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                            {selectedTier.price.toFixed(2)} USDC <span className="text-xs text-gray-400 font-normal">/mo</span>
                        </span>
                    </div>
                    
                </div>

                {step === 'connect' ? (
                    <div className="space-y-4">
                        <div className="text-center py-3 space-y-1">
                            <h3 className="text-md font-bold text-white">Choose Payment / Wallet Method</h3>
                            <p className="text-xs text-gray-400 max-w-sm mx-auto">
                                Fund directly using a credit/debit card, or connect an existing Web3 wallet on Base Sepolia.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {/* Option 1: Buy with Credit Card via Coinbase On-Ramp */}
                            <div className="p-3 bg-slate-800/80 rounded-xl border border-purple-500/30 space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                                    <CreditCard className="w-4 h-4 text-purple-400" />
                                    <span>Option 1: Buy USDC with Credit Card / Apple Pay</span>
                                </div>
                                <OnRampButton
                                    amount={Math.ceil(selectedTier.price)}
                                    destinationWallet={manualAddress || walletAddress || ''}
                                    fanId=""
                                />
                            </div>

                            {useEmbeddedWallet ? (
                                <button
                                    onClick={() => setShowEmbeddedModal(true)}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl flex items-center justify-between transition-all duration-300 shadow-lg"
                                >
                                    <span className="flex flex-col text-left">
                                        <span className="text-sm">Option 2: Pay with Embedded Wallet</span>
                                        <span className="text-3xs text-gray-200 font-normal">Gas-free • 1-Click Subscribe</span>
                                    </span>
                                    <Zap className="w-5 h-5 text-white" />
                                </button>
                            ) : (
                                <>
                                    {/* Option 2: Browser Extension Wallet */}
                                    <button
                                        onClick={() => handleConnect('custom')}
                                        disabled={walletLoading}
                                        className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-between transition-all duration-300 border border-slate-700"
                                    >
                                        <span className="flex flex-col text-left">
                                            <span className="text-sm">Option 2: Browser Extension Wallet</span>
                                            <span className="text-3xs text-gray-400 font-normal">MetaMask, Coinbase Wallet, Phantom</span>
                                        </span>
                                        <span className="border border-slate-600 py-1 px-2 rounded-lg text-xs text-gray-300">Connect</span>
                                    </button>

                                    {/* Option 3: Manual Wallet Address Input */}
                                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 space-y-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowManualAddress(!showManualAddress)}
                                            className="w-full flex justify-between items-center text-xs font-bold text-gray-300 hover:text-white"
                                        >
                                            <span>Option 3: Enter Wallet Address Manually</span>
                                            <ChevronRight className={`w-4 h-4 transition-transform ${showManualAddress ? 'rotate-90' : ''}`} />
                                        </button>

                                        {showManualAddress && (
                                            <form onSubmit={handleManualAddressSubmit} className="pt-2 space-y-2">
                                                <input
                                                    type="text"
                                                    placeholder="0x... (Your EVM Wallet Address)"
                                                    value={manualAddress}
                                                    onChange={(e) => setManualAddress(e.target.value)}
                                                    className="w-full text-xs font-mono p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                                />
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                                                >
                                                    Use Wallet Address
                                                </Button>
                                            </form>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-3 bg-purple-950/20 border border-purple-900/50 rounded-xl space-y-2">
                            <p className="text-2xs text-purple-400 uppercase tracking-widest font-bold">Connected Wallet</p>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-mono text-gray-300 bg-slate-950 py-1 px-2 rounded border border-slate-800">
                                    {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}` : ''}
                                </span>
                                <span className="text-xs font-semibold text-white">
                                    Balance: <span className="text-pink-400">{balance.toFixed(2)} USDC</span>
                                </span>
                            </div>
                        </div>

                        <div className="p-3 bg-slate-800 rounded-xl space-y-1.5 text-xs text-gray-400 border border-slate-700">
                            <div className="flex items-center text-white font-semibold">
                                <ShieldCheck className="w-4 h-4 mr-1 text-green-400" />
                                Privacy protected transaction
                            </div>
                            <p className="leading-relaxed">
                                Denominated in USDC. Confirming will request your wallet to switch to **Base Sepolia** to sign the one-time subscription pull permission.
                            </p>
                        </div>

                        <div className="flex items-center space-x-2 text-2xs text-purple-300 bg-purple-500/10 p-2.5 rounded-lg border border-purple-500/20">
                            <AlertCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <span>Gas is paid in native ETH on Base Sepolia.</span>
                        </div>
                    </div>
                )}

                {(error || walletError) && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 text-center">
                        {error || walletError}
                    </div>
                )}
            </main>

            <footer className="p-6 bg-slate-950 border-t border-gray-800 flex justify-end space-x-3">
                <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                    Cancel
                </Button>
                {step === 'approve' && (
                    <Button
                        type="button"
                        onClick={handleConfirmSubscription}
                        isLoading={isLoading}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-none shadow-lg text-white font-bold"
                    >
                        Sign & Authorize ${selectedTier.price.toFixed(2)} / month
                    </Button>
                )}
            </footer>
        </Modal>
    );
};

export default SubscriptionModal;
