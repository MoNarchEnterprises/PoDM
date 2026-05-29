import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Creator, SubscriptionTier } from '@common/types/Creator';
import { useCryptoWallet } from '../../shared/hooks/useCryptoWallet';
import { Wallet, ShieldCheck, Zap, AlertCircle } from 'lucide-react';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    creator: Creator;
    selectedTier: SubscriptionTier;
    onSubscriptionComplete: (result: any) => void;
}

interface NetworkParams {
    chainId: string;
    chainName: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    rpcUrls: string[];
    blockExplorerUrls: string[];
}

const NETWORKS: Record<string, NetworkParams> = {
    base: {
        chainId: '0x14a34', // 84532 (Base Sepolia)
        chainName: 'Base Sepolia Testnet',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://sepolia.base.org'],
        blockExplorerUrls: ['https://sepolia.basescan.org']
    },
    monad: {
        chainId: '0x279f', // 10143 (Monad Testnet)
        chainName: 'Monad Testnet',
        nativeCurrency: { name: 'Monad', symbol: 'MONAD', decimals: 18 },
        rpcUrls: ['https://rpc.testnet.monad.xyz'],
        blockExplorerUrls: ['https://testnet.monadexplorer.com']
    },
    megaeth: {
        chainId: '0x270f', // 9999 (MegaETH Testnet)
        chainName: 'MegaETH Testnet',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://rpc.testnet.megaeth.systems'],
        blockExplorerUrls: ['https://testnet.megaeth.systems']
    }
};

