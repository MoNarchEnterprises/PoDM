import React, { useState, useEffect } from 'react';
import { Home, ImageIcon, Briefcase, Settings, MessageSquare, User as UserIcon, Bell, Shield, CreditCard, EyeOff, HelpCircle, Save, Camera, X, Smartphone } from 'lucide-react';

// --- Import Shared Types ---
import { User as FanUser } from '../../../common/types/User';

// --- Import Reusable Components ---
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useModal } from '../../hooks/useModal';

// --- Local Types ---
interface FanSettings {
    notifications: {
        newContent: boolean;
        creatorLive: boolean;
        emailPromotions: boolean;
    };
    privacy: {
        showInSearch: boolean;
        showSubscriptions: boolean;
    };
    paymentMethod: {
        brand: string;
        last4: string;
    };
}

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

const ToggleSwitch = ({ label, description, enabled, setEnabled }: { label: string; description?: string; enabled: boolean; setEnabled: (enabled: boolean) => void; }) => (
    <div className="flex items-center justify-between">
        <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
            {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
        <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'}`}
        >
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);

const UpdatePaymentModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <header className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold">Update Payment Method</h2>
            </header>
            <main className="p-6 space-y-4">
                <Input id="card-number" label="Card Number" placeholder="•••• •••• •••• 4242" />
                <div className="grid grid-cols-2 gap-4">
                    <Input id="expiry" label="Expiry Date" placeholder="MM / YY" />
                    <Input id="cvc" label="CVC" placeholder="•••" />
                </div>
            </main>
            <footer className="p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <Button onClick={onClose}>Save Card</Button>
            </footer>
        </Modal>
    );
};


// --- Settings Panels ---

const AccountSettingsPanel = ({ fan }: { fan: FanUser }) => (
    <SettingsCard title="Profile Information" subtitle="Update your account details.">
        <div className="flex items-center space-x-4">
            <div className="relative">
                <img src={fan.profile.avatar} alt="Avatar" className="w-20 h-20 rounded-full" />
                <Button variant="primary" size="sm" className="absolute bottom-0 right-0 p-1.5 h-auto rounded-full"><Camera className="w-4 h-4" /></Button>
            </div>
            <Input id="name" label="Name" defaultValue={fan.profile.name} containerClassName="flex-grow" />
        </div>
        <Input id="username" label="Username" defaultValue={fan.username} />
        <Input id="email" label="Email Address" type="email" defaultValue={fan.email} />
    </SettingsCard>
);

const NotificationSettingsPanel = ({ settings }: { settings: FanSettings['notifications'] }) => {
    const [notifications, setNotifications] = useState(settings);
    return (
         <SettingsCard title="Notifications" subtitle="Choose how you want to be notified.">
            <p className="text-sm font-semibold">Creator Updates</p>
            <ToggleSwitch label="New Content" description="Get notified when a creator you follow posts new content." enabled={notifications.newContent} setEnabled={(val) => setNotifications(p => ({...p, newContent: val}))} />
            <ToggleSwitch label="Creator Goes Live" description="Get an alert when a creator starts a live stream." enabled={notifications.creatorLive} setEnabled={(val) => setNotifications(p => ({...p, creatorLive: val}))} />
            <hr className="border-gray-200 dark:border-gray-600"/>
            <p className="text-sm font-semibold">Email Notifications</p>
            <ToggleSwitch label="Promotional Emails" description="Receive emails about new creators and platform updates." enabled={notifications.emailPromotions} setEnabled={(val) => setNotifications(p => ({...p, emailPromotions: val}))} />
         </SettingsCard>
    );
};

