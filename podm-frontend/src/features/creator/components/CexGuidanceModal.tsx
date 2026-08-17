import React, { useState, useRef, useEffect } from 'react';
import {
    Building2, ExternalLink, ShieldAlert, CheckCircle, ArrowRight,
    Bookmark, Info
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { buildWalletOwnershipMessage } from '@common/walletOwnership';

interface CexOption {
    id: string;
    name: string;
    region: string;
    description: string;
    url: string;
    badge?: string;
    color: string;
}

const CEX_EXCHANGES: CexOption[] = [
    {
        id: 'coinbase',
        name: 'Coinbase',
        region: 'US, EU, UK & Global',
        description: 'Native Base network USDC deposits. Direct bank ACH, Wire & SEPA cashouts.',
        url: 'https://www.coinbase.com',
        badge: 'Recommended',
        color: 'from-blue-600 to-blue-700'
    },
    {
        id: 'kraken',
        name: 'Kraken',
        region: 'US, EU, UK & Global',
        description: 'Industry-leading security with fast SEPA & FedNow bank transfers.',
        url: 'https://www.kraken.com',
        color: 'from-purple-600 to-indigo-700'
    },
    {
        id: 'binance',
        name: 'Binance',
        region: 'Global, Asia, EU & LATAM',
        description: 'Supports Base network USDC deposits and wide P2P local bank cashouts.',
        url: 'https://www.binance.com',
        color: 'from-yellow-600 to-amber-700'
    },
    {
        id: 'bitso',
        name: 'Bitso',
        region: 'Mexico, Brazil, Argentina, Colombia',
        description: 'Direct instant SPEI (Mexico) and Pix (Brazil) local bank payouts.',
        url: 'https://bitso.com',
        badge: 'LATAM Instant',
        color: 'from-emerald-600 to-teal-700'
    }
];

interface CexGuidanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddressSaved?: (address: string) => void;
    initialAddress?: string;
}

