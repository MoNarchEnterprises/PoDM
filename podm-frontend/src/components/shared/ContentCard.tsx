import React, { useState } from 'react';
import { Lock, DollarSign, Bookmark } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import { loadStripe } from '@stripe/stripe-js';

import { AxiosError } from 'axios';

// --- Import Shared Types ---
import { Content } from '@common/types/Content';
import { Creator } from '@common/types/Creator';

// --- Import Reusable UI Components ---
import Button from '../ui/Button';
import * as apiClient from '../../lib/apiClient';
import { useModal } from '../../hooks/useModal';
import TipModal from './TipModal';
import UnlockModal from './UnlockModal'; // Import the UnlockModal

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);


// --- Local Types ---
// This interface represents the shape of the data this component expects.
// Your API would be responsible for joining the creator's info with the content.
export interface ContentWithCreator extends Content {
    creator: Creator;
    isUnlocked?: boolean;
    isSubscribedToCreator?: boolean;
}

// --- Main Post Card Component ---
interface PostCardProps {
    post: ContentWithCreator;
    isLocked?: boolean; // Optional prop to force a locked state, useful for public profiles
}

const PostCard = ({ post, isLocked: forceLocked }: PostCardProps) => {
    const navigate = useNavigate();
    const { isOpen: isTipModalOpen, openModal: openTipModal, closeModal: closeTipModal } = useModal();
    const { isOpen: isUnlockModalOpen, openModal: openUnlockModal, closeModal: closeUnlockModal } = useModal();
    const [isSaving, setIsSaving] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [localIsUnlocked, setLocalIsUnlocked] = useState(post.isUnlocked || false);

    // A post is locked if forced, or if it's pay-per-view AND not unlocked.
    const isLocked = forceLocked || (post.visibility === 'pay_per_view' && !localIsUnlocked);

    const handleSaveToGallery = async () => {
        setIsSaving(true);
        try {
            await apiClient.addContentToGallery(post._id);
            setIsBookmarked(true);
        } catch (error) {
            console.error("Failed to add to gallery:", error);
            alert("Could not save to gallery. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleTipSubmit = async (amount: number, message: string, paymentMethodId?: string) => {
        return apiClient.sendTip(post.creatorId, amount, message, post._id, paymentMethodId);
    };

    const handleUnlockSuccess = () => {
        setLocalIsUnlocked(true);
        // alert('Content unlocked!'); // Modal handles success message
    };

    return (
        <>
            {/* Render the TipModal, controlled by our useModal hook */}
            <TipModal
                isOpen={isTipModalOpen}
                onClose={closeTipModal}
                creator={post.creator} // Pass the full creator object
                onSubmit={handleTipSubmit}
            />

            <UnlockModal
                isOpen={isUnlockModalOpen}
                onClose={closeUnlockModal}
                contentId={post._id}
                title={post.title}
                price={post.price || 0}
                onUnlockSuccess={handleUnlockSuccess}
            />

            <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md overflow-hidden group transition-all duration-300 ease-in-out transform hover:shadow-xl hover:-translate-y-1" onClick={() => !isLocked && navigate(`/content/${post._id}`)}>
                <div className="relative">
                    <img
                        className={`w-full h-auto object-cover aspect-[4/5] ${isLocked ? 'blur-md' : ''}`}
                        src={post.files[0]?.thumbnailUrl}
                        alt={post.title}
                        onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400/1F2937/FFFFFF?text=Error'; }}
                    />
                    {isLocked && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4">
                            <Lock className="w-12 h-12 mb-4" />
                            <h3 className="font-bold text-lg text-center">Content Locked</h3>
                            <div className="flex flex-col items-center space-y-2">
                                {!post.isSubscribedToCreator ? (
                                    <Button className="mt-4 bg-purple-600 hover:bg-purple-700" onClick={(e) => { e.stopPropagation(); navigate(`/creator/${post.creator.username}`); }}>
                                        Subscribe to Unlock
                                    </Button>
                                ) : (
                                    post.minTierLevel && post.minTierLevel > 1 && !post.price ? (
                                        <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={(e) => { e.stopPropagation(); navigate(`/creator/${post.creator.username}?tab=subscribe`); }}>
                                            Upgrade to Tier {post.minTierLevel}
                                        </Button>
                                    ) : (
                                        <Button className="mt-4" onClick={(e) => { e.stopPropagation(); openUnlockModal(); }}>
                                            {post.price ? `Unlock for $${(post.price / 100).toFixed(2)}` : 'Subscribe to view'}
                                        </Button>
                                    )
                                )}
                            </div>
                        </div>
                    )}
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded-full capitalize">
                        {post.type}
                    </div>
                </div>
                <div className="p-4">
                    <div className="flex items-center mb-3">
                        <img className="w-10 h-10 rounded-full mr-3" src={post.creator.profile.avatar} alt={post.creator.profile.name} />
                        <div>
                            <p className="font-semibold ...">{post.creator.profile.name}</p>
                            <p className="text-xs ...">{new Date(post.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <p className="text-gray-700 ...">{post.title}</p>
                    <div className="flex items-center justify-between ...">
                        {/* --- THIS IS THE KEY CHANGE --- */}
                        {/* The onClick handler now opens the tip modal */}
                        <Button variant="ghost" size="sm" leftIcon={DollarSign} onClick={openTipModal}>
                            Tip
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveToGallery}
                            // Disable the button if it's already saved or currently saving
                            disabled={isBookmarked || isSaving}
                            className={isBookmarked ? 'text-purple-500' : ''}
                            leftIcon={Bookmark}
                        >
                            {isSaving ? 'Saving...' : (isBookmarked ? 'Saved' : 'Save')}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PostCard;
