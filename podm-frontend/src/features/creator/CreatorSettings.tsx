import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, CheckCircle, AlertCircle, MessageCircle, CreditCard, 
        HelpCircle, Save, Camera, Edit, Trash2, PlusCircle, Twitter, Instagram, 
        Globe, 
        X} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

// --- Import Shared Types ---
import { Creator, SubscriptionTier, SocialLinks } from '@common/types/Creator';

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
    <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <button onClick={() => setEnabled(!enabled)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'}`}>
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);

// --- Settings Panels ---

const AccountSettingsPanel = ({ 
    profile, 
    bannerPreview,
    onProfileChange, 
    onSocialsChange,
    onAvatarChange,
    onBannerChange,
}: { 
    profile: any; 
    bannerPreview: string | null;
    onProfileChange: (field: string, value: string) => void; 
    onSocialsChange: (platform: keyof SocialLinks, value: string) => void;
    onAvatarChange: (file: File) => void;
    onBannerChange: (file: File) => void;
}) => {
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, handler: (file: File) => void) => {
        const file = event.target.files?.[0];
        if (file) handler(file);
    };

    return (
        <SettingsCard title="Profile Information" subtitle="This information will be displayed publicly on your profile.">
            {/* --- THIS IS THE NEW BANNER UPLOAD UI --- */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Banner Image</label>
                <div 
                    className="relative aspect-[16/5] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden group flex items-center justify-center cursor-pointer"
                    onClick={() => bannerInputRef.current?.click()}
                >
                    <img src={bannerPreview || 'https://placehold.co/1200x300/1F2937/FFFFFF?text=Upload+Banner'} alt="Banner Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-center text-white">
                            <Camera className="w-8 h-8 mx-auto" /><p className="text-sm font-semibold mt-1">Change Banner</p>
                        </div>
                    </div>
                </div>
            </div>
            <input type="file" ref={bannerInputRef} onChange={(e) => handleFileSelect(e, onBannerChange)} className="hidden" accept="image/png, image/jpeg, image/webp" />
            
            {/* Avatar and Name */}
            <div className="flex items-center space-x-4 pt-4">
                <div className="relative flex-shrink-0">
                    {/* Use profile.avatar for the avatar preview */}
                    <img src={profile.avatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
                    <button onClick={() => avatarInputRef.current?.click()} className="absolute bottom-0 right-0 p-1.5 h-auto rounded-full bg-purple-600 text-white hover:bg-purple-700"><Camera className="w-4 h-4" /></button>
                </div>
                <Input id="name" label="Display Name" value={profile.name} onChange={(e) => onProfileChange('name', e.target.value)} containerClassName="flex-grow" />
            </div>
            <input type="file" ref={avatarInputRef} onChange={(e) => handleFileSelect(e, onAvatarChange)} className="hidden" accept="image/png, image/jpeg, image/webp" />

            <Input id="username" label="Username" value={profile.username} readOnly disabled />
            <div>
                <label htmlFor="bio" className="block text-sm font-medium mb-1">Bio</label>
                <textarea id="bio" rows={4} value={profile.bio || ''} onChange={(e) => onProfileChange('bio', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            
            {/* --- THIS IS THE NEW SOCIAL LINKS UI --- */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-md font-semibold mb-2">Social Links</h4>
                <div className="space-y-4">
                    <Input id="twitter" placeholder="Your Twitter username (e.g., podmofficial)" leftIcon={Twitter} value={profile.socialLinks?.twitter || ''} onChange={(e) => onSocialsChange('twitter', e.target.value)} />
                    <Input id="instagram" placeholder="Your Instagram username" leftIcon={Instagram} value={profile.socialLinks?.instagram || ''} onChange={(e) => onSocialsChange('instagram', e.target.value)} />
                    <Input id="tiktok" placeholder="Your TikTok username" leftIcon={Globe} value={profile.socialLinks?.tiktok || ''} onChange={(e) => onSocialsChange('tiktok', e.target.value)} />
                </div>
            </div>
        </SettingsCard>
    );
};

const WelcomeMessagePanel = ({ welcomeMessage, onMessageChange }: { welcomeMessage: any; onMessageChange: (field: string, value: any) => void; }) => (
    <SettingsCard title="Welcome Message" subtitle="Automatically send a message to new subscribers.">
        <ToggleSwitch label="Enable Welcome Message" enabled={welcomeMessage.isActive} setEnabled={(val) => onMessageChange('isActive', val)} />
        <div>
            <label htmlFor="welcome-message" className="block text-sm font-medium mb-1">Message</label>
            <textarea id="welcome-message" rows={5} value={welcomeMessage.message} onChange={(e) => onMessageChange('message', e.target.value)} 
            className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
    </SettingsCard>
);

const PaymentsSettingsPanel = ({ 
    tiers,
    onAddTier,
    onTierChange,
    onDeleteTier,
    onAddTierFeature,
    onTierFeatureChange,
    onDeleteTierFeature 
}: { 
    tiers: SubscriptionTier[];
    onAddTier: () => void;
    onTierChange: (tierId: string, field: 'name' | 'price', value: string | number) => void;
    onDeleteTier: (tierId: string) => void;
    onAddTierFeature: (tierId: string) => void;
    onTierFeatureChange: (tierId: string, featureIndex: number, value: string) => void;
    onDeleteTierFeature: (tierId: string, featureIndex: number) => void;
}) => (
    <SettingsCard 
        title="Subscription Tiers" 
        subtitle="Manage different subscription levels for your fans." 
        // Wire the onAddTier function to the button's onClick event
        footerContent={<Button leftIcon={PlusCircle} onClick={onAddTier}>Add New Tier</Button>}
    >
        {tiers.length > 0 ? (
            <div className="space-y-4">
                {tiers.map((tier) => (
                    <div key={tier.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                            {/* Tier Name Input */}
                            <Input 
                                id={`tier-name-${tier.id}`}
                                label="Tier Name"
                                value={tier.name}
                                onChange={(e) => onTierChange(tier.id, 'name', e.target.value)}
                                containerClassName="md:col-span-2"
                            />
                            {/* Tier Price Input */}
                            <Input 
                                id={`tier-price-${tier.id}`}
                                label="Price ($/month)"
                                type="number"
                                value={tier.price}
                                onChange={(e) => onTierChange(tier.id, 'price', parseFloat(e.target.value) || 0)}
                                containerClassName="md:col-span-2"
                            />
                            {/* Delete Button */}
                            <div className="text-right md:pt-6">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="p-2 h-auto text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50"
                                    onClick={() => onDeleteTier(tier.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Features / Perks</label>
                            <div className="space-y-2">
                                {tier.features.map((feature, index) => (
                                    <div key={index} className="flex items-center space-x-2">
                                        <Input 
                                            id={`feature-${tier.id}-${index}`}
                                            value={feature}
                                            onChange={(e) => onTierFeatureChange(tier.id, index, e.target.value)}
                                            placeholder="e.g., Exclusive weekly videos"
                                            containerClassName="flex-grow"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="p-2 h-auto text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50 mt-1"
                                            onClick={() => onDeleteTierFeature(tier.id, index)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => onAddTierFeature(tier.id)}
                                    className="text-purple-600 dark:text-purple-400">
                                    + Add Feature
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center py-8 text-gray-500">
                <p>You don't have any subscription tiers yet.</p>
                <p>Click "Add New Tier" to get started.</p>
            </div>
        )}
    </SettingsCard>
);

const HelpPanel = () => ( <SettingsCard title="Contact Support" subtitle="Have an issue or a question? Let us know." footerContent={<Button>Submit Ticket</Button>}><Input id="subject" label="Subject" placeholder="e.g., Payout Issue" /><div><label htmlFor="description" className="block text-sm font-medium mb-1">How can we help?</label><textarea id="description" rows={6} placeholder="Please describe your issue in detail..." className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500" /></div></SettingsCard> );

// --- Main Settings Page Component ---
interface CreatorSettingsPageProps {
    creator: Creator;
}

const CreatorSettingsPage = ({ creator }: CreatorSettingsPageProps) => {
    const { setUser } = useAuth();

    console.log('[CreatorSettingsPage] Received "creator" prop:', creator);

    const [activeTab, setActiveTab] = useState('Account');
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [settingsData, setSettingsData] = useState<Creator>(creator);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(creator.profile.coverImageUrl || null);
    
    
    
    // Effect to keep local state in sync if the global user object changes
    useEffect(() => {
        setSettingsData(creator);
        setBannerPreview(creator.profile.coverImageUrl || null);
    }, [creator]);

    const handleAddTier = () => {
    // DEBUG: Confirm the function is called
        console.log("Adding a new tier...");

        const newTier: SubscriptionTier = {
            // Use a temporary, client-side ID. The backend can replace this if needed.
            id: `new-${Date.now()}`, 
            name: 'New Tier',
            price: 10, // Default price
            features: ['Full content access'],
            subscriberCount: 0,
        };

        setSettingsData(prev => ({
            ...prev,
            creatorData: {
                ...prev.creatorData,
                // Add the new tier to the existing array
                subscriptionTiers: [...(prev.creatorData.subscriptionTiers || []), newTier],
        }
        }));
    };

    const handleTierChange = (tierId: string, field: 'name' | 'price', value: string | number) => {
        setSettingsData(prev => ({
            ...prev,
            creatorData: {
                ...prev.creatorData,
                subscriptionTiers: (prev.creatorData.subscriptionTiers || []).map(tier => 
                    tier.id === tierId ? { ...tier, [field]: value } : tier
                ),
            }
        }));
    };

    const handleDeleteTier = (tierId: string) => {
        if (window.confirm("Are you sure you want to delete this tier? This cannot be undone.")) {
            setSettingsData(prev => ({
                ...prev,
                creatorData: {
                    ...prev.creatorData,
                    // Filter out the tier with the matching ID
                    subscriptionTiers: (prev.creatorData.subscriptionTiers || []).filter(tier => tier.id !== tierId),
                }
            }));
        }
    };

    const handleAddTierFeature = (tierId: string) => {
        setSettingsData(prev => ({
            ...prev,
            creatorData: {
                ...prev.creatorData,
                subscriptionTiers: (prev.creatorData.subscriptionTiers || []).map(tier => 
                    tier.id === tierId 
                        // Append a new, empty string to the features array for this tier
                        ? { ...tier, features: [...tier.features, ''] } 
                        : tier
                ),
            }
        }));
    };

    const handleTierFeatureChange = (tierId: string, featureIndex: number, value: string) => {
        setSettingsData(prev => ({
            ...prev,
            creatorData: {
                ...prev.creatorData,
                // First, map over the tiers to find the correct one
                subscriptionTiers: (prev.creatorData.subscriptionTiers || []).map(tier => {
                    if (tier.id === tierId) {
                        // Then, map over the features to update the specific one by its index
                        const updatedFeatures = tier.features.map((feature, index) => 
                            index === featureIndex ? value : feature
                        );
                        return { ...tier, features: updatedFeatures };
                    }
                    return tier;
                }),
            }
        }));
    };

    const handleDeleteTierFeature = (tierId: string, featureIndex: number) => {
        setSettingsData(prev => ({
            ...prev,
            creatorData: {
                ...prev.creatorData,
                subscriptionTiers: (prev.creatorData.subscriptionTiers || []).map(tier => {
                    if (tier.id === tierId) {
                        // Filter the features array to remove the one at the specified index
                        const updatedFeatures = tier.features.filter((_, index) => index !== featureIndex);
                        return { ...tier, features: updatedFeatures };
                    }
                    return tier;
                }),
            }
        }));
    };

    const handleAvatarChange = (file: File) => {
        setAvatarFile(file);
        setSettingsData(prev => ({ ...prev, profile: { ...prev.profile, avatar: URL.createObjectURL(file) } }));
    };

    const handleBannerChange = (file: File) => {
        setBannerFile(file);
        // ONLY update the preview state, not the main data state's URL
        setBannerPreview(URL.createObjectURL(file));
    };

    const handleProfileChange = (field: string, value: string) => {
        setSettingsData(prev => ({ ...prev, profile: { ...prev.profile, [field]: value } }));
    };
    const handleSocialsChange = (platform: keyof SocialLinks, value: string) => {
        setSettingsData(prev => ({ ...prev, profile: { ...prev.profile, socialLinks: { ...(prev.profile.socialLinks || {}), [platform]: value } } }));
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
        console.log('[handleSaveChanges] Save clicked. Banner File:', bannerFile, 'Avatar File:', avatarFile);
        setIsSaving(true);
        setFeedback(null);
        
        try {

            const payload = {
                profile: { 
                    name: settingsData.profile.name, 
                    bio: settingsData.profile.bio,
                    socialLinks: settingsData.profile.socialLinks, 
                },
                creatorData: settingsData.creatorData 
            };
            
            console.log('Payload being sent to updateCreatorSettings:', payload);

            const settingsResponse = await apiClient.updateCreatorSettings(payload, bannerFile);
            // Second, update the avatar if a new one was selected.
            if (avatarFile) {
                const avatarRes = await apiClient.uploadAvatar(avatarFile);
                // The final, most up-to-date user object comes from the last operation.
                setUser(avatarRes.data);
            } else {
                // If no new avatar, the settings response is the final state.
                setUser(settingsResponse.data);
            }

            setAvatarFile(null);
            setBannerFile(null);
            setFeedback({ type: 'success', message: 'Settings saved successfully!' });

        } catch (error: any) {
            console.error("Failed to save settings:", error);
            setFeedback({ type: 'error', message: error.response?.data?.message || "An error occurred. Please try again." });
        } finally {
            setIsSaving(false);
            // Automatically clear the feedback message after a few seconds
            setTimeout(() => setFeedback(null), 5000);
        }
    };

    const menuItems = [ { key: 'Account', label: 'Account', icon: UserIcon }, { key: 'Welcome Message', label: 'Welcome Message', icon: MessageCircle }, { key: 'Payments', label: 'Payments', icon: CreditCard }, { key: 'Help', label: 'Help', icon: HelpCircle }, ];

    const renderContent = () => {
        // The props passed from the useAuth hook now have the correct shape, so fallbacks are not needed.
        switch (activeTab) {
            case 'Account': 
                return <AccountSettingsPanel 
                    profile={settingsData.profile}
                    bannerPreview={bannerPreview}
                    onProfileChange={handleProfileChange}
                    onSocialsChange={handleSocialsChange}
                    onAvatarChange={handleAvatarChange}
                    onBannerChange={handleBannerChange}
                />;
            case 'Welcome Message': return <WelcomeMessagePanel welcomeMessage={settingsData.creatorData.welcomeMessage || {}} onMessageChange={handleWelcomeMessageChange} />;
            case 'Payments': 
            return <PaymentsSettingsPanel 
                        tiers={settingsData.creatorData.subscriptionTiers || []} 
                        onAddTier={handleAddTier}
                        onTierChange={handleTierChange}
                        onDeleteTier={handleDeleteTier}
                        onAddTierFeature={handleAddTierFeature}
                        onTierFeatureChange={handleTierFeatureChange}
                        onDeleteTierFeature={handleDeleteTierFeature}
                    />;
            case 'Help': return <HelpPanel />;
            default: return <div>Under construction.</div>;
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Settings</h1>
                    <p className="text-gray-500 mt-1">Manage your profile, payments, and account settings.</p>
                </div>
                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    {feedback && (
                        <div className={`flex items-center gap-2 text-sm ${feedback.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                            {feedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {feedback.message}
                        </div>
                    )}
                    <Button onClick={handleSaveChanges} isLoading={isSaving} leftIcon={Save} 
                        className="mt-4 sm:mt-0">Save All Changes
                    </Button>
                </div>
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