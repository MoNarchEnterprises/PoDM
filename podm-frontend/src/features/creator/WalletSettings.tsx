import React, { useState, useEffect } from 'react';
import useCryptoWallet from '../../shared/hooks/useCryptoWallet';
import { useEmbeddedWallet } from '../../context/EmbeddedWalletContext';
import { DEFAULT_COMMISSION_RATE } from '../../lib/constants';
import { Wallet, Copy, Check, Building2, ExternalLink, TrendingUp, Info, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import CexGuidanceModal from './components/CexGuidanceModal';

interface CommissionTierInfo {
    rate: number;
    tierName: string;
    monthlyVolumeCents: number;
    nextTierThresholdCents: number | null;
    distanceToNextTierCents: number | null;
    nextTierRate: number | null;
}

const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const impersonating = localStorage.getItem('impersonating_user_id') || sessionStorage.getItem('impersonating_user_id');
    if (impersonating) {
        headers['x-impersonating-user-id'] = impersonating;
    }
    return headers;
};

export const WalletSettings: React.FC = () => {
    const {
        balance,
        disconnectWallet
    } = useCryptoWallet();
    const { usdcBalance: embeddedBalance } = useEmbeddedWallet();

    const [walletType, setWalletType] = useState<'embedded' | 'custom'>('embedded');
    const [payoutPreference, setPayoutPreference] = useState<'debit_card' | 'on_chain' | 'base'>('debit_card');
    const [embeddedAddress, setEmbeddedAddress] = useState<string>('');
    const [customAddress, setCustomAddress] = useState<string>('');
    const [commissionRate, setCommissionRate] = useState<number>(DEFAULT_COMMISSION_RATE);
    const [tierInfo, setTierInfo] = useState<CommissionTierInfo | null>(null);
    const [isEnclaveMember, setIsEnclaveMember] = useState<boolean>(false);
    const [isScheduleOpen, setIsScheduleOpen] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [copied, setCopied] = useState<boolean>(false);
    const [isCexModalOpen, setIsCexModalOpen] = useState<boolean>(false);

    const handleCopyAddress = (addr: string) => {
        if (!addr) return;
        navigator.clipboard.writeText(addr);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        const loadConfigs = async () => {
            try {
                const response = await fetch('/api/v1/payments/crypto/wallet', {
                    headers: getAuthHeaders(),
                });
                if (response.ok) {
                    const result = await response.json();
                    if (result.data) {
                        const loadedType = result.data.walletType === 'custom' ? 'custom' : 'embedded';
                        setWalletType(loadedType);
                        setPayoutPreference(result.data.payoutPreference || 'debit_card');
                        if (result.data.commissionRate !== undefined && result.data.commissionRate !== null) {
                            setCommissionRate(result.data.commissionRate);
                        }
                        if (result.data.tierInfo) {
                            setTierInfo(result.data.tierInfo);
                        }
                        if (result.data.isEnclaveMember !== undefined) {
                            setIsEnclaveMember(Boolean(result.data.isEnclaveMember));
                        }
                        if (result.data.walletAddress) {
                            if (loadedType === 'embedded') {
                                setEmbeddedAddress(result.data.walletAddress);
                            } else {
                                setCustomAddress(result.data.walletAddress);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load wallet configurations:", err);
            }
        };
        loadConfigs();
    }, []);

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveMessage(null);

        try {
            const addressToSave = walletType === 'embedded'
                ? embeddedAddress
                : customAddress;

            if (walletType === 'custom' && (!customAddress || !customAddress.trim())) {
                throw new Error('Please enter a valid custom wallet address.');
            }

            let challengeId: string | undefined;
            let signature: string | undefined;

            if (walletType === 'custom') {
                const challengeResponse = await fetch('/api/v1/payments/crypto/wallet/challenge', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ walletAddress: addressToSave.trim() }),
                });

                if (!challengeResponse.ok) {
                    const errResult = await challengeResponse.json();
                    throw new Error(errResult.message || 'Failed to generate wallet verification challenge.');
                }

                const challengeJson = await challengeResponse.json();
                const challengeData = challengeJson.data || challengeJson;
                challengeId = challengeData.challengeId;
                const message = challengeData.message;

                const ethereum = (window as any).ethereum;
                if (!ethereum) {
                    throw new Error('Web3 wallet (MetaMask or Coinbase Wallet) not detected to sign verification challenge.');
                }

                const accounts = await ethereum.request({ method: 'eth_requestAccounts' }) as string[];
                const connectedAddress = accounts?.[0];
                if (!connectedAddress || connectedAddress.toLowerCase() !== addressToSave.trim().toLowerCase()) {
                    throw new Error(`Connected wallet (${connectedAddress || 'none'}) does not match the entered address (${addressToSave.trim()}).`);
                }

                signature = await ethereum.request({
                    method: 'personal_sign',
                    params: [message, connectedAddress],
                }) as string;
            }

            const payload = {
                walletAddress: addressToSave,
                walletType,
                payoutPreference: walletType === 'embedded' ? 'debit_card' : payoutPreference,
                challengeId,
                signature,
            };

            const response = await fetch('/api/v1/payments/crypto/wallet', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errResult = await response.json();
                throw new Error(errResult.message || 'Failed to save settings.');
            }

            setSaveMessage('Payout settings saved successfully!');
        } catch (err: unknown) {
            const error = err as Error;
            setSaveMessage('Failed to save settings: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-12">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                            Payouts & Wallet
                        </h1>
                        <p className="text-gray-400 mt-2 text-sm md:text-base">
                            Configure how you receive earnings from subscriptions and tips.
                        </p>
                    </div>
                    <div className="self-start px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-950/20 text-purple-300 text-xs font-semibold flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                        Base Network (USDC)
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    <div className="lg:col-span-1 space-y-6">
                        <div className="relative rounded-2xl overflow-hidden border border-purple-500/20 bg-gray-900/60 backdrop-blur-xl p-6 shadow-2xl">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full filter blur-3xl pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-600/10 rounded-full filter blur-3xl pointer-events-none"></div>

                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">USDC Wallet Balance</p>
                            <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mt-2">
                                ${(walletType === 'embedded' ? embeddedBalance : balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">1 USDC = $1.00 USD</p>
                        </div>

                        {/* Fee Tier & Monthly Volume Card */}
                        <div className="rounded-xl border border-purple-500/20 bg-gray-900/40 p-5 space-y-4 shadow-xl backdrop-blur-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 text-purple-300 font-bold text-xs">
                                    <TrendingUp className="w-4 h-4 text-purple-400" />
                                    <span>Platform Fee Tier</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    isEnclaveMember
                                        ? 'bg-gradient-to-r from-purple-900/60 to-pink-900/60 text-pink-300 border-pink-500/40'
                                        : 'bg-purple-950/60 text-purple-300 border-purple-500/30'
                                }`}>
                                    {isEnclaveMember ? 'The Enclave (10%)' : (tierInfo?.tierName || 'Standard')}
                                </span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">30-Day Volume (USDC)</span>
                                    <span className="font-bold text-white">
                                        ${((tierInfo?.monthlyVolumeCents ?? 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs border-t border-gray-800/80 pt-2">
                                    <span className="text-gray-400">Your Current Fee</span>
                                    <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 text-sm">
                                        {commissionRate}% <span className="text-[10px] text-gray-400 font-normal">(Keep {(100 - commissionRate).toFixed(1)}%)</span>
                                    </span>
                                </div>
                            </div>

                            {/* Progress bar towards next tier if applicable */}
                            {!isEnclaveMember && tierInfo?.nextTierThresholdCents && tierInfo.distanceToNextTierCents !== null && (
                                <div className="space-y-1.5 pt-1 border-t border-gray-800/60">
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-gray-400">Next Tier ({tierInfo.nextTierRate}%)</span>
                                        <span className="text-purple-300 font-semibold">
                                            ${((tierInfo.monthlyVolumeCents) / 100).toFixed(0)} / ${(tierInfo.nextTierThresholdCents / 100).toFixed(0)}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                                            style={{
                                                width: `${Math.min(100, Math.max(0, Math.round((tierInfo.monthlyVolumeCents / tierInfo.nextTierThresholdCents) * 100)))}%`
                                            }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400">
                                        ✨ Earn <strong className="text-purple-300">${(tierInfo.distanceToNextTierCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> more this month to unlock <strong className="text-pink-300">{tierInfo.nextTierRate}%</strong> fee!
                                    </p>
                                </div>
                            )}

                            {/* Collapsible Fee Schedule Button */}
                            <button
                                type="button"
                                onClick={() => setIsScheduleOpen(!isScheduleOpen)}
                                className="w-full flex items-center justify-between pt-2 border-t border-gray-800/60 text-[11px] text-gray-400 hover:text-purple-300 transition-colors"
                            >
                                <span className="flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5 text-purple-400" />
                                    <span>Fee Schedule Details</span>
                                </span>
                                {isScheduleOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {/* Expandable Fee Table */}
                            {isScheduleOpen && (
                                <div className="space-y-2 pt-2 border-t border-gray-800/80 text-[11px]">
                                    <div className="rounded-lg bg-gray-950/80 p-2.5 space-y-2 border border-gray-800">
                                        <div className="flex justify-between items-center text-[10px] uppercase font-bold text-gray-400">
                                            <span>Monthly Revenue</span>
                                            <span>Platform Fee</span>
                                        </div>
                                        <div className={`flex justify-between items-center p-1.5 rounded ${commissionRate === 15 && !isEnclaveMember ? 'bg-purple-900/30 border border-purple-500/30 font-bold text-white' : 'text-gray-300'}`}>
                                            <span>$0 – $5,000 / mo</span>
                                            <span className="text-purple-300">15.0% (Keep 85%)</span>
                                        </div>
                                        <div className={`flex justify-between items-center p-1.5 rounded ${commissionRate === 12.5 && !isEnclaveMember ? 'bg-purple-900/30 border border-purple-500/30 font-bold text-white' : 'text-gray-300'}`}>
                                            <span>$5,000 – $10,000 / mo</span>
                                            <span className="text-purple-300">12.5% (Keep 87.5%)</span>
                                        </div>
                                        <div className={`flex justify-between items-center p-1.5 rounded ${commissionRate === 10 && !isEnclaveMember ? 'bg-purple-900/30 border border-purple-500/30 font-bold text-white' : 'text-gray-300'}`}>
                                            <span>$10,000+ / mo</span>
                                            <span className="text-purple-300">10.0% (Keep 90%)</span>
                                        </div>
                                        <div className={`flex justify-between items-center p-1.5 rounded ${isEnclaveMember ? 'bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-pink-500/40 font-bold text-pink-200' : 'text-gray-400'}`}>
                                            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-pink-400" /> The Enclave (First 50)</span>
                                            <span className="text-pink-300 font-bold">10.0% Lifetime</span>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-gray-500 leading-tight">
                                        * OnlyFans / Fansly charge flat 20% fees. PoDM standard rates decrease automatically as your monthly revenue grows.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* CEX Bank Cashout Setup Card */}
                        <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-5 space-y-3 shadow-lg">
                            <div className="flex items-center space-x-2 text-purple-300 font-bold text-xs">
                                <Building2 className="w-4 h-4 text-purple-400" />
                                <span>Fiat Bank Cashout Guide</span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Connect your USDC payout address to a Centralized Exchange (Coinbase, Kraken, Binance, Bitso) to withdraw funds directly to your local bank account.
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsCexModalOpen(true)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md hover:shadow-purple-500/20"
                            >
                                <span>Set Up Bank Cashout</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <form onSubmit={handleSaveSettings} className="rounded-2xl border border-gray-800/80 bg-gray-900/40 p-6 md:p-8 shadow-2xl space-y-6">
                            <h3 className="text-xl font-bold text-white">Payout Method Settings</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div
                                    onClick={() => {
                                        setWalletType('embedded');
                                        setPayoutPreference('debit_card');
                                    }}
                                    className={`relative cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                                        walletType === 'embedded'
                                            ? 'border-purple-500 bg-purple-950/10'
                                            : 'border-gray-800 bg-gray-950/40 hover:border-gray-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${walletType === 'embedded' ? 'border-purple-500' : 'border-gray-700'}`}>
                                            {walletType === 'embedded' && <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                                                Embedded Wallet <span className="text-[10px] bg-purple-900/60 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-normal">Default</span>
                                            </h4>
                                            <p className="text-xs text-gray-400 mt-1">Automatic setup. Instant off-ramp payouts.</p>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    onClick={() => {
                                        setWalletType('custom');
                                        setPayoutPreference('on_chain');
                                        disconnectWallet();
                                    }}
                                    className={`relative cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                                        walletType === 'custom'
                                            ? 'border-pink-500 bg-pink-950/10'
                                            : 'border-gray-800 bg-gray-950/40 hover:border-gray-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${walletType === 'custom' ? 'border-pink-500' : 'border-gray-700'}`}>
                                            {walletType === 'custom' && <div className="w-2.5 h-2.5 rounded-full bg-pink-500"></div>}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white">Custom Wallet (Advanced)</h4>
                                            <p className="text-xs text-gray-400 mt-1">Link your own hardware/software wallet address.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {walletType === 'embedded' ? (
                                <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-900 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
                                            <Wallet className="w-4 h-4" /> Default Embedded Payout Profile
                                        </p>
                                        <span className="text-[10px] bg-purple-950/60 border border-purple-500/30 text-purple-300 font-semibold px-2 py-0.5 rounded-full">
                                            Active Default
                                        </span>
                                    </div>
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs bg-gray-900/80 p-3 rounded-lg border border-gray-800">
                                        <div>
                                            <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Your Wallet Address</span>
                                            <code className="text-purple-200 font-mono select-all text-xs break-all">
                                                {embeddedAddress || 'Provisioning wallet...'}
                                            </code>
                                        </div>
                                        {embeddedAddress && (
                                            <button
                                                type="button"
                                                onClick={() => handleCopyAddress(embeddedAddress)}
                                                className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 bg-purple-950/30 hover:bg-purple-950/50 px-3 py-1.5 rounded-lg border border-purple-500/20 transition-colors self-start md:self-auto"
                                            >
                                                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                <span>{copied ? 'Copied' : 'Copy'}</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-gray-500 border-t border-gray-900 pt-3">
                                        * Automatically assigned during creator setup. Earnings settle directly to this address.
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 p-4 rounded-xl bg-gray-950/60 border border-gray-900">
                                    <p className="text-xs font-semibold text-pink-400">Custom Wallet Details</p>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Wallet Address (ERC-20)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={customAddress}
                                                onChange={(e) => setCustomAddress(e.target.value)}
                                                placeholder="0x..."
                                                className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors"
                                            />
                                            {customAddress && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyAddress(customAddress)}
                                                    className="flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 bg-pink-950/30 hover:bg-pink-950/50 px-3 py-2.5 rounded-xl border border-pink-500/20 transition-colors shrink-0"
                                                >
                                                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                    <span>{copied ? 'Copied' : 'Copy'}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payout Preference</label>
                                        <div className="flex flex-col gap-2 text-xs">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    checked={payoutPreference === 'on_chain'}
                                                    onChange={() => setPayoutPreference('on_chain')}
                                                    className="text-pink-500 focus:ring-0 bg-gray-900 border-gray-800"
                                                />
                                                Real-time on-chain payout (Base USDC)
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    checked={payoutPreference === 'base'}
                                                    onChange={() => setPayoutPreference('base')}
                                                    className="text-pink-500 focus:ring-0 bg-gray-900 border-gray-800"
                                                />
                                                Base Network (USDC)
                                            </label>
                                        </div>
                                    </div>

                                    <div className="text-[10px] text-pink-400/80 border-t border-gray-900 pt-3 flex gap-2">
                                        ⚠️ <p><strong>Disclaimer:</strong> You are fully responsible for cashing out from your custom wallet address. The platform has no keys or recovery paths for your self-custody funds.</p>
                                    </div>
                                </div>
                            )}

                            {saveMessage && (
                                <div className={`p-3 rounded-lg text-xs font-semibold ${saveMessage.includes('successfully') ? 'bg-green-950/20 border border-green-500/20 text-green-400' : 'bg-red-950/20 border border-red-500/20 text-red-400'}`}>
                                    {saveMessage}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gray-100 hover:bg-white text-gray-950 disabled:opacity-50 transition-colors duration-150"
                            >
                                {isSaving ? 'Saving...' : 'Save Payout Settings'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <CexGuidanceModal
                isOpen={isCexModalOpen}
                onClose={() => setIsCexModalOpen(false)}
                initialAddress={customAddress}
                onAddressSaved={(newAddress) => {
                    setCustomAddress(newAddress);
                    setWalletType('custom');
                    setPayoutPreference('on_chain');
                }}
            />
        </div>
    );
};
export default WalletSettings;
