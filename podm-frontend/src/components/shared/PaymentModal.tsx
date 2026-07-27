import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useCryptoWallet } from '../../shared/hooks/useCryptoWallet';
import { useCryptoPayment } from '../../shared/hooks/useCryptoPayment';
import { PaymentOrchestrator, PaymentType as OrchestratorPaymentType } from '../../shared/lib/PaymentOrchestrator';
import { Wallet, ShieldCheck, Zap, AlertCircle, CheckCircle, Send, Lock } from 'lucide-react';
import { getCryptoWallet } from '../../lib/wallet';
import OnRampButton from './OnRampButton';

type PaymentType = 'tip' | 'ppv' | 'subscription';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: PaymentType;
    amount?: number;
    creator: { id: string; profile: { name: string; avatar: string; crypto_wallet_address?: string }; crypto_wallet_address?: string };
    contentTitle?: string;
    relatedId?: string;
    tierName?: string;
    onSuccess: (result: any) => void;
    fanId?: string;
}

const PaymentModal = ({ isOpen, onClose, type, amount, creator, contentTitle, relatedId, tierName, onSuccess, fanId }: PaymentModalProps) => {
    const { isConnected, walletAddress, balance, isLoading: walletLoading, error: walletError, connectWallet } = useCryptoWallet();
    const cryptoPayment = useCryptoPayment();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'connect' | 'approve' | 'success'>('connect');
    const [txHash, setTxHash] = useState<string | null>(null);

    const displayAmount = amount || 0;
    const displayPrice = (displayAmount / 100).toFixed(2);

    const handleConnect = async () => {
        setError(null);
        await connectWallet('custom');
    };

    const handleConfirmPayment = async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (!walletAddress) throw new Error('Wallet not connected.');

            const mappedType: OrchestratorPaymentType = type === 'tip' ? 'Tip' : type === 'ppv' ? 'PPV Post' : 'Subscription';
            const orchestrator = new PaymentOrchestrator(undefined, cryptoPayment);

            const result = await orchestrator.payWithBrowserWallet({
                paymentType: mappedType,
                amount: displayAmount / 100,
                creatorId: creator.id,
                creatorWalletAddress: getCryptoWallet(creator),
                creatorProfile: creator,
                contentId: type === 'ppv' ? relatedId : undefined,
                tierId: type === 'subscription' ? relatedId : undefined,
                fromAddress: walletAddress,
            });

            if (!result.success) {
                throw new Error(result.error || 'Transaction failed.');
            }

            const hash = result.txHash || '';
            setTxHash(hash);
            setStep('success');

            onSuccess({ txHash: hash, transactionType: mappedType, creatorId: creator.id, relatedId, amountInCents: displayAmount });
        } catch (err: any) {
            setError(err.message || 'Transaction failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setStep('connect');
        setError(null);
        setTxHash(null);
        setIsLoading(false);
        onClose();
    };

    const isApprovalStep = isConnected && step !== 'success';

    const modalTitle = type === 'tip' ? 'Send a Tip' : type === 'ppv' ? 'Unlock Content' : 'USDC Autopilot Subscription';

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            <header className="p-6 border-b border-gray-700 bg-gradient-to-r from-purple-900/40 to-pink-900/40">
                <h2 className="text-xl font-bold text-white flex items-center">
                    {type === 'tip' ? <Send className="w-6 h-6 mr-2 text-pink-500" /> : type === 'ppv' ? <Lock className="w-6 h-6 mr-2 text-pink-500" /> : <ShieldCheck className="w-6 h-6 mr-2 text-pink-500 animate-pulse" />}
                    {modalTitle}
                </h2>
                <p className="text-xs text-purple-300 mt-1 uppercase tracking-widest font-semibold">Powered by Base Network (USDC)</p>
            </header>

            <main className="p-6 space-y-6 bg-slate-900 text-gray-200">
                <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                        {type === 'tip' ? 'Tipping' : type === 'ppv' ? 'Unlocking' : 'Subscribing to'}
                    </p>
                    <div className="flex justify-between items-baseline mt-1">
                        <span className="text-lg font-bold text-white">
                            {type === 'subscription' && tierName ? `${tierName} Tier` : contentTitle || creator.profile.name}
                        </span>
                        <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                            ${displayPrice} USDC
                        </span>
                    </div>
                    <div className="mt-3 flex items-center text-xs text-green-400 bg-green-500/10 p-2 rounded-lg">
                        <Zap className="w-4 h-4 mr-1.5 flex-shrink-0" />
                        Secure on-chain payment via Base Sepolia
                    </div>
                </div>

                {step === 'success' ? (
                    <div className="text-center py-6 space-y-4">
                        <CheckCircle className="w-16 h-16 mx-auto text-green-400" />
                        <h3 className="text-lg font-bold text-white">
                            {type === 'tip' ? 'Tip Sent!' : type === 'ppv' ? 'Content Unlocked!' : 'Subscription Active!'}
                        </h3>
                        {txHash && (
                            <p className="text-xs text-gray-400 font-mono break-all">
                                Tx: {txHash.slice(0, 20)}...{txHash.slice(-8)}
                            </p>
                        )}
                    </div>
                ) : !isConnected ? (
                    <div className="space-y-4">
                        <div className="text-center py-4 space-y-2">
                            <Wallet className="w-12 h-12 mx-auto text-purple-400 animate-bounce" />
                            <h3 className="text-md font-bold text-white">Connect Crypto Wallet</h3>
                            <p className="text-xs text-gray-400">Connect a Web3 wallet with USDC on Base Sepolia to continue.</p>
                        </div>
                        <button onClick={handleConnect} disabled={walletLoading}
                            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-between border border-slate-700"
                        >
                            <span className="flex flex-col text-left">
                                <span className="text-sm">Browser Extension Wallet</span>
                                <span className="text-3xs text-gray-400 font-normal">MetaMask, Coinbase Wallet</span>
                            </span>
                            <span className="border border-slate-600 py-1 px-2 rounded-lg text-xs text-gray-300">Connect</span>
                        </button>
                        <OnRampButton amount={Math.ceil(displayAmount / 100)} destinationWallet="" fanId={fanId || ''} />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-3 bg-purple-950/20 border border-purple-900/50 rounded-xl space-y-2">
                            <p className="text-2xs text-purple-400 uppercase tracking-widest font-bold">Connected Wallet</p>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-mono text-gray-300 bg-slate-950 py-1 px-2 rounded border border-slate-800">
                                    {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}` : ''}
                                </span>
                                <span className="text-xs font-semibold text-white">Balance: <span className="text-pink-400">{balance.toFixed(2)} USDC</span></span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 text-2xs text-purple-300 bg-purple-500/10 p-2.5 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <span>Gas paid in native ETH on Base Sepolia. First payment requires two wallet approvals (USDC approve, then pay). Subsequent payments are single-click.</span>
                        </div>
                    </div>
                )}

                {(error || walletError) && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 text-center">{error || walletError}</div>
                )}
            </main>

            <footer className="p-6 bg-slate-950 border-t border-gray-800 flex justify-end space-x-3">
                <Button variant="ghost" onClick={handleClose} disabled={isLoading}>Cancel</Button>
                {isApprovalStep && (
                    <Button type="button" onClick={handleConfirmPayment} isLoading={isLoading}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-none shadow-lg text-white font-bold"
                    >
                        {type === 'tip' ? `Send $${displayPrice}` : type === 'ppv' ? `Pay $${displayPrice} & Unlock` : `Sign & Authorize $${displayPrice} / month`}
                    </Button>
                )}
                {step === 'success' && (
                    <Button type="button" onClick={handleClose} className="bg-gray-700 text-white">Done</Button>
                )}
            </footer>
        </Modal>
    );
};

export default PaymentModal;
