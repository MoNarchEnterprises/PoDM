import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useCryptoWallet } from '../../shared/hooks/useCryptoWallet';
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

const BASE_SEPOLIA_CHAIN_ID = '0x14a34';
const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';
const BASE_MAINNET_CHAIN_ID = '0x2105';

const APPROVE_SELECTOR   = '0xb3886be3'; // approve(address spender, uint256 amount)
const ALLOWANCE_SELECTOR = '0xd1ac244a'; // allowance(address owner, address spender) view returns (uint256)
const PAY_SUB_SELECTOR   = '0x7158d140'; // paySubscription(address, address, uint256, bytes32)
const PAY_TIP_SELECTOR   = '0x7b6c03b7'; // payTip(address, address, uint256)
const PAY_PPV_SELECTOR   = '0xf6ad20a7'; // payPPV(address, address, uint256, bytes32)
const MAX_UINT256_HEX = '0x' + 'f'.repeat(64);

function stringToBytes32(str: string | undefined): string {
    if (!str) return '0'.repeat(64);
    const clean = str.replace(/-/g, '');
    if (/^[0-9a-fA-F]{64}$/.test(clean)) return clean.toLowerCase();
    let hex = '';
    for (let i = 0; i < str.length && i < 32; i++) {
        hex += str.charCodeAt(i).toString(16);
    }
    return hex.padEnd(64, '0');
}

function padAddress(addr: string): string {
    return addr.slice(2).toLowerCase().padStart(64, '0');
}

function padUint(value: bigint): string {
    return value.toString(16).padStart(64, '0');
}

const PaymentModal = ({ isOpen, onClose, type, amount, creator, contentTitle, relatedId, tierName, onSuccess, fanId }: PaymentModalProps) => {
    const { isConnected, walletAddress, balance, chainId, isLoading: walletLoading, error: walletError, connectWallet } = useCryptoWallet();
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

    const waitForReceipt = async (hash: string, timeoutMs = 60000): Promise<any> => {
        const eth = window.ethereum;
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const r = await eth!.request({ method: 'eth_getTransactionReceipt', params: [hash] });
            if (r) return r;
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        throw new Error(`Transaction ${hash.slice(0, 10)}... not mined within ${timeoutMs / 1000}s`);
    };

    const getUsdcAddress = (cid: number | undefined) => {
        const c = (typeof cid === 'number' ? cid : 84532);
        return c === 8453
            ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913'
            : '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
    };

    const handleConfirmPayment = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const eth = window.ethereum;
            if (!eth || !walletAddress) throw new Error('Wallet not connected.');

            const targetChainId = chainId === 8453 ? BASE_MAINNET_CHAIN_ID : BASE_SEPOLIA_CHAIN_ID;
            await eth.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: targetChainId }],
            }).catch(async (switchError: any) => {
                if (switchError.code === 4902) {
                    await eth.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: targetChainId,
                            chainName: 'Base Sepolia Testnet',
                            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                            rpcUrls: [BASE_SEPOLIA_RPC],
                            blockExplorerUrls: ['https://sepolia.basescan.org'],
                        }],
                    });
                } else {
                    throw new Error('Failed to switch network to Base Sepolia.');
                }
            });

            const contractAddress = chainId === 8453
                ? import.meta.env.VITE_BASE_CONTRACT_ADDRESS
                : import.meta.env.VITE_BASE_TESTNET_CONTRACT_ADDRESS;
            if (!contractAddress) throw new Error('Contract address not configured.');

            const usdcAddress = getUsdcAddress(chainId);
            const amountWei = BigInt(Math.round((displayAmount / 100) * 1e6));
            const creatorWallet = getCryptoWallet(creator);

            // ── Step 1: Ensure USDC allowance for the PoDM contract ──
            const allowanceData = ALLOWANCE_SELECTOR + padAddress(walletAddress) + padAddress(contractAddress);
            const allowanceHex = await eth.request({
                method: 'eth_call',
                params: [{ from: walletAddress, to: usdcAddress, data: allowanceData }, 'latest'],
            }) as string;
            const currentAllowance = allowanceHex && allowanceHex !== '0x' ? BigInt(allowanceHex) : 0n;

            if (currentAllowance < amountWei) {
                const approveData = APPROVE_SELECTOR + padAddress(contractAddress) + MAX_UINT256_HEX.slice(2);
                const approveHash: string = await eth.request({
                    method: 'eth_sendTransaction',
                    params: [{ from: walletAddress, to: usdcAddress, data: approveData }],
                });
                if (!approveHash || typeof approveHash !== 'string') throw new Error('Approval transaction rejected.');
                await waitForReceipt(approveHash);
            }

            // ── Step 2: Call the PoDM contract payX function ──
            let selector: string;
            let data: string;
            if (type === 'subscription') {
                selector = PAY_SUB_SELECTOR;
                data = selector + padAddress(usdcAddress) + padAddress(creatorWallet) + padUint(amountWei) + stringToBytes32(relatedId);
            } else if (type === 'tip') {
                selector = PAY_TIP_SELECTOR;
                data = selector + padAddress(usdcAddress) + padAddress(creatorWallet) + padUint(amountWei);
            } else {
                selector = PAY_PPV_SELECTOR;
                data = selector + padAddress(usdcAddress) + padAddress(creatorWallet) + padUint(amountWei) + stringToBytes32(relatedId);
            }

            const hash: string = await eth.request({
                method: 'eth_sendTransaction',
                params: [{ from: walletAddress, to: contractAddress, data }],
            });

            if (!hash || typeof hash !== 'string') throw new Error('Transaction rejected.');

            // Wait for the payX tx to be mined
            await waitForReceipt(hash);
            setTxHash(hash);
            setStep('success');

            const transactionType = type === 'tip' ? 'Tip' : type === 'ppv' ? 'PPV Post' : 'Subscription';
            onSuccess({ txHash: hash, transactionType, creatorId: creator.id, relatedId, amountInCents: displayAmount });
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