const PrivacySettingsPanel = ({ settings }: { settings: FanSettings['privacy'] }) => {
    const [privacy, setPrivacy] = useState(settings);
    return (
        <SettingsCard title="Privacy" subtitle="Control how your profile appears to others.">
            <ToggleSwitch label="Show in Search" description="Allow other users to find your profile via search." enabled={privacy.showInSearch} setEnabled={(val) => setPrivacy(p => ({...p, showInSearch: val}))} />
            <ToggleSwitch label="Show Subscriptions" description="Allow others to see which creators you are subscribed to." enabled={privacy.showSubscriptions} setEnabled={(val) => setPrivacy(p => ({...p, showSubscriptions: val}))} />
        </SettingsCard>
    );
};

const PaymentsSettingsPanel = ({ settings, onUpdateClick }: { settings: FanSettings['paymentMethod'], onUpdateClick: () => void }) => (
    <SettingsCard title="Payment Methods" subtitle="Manage your saved payment information." noFooter>
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center space-x-4">
                <CreditCard className="w-8 h-8 text-blue-500" />
                <div>
                    <p className="font-semibold">{settings.brand} ending in {settings.last4}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Your default payment method</p>
                </div>
            </div>
            <Button variant="ghost" onClick={onUpdateClick}>Update</Button>
        </div>
    </SettingsCard>
);

const SecuritySettingsPanel = () => {
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    return (
        <div className="space-y-6">
            <SettingsCard title="Change Password">
                <Input id="current-password" type="password" label="Current Password" />
                <Input id="new-password" type="password" label="New Password" />
                <Input id="confirm-password" type="password" label="Confirm New Password" />
            </SettingsCard>
            <SettingsCard title="Two-Factor Authentication (2FA)" noFooter>
                <div className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <Smartphone className="w-8 h-8 text-purple-500 mt-1" />
                    <div>
                        <h4 className="font-semibold">Authenticator App</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Add an extra layer of security to your account.</p>
                        <ToggleSwitch label="Enable 2FA" enabled={twoFactorEnabled} setEnabled={setTwoFactorEnabled} />
                    </div>
                </div>
            </SettingsCard>
        </div>
    );
};

const HelpPanel = () => (
    <SettingsCard title="Contact Support" subtitle="Have an issue or a question? Let us know.">
        <Input id="subject" label="Subject" placeholder="e.g., Billing Question" />
        <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">How can we help?</label>
            <textarea id="description" rows={6} placeholder="Please describe your issue in detail..." className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
        </div>
    </SettingsCard>
);

// --- Main Settings Page Component ---
interface FanSettingsPageProps {
    fan: FanUser;
    settings: FanSettings;
}

const FanSettingsPage = ({ fan, settings }: FanSettingsPageProps) => {
    const [activeTab, setActiveTab] = useState('Account');
    const { isOpen: isPaymentModalOpen, openModal: openPaymentModal, closeModal: closePaymentModal } = useModal();

    const menuItems = [
        { key: 'Account', label: 'Account', icon: UserIcon },
        { key: 'Notifications', label: 'Notifications', icon: Bell },
        { key: 'Privacy', label: 'Privacy', icon: EyeOff },
        { key: 'Payments', label: 'Payments', icon: CreditCard },
        { key: 'Security', label: 'Security', icon: Shield },
        { key: 'Help', label: 'Help', icon: HelpCircle },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'Account': return <AccountSettingsPanel fan={fan} />;
            case 'Notifications': return <NotificationSettingsPanel settings={settings.notifications} />;
            case 'Privacy': return <PrivacySettingsPanel settings={settings.privacy} />;
            case 'Payments': return <PaymentsSettingsPanel settings={settings.paymentMethod} onUpdateClick={openPaymentModal} />;
            case 'Security': return <SecuritySettingsPanel />;
            case 'Help': return <HelpPanel />;
            default: return <div className="text-center p-8 bg-white dark:bg-gray-800/50 rounded-xl">This section is under construction.</div>;
        }
    };

    return (
        <>
            <UpdatePaymentModal isOpen={isPaymentModalOpen} onClose={closePaymentModal} />
            <div className="p-4 sm:p-6 lg:p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your profile and account preferences.</p>
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
        </>
    );
};

export default FanSettingsPage;
