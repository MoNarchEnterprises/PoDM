import React, { useState, useRef } from 'react';
import { User as UserIcon, MessageCircle, CreditCard, HelpCircle, Save, Camera, Edit, Trash2, PlusCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

// --- Import Shared Types ---
import { Creator, SubscriptionTier } from '@common/types/Creator';

// --- Import Reusable Components & API Client ---
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import * as apiClient from '../../lib/apiClient';

// --- Reusable Sub-Components ---
const SettingsCard = ({ title, subtitle, children, footerContent }: { title: string; subtitle?: string; children: React.ReactNode; footerContent?: React.ReactNode; }) => (
    <Card noPadding>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700"><h3 className="text-lg font-semibold">{title}</h3>{subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}</div>
        <div className="p-6 space-y-4">{children}</div>
        {footerContent && (<footer className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t flex justify-end items-center gap-4">{footerContent}</footer>)}
    </Card>
);

const ToggleSwitch = ({ label, enabled, setEnabled }: { label: string; enabled: boolean; setEnabled: (enabled: boolean) => void; }) => (
    <div className="flex items-center justify-between"><span className="text-sm font-medium">{label}</span><button onClick={() => setEnabled(!enabled)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'}`}><span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>
);

// --- Settings Panels ---

const AccountSettingsPanel = ({ profile, onProfileChange, onAvatarChange }: { profile: any; onProfileChange: (field: string, value: string) => void; onAvatarChange: (file: File) => void; }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onAvatarChange(file);
        }
    };

    return (
        <SettingsCard title="Profile Information" subtitle="This information will be displayed publicly on your profile.">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
            <div className="flex items-center space-x-4">
                <div className="relative">
                    <img src={profile.avatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
                    <Button onClick={handleAvatarClick} variant="primary" size="sm" className="absolute bottom-0 right-0 p-1.5 h-auto rounded-full"><Camera className="w-4 h-4" /></Button>
                </div>
                <Input id="name" label="Display Name" value={profile.name} onChange={(e) => onProfileChange('name', e.target.value)} containerClassName="flex-grow" />
            </div>
            <Input id="username" label="Username" value={profile.username} readOnly disabled />
            <div>
                <label htmlFor="bio" className="block text-sm font-medium mb-1">Bio</label>
                <textarea id="bio" rows={4} value={profile.bio} onChange={(e) => onProfileChange('bio', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
        </SettingsCard>
    );
};

const WelcomeMessagePanel = ({ welcomeMessage, onMessageChange }: { welcomeMessage: any; onMessageChange: (field: string, value: any) => void; }) => (
    <SettingsCard title="Welcome Message" subtitle="Automatically send a message to new subscribers.">
        <ToggleSwitch label="Enable Welcome Message" enabled={welcomeMessage.isActive} setEnabled={(val) => onMessageChange('isActive', val)} />
        <div><label htmlFor="welcome-message" className="block text-sm font-medium mb-1">Message</label><textarea id="welcome-message" rows={5} value={welcomeMessage.message} onChange={(e) => onMessageChange('message', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
    </SettingsCard>
);

const PaymentsSettingsPanel = ({ tiers }: { tiers: SubscriptionTier[] }) => (
    <SettingsCard title="Subscription Tiers" subtitle="Manage different subscription levels for your fans." footerContent={<Button leftIcon={PlusCircle}>Add New Tier</Button>}>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {tiers.map((tier) => (<li key={tier.id} className="py-3"><div className="flex items-center justify-between"><div><p className="font-semibold">{tier.name} - ${tier.price.toFixed(2)}/month</p><p className="text-xs text-gray-500">{tier.features.join(' · ')}</p></div><div className="flex items-center space-x-2"><Button variant="ghost" size="sm" className="p-2 h-auto"><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="sm" className="p-2 h-auto"><Trash2 className="w-4 h-4" /></Button></div></div></li>))}
        </ul>
    </SettingsCard>
);

const HelpPanel = () => ( <SettingsCard title="Contact Support" subtitle="Have an issue or a question? Let us know." footerContent={<Button>Submit Ticket</Button>}><Input id="subject" label="Subject" placeholder="e.g., Payout Issue" /><div><label htmlFor="description" className="block text-sm font-medium mb-1">How can we help?</label><textarea id="description" rows={6} placeholder="Please describe your issue in detail..." className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500" /></div></SettingsCard> );

// --- Main Settings Page Component ---
interface CreatorSettingsPageProps {
    creator: Creator;
}

const CreatorSettingsPage = ({ creator }: CreatorSettingsPageProps) => {
    const { setUser } = useAuth();
    const [activeTab, setActiveTab] = useState('Account');
    const [isSaving, setIsSaving] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);

    const [settingsData, setSettingsData] = useState<Creator>(creator);
    
    const handleAvatarChange = (file: File) => {
        setAvatarFile(file);
        setSettingsData(prev => ({ ...prev, profile: { ...prev.profile, avatar: URL.createObjectURL(file) } }));
    };

    const handleProfileChange = (field: string, value: string) => {
        setSettingsData((prev: Creator) => ({ ...prev, profile: { ...prev.profile, [field]: value } }));
    };
    
    const handleWelcomeMessageChange = (field: string, value: any) => {
        setSettingsData((prev: Creator) => ({
                ...prev,
                creatorData: {
                    ...prev.creatorData,
                    welcomeMessage: {
                        ...prev.creatorData.welcomeMessage,
                        [field]: value
                    }
                }
        }));
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            if (avatarFile) {
                const avatarResponse = await apiClient.uploadAvatar(avatarFile);
                setUser(avatarResponse.data);
                setSettingsData(avatarResponse.data);
                setAvatarFile(null);
            }

            const payload = {
                profile: { name: settingsData.profile.name, bio: settingsData.profile.bio },
                creatorData: { welcomeMessage: settingsData.creatorData.welcomeMessage }
            };
            const settingsResponse = await apiClient.updateCreatorSettings(payload);
            setUser(settingsResponse.data);
            setSettingsData(settingsResponse.data);
            
            alert("Settings saved successfully!");
        } catch (error) {
            console.error("Failed to save settings:", error);
            alert("Failed to save settings. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const menuItems = [ { key: 'Account', label: 'Account', icon: UserIcon }, { key: 'Welcome Message', label: 'Welcome Message', icon: MessageCircle }, { key: 'Payments', label: 'Payments', icon: CreditCard }, { key: 'Help', label: 'Help', icon: HelpCircle }, ];

    const renderContent = () => {
        // The props passed from the useAuth hook now have the correct shape, so fallbacks are not needed.
        switch (activeTab) {
            case 'Account': return <AccountSettingsPanel profile={settingsData.profile} onProfileChange={handleProfileChange} onAvatarChange={handleAvatarChange} />;
            case 'Welcome Message': return <WelcomeMessagePanel welcomeMessage={settingsData.creatorData.welcomeMessage} onMessageChange={handleWelcomeMessageChange} />;
            case 'Payments': return <PaymentsSettingsPanel tiers={settingsData.creatorData.subscriptionTiers} />;
            case 'Help': return <HelpPanel />;
            default: return <div>Under construction.</div>;
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
                <div><h1 className="text-3xl font-bold">Settings</h1><p className="text-gray-500 mt-1">Manage your profile, payments, and account settings.</p></div>
                <Button onClick={handleSaveChanges} isLoading={isSaving} leftIcon={Save} className="mt-4 sm:mt-0">Save All Changes</Button>
            </header>
            <div className="flex flex-col md:flex-row gap-8">
                <aside className="md:w-1/4 lg:w-1/5">
                    <nav className="space-y-1">
                        {menuItems.map(item => ( <button key={item.key} onClick={() => setActiveTab(item.key)} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === item.key ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><item.icon className="w-5 h-5" /><span>{item.label}</span></button> ))}
                    </nav>
                </aside>
                <main className="flex-1">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default CreatorSettingsPage;