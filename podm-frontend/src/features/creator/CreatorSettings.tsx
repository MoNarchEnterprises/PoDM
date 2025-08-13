import React, { useState, useEffect } from 'react';
import { Home, FileText, MessageSquare, BarChart2, Settings, DollarSign, User as UserIcon, Bell, Shield, CreditCard, MessageCircle, HelpCircle, Save, Camera, CheckCircle, Smartphone, Monitor, Banknote, Edit, Trash2, PlusCircle } from 'lucide-react';

// --- Import Shared Types ---
import { Creator, SubscriptionTier } from '@common/types/Creator';

// --- Import Reusable Components ---
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

// --- Reusable Sub-Components ---

const SettingsCard = ({ title, subtitle, children, noFooter, footerContent }: { title: string; subtitle?: string; children: React.ReactNode; noFooter?: boolean; footerContent?: React.ReactNode; }) => (
    <Card noPadding>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
        <div className="p-6 space-y-4">
            {children}
        </div>
        {!noFooter && (
            <footer className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                {footerContent || (
                    <Button leftIcon={Save}>Save Changes</Button>
                )}
            </footer>
        )}
    </Card>
);

const ToggleSwitch = ({ label, enabled, setEnabled }: { label: string; enabled: boolean; setEnabled: (enabled: boolean) => void; }) => (
    <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'}`}
        >
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);

// --- Settings Panels ---

const AccountSettingsPanel = ({ creator }: { creator: Creator }) => (
    <div className="space-y-6">
        <SettingsCard title="Profile Information" subtitle="This information will be displayed publicly on your profile.">
            <div className="flex items-center space-x-4">
                <div className="relative">
                    <img src={creator.profile.avatar} alt="Avatar" className="w-20 h-20 rounded-full" />
                    <Button variant="primary" size="sm" className="absolute bottom-0 right-0 p-1.5 h-auto rounded-full"><Camera className="w-4 h-4" /></Button>
                </div>
                <Input id="name" label="Name" defaultValue={creator.profile.name} containerClassName="flex-grow" />
            </div>
            <Input id="username" label="Username" defaultValue={creator.username} />
            <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                <textarea id="bio" rows={4} defaultValue={creator.profile.bio} className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
            </div>
        </SettingsCard>
        <SettingsCard title="Verification Status" noFooter>
             <div className="flex items-center space-x-3 bg-blue-50 dark:bg-blue-900/50 p-4 rounded-lg">
                <CheckCircle className="w-8 h-8 text-blue-500" />
                <div>
                    <p className="font-semibold text-blue-800 dark:text-blue-200">You are verified!</p>
                    <p className="text-sm text-blue-600 dark:text-blue-300">Verified on: 2025-01-15</p>
                </div>
             </div>
        </SettingsCard>
    </div>
);

const WelcomeMessagePanel = ({ creator }: { creator: Creator }) => {
    const [isActive, setIsActive] = useState(creator.creatorData.welcomeMessage.isActive);
    return (
        <SettingsCard title="Welcome Message" subtitle="Automatically send a message to new subscribers.">
            <ToggleSwitch label="Enable Welcome Message" enabled={isActive} setEnabled={setIsActive} />
            <div>
                <label htmlFor="welcome-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                <textarea id="welcome-message" rows={5} defaultValue={creator.creatorData.welcomeMessage.message} className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
            </div>
        </SettingsCard>
    );
};

const PaymentsSettingsPanel = ({ creator }: { creator: Creator }) => (
    <div className="space-y-6">
        <SettingsCard title="Payout Method" subtitle="This is how you will receive your earnings." noFooter>
           <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-4">
                    <Banknote className="w-8 h-8 text-green-500" />
                    <div>
                        <p className="font-semibold">{creator.creatorData.payoutSettings.method === 'bank_transfer' ? 'Bank Account' : 'PayPal'}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Chase Bank **** 4242</p>
                    </div>
                </div>
                <Button variant="ghost">Manage</Button>
            </div>
        </SettingsCard>
        <SettingsCard 
            title="Subscription Tiers" 
            subtitle="Create and manage different subscription levels for your fans."
            footerContent={<Button leftIcon={PlusCircle}>Add New Tier</Button>}
        >
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {creator.creatorData.subscriptionTiers.map((tier: SubscriptionTier) => (
                    <li key={tier.id} className="py-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-gray-200">{tier.name} - ${tier.price}/month</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{tier.features.join(' · ')}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" className="p-2 h-auto"><Edit className="w-4 h-4 text-gray-500" /></Button>
                                <Button variant="ghost" size="sm" className="p-2 h-auto"><Trash2 className="w-4 h-4 text-gray-500" /></Button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </SettingsCard>
    </div>
);

const HelpPanel = () => (
    <SettingsCard title="Contact Support" subtitle="Have an issue or a question? Let us know.">
        <Input id="subject" label="Subject" placeholder="e.g., Payout Issue" />
        <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">How can we help?</label>
            <textarea id="description" rows={6} placeholder="Please describe your issue in detail..." className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
        </div>
    </SettingsCard>
);


// --- Main Settings Page Component ---
interface CreatorSettingsPageProps {
    creator: Creator;
}

const CreatorSettingsPage = ({ creator }: CreatorSettingsPageProps) => {
    const [activeTab, setActiveTab] = useState('Account');

    const menuItems = [
        { key: 'Account', label: 'Account', icon: UserIcon },
        { key: 'Welcome Message', label: 'Welcome Message', icon: MessageCircle },
        { key: 'Payments', label: 'Payments', icon: CreditCard },
        { key: 'Help', label: 'Help', icon: HelpCircle },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'Account': return <AccountSettingsPanel creator={creator} />;
            case 'Welcome Message': return <WelcomeMessagePanel creator={creator} />;
            case 'Payments': return <PaymentsSettingsPanel creator={creator} />;
            case 'Help': return <HelpPanel />;
            default: return <div className="text-center p-8 bg-white dark:bg-gray-800/50 rounded-xl">This section is under construction.</div>;
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your profile, payments, and account settings.</p>
            </header>
            <div className="flex flex-col md:flex-row gap-8">
                <aside className="md:w-1/4 lg:w-1/5">
                    <nav className="space-y-1">
                        {menuItems.map(item => (
                            <button
                                key={item.key}
                                onClick={() => setActiveTab(item.key)}
                                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === item.key ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                                <item.icon className="w-5 h-5" />
                                <span>{item.label}</span>
                            </button>
                        ))}
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
