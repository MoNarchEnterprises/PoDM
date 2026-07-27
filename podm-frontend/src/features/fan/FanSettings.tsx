import React, { useEffect, useState } from 'react';
import { User as UserIcon, Bell, CreditCard, Shield, HelpCircle, Save, Camera } from 'lucide-react';

// --- Import Shared Types ---
import { User as FanUser } from '@common/types/User';

// --- Import Reusable Components & Hooks ---
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useModal } from '../../hooks/useModal';
import * as apiClient from '../../lib/apiClient';
import { getCryptoWallet } from '../../lib/wallet';
import { useEmbeddedWallet } from '../../context/EmbeddedWalletContext';
import { transferUsdcToSmartAccount } from '../../lib/embeddedWalletApi';
import { Loader2 } from 'lucide-react';

import SettingsCard from '../../components/shared/SettingsCard';
import ToggleSwitch from '../../components/shared/ToggleSwitch';
// --- Local Type Definitions ---
export interface FanSettingsData {
    notifications: { newContent?: boolean; creatorLive?: boolean; emailPromotions?: boolean; };
    privacy: { showInSearch?: boolean; showSubscriptions?: boolean; };
    paymentMethod: { brand: string; last4: string; };
}

const WalletLinkModal = ({ isOpen, onClose, onUpdateSuccess }: { isOpen: boolean; onClose: () => void; onUpdateSuccess: () => void; }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inputAddress, setInputAddress] = useState('');
    const [walletAddress, setWalletAddress] = useState<string | null>(null);

    const handleConnect = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const eth = window.ethereum;
            if (!eth) {
                setError('No wallet detected. Please install MetaMask or Coinbase Wallet.');
                return;
            }
            const accounts = await eth.request({ method: 'eth_requestAccounts' });
            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts returned from wallet.');
            }
            setWalletAddress(accounts[0]);
        } catch (err: any) {
            setError(err.message || 'Failed to connect wallet.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        const address = walletAddress || inputAddress.trim();
        if (!address) return;
        setIsLoading(true);
        setError(null);
        try {
            await apiClient.linkWallet(address);
            onUpdateSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to link wallet.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <header className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold">Link Crypto Wallet</h2>
            </header>
            <main className="p-6 space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Enter your EVM wallet address or connect a browser wallet to send tips, unlock content, and manage subscriptions via USDC on Base.
                </p>
                <input
                    type="text"
                    value={inputAddress}
                    onChange={(e) => { setInputAddress(e.target.value); setWalletAddress(null); }}
                    placeholder="0x..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                {walletAddress && (
                    <div className="p-3 bg-slate-800 rounded-md border border-slate-700 text-center">
                        <p className="text-sm text-gray-400">Your wallet:</p>
                        <p className="font-semibold text-white text-xs truncate">{walletAddress}</p>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-gray-700" />
                    <span className="text-xs text-gray-500">or connect browser wallet</span>
                    <div className="h-px flex-1 bg-gray-700" />
                </div>
                <Button onClick={handleConnect} isLoading={isLoading} className="w-full">
                    Connect Wallet
                </Button>
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            </main>
            {(walletAddress || inputAddress.trim()) && (
                <footer className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <Button onClick={handleSave} isLoading={isLoading}>
                        Link Wallet
                    </Button>
                </footer>
            )}
        </Modal>
    );
};

// --- Settings Panels ---

const AccountSettingsPanel = ({ profile, onProfileChange }: { profile: any; onProfileChange: (field: string, value: string) => void; }) => (<SettingsCard title="Profile Information" subtitle="Update your account details."><div className="flex items-center space-x-4"><div className="relative"><img src={profile.avatar} alt="Avatar" className="w-20 h-20 rounded-full" /><Button variant="primary" size="sm" className="absolute bottom-0 right-0 p-1.5 h-auto rounded-full"><Camera className="w-4 h-4" /></Button></div><Input id="name" label="Display Name" value={profile.name || ''} onChange={(e) => onProfileChange('name', e.target.value)} containerClassName="flex-grow" /></div><Input id="username" label="Username" value={profile.username || ''} readOnly disabled /><Input id="email" label="Email Address" type="email" value={profile.email || ''} readOnly disabled /></SettingsCard>);
const NotificationSettingsPanel = ({ settings, onSettingsChange }: { settings: FanSettingsData['notifications']; onSettingsChange: (category: 'notifications', key: string, value: boolean) => void; }) => (
    <SettingsCard title="Notifications" subtitle="Choose how you want to be notified.">
        <ToggleSwitch
            label="New Content"
            description="Get notified when a creator you follow posts."
            enabled={!!settings.newContent}
            setEnabled={(val) => onSettingsChange('notifications', 'newContent', val)}
        />
    </SettingsCard>
);
const PrivacySettingsPanel = ({ settings, onSettingsChange }: { settings: FanSettingsData['privacy']; onSettingsChange: (category: 'privacy', key: string, value: boolean) => void; }) => (<SettingsCard title="Privacy" subtitle="Control how your profile appears to others."><ToggleSwitch label="Show in Search" description="Allow others to find your profile via search." enabled={!!settings.showInSearch} setEnabled={(val) => onSettingsChange('privacy', 'showInSearch', val)} /><ToggleSwitch label="Show Subscriptions" description="Allow others to see which creators you follow." enabled={!!settings.showSubscriptions} setEnabled={(val) => onSettingsChange('privacy', 'showSubscriptions', val)} /></SettingsCard>);
const PaymentsSettingsPanel = ({ walletAddress, onLinkClick, embeddedWallet, embeddedBalance }: { walletAddress?: string | null, onLinkClick: () => void, embeddedWallet?: { walletAddress?: string | null, smartAccountAddress?: string | null } | null, embeddedBalance?: number }) => {
    const [isTransferring, setIsTransferring] = useState(false);
    const [transferResult, setTransferResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleTransferToSmartAccount = async () => {
        setIsTransferring(true);
        setTransferResult(null);
        try {
            const res = await transferUsdcToSmartAccount();
            setTransferResult({ type: 'success', message: `Transferred $${res.data.amount.toFixed(2)} USDC to smart account! Tx: ${res.data.txHash.slice(0, 10)}...` });
        } catch (err: any) {
            setTransferResult({ type: 'error', message: err.response?.data?.message || err.message || 'Transfer failed' });
        } finally {
            setIsTransferring(false);
        }
    };

    return (
        <>
            <SettingsCard title="Browser Wallet" subtitle="Your linked EVM wallet for browser-based payments.">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-4">
                        <CreditCard className="w-8 h-8 text-blue-500" />
                        <div>
                            {walletAddress ? (
                                <>
                                    <p className="font-semibold">Wallet Connected</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate max-w-[200px]">{walletAddress}</p>
                                </>
                            ) : (
                                <>
                                    <p className="font-semibold">No Wallet Connected</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Link a wallet to pay with USDC</p>
                                </>
                            )}
                        </div>
                    </div>
                    <Button variant="ghost" onClick={onLinkClick}>
                        {walletAddress ? 'Update' : 'Link Wallet'}
                    </Button>
                </div>
            </SettingsCard>
            {embeddedWallet && (embeddedWallet.walletAddress || embeddedWallet.smartAccountAddress) && (
                <SettingsCard title="Embedded Wallet" subtitle="Your gasless smart wallet on Base (ERC-4337).">
                    <div className="space-y-3">
                        {embeddedWallet.walletAddress && (
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">EOA Address (Signer)</p>
                                <p className="text-sm font-mono text-gray-900 dark:text-white break-all bg-gray-50 dark:bg-gray-700/50 p-2 rounded">{embeddedWallet.walletAddress}</p>
                            </div>
                        )}
                        {embeddedWallet.smartAccountAddress && (
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Smart Account (Holds Funds)</p>
                                <p className="text-sm font-mono text-gray-900 dark:text-white break-all bg-gray-50 dark:bg-gray-700/50 p-2 rounded">{embeddedWallet.smartAccountAddress}</p>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-500 dark:text-gray-400">USDC Balance</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">${(embeddedBalance ?? 0).toFixed(2)}</span>
                        </div>
                        {(embeddedBalance ?? 0) > 0 && (
                            <Button
                                onClick={handleTransferToSmartAccount}
                                disabled={isTransferring}
                                className="w-full mt-2"
                            >
                                {isTransferring ? (
                                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Transferring...</>
                                ) : (
                                    'Send USDC to Smart Account'
                                )}
                            </Button>
                        )}
                        {transferResult && (
                            <p className={`text-sm text-center ${transferResult.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                                {transferResult.message}
                            </p>
                        )}
                    </div>
                </SettingsCard>
            )}
        </>
    );
};

// --- FULL SECURITY PANEL IMPLEMENTATION ---
const SecuritySettingsPanel = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handlePasswordChange = async () => {
        if (newPassword !== confirmPassword) {
            setFeedback({ type: 'error', message: "New passwords do not match." });
            return;
        }
        if (!currentPassword || !newPassword) {
            setFeedback({ type: 'error', message: "All password fields are required." });
            return;
        }
        setIsLoading(true);
        setFeedback(null);
        try {
            await apiClient.changePassword({ currentPassword, newPassword });
            setFeedback({ type: 'success', message: "Password changed successfully!" });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            setFeedback({ type: 'error', message: error.response?.data?.message || error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <SettingsCard title="Change Password" footerContent={
                <>
                    {feedback && <p className={`text-sm ${feedback.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>{feedback.message}</p>}
                    <Button onClick={handlePasswordChange} isLoading={isLoading}>Update Password</Button>
                </>
            }>
                <Input id="current-password" type="password" label="Current Password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                <Input id="new-password" type="password" label="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                <Input id="confirm-password" type="password" label="Confirm New Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </SettingsCard>
            <SettingsCard title="Two-Factor Authentication (2FA)">
                <ToggleSwitch label="Enable Authenticator App" description="Add an extra layer of security to your account." enabled={twoFactorEnabled} setEnabled={setTwoFactorEnabled} />
            </SettingsCard>
        </div>
    );
};

// --- FULL HELP PANEL IMPLEMENTATION ---
const HelpPanel = () => {
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleSubmitTicket = async () => {
        if (!subject || !description) {
            setFeedback({ type: 'error', message: "Please fill out both fields." });
            return;
        }
        setIsLoading(true);
        setFeedback(null);
        try {
            await apiClient.submitSupportTicket(subject, description);
            setFeedback({ type: 'success', message: "Support ticket submitted!" });
            setSubject('');
            setDescription('');
        } catch (error: any) {
            setFeedback({ type: 'error', message: error.response?.data?.message || "Failed to submit ticket." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SettingsCard title="Contact Support" subtitle="Have an issue or a question? Let us know." footerContent={
            <>
                {feedback && <p className={`text-sm ${feedback.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>{feedback.message}</p>}
                <Button onClick={handleSubmitTicket} isLoading={isLoading}>Submit Ticket</Button>
            </>
        }>
            <Input id="subject" label="Subject" placeholder="e.g., Billing Question" value={subject} onChange={e => setSubject(e.target.value)} />
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">How can we help?</label>
                <textarea id="description" rows={6} placeholder="Please describe your issue in detail..." value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
        </SettingsCard>
    );
};

// --- Main Settings Page Component ---

interface FanSettingsPageProps {
    fan: FanUser;
    initialSettings: FanSettingsData;
}

const FanSettingsPage = ({ fan, initialSettings }: FanSettingsPageProps) => {
    const [activeTab, setActiveTab] = useState('Account');
    const [profile, setProfile] = useState({ name: fan.profile.name, username: fan.username, email: fan.email, avatar: fan.profile.avatar });
    const [preferences, setPreferences] = useState({ notifications: initialSettings.notifications, privacy: initialSettings.privacy });
    const [walletAddress, setWalletAddress] = useState<string | null>(getCryptoWallet(fan));
    const [isSaving, setIsSaving] = useState(false);
    const { isOpen: isWalletModalOpen, openModal: openWalletModal, closeModal: closeWalletModal } = useModal();
    const { walletAddress: embeddedAddr, smartAccountAddress, usdcBalance, isReady } = useEmbeddedWallet();

    const handleProfileChange = (field: string, value: string) => setProfile(prev => ({ ...prev, [field]: value }));
    const handleSettingsChange = (category: 'notifications' | 'privacy', key: string, value: boolean) => setPreferences(prev => ({ ...prev, [category]: { ...prev[category], [key]: value } }));

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            await apiClient.updateFanSettings({ profile: { name: profile.name }, preferences });
            alert('Settings saved successfully!');
        } catch (error) {
            console.error("Failed to save settings:", error);
            alert('Failed to save settings. Please try again.');
        } finally { setIsSaving(false); }
    };

    const handleWalletUpdateSuccess = async () => {
        try {
            const response = await apiClient.getFanSettings();
            setWalletAddress(getCryptoWallet(response.data.fan));
            alert('Wallet linked successfully!');
        } catch (error) {
            console.error("Failed to refresh settings after wallet link:", error);
        }
    };

    const menuItems = [
        { key: 'Account', label: 'Account', icon: UserIcon },
        { key: 'Notifications', label: 'Notifications', icon: Bell },
        { key: 'Payments', label: 'Payments', icon: CreditCard },
        { key: 'Security', label: 'Security', icon: Shield },
        { key: 'Help', label: 'Help', icon: HelpCircle },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'Account': return <AccountSettingsPanel profile={profile} onProfileChange={handleProfileChange} />;
            case 'Notifications': return <NotificationSettingsPanel settings={preferences.notifications} onSettingsChange={handleSettingsChange} />;
            case 'Payments': return <PaymentsSettingsPanel walletAddress={walletAddress} onLinkClick={openWalletModal} embeddedWallet={{ walletAddress: embeddedAddr, smartAccountAddress }} embeddedBalance={usdcBalance} />;
            case 'Security': return <SecuritySettingsPanel />;
            case 'Help': return <HelpPanel />;
            default: return <div className="text-center p-8 bg-white dark:bg-gray-800/50 rounded-xl"><p>Select a category.</p></div>;
        }
    };

    return (
        <>
            <WalletLinkModal isOpen={isWalletModalOpen} onClose={closeWalletModal} onUpdateSuccess={handleWalletUpdateSuccess} />
            <div className="p-4 sm:p-6 lg:p-8">
                <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
                    <div><h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1><p className="text-gray-500 dark:text-gray-400 mt-1">Manage your profile and account preferences.</p></div>
                    <Button onClick={handleSaveChanges} isLoading={isSaving} leftIcon={Save} className="mt-4 sm:mt-0">Save Changes</Button>
                </header>
                <div className="flex flex-col md:flex-row gap-8">
                    <aside className="md:w-1/4 lg:w-1-5">
                        <nav className="space-y-1">
                            {menuItems.map(item => (
                                <button key={item.key} onClick={() => setActiveTab(item.key)} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === item.key ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><item.icon className="w-5 h-5" /><span>{item.label}</span></button>
                            ))}
                        </nav>
                    </aside>
                    <main className="flex-1"><div className="space-y-6">{renderContent()}</div></main>
                </div>
            </div>
        </>
    );
};

export default FanSettingsPage;
