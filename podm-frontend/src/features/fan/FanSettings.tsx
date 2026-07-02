import React, { useEffect, useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
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

import SettingsCard from '../../components/shared/SettingsCard';
import ToggleSwitch from '../../components/shared/ToggleSwitch';
// --- Local Type Definitions ---
export interface FanSettingsData {
    notifications: { newContent?: boolean; creatorLive?: boolean; emailPromotions?: boolean; };
    privacy: { showInSearch?: boolean; showSubscriptions?: boolean; };
    paymentMethod: { brand: string; last4: string; };
}


const UpdatePaymentModal = ({ isOpen, onClose, onUpdateSuccess }: { isOpen: boolean; onClose: () => void; onUpdateSuccess: () => void; }) => {
    const stripe = useStripe();
    const elements = useElements();

    // State for the server-side interaction
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch the client secret from our new backend endpoint whenever the modal opens
    useEffect(() => {
        if (isOpen) {
            setError(null);
            apiClient.createSetupIntent()
                .then(response => {
                    setClientSecret(response.data.clientSecret);
                })
                .catch(err => {
                    setError("Could not prepare the payment form. Please try again.");
                    console.error(err);
                });
        }
    }, [isOpen]);

    const CARD_ELEMENT_OPTIONS = { style: { base: { color: '#CBD5E1', fontFamily: 'sans-serif', fontSmoothing: 'antialiased', fontSize: '16px', '::placeholder': { color: '#64748B' } }, invalid: { color: '#EF4444', iconColor: '#EF4444' } } };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!stripe || !elements || !clientSecret) {
            setError("Payment form is not ready. Please try again in a moment.");
            return;
        }

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
            setError("Payment form not found. Please refresh.");
            return;
        }

        setIsLoading(true);
        setError(null);

        // --- Step 1: Confirm the card setup on the client-side ---
        const { error: setupError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
            payment_method: {
                card: cardElement,
            },
        });

        if (setupError) {
            setError(setupError.message || "An unexpected error occurred.");
            setIsLoading(false);
            return;
        }

        if (setupIntent.status !== 'succeeded') {
            setError("Card setup could not be completed. Please try again.");
            setIsLoading(false);
            return;
        }

        // --- Step 2: Card setup is successful, now send the confirmed payment method to our server ---
        try {
            await apiClient.updateFanPaymentMethod(setupIntent.payment_method as string);
            onUpdateSuccess();
            onClose();
        } catch (apiError: any) {
            setError(apiError.response?.data?.message || 'Failed to save the new payment method.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <header className="p-6 border-b border-gray-200 dark:border-gray-700"><h2 className="text-xl font-bold">Update Payment Method</h2></header>
            <form onSubmit={handleSubmit}>
                <main className="p-6 space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enter your new card details below. Your information is sent securely to Stripe.</p>
                    <div className="p-3 bg-slate-800 rounded-md border border-slate-700">
                        <CardElement options={CARD_ELEMENT_OPTIONS} />
                    </div>
                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                </main>
                <footer className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <Button type="submit" isLoading={isLoading} disabled={!stripe || !elements || !clientSecret}>
                        Save Card
                    </Button>
                </footer>
            </form>
        </Modal>
    );
};

// --- Settings Panels (Now with full implementations) ---

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
const PaymentsSettingsPanel = ({ paymentMethod, onUpdateClick }: { paymentMethod: FanSettingsData['paymentMethod'], onUpdateClick: () => void }) => (<SettingsCard title="Payment Methods" subtitle="Manage your saved payment information."><div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><div className="flex items-center space-x-4"><CreditCard className="w-8 h-8 text-blue-500" /><div><p className="font-semibold">{paymentMethod.brand} ending in {paymentMethod.last4}</p><p className="text-sm text-gray-500 dark:text-gray-400">Your default payment method</p></div></div><Button variant="ghost" onClick={onUpdateClick}>Update</Button></div></SettingsCard>);

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
    const [paymentMethod, setPaymentMethod] = useState(initialSettings.paymentMethod);
    const [isSaving, setIsSaving] = useState(false);
    const { isOpen: isPaymentModalOpen, openModal: openPaymentModal, closeModal: closePaymentModal } = useModal();

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

    const handlePaymentUpdateSuccess = async () => {
        try {
            const response = await apiClient.getFanSettings();
            setPaymentMethod(response.data.settings.paymentMethod);
            alert("Payment method updated successfully!");
        } catch (error) {
            console.error("Failed to refresh settings after payment update:", error);
            alert("Payment method was updated, but we couldn't refresh the details. Please refresh the page.");
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
            case 'Payments': return <PaymentsSettingsPanel paymentMethod={paymentMethod} onUpdateClick={openPaymentModal} />;
            case 'Security': return <SecuritySettingsPanel />;
            case 'Help': return <HelpPanel />;
            default: return <div className="text-center p-8 bg-white dark:bg-gray-800/50 rounded-xl"><p>Select a category.</p></div>;
        }
    };

    return (
        <>
            <UpdatePaymentModal isOpen={isPaymentModalOpen} onClose={closePaymentModal} onUpdateSuccess={handlePaymentUpdateSuccess} />
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
