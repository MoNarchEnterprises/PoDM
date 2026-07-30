import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as apiClient from '../../lib/apiClient';
import { CheckCircle, MoreVertical, Twitter, Instagram } from 'lucide-react';

// --- Import Shared Types ---
import { Creator, SubscriptionTier } from '@common/types/Creator';
import { Content } from '@common/types/Content';

// --- Import Reusable Components ---
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import Container from '../../components/layout/Container';
import TierCard from '../../components/shared/TierCard';
import PostCard from '../../components/shared/ContentCard';
import Button from '../../components/ui/Button';
import { useModal } from '../../hooks/useModal';
import AuthModal from '../auth/AuthModal'; // Import AuthModal here

// Import BOTH subscription modals
import SubscriptionModal from './SubscriptionModal';
import SubscriptionAuthModal from './SubscriptionAuthModal';
import { getContentLockState } from '../../components/shared/ContentLockManager';

// --- Main Profile Page Component (Not exported directly) ---
interface CreatorProfilePageProps {
    creator: Creator;
    content: Content[];
    isSubscribed: boolean;
}

const CreatorProfilePage = ({ creator, content, isSubscribed }: CreatorProfilePageProps) => {
    const { user } = useAuth();

    // State for the two different modals
    const { isOpen: isSubModalOpen, openModal: openSubModal, closeModal: closeSubModal } = useModal();
    const { isOpen: isSubAuthModalOpen, openModal: openSubAuthModal, closeModal: closeSubAuthModal } = useModal();

    // State for the general AuthModal (Login/Signup from Header)
    const { isOpen: isAuthModalOpen, openModal: openAuthModal, closeModal: closeAuthModal } = useModal();
    const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

    const handleLoginClick = () => {
        setAuthModalMode('login');
        openAuthModal();
    };

    const handleSignUpClick = () => {
        setAuthModalMode('signup');
        openAuthModal();
    };

    // Safe extraction of subscription tiers array
    const tiers: SubscriptionTier[] = creator?.creator_data?.subscriptionTiers || (creator as any)?.creatorData?.subscriptionTiers || [];

    // State for UI selection and loading
    const [selectedTierId, setSelectedTierId] = useState(tiers[0]?.id || '');
    const [isPreparing, setIsPreparing] = useState(false);

    // This state will hold the FRESH tier data right before opening a modal
    const [tierForModal, setTierForModal] = useState<SubscriptionTier | null>(null);

    // Derived state for UI display (this can be stale, which is fine for display purposes)
    const selectedTierForDisplay = tiers.find(t => t.id === selectedTierId);
    const isAlreadySubscribed = isSubscribed;

    /**
     * A dedicated function to start the subscription process for a LOGGED-IN user.
     * It fetches fresh data to ensure the tier and price are correct before showing the payment form.
     */
    const initiateSubscriptionForUser = async (tierId: string) => {
        if (!tierId) return;

        setIsPreparing(true);
        try {
            const response = await apiClient.getPublicCreatorProfile(creator.username);
            const freshCreator = response.data?.creator;
            const freshTiers = freshCreator?.creator_data?.subscriptionTiers || (freshCreator as any)?.creatorData?.subscriptionTiers || [];
            const freshTier = freshTiers.find((t: SubscriptionTier) => t.id === tierId);

            if (!freshTier) {
                throw new Error("This tier is not available. Please refresh the page and try again.");
            }

            setTierForModal(freshTier);
            openSubModal(); // Open the simple payment modal
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsPreparing(false);
        }
    };

    /**
     * The main click handler for the "Subscribe" button. It decides which flow to start
     * based on whether the user is logged in or not.
     */
    const handleSubscribeClick = () => {
        if (!selectedTierId) {
            alert("Please select a tier.");
            return;
        }

        if (user) {
            // If user is already logged in, start the payment flow directly.
            initiateSubscriptionForUser(selectedTierId);
        } else {
            // If user is a guest, find the tier from the current (possibly stale) data
            // to pass to the auth modal. The auth modal will handle fetching fresh data if needed.
            const tier = tiers.find(t => t.id === selectedTierId);
            if (tier) {
                setTierForModal(tier);
                openSubAuthModal();
            }
        }
    };

    /**
     * A callback function passed to SubscriptionAuthModal.
     * It's triggered after an existing fan successfully logs in.
     */
    const handleLoginSuccess = () => {
        closeSubAuthModal(); // Close the auth modal
        // Immediately start the subscription process for the now logged-in user,
        // using the tierId that was already selected in the UI.
        initiateSubscriptionForUser(selectedTierId);
    };

    /**
     * Handles the final payment confirmation for a logged-in user via SubscriptionModal.
     */
    const handleSubscriptionConfirm = async ({ creatorId, tierId, paymentMethodId }: { creatorId: string, tierId: string, paymentMethodId: string }) => {
        try {
            await apiClient.createSubscription(creatorId, tierId, paymentMethodId);
            alert(`Successfully subscribed to ${creator.profile.name}!`);
            window.location.reload(); // Refresh the page to show the new subscribed state
        } catch (err: any) {
            console.error("Subscription failed:", err);
            throw new Error(err.response?.data?.message || err.message || "Subscription failed.");
        }
    };

    const gridColsMap: { [key: number]: string } = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' };
    const numTiers = tiers.length || 1;
    const gridColsClass = gridColsMap[numTiers] || 'md:grid-cols-3';

    return (
        <>
            {/* General Auth Modal (Login/Signup) */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={closeAuthModal}
                initialMode={authModalMode}
            />

            {/* Modal for LOGGED-IN users, uses the simple payment flow */}
            {tierForModal && (
                <SubscriptionModal
                    isOpen={isSubModalOpen}
                    onClose={closeSubModal}
                    creator={creator}
                    selectedTier={tierForModal}
                    onSubscriptionComplete={handleSubscriptionConfirm}
                />
            )}

            {/* Modal for GUESTS, uses the combined signup/login/payment flow */}
            {tierForModal && (
                <SubscriptionAuthModal
                    isOpen={isSubAuthModalOpen}
                    onClose={closeSubAuthModal}
                    creator={creator}
                    selectedTier={tierForModal}
                    onLoginSuccess={handleLoginSuccess}
                />
            )}

            <div className="bg-gray-50 dark:bg-gray-900 font-sans">
                {/* Header with Login/Signup handlers wired up */}
                <Header
                    user={user}
                    onLoginClick={handleLoginClick}
                    onSignUpClick={handleSignUpClick}
                />

                <main className="py-8">
                    <Container>
                        <div className="relative bg-white dark:bg-gray-800/50 p-6 rounded-2xl shadow-md">
                            <div className="h-48 md:h-64 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden">
                                <img
                                    src={creator.profile.coverImageUrl || 'https://placehold.co/1200x400/1F2937/FFFFFF?text=No+Banner'}
                                    alt={`${creator.profile.name}'s banner`}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 sm:-mt-12 px-4">
                                <img
                                    src={creator.profile.avatar}
                                    alt={creator.profile.name}
                                    className="w-32 h-32 rounded-full border-4 border-gray-50 dark:border-gray-900 object-cover"
                                />
                                <div className="sm:ml-6 mt-4 sm:mt-0 text-center sm:text-left flex-grow">
                                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center justify-center sm:justify-start">
                                        {creator.profile.name}
                                        {creator.verification_status === 'verified' && <CheckCircle className="w-6 h-6 ml-2 text-blue-500" />}
                                    </h1>
                                    <p className="text-gray-500 dark:text-gray-400">@{creator.username}</p>
                                </div>
                                <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                                    {/* Placeholder for future social link buttons */}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 bg-white dark:bg-gray-800/50 p-6 rounded-2xl shadow-md">
                            <h2 className="text-xl font-bold mb-2">About</h2>
                            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                {creator.profile.bio}
                            </p>
                        </div>

                        {!isAlreadySubscribed && (
                            <div className="mt-8">
                                <h2 className="text-xl font-bold mb-4 text-center">Choose Your Subscription</h2>
                                <div className={`grid grid-cols-1 ${gridColsClass} gap-6`}>
                                    {tiers.map(tier => (
                                        <TierCard key={tier.id} tier={tier} onSelect={setSelectedTierId} isSelected={selectedTierId === tier.id} />
                                    ))}
                                </div>
                                <div className="mt-6 text-center">
                                    <Button
                                        size="lg"
                                        className="w-full md:w-auto md:px-12 bg-pink-500 hover:bg-pink-600"
                                        onClick={handleSubscribeClick}
                                        isLoading={isPreparing}
                                        disabled={!selectedTierForDisplay || isPreparing}
                                    >
                                        {isPreparing ? 'Preparing...' : `Subscribe for $${Number(selectedTierForDisplay?.price).toFixed(2)}/month`}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {isAlreadySubscribed && (
                            <div className="mt-8 text-center bg-purple-500/10 dark:bg-purple-900/50 p-6 rounded-xl">
                                <p className="font-semibold text-lg text-purple-600 dark:text-purple-300">
                                    You are subscribed!
                                </p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Thank you for supporting {creator.profile.name}.
                                </p>
                            </div>
                        )}

                        <div className="mt-12">
                            <h2 className="text-2xl font-bold mb-6">Content</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {content.map(post => {
                                    const lockState = getContentLockState(
                                        post,
                                        creator,
                                        { isSubscribed: isAlreadySubscribed, tierLevel: undefined }
                                    );
                                    const postWithCreator = {
                                        ...post,
                                        isUnlocked: lockState.isUnlocked,
                                        isSubscribedToCreator: isAlreadySubscribed,
                                        isLockedByTier: lockState.lockType === 'tier',
                                        creator: {
                                            _id: creator.id,
                                            username: creator.username,
                                            verified: creator.verification_status === 'verified',
                                            profile: {
                                                name: creator.profile.name,
                                                avatar: creator.profile.avatar,
                                            },
                                        }
                                    };
                                    return (
                                        <PostCard
                                            key={post.id}
                                            post={postWithCreator as any}
                                            lockState={lockState}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </Container>
                </main>

                <Footer />
            </div>
        </>
    );
};

// --- Data Loader Component (This is the default export) ---
const CreatorProfileLoader = () => {
    const { username } = useParams<{ username: string }>();
    const [profileData, setProfileData] = useState<{ creator: Creator; content: Content[]; isSubscribed: boolean } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user: viewer } = useAuth();

    useEffect(() => {
        if (!username) return;
        const fetchProfile = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await apiClient.getPublicCreatorProfile(username);
                setProfileData(response.data);

                // --- THIS IS THE FIX ---
                // After successfully fetching the profile, log the visit event.
                // The backend will handle not logging self-views or admin views.
                if (response.data.creator) {
                    apiClient.logAnalyticsEvent({
                        eventType: 'profile_visit',
                        creatorId: response.data.creator.id,
                    });
                }
                // --- END OF FIX ---

            } catch (err) {
                setError("Creator not found or there was an error loading their profile.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [username]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading Profile...</div>;
    }

    if (error || !profileData) {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">{error || "Profile could not be loaded."}</div>;
    }

    return <CreatorProfilePage creator={profileData.creator} content={profileData.content} isSubscribed={profileData.isSubscribed} />;
};

export default CreatorProfileLoader;