export const CexGuidanceModal: React.FC<CexGuidanceModalProps> = ({
    isOpen,
    onClose,
    onAddressSaved,
    initialAddress = ''
}) => {
    const { user, impersonatedUser } = useAuth();
    const authenticatedUser = impersonatedUser || user;
    const [step, setStep] = useState<number>(1);
    const [selectedCex, setSelectedCex] = useState<CexOption | null>(null);
    const [showDisclaimer, setShowDisclaimer] = useState<boolean>(false);
    const [userAddress, setUserAddress] = useState<string>(initialAddress);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    
    // Checklist state
    const [checklist, setChecklist] = useState({
        createdAccount: false,
        linkedBank: false,
        copiedAddress: false,
        bookmarked: false
    });

    const addressInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus the address input when entering step 3
    useEffect(() => {
        if (step === 3 && addressInputRef.current) {
            setTimeout(() => {
                addressInputRef.current?.focus();
            }, 150);
        }
    }, [step]);

    const handleSelectCex = (cex: CexOption) => {
        setSelectedCex(cex);
        setShowDisclaimer(true);
    };

    const handleProceedToExternalCex = () => {
        if (selectedCex) {
            // ALWAYS open in a new tab so PoDM tab stays open
            window.open(selectedCex.url, '_blank', 'noopener,noreferrer');
        }
        setShowDisclaimer(false);
        setStep(2);
    };

    const toggleChecklistItem = (key: keyof typeof checklist) => {
        setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const getAuthHeaders = (): Record<string, string> => {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const impersonating = localStorage.getItem('impersonating_user_id') || sessionStorage.getItem('impersonating_user_id');
        if (impersonating) headers['x-impersonating-user-id'] = impersonating;
        return headers;
    };

    const handleSaveAddress = async () => {
        if (!userAddress || !userAddress.trim() || !userAddress.startsWith('0x') || userAddress.length !== 42) {
            setErrorMessage('Please enter a valid 42-character ERC-20 wallet address (starting with 0x).');
            return;
        }

        setIsSaving(true);
        setErrorMessage(null);

        try {
            const ethereum = window.ethereum;
            if (!ethereum) {
                throw new Error('Connect the wallet that owns this address to prove ownership.');
            }
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' }) as string[];
            const connectedAddress = accounts?.[0];
            if (!connectedAddress || connectedAddress.toLowerCase() !== userAddress.trim().toLowerCase()) {
                throw new Error('The connected wallet must match the address entered above.');
            }
            if (!authenticatedUser?.id) {
                throw new Error('Your session must be loaded before linking a wallet.');
            }
            const challengeRes = await fetch('/api/v1/payments/crypto/wallet/challenge', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ walletAddress: userAddress.trim() }),
            });
            if (!challengeRes.ok) {
                const err = await challengeRes.json();
                throw new Error(err.message || 'Failed to generate wallet verification challenge.');
            }
            const challengeJson = await challengeRes.json();
            const challengeData = challengeJson.data || challengeJson;
            const challengeId = challengeData.challengeId;
            const message = challengeData.message;

            const signature = await ethereum.request({
                method: 'personal_sign',
                params: [message, connectedAddress]
            }) as string;

            const payload = {
                walletAddress: userAddress.trim(),
                walletType: 'custom',
                payoutPreference: 'on_chain',
                challengeId,
                signature
            };

            const response = await fetch('/api/v1/payments/crypto/wallet', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to save exchange address.');
            }

            setSaveSuccess(true);
            if (onAddressSaved) {
                onAddressSaved(userAddress.trim());
            }
            setTimeout(() => {
                onClose();
            }, 1200);
        } catch (err: any) {
            setErrorMessage(err.message || 'Error saving wallet address.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl bg-gray-950 border border-gray-800 text-gray-100 p-0 overflow-hidden rounded-2xl">
            <div className="flex flex-col max-h-[90vh]">
                {/* Header */}
                <header className="p-6 border-b border-gray-800 bg-gradient-to-r from-gray-900 via-purple-950/40 to-gray-900 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-400">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Fiat Cashout & Exchange Setup Guide</h2>
                            <p className="text-xs text-gray-400">Withdraw your USDC earnings directly to your local bank account</p>
                        </div>
                    </div>
                </header>

                {/* Body Content */}
                <main className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-950">

                    {/* Step Indicator */}
                    <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                        <div className={`flex items-center space-x-2 text-xs font-semibold ${step === 1 ? 'text-purple-400' : 'text-gray-500'}`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-purple-600 text-white' : 'bg-gray-800'}`}>1</span>
                            <span>Choose Exchange</span>
                        </div>
                        <div className="h-0.5 w-8 bg-gray-800"></div>
                        <div className={`flex items-center space-x-2 text-xs font-semibold ${step === 2 ? 'text-purple-400' : 'text-gray-500'}`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-purple-600 text-white' : 'bg-gray-800'}`}>2</span>
                            <span>Verification Checklist</span>
                        </div>
                        <div className="h-0.5 w-8 bg-gray-800"></div>
                        <div className={`flex items-center space-x-2 text-xs font-semibold ${step === 3 ? 'text-purple-400' : 'text-gray-500'}`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-purple-600 text-white' : 'bg-gray-800'}`}>3</span>
                            <span>Link Address</span>
                        </div>
                    </div>

                    {/* Step 1: Select Exchange */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-gray-300">Select a Centralized Exchange (CEX)</h3>
                                <p className="text-xs text-gray-400 mt-1">Choose a licensed exchange supported in your country to cash out USDC to your bank account.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                {CEX_EXCHANGES.map(cex => (
                                    <div
                                        key={cex.id}
                                        onClick={() => handleSelectCex(cex)}
                                        className="relative group cursor-pointer rounded-xl border border-gray-800 bg-gray-900/60 hover:bg-gray-900 hover:border-purple-500/50 p-4 transition-all duration-200 flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-bold text-white text-base group-hover:text-purple-300 flex items-center gap-1.5">
                                                    {cex.name}
                                                    <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                                                </h4>
                                                {cex.badge && (
                                                    <span className="text-[10px] bg-purple-950/80 border border-purple-500/40 text-purple-300 font-semibold px-2 py-0.5 rounded-full">
                                                        {cex.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-purple-400/90 font-medium mt-1">{cex.region}</p>
                                            <p className="text-xs text-gray-400 mt-2 leading-relaxed">{cex.description}</p>
                                        </div>
                                        <div className="mt-4 pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs text-purple-400 font-semibold">
                                            <span>Set Up on {cex.name}</span>
                                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Checklist */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-4 flex items-start space-x-3">
                                <Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                                <div className="text-xs space-y-1">
                                    <p className="font-bold text-purple-200">Setting up {selectedCex?.name || 'Exchange'} Account</p>
                                    <p className="text-purple-300/80">Follow these 4 quick steps on your exchange's website to enable fiat bank withdrawals.</p>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <label
                                    onClick={() => toggleChecklistItem('createdAccount')}
                                    className={`flex items-start space-x-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${checklist.createdAccount ? 'bg-green-950/20 border-green-500/30 text-white' : 'bg-gray-900/50 border-gray-800 text-gray-300 hover:border-gray-700'}`}
                                >
                                    <input type="checkbox" checked={checklist.createdAccount} readOnly className="mt-1 rounded text-purple-600 focus:ring-0" />
                                    <div className="text-xs">
                                        <p className="font-bold">1. Register Account & Complete Identity Verification (KYC)</p>
                                        <p className="text-gray-400 mt-0.5">Upload your ID/Passport on {selectedCex?.name || 'the exchange'} to comply with banking regulations.</p>
                                    </div>
                                </label>

                                <label
                                    onClick={() => toggleChecklistItem('linkedBank')}
                                    className={`flex items-start space-x-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${checklist.linkedBank ? 'bg-green-950/20 border-green-500/30 text-white' : 'bg-gray-900/50 border-gray-800 text-gray-300 hover:border-gray-700'}`}
                                >
                                    <input type="checkbox" checked={checklist.linkedBank} readOnly className="mt-1 rounded text-purple-600 focus:ring-0" />
                                    <div className="text-xs">
                                        <p className="font-bold">2. Link Your Local Bank Account or Debit Card</p>
                                        <p className="text-gray-400 mt-0.5">Add your checking account, IBAN, SPEI, or debit card for cashouts.</p>
                                    </div>
                                </label>

                                <label
                                    onClick={() => toggleChecklistItem('copiedAddress')}
                                    className={`flex items-start space-x-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${checklist.copiedAddress ? 'bg-green-950/20 border-green-500/30 text-white' : 'bg-gray-900/50 border-gray-800 text-gray-300 hover:border-gray-700'}`}
                                >
                                    <input type="checkbox" checked={checklist.copiedAddress} readOnly className="mt-1 rounded text-purple-600 focus:ring-0" />
                                    <div className="text-xs">
                                        <p className="font-bold">3. Copy your USDC Deposit Address (Select Network: Base)</p>
                                        <p className="text-gray-400 mt-0.5">Navigate to Deposit $\rightarrow$ Select USDC $\rightarrow$ Choose network <strong>Base</strong>, then copy the address.</p>
                                    </div>
                                </label>

                                <label
                                    onClick={() => toggleChecklistItem('bookmarked')}
                                    className={`flex items-start space-x-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${checklist.bookmarked ? 'bg-green-950/20 border-green-500/30 text-white' : 'bg-gray-900/50 border-gray-800 text-gray-300 hover:border-gray-700'}`}
                                >
                                    <input type="checkbox" checked={checklist.bookmarked} readOnly className="mt-1 rounded text-purple-600 focus:ring-0" />
                                    <div className="text-xs flex items-center gap-1.5 font-bold text-amber-300">
                                        <Bookmark className="w-4 h-4 flex-shrink-0" />
                                        <span>4. Bookmark & Save Your Exchange Login Credentials</span>
                                    </div>
                                </label>
                            </div>

                            <div className="pt-4 flex justify-between">
                                <Button variant="secondary" onClick={() => setStep(1)}>
                                    Back to Exchanges
                                </Button>
                                <Button onClick={() => setStep(3)} rightIcon={ArrowRight}>
                                    Next: Link Address to PoDM
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Link Address */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Paste Exchange Deposit Address</h3>
                                <p className="text-xs text-gray-400 mt-1">
                                    Paste your USDC deposit address on the <strong>Base Network</strong> below. PoDM will send your payout earnings directly to this address.
                                </p>
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-xs font-semibold text-gray-300">USDC (Base Network) Wallet Address</label>
                                <input
                                    ref={addressInputRef}
                                    type="text"
                                    value={userAddress}
                                    onChange={(e) => setUserAddress(e.target.value)}
                                    placeholder="0x..."
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-purple-500 transition-colors"
                                />
                                <p className="text-[11px] text-gray-500">
                                    Example format: <code>0x71C...3972</code> (Must start with 0x)
                                </p>
                            </div>

                            {errorMessage && (
                                <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl text-xs text-red-400 font-medium">
                                    {errorMessage}
                                </div>
                            )}

                            {saveSuccess && (
                                <div className="p-3 bg-green-950/30 border border-green-500/30 rounded-xl text-xs text-green-400 font-semibold flex items-center space-x-2">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Exchange USDC Base deposit address saved successfully!</span>
                                </div>
                            )}

                            <div className="pt-4 flex justify-between">
                                <Button variant="secondary" onClick={() => setStep(2)}>
                                    Back
                                </Button>
                                <Button
                                    onClick={handleSaveAddress}
                                    isLoading={isSaving}
                                    rightIcon={CheckCircle}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    Save & Link Exchange Address
                                </Button>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* External Site Disclaimer Sub-Modal */}
            {showDisclaimer && selectedCex && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-purple-500/30 rounded-2xl max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
                        <div className="flex items-center space-x-3 text-amber-400">
                            <ShieldAlert className="w-7 h-7 flex-shrink-0" />
                            <h3 className="text-lg font-bold text-white">External Site Disclaimer</h3>
                        </div>

                        <div className="space-y-3 text-xs text-gray-300 leading-relaxed bg-gray-950/60 p-4 rounded-xl border border-gray-800">
                            <p>
                                You are leaving PoDM to visit an external third-party platform (<strong>{selectedCex.name}</strong>).
                            </p>
                            <p className="text-gray-400">
                                <strong>PoDM is completely independent</strong>, has no affiliation with, and assumes no liability for external exchange accounts, identity verification, or local banking services.
                            </p>
                            <div className="p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-lg text-amber-300 font-semibold flex items-center space-x-2">
                                <Bookmark className="w-4 h-4 flex-shrink-0" />
                                <span>Be sure to bookmark the exchange URL and save your credentials safely.</span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <Button
                                variant="secondary"
                                onClick={() => setShowDisclaimer(false)}
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleProceedToExternalCex}
                                rightIcon={ExternalLink}
                                className="w-full sm:w-auto flex-1 bg-purple-600 hover:bg-purple-700"
                            >
                                Proceed to {selectedCex.name} (New Tab)
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default CexGuidanceModal;
