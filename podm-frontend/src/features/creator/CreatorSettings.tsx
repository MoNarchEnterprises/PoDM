import React, { useState, useRef, useEffect } from 'react';
import {
    User as UserIcon, CheckCircle, AlertCircle, MessageCircle, CreditCard,
    HelpCircle, Save, Camera, Edit, Trash2, PlusCircle, Twitter, Instagram,
    Globe, Link,
    X,
    Send
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

// --- Import Shared Types ---
import { Creator, SubscriptionTier, SocialLinks, CreatorData } from '@common/types/Creator';
import { User, UserProfile, UserStatus } from '@common/types/User';
import { TransactionType } from '@common/types/Transaction';
import { Content } from '@common/types/Content';


// --- Import Reusable Components & API Client ---
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import * as apiClient from '../../lib/apiClient';
import Modal from '../../components/ui/Modal';
import { useModal } from '../../hooks/useModal';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import { formatDate } from '../../lib/formatters';
import { useAdminData } from '../admin/AdminPanel';

// --- Local Types ---
interface AdminUser extends User { }

// --- Reusable Sub-Components ---
const SettingsCard = ({ title, subtitle, children, footerContent }: { title: string; subtitle?: string; children: React.ReactNode; footerContent?: React.ReactNode; }) => (
    <Card noPadding>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
        <div className="p-6 space-y-4">{children}</div>
        {footerContent && (<footer className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center gap-4">{footerContent}</footer>)}
    </Card>
);

const ToggleSwitch = ({ label, description, enabled, setEnabled }: { label: string; description?: string; enabled: boolean; setEnabled: (enabled: boolean) => void; }) => (
    <div className="flex items-center justify-between py-2">
        <div><p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>{description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}</div>
        <button onClick={() => setEnabled(!enabled)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'}`}>
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);

// --- NEW COMPONENT: Modal for selecting welcome message content ---
const WelcomeContentModal = ({ isOpen, onClose, contentItems, onSelect }: { isOpen: boolean; onClose: () => void; contentItems: Content[]; onSelect: (content: Content) => void; }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl">
            <div className="flex flex-col max-h-[90vh]">
                <header className="p-6 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Select Content to Attach</h2>
                </header>
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {contentItems.map(item => (
                            <div
                                key={item._id}
                                onClick={() => { onSelect(item); onClose(); }}
                                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                            >
                                <img src={(item.files[0] as any).thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                    <p className="text-xs text-white font-bold truncate">{item.title}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </Modal>
    );
};


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
        <SettingsCard title="Profile Information" subtitle="Update your public profile details.">
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
            <input
                type="file"
                ref={bannerInputRef}
                onChange={(e) => handleFileSelect(e, onBannerChange)}
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
            />

            <div className="flex items-center space-x-4 pt-4">
                <div className="relative flex-shrink-0">
                    <img src={profile.avatar} alt="Avatar" className="w-20 h-16 rounded-full object-cover" />
                    <button onClick={() => avatarInputRef.current?.click()} className="absolute bottom-0 right-0 p-1.5 h-auto rounded-full bg-purple-600 text-white hover:bg-purple-700"><Camera className="w-4 h-4" /></button>
                </div>
                <Input id="name" label="Display Name" value={profile.name} onChange={(e) => onProfileChange('name', e.target.value)} containerClassName="flex-grow" />
            </div>
            <input
                type="file"
                ref={avatarInputRef}
                onChange={(e) => handleFileSelect(e, onAvatarChange)}
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
            />

            <Input id="username" label="Username" value={profile.username} readOnly disabled />
            <div>
                <label htmlFor="bio" className="block text-sm font-medium mb-1">Bio</label>
                <textarea id="bio" rows={4} value={profile.bio || ''} onChange={(e) => onProfileChange('bio', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
            </div>

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

const WelcomeMessagePanel = ({ welcomeMessage, onMessageChange, onSelectContentClick, attachedContent }: {
    welcomeMessage: any;
    onMessageChange: (field: string, value: any) => void;
    onSelectContentClick: () => void;
    attachedContent?: Content | null;
}) => (
    <SettingsCard title="Welcome Message" subtitle="Automatically send a message to new subscribers.">
        <ToggleSwitch label="Enable Welcome Message" enabled={welcomeMessage.isActive} setEnabled={(val) => onMessageChange('isActive', val)} />
        <div>
            <label htmlFor="welcome-message" className="block text-sm font-medium mb-1">Message</label>
            <textarea id="welcome-message" rows={5} value={welcomeMessage.message} onChange={(e) => onMessageChange('message', e.target.value)}
                className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
        </div>
        <div>
            <label className="block text-sm font-medium mb-2">Attach Free Content (Optional)</label>
            {attachedContent ? (
                <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                        <img src={(attachedContent.files[0] as any).thumbnailUrl} alt={attachedContent.title} className="w-10 h-10 rounded-md object-cover" />
                        <span className="text-sm font-medium">{attachedContent.title}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => onMessageChange('freeContentId', null)}>
                        Remove
                    </Button>
                </div>
            ) : (
                <Button variant="secondary" onClick={onSelectContentClick}>
                    Select Content from Vault
                </Button>
            )}
        </div>
    </SettingsCard>
);

const PaymentsSettingsPanel = ({
    creator,
    tiers,
    onAddTier,
    onTierChange,
    onDeleteTier,
    onAddTierFeature,
    onTierFeatureChange,
    onDeleteTierFeature
}: {
    creator: Creator;
    tiers: SubscriptionTier[];
    onAddTier: () => void;
    onTierChange: (tierId: string, field: 'name' | 'price' | 'level', value: string | number) => void;
    onDeleteTier: (tierId: string) => void;
    onAddTierFeature: (tierId: string) => void;
    onTierFeatureChange: (tierId: string, featureIndex: number, value: string) => void;
    onDeleteTierFeature: (tierId: string, featureIndex: number) => void;
}) => {
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnectStripe = async () => {
        setIsConnecting(true);
        try {
            const response = await apiClient.createStripeOnboardingLink();
            window.location.href = response.data.url; // Redirect the user to Stripe
        } catch (error: any) {
            alert(`Could not connect to Stripe: ${error.response?.data?.message || 'Please try again.'}`);
            console.error(error);
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <SettingsCard
            title="Subscription Tiers & Payouts"
            subtitle="Manage your subscription options and connect your Stripe account for payouts."
        >
            {/* --- STRIPE CONNECTION STATUS --- */}
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg mb-6">
                <h4 className="text-md font-semibold mb-2 text-gray-900 dark:text-white">Payout Settings</h4>
                {creator.stripe_account_id ? (
                    <div className="text-center py-4">
                        <CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-2" />
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Stripe Account Connected!</p>
                    </div>
                ) : (
                    <Button
                        onClick={handleConnectStripe}
                        isLoading={isConnecting}
                        leftIcon={Link}
                        className="w-full"
                    >
                        Connect with Stripe
                    </Button>
                )}
            </div>

            {/* --- SUBSCRIPTION TIERS --- */}
            <div className="space-y-4">
                {tiers.length > 0 ? (
                    tiers.map((tier) => (
                        <div key={tier.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                                <Input
                                    id={`tier-name-${tier.id}`}
                                    label="Tier Name"
                                    value={tier.name}
                                    onChange={(e) => onTierChange(tier.id, 'name', e.target.value)}
                                    containerClassName="md:col-span-2"
                                />
                                <Input
                                    id={`tier-level-${tier.id}`}
                                    label="Level (1-10)"
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={tier.level || 1} // Handle legacy tiers without level
                                    onChange={(e) => onTierChange(tier.id, 'level', parseInt(e.target.value))}
                                    containerClassName="md:col-span-1"
                                />
                                <Input
                                    id={`tier-price-${tier.id}`}
                                    label="Price ($/month)"
                                    type="number"
                                    value={tier.price}
                                    onChange={(e) => onTierChange(tier.id, 'price', e.target.value)}
                                    containerClassName="md:col-span-2"
                                />
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
                                                className="p-2 h-auto text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50"
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
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p className="font-semibold">No subscription tiers yet.</p>
                        <p>Click "Add New Tier" below to set up your subscription options.</p>
                    </div>
                )}
            </div>
        </SettingsCard>
    );
};

const HelpPanel = () => (
    <SettingsCard title="Contact Support" subtitle="Have an issue or a question? Let us know." footerContent={
        <Button leftIcon={Send}>Submit Ticket</Button>
    }>
        <Input id="subject" label="Subject" placeholder="e.g., Payout Issue" />
        <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">How can we help?</label>
            <textarea id="description" rows={6} placeholder="Please describe your issue in detail..." className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
        </div>
    </SettingsCard>
);

// --- Main Settings Page Component ---
interface CreatorSettingsPageProps {
    creator: Creator;
}

const CreatorSettingsPage = ({ creator }: CreatorSettingsPageProps) => {
    const { setUser } = useAuth();


    const [activeTab, setActiveTab] = useState('Account');
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [settingsData, setSettingsData] = useState<Creator>(creator);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(creator.profile.coverImageUrl || null);

    // --- STATE FOR WELCOME MESSAGE CONTENT ---
    const [attachableContent, setAttachableContent] = useState<Content[]>([]);
    const [attachedContentDetails, setAttachedContentDetails] = useState<Content | null>(null);
    const { isOpen: isWelcomeModalOpen, openModal: openWelcomeModal, closeModal: closeWelcomeModal } = useModal();


    // Effect to keep local state in sync if the global user object changes
    useEffect(() => {
        setSettingsData(creator);
        setBannerPreview(creator.profile.coverImageUrl || null);
    }, [creator]);

    // --- THIS IS THE FIX ---
    // This effect fetches content and processes it to include secure, viewable thumbnail URLs.
    useEffect(() => {
        const fetchAndProcessContent = async () => {
            try {
                // 1. Fetch the raw content list with private storage paths
                const response = await apiClient.getMyCreatorContent({ type: 'All' });
                const validContent = response.data.filter((c: Content) => c.status === 'published' || c.visibility === 'unlisted');

                // 2. Process each item to get a signed URL for its thumbnail
                const contentWithSignedUrls = await Promise.all(
                    validContent.map(async (contentItem: Content) => {
                        try {
                            const urlResponse = await apiClient.getSecureContentUrl(contentItem._id);
                            // Create a deep copy to safely modify the nested files array
                            const newItem = JSON.parse(JSON.stringify(contentItem));
                            if (newItem.files && newItem.files.length > 0) {
                                // Replace the private path with the temporary public URL
                                newItem.files[0].thumbnailUrl = urlResponse.data.secureUrl;
                            }
                            return newItem;
                        } catch (urlError) {
                            console.error(`Failed to get signed URL for content ${contentItem._id}`, urlError);
                            // On failure, return the original item to prevent crashes
                            return contentItem;
                        }
                    })
                );

                // 3. Set the state with the fully processed, viewable content list
                setAttachableContent(contentWithSignedUrls);

            } catch (error) {
                console.error("Failed to fetch content for welcome message modal:", error);
            }
        };
        fetchAndProcessContent();
    }, []);
    // --- END OF FIX ---

    // Effect to find and set the details of the currently attached content
    useEffect(() => {
        const contentId = settingsData.creatorData?.welcomeMessage?.freeContentId;
        if (contentId) {
            const details = attachableContent.find(c => c._id === contentId);
            setAttachedContentDetails(details || null);
        } else {
            setAttachedContentDetails(null);
        }
    }, [settingsData.creatorData?.welcomeMessage?.freeContentId, attachableContent]);

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
            stripePriceId: undefined, // New tiers won't have a Stripe price ID yet
            level: 1, // Default level
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

    const handleTierChange = (tierId: string, field: 'name' | 'price' | 'level', value: string | number) => {
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
        setIsSaving(true);
        setFeedback(null);

        try {

            const payload = {
                profile: {
                    name: settingsData.profile.name,
                    bio: settingsData.profile.bio,
                    socialLinks: settingsData.profile.socialLinks,
                },
                creatorData: settingsData.creatorData ||
                {
                    subscriptionTiers: [],
                    welcomeMessage: {},
                    payoutSettings: {},
                    contentSettings: {}
                }
            };


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

    const menuItems = [
        { key: 'Account', label: 'Account', icon: UserIcon },
        { key: 'Welcome Message', label: 'Welcome Message', icon: MessageCircle },
        { key: 'Payments', label: 'Payments', icon: CreditCard },
        { key: 'Help', label: 'Help', icon: HelpCircle },
    ];

    const renderContent = () => {
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
            case 'Welcome Message':
                return <WelcomeMessagePanel
                    welcomeMessage={settingsData.creatorData?.welcomeMessage || {}}
                    onMessageChange={handleWelcomeMessageChange}
                    onSelectContentClick={openWelcomeModal}
                    attachedContent={attachedContentDetails}
                />;
            case 'Payments':
                return <PaymentsSettingsPanel
                    creator={settingsData} // Pass the creator object
                    tiers={settingsData.creatorData?.subscriptionTiers || []}
                    onAddTier={handleAddTier}
                    onTierChange={handleTierChange}
                    onDeleteTier={handleDeleteTier}
                    onAddTierFeature={handleAddTierFeature}
                    onTierFeatureChange={handleTierFeatureChange}
                    onDeleteTierFeature={handleDeleteTierFeature}
                />;
            case 'Help':
                return <HelpPanel />;
            default:
                return <div className="text-center p-8 bg-white dark:bg-gray-800/50 rounded-xl">
                    <p>This section is under construction.</p>
                </div>;
        }
    };

    return (
        <>
            <WelcomeContentModal
                isOpen={isWelcomeModalOpen}
                onClose={closeWelcomeModal}
                contentItems={attachableContent}
                onSelect={(content) => handleWelcomeMessageChange('freeContentId', content._id)}
            />
            <div className="p-4 sm:p-6 lg:p-8">
                <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your profile, tiers, and payout information.</p>
                    </div>
                    <div className="flex items-center gap-4 mt-4 sm:mt-0">
                        {feedback && (
                            <div className={`flex items-center gap-2 text-sm ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {feedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                {feedback.message}
                            </div>
                        )}
                        <Button onClick={handleSaveChanges} isLoading={isSaving} leftIcon={Save}>
                            Save All Changes
                        </Button>
                    </div>
                </header>
                <div className="flex flex-col md:flex-row gap-8">
                    <aside className="md:w-1/4 lg:w-1/5">
                        <nav className="space-y-1">
                            {menuItems.map(item => (
                                <button
                                    key={item.key}
                                    onClick={() => setActiveTab(item.key)}
                                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === item.key
                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`
                                    }
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

export default CreatorSettingsPage;