const SubscriptionModal = ({ isOpen, onClose, creator, selectedTier, onSubscriptionComplete }: SubscriptionModalProps) => {
    const { isConnected, walletAddress, balance, isLoading: walletLoading, connectWallet } = useCryptoWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'connect' | 'approve'>('connect');

    // Retrieve creator's preferred payout network (Base is the default)
    const preferredNetwork = creator.profile.crypto_wallet_payout_preference || 'base';
    const activeNetwork = NETWORKS[preferredNetwork] || NETWORKS.base;

    React.useEffect(() => {
        if (isConnected) {
            setStep('approve');
        } else {
            setStep('connect');
        }
    }, [isConnected]);

    const handleConnect = async (type: 'embedded' | 'custom') => {
        try {
            setError(null);
            await connectWallet(type);
        } catch (err: any) {
            setError(err.message || 'Failed to connect wallet.');
        }
    };

    const handleConfirmSubscription = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Trigger transient browser wallet network switch popup for custom extensions (MetaMask, Phantom, etc.)
            const eth = (window as any).ethereum;
            if (eth && walletAddress && !walletAddress.startsWith('0x84f2')) { // Skip simulation wallet
                try {
                    await eth.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: activeNetwork.chainId }],
                    });
                } catch (switchError: any) {
                    if (switchError.code === 4902) {
                        try {
                            await eth.request({
                                method: 'wallet_addEthereumChain',
                                params: [activeNetwork],
                            });
                        } catch (addError: any) {
                            throw new Error(`Failed to add ${activeNetwork.chainName} to your wallet.`);
                        }
                    } else {
                        throw new Error(`Failed to switch network to ${activeNetwork.chainName}.`);
                    }
                }
            }

            // Simulate the smart contract splitter transaction execution
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Generate a real-looking mock transaction hash for the ledger
            const mockTxHash = '0x0000_sub_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

            await onSubscriptionComplete({
                creatorId: creator.id,
                tierId: selectedTier.id,
                paymentMethodId: mockTxHash,
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Transaction failed or rejected by wallet.');
        } finally {
            setIsLoading(false);
        }
    };

    const networkHeaderNames: Record<string, string> = {
        base: 'Base Network (USDC)',
        monad: 'Monad L1 (USDC)',
        megaeth: 'MegaETH L2 (USDC)'
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <header className="p-6 border-b border-gray-700 bg-gradient-to-r from-purple-900/40 to-pink-900/40">
                <h2 className="text-xl font-bold text-white flex items-center">
                    <ShieldCheck className="w-6 h-6 mr-2 text-pink-500 animate-pulse" />
                    USDC Autopilot Subscription
                </h2>
                <p className="text-xs text-purple-300 mt-1 uppercase tracking-widest font-semibold">
                    Powered by {networkHeaderNames[preferredNetwork] || 'Base Network (USDC)'}
                </p>
            </header>

            <main className="p-6 space-y-6 bg-slate-900 text-gray-200">
                {/* Product Summary */}
                <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Subscribing to</p>
                    <div className="flex justify-between items-baseline mt-1">
                        <span className="text-lg font-bold text-white">{selectedTier.name} Tier</span>
                        <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                            {selectedTier.price.toFixed(2)} USDC <span className="text-xs text-gray-400 font-normal">/mo</span>
                        </span>
                    </div>
                    <div className="mt-3 flex items-center text-xs text-green-400 bg-green-500/10 p-2 rounded-lg">
                        <Zap className="w-4 h-4 mr-1.5 flex-shrink-0" />
                        Autopilot Enabled: split payout handled directly on-chain on {activeNetwork.chainName}
                    </div>
                </div>

                {step === 'connect' ? (
                    <div className="space-y-4">
                        <div className="text-center py-4 space-y-2">
                            <Wallet className="w-12 h-12 mx-auto text-purple-400 animate-bounce" />
                            <h3 className="text-md font-bold text-white">Connect Crypto Wallet</h3>
                            <p className="text-xs text-gray-400 max-w-sm mx-auto">
                                You need to connect a Web3 wallet containing USDC on the {activeNetwork.chainName} to configure the monthly subscription.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => handleConnect('embedded')}
                                disabled={walletLoading}
                                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white font-bold rounded-xl flex items-center justify-between transition-all duration-300 transform hover:-translate-y-0.5 border border-purple-500/40 shadow-lg shadow-purple-900/30"
                            >
                                <span className="flex flex-col text-left">
                                    <span className="text-sm">Embedded Account (Privy)</span>
                                    <span className="text-3xs text-purple-300 font-normal">Quick login with Google / Email</span>
                                </span>
                                <span className="bg-purple-900/50 py-1 px-2.5 rounded-lg text-xs font-bold text-purple-200">Recommended</span>
                            </button>

                            <button
                                onClick={() => handleConnect('custom')}
                                disabled={walletLoading}
                                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-between transition-all duration-300 border border-slate-700"
                            >
                                <span className="flex flex-col text-left">
                                    <span className="text-sm">Browser Extension Wallet</span>
                                    <span className="text-3xs text-gray-400 font-normal">MetaMask, Coinbase Wallet, Phantom</span>
                                </span>
                                <span className="border border-slate-600 py-1 px-2 rounded-lg text-xs text-gray-300">Custom</span>
                            </button>
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

                        {/* Safety Disclaimer */}
                        <div className="p-3 bg-slate-800 rounded-xl space-y-1.5 text-xs text-gray-400 border border-slate-700">
                            <div className="flex items-center text-white font-semibold">
                                <ShieldCheck className="w-4 h-4 mr-1 text-green-400" />
                                100% Chargeback Proof Protocol
                            </div>
                            <p className="leading-relaxed">
                                Denominated in USDC. Confirming will request your wallet to switch to **{activeNetwork.chainName}** to sign the one-time subscription pull permission. PoDM Platform commission is dynamically calculated.
                            </p>
                        </div>

                        <div className="flex items-center space-x-2 text-2xs text-purple-300 bg-purple-500/10 p-2.5 rounded-lg border border-purple-500/20">
                            <AlertCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <span>Gas is paid in native {activeNetwork.nativeCurrency.symbol}. Switch prompt will handle network parameters automatically.</span>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 text-center">
                        {error}
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