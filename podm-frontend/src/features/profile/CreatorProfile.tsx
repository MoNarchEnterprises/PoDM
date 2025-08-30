import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth'; // 1. Import useAuth
import * as apiClient from '../../lib/apiClient'; // 2. Import apiClient
import { CheckCircle, Twitter, Instagram } from 'lucide-react';

// --- Import Shared Types ---
import { Creator } from '@common/types/Creator';
import { Content } from '@common/types/Content';

// --- Import Reusable Components ---
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import Container from '../../components/layout/Container';
import TierCard from '../../components/shared/TierCard';
import PostCard from '../../components/shared/ContentCard'; // Assuming ContentCard is renamed to PostCard
import Button from '../../components/ui/Button';

import AuthModal from '../auth/AuthModal';
import { useModal } from '../../hooks/useModal';
import SubscriptionModal from './SubscriptionModal';


// --- Main Profile Page Component ---
interface CreatorProfilePageProps {
    creator: Creator;
    content: Content[];
}

const CreatorProfilePage = ({ creator, content }: CreatorProfilePageProps) => {
    const { user } = useAuth();
    const stripe = useStripe(); // We only need the main stripe object here
    
    // --- State for Modals ---
    const { isOpen: isAuthModalOpen, openModal: openAuthModal, closeModal: closeAuthModal } = useModal();
    const { isOpen: isSubModalOpen, openModal: openSubModal, closeModal: closeSubModal } = useModal();
    
    // State for subscription interaction
    const [selectedTierId, setSelectedTierId] = useState(creator.creatorData.subscriptionTiers[0]?.id || '');
    
    const selectedTier = creator.creatorData.subscriptionTiers.find(t => t.id === selectedTierId);
    const isAlreadySubscribed = false; // This would be replaced with a real subscription check

    const handleSubscribeClick = () => {
        if (!user) {
            // If user is not logged in, open the auth modal first
            openAuthModal();
        } else {
            // If user is logged in, open the payment modal
            openSubModal();
        }
    };

    // --- This function now receives data from the SubscriptionModal ---
    const handleSubscriptionConfirm = async ({ creatorId, tierId, paymentMethodId }: { creatorId: string, tierId: string, paymentMethodId: string }) => {
        if (!stripe) {
            throw new Error("Stripe is not initialized.");
        }
        
        try {
            const result = await apiClient.createSubscription(creatorId, tierId, paymentMethodId);
            
            const { requiresAction, clientSecret, subscription } = result.data;

            if (requiresAction && clientSecret) {
                console.log("Payment requires further action. Confirming card payment...");
                const { error: confirmationError } = await stripe.confirmCardPayment(clientSecret);
                if (confirmationError) {
                    throw new Error(confirmationError.message);
                }
                alert(`Subscription to ${creator.profile.name} is processing! You will be notified upon completion.`);
            } else if (subscription) {
                alert(`Successfully subscribed to ${creator.profile.name}!`);
            }
        } catch (err: any) {
            console.error("Subscription failed:", err);
            // Re-throw the error so the modal can display it to the user
            throw new Error(err.response?.data?.message || err.message || "Subscription failed. Please try again.");
        }
    };

    return (
        <>
            <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
            
            {/* --- Render the new SubscriptionModal --- */}
            {selectedTier && (
                 <SubscriptionModal 
                    isOpen={isSubModalOpen}
                    onClose={closeSubModal}
                    creator={creator}
                    selectedTier={selectedTier}
                    onSubscriptionComplete={handleSubscriptionConfirm}
                 />
            )}
           
            <div className="bg-gray-50 dark:bg-gray-900 font-sans">
                {/* ... (Header, main, Container, Profile Header, Bio Section - all remain the same) ... */}

                {/* Tiers Section */}
                {!isAlreadySubscribed && (
                    <div className="mt-8">
                        <h2 className="text-xl font-bold mb-4 text-center">Choose Your Subscription</h2>
                        <div className={`grid grid-cols-1 md:grid-cols-${creator.creatorData.subscriptionTiers.length} gap-6`}>
                            {creator.creatorData.subscriptionTiers.map(tier => (
                                <TierCard key={tier.id} tier={tier} onSelect={setSelectedTierId} isSelected={selectedTierId === tier.id} />
                            ))}
                        </div>
                        <div className="mt-6 text-center">
                            {/* --- This button now just opens the modal --- */}
                            <Button size="lg" className="w-full md:w-auto md:px-12 bg-pink-500 hover:bg-pink-600" onClick={handleSubscribeClick} disabled={!selectedTier}>
                                Subscribe for ${selectedTier?.price.toFixed(2)}/month
                            </Button>
                        </div>
                    </div>
                )}

                {/* ... (Content Grid Section, Footer - all remain the same) ... */}
            </div>
        </>
    );
};

// --- Data Loader Component ---
const CreatorProfileLoader = () => {
    const { username } = useParams<{ username: string }>();
    const [profileData, setProfileData] = useState<{ creator: Creator; content: Content[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!username) return;

        const fetchProfile = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await apiClient.getPublicCreatorProfile(username);
                setProfileData(response.data);
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

    return <CreatorProfilePage creator={profileData.creator} content={profileData.content} />;
};
