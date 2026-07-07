import React, { useState, useEffect } from 'react';
import useCryptoWallet from '../../shared/hooks/useCryptoWallet';

export const WalletSettings: React.FC = () => {
    const {
        isConnected,
        walletAddress,
        balance,
        isLoading: isWalletLoading,
        connectWallet,
        disconnectWallet
    } = useCryptoWallet();

    const [walletType, setWalletType] = useState<'embedded' | 'custom'>('embedded');
    const [payoutPreference, setPayoutPreference] = useState<'debit_card' | 'on_chain' | 'base'>('debit_card');
    const [customAddress, setCustomAddress] = useState<string>('');
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
    const [withdrawAmount, setWithdrawAmount] = useState<string>('');
    const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
    const [withdrawalStatus, setWithdrawalStatus] = useState<any>(null);

    useEffect(() => {
        const loadConfigs = async () => {
            try {
                const response = await fetch('/api/v1/payments/crypto/wallet');
                if (response.ok) {
                    const result = await response.json();
                    if (result.data) {
                        setWalletType(result.data.walletType || 'embedded');
                        setPayoutPreference(result.data.payoutPreference || 'debit_card');
                        if (result.data.walletType === 'custom') {
                            setCustomAddress(result.data.walletAddress || '');
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load wallet configurations:", err);
            }
        };
        loadConfigs();
    }, []);

    useEffect(() => {
        if (!isConnected && walletType === 'embedded') {
            connectWallet('embedded');
        }
    }, [isConnected, walletType, connectWallet]);

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveMessage(null);

        try {
            const payload = {
                walletAddress: walletType === 'embedded' ? walletAddress : customAddress,
                walletType,
                payoutPreference: walletType === 'embedded' ? 'debit_card' : payoutPreference,
            };

            const response = await fetch('/api/v1/payments/crypto/wallet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errResult = await response.json();
                throw new Error(errResult.message || 'Failed to save settings.');
            }

            setSaveMessage('Payout settings saved successfully!');
        } catch (err: any) {
            setSaveMessage('Failed to save settings: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsWithdrawing(true);
        setWithdrawalStatus(null);

        try {
            const amountInCents = Math.round(parseFloat(withdrawAmount) * 100);

            const response = await fetch('/api/v1/payments/crypto/withdraw', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ amountInCents }),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Withdrawal failed.');
            }

            setWithdrawalStatus(result.data);
            setWithdrawAmount('');
        } catch (err: any) {
            setWithdrawalStatus({ error: err.message || 'Withdrawal request failed.' });
        } finally {
            setIsWithdrawing(false);
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
                                ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">1 USDC = $1.00 USD</p>

                            {payoutPreference === 'debit_card' && walletType === 'embedded' ? (
                                <button
                                    onClick={() => setShowWithdrawModal(true)}
                                    className="w-full mt-6 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-primary to-secondary hover:from-primary-dark hover:to-pink-600 text-white shadow-lg shadow-purple-500/20 active:scale-95 transition-all duration-150"
                                >
                                    Withdraw to Bank
                                </button>
                            ) : (
                                <div className="mt-6 p-4 rounded-xl border border-gray-800 bg-gray-950/40 text-center">
                                    <p className="text-xs text-pink-400 font-semibold">
                                        ⚡ Auto-routed to Custom Wallet
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        Payouts go directly to your address in real-time.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="rounded-xl border border-gray-900 bg-gray-900/30 p-4 space-y-3">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Monthly Revenue (USDC)</span>
                                <span className="font-bold text-white">$1,250.00</span>
                            </div>
                            <div className="flex justify-between text-xs border-t border-gray-900 pt-3">
                                <span className="text-gray-400">Platform Commission</span>
                                <span className="font-bold text-purple-400">Per-creator rate</span>
                            </div>
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
                                        connectWallet('embedded');
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
                                            <h4 className="text-sm font-bold text-white">Embedded Wallet (Easiest)</h4>
                                            <p className="text-xs text-gray-400 mt-1">Automatic setup. One-click withdraw to debit card.</p>
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
                                    <p className="text-xs font-semibold text-purple-400">Embedded Payout Profile</p>
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                                        <div>
                                            <span className="text-gray-400">Your Wallet Address:</span>
                                            <code className="text-gray-300 ml-2 bg-gray-900 px-2 py-0.5 rounded text-[10px]">
                                                {isWalletLoading ? 'Connecting...' : walletAddress}
                                            </code>
                                        </div>
                                        <div className="text-gray-400">
                                            Status: <span className="text-green-400 font-bold">Linked</span>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-gray-500 border-t border-gray-900 pt-3">
                                        * Fees are fractions of a cent. Withdrawals to linked debit cards occur immediately via our secure off-ramp engine.
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 p-4 rounded-xl bg-gray-950/60 border border-gray-900">
                                    <p className="text-xs font-semibold text-pink-400">Custom Wallet Details</p>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Wallet Address (ERC-20)</label>
                                        <input
                                            type="text"
                                            value={customAddress}
                                            onChange={(e) => setCustomAddress(e.target.value)}
                                            placeholder="0x..."
                                            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors"
                                        />
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

            {showWithdrawModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="relative w-full max-w-md rounded-2xl border border-purple-500/20 bg-gray-900 p-6 md:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">

                        <div>
                            <h3 className="text-xl font-extrabold text-white">Withdraw settled USDC</h3>
                            <p className="text-gray-400 text-xs mt-1">Convert your USDC instantly and cash out to bank.</p>
                        </div>

                        {withdrawalStatus && !withdrawalStatus.error ? (
                            <div className="space-y-6 text-center py-4">
                                <div className="w-12 h-12 rounded-full bg-green-950/20 border border-green-500/20 text-green-400 flex items-center justify-center mx-auto text-xl font-bold">
                                    ✓
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-gray-400">Withdrawal Initiated!</p>
                                    <h4 className="text-2xl font-black text-white">${withdrawalStatus.amount} USD</h4>
                                </div>
                                <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 text-left text-xs space-y-2">
                                    <div className="flex justify-between"><span className="text-gray-500">Destination:</span><span className="text-gray-300 font-bold">{withdrawalStatus.recipientCard}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Processing Time:</span><span className="text-gray-300 font-bold">{withdrawalStatus.estimatedArrival}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Transaction ID:</span><span className="text-[10px] text-gray-500 font-mono">{withdrawalStatus.transferId}</span></div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowWithdrawModal(false);
                                        setWithdrawalStatus(null);
                                    }}
                                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-gray-800 text-white hover:bg-gray-700 transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleWithdraw} className="space-y-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount to Withdraw</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">$</span>
                                        <input
                                            type="number"
                                            value={withdrawAmount}
                                            onChange={(e) => setWithdrawAmount(e.target.value)}
                                            placeholder="Max: 1250.00"
                                            max="1250"
                                            step="0.01"
                                            className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-8 pr-16 py-3 text-lg font-bold text-white focus:outline-none focus:border-purple-500"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">USDC</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-gray-500 pt-1">
                                        <span>Instant cash-out fee: 1.5%</span>
                                        <span className="cursor-pointer text-purple-400 hover:underline" onClick={() => setWithdrawAmount('1250.00')}>Use Max</span>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-3">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Linked Payout Destination</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-gray-900 border border-gray-800 flex items-center justify-center text-xs font-bold text-purple-400">
                                            Visa
                                        </div>
                                        <div className="text-xs">
                                            <p className="text-gray-300 font-bold">Visa debit ending in 4321</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">Linked via Coinbase Off-Ramp API</p>
                                        </div>
                                    </div>
                                </div>

                                {withdrawalStatus?.error && (
                                    <div className="p-3 rounded-lg text-xs font-semibold bg-red-950/20 border border-red-500/20 text-red-400">
                                        {withdrawalStatus.error}
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowWithdrawModal(false);
                                            setWithdrawalStatus(null);
                                        }}
                                        className="w-1/2 py-2.5 rounded-xl text-xs font-bold bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isWithdrawing || !withdrawAmount}
                                        className="w-1/2 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-primary to-secondary hover:from-primary-dark hover:to-pink-600 text-white disabled:opacity-50 transition-colors shadow-lg shadow-purple-500/20"
                                    >
                                        {isWithdrawing ? 'Withdrawing...' : 'Confirm'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
export default WalletSettings;
