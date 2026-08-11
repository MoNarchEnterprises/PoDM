import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Bookmark, DollarSign, MoreVertical } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth'; // 1. Import useAuth
import * as apiClient from '../../lib/apiClient'; // 2. Import apiClient

// --- Import Shared Types ---
import { Content } from '@common/types/Content';
import { Creator } from '@common/types/Creator';

// --- Import Reusable Components & Hooks ---
import Button from '../../components/ui/Button';
import ReportModal from '../../components/shared/ReportModal';
import TipModal from '../../components/shared/TipModal';
import { useModal } from '../../hooks/useModal';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import ContentLockOverlay from '../../components/shared/ContentLockOverlay';
import { useContentLock } from '../../components/shared/ContentLockManager';

import { Link, useNavigate } from 'react-router-dom';

// --- Reusable Sub-Components ---
const RelatedContentCard = ({ item }: { item: Content }) => (
    <Link to={`/content/${item.id}`} className="relative group overflow-hidden rounded-xl aspect-w-1 aspect-h-1">
        <img src={item.files[0]?.thumbnailUrl} alt={item.title} className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 ${!item.isUnlocked ? 'blur-md' : ''}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        {!item.isUnlocked && (
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-center">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    {item.price && item.price > 0 ? `$${(item.price / 100).toFixed(2)}` : 'Locked'}
                </div>
            </div>
        )}
        <div className="absolute bottom-0 left-0 p-2 text-white">
            <h4 className="font-bold text-xs truncate">{item.title}</h4>
        </div>
    </Link>
);

// --- Main Content Viewer Component ---
interface ContentViewerPageProps {
    content: Content;
    creator: Creator;
    relatedContent: Content[];
}

const ContentViewerPage = ({ content, creator, relatedContent }: ContentViewerPageProps) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [secureUrl, setSecureUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Use centralized lock management
    const { lockState: _lockState, markAsUnlocked: _markAsUnlocked } = useContentLock(content, creator);

    useEffect(() => {
        if (content && content.id) {
            apiClient.logAnalyticsEvent({
                eventType: 'post_view',
                creatorId: creator.id,
                contentId: content.id,
            });

            // Fetch secure URL for both videos and photos
            if (content.type === 'video' || content.type === 'photo') {
                setIsLoading(true);
                apiClient.getSecureContentViewUrl(content.id)
                    .then(response => {
                        setSecureUrl(response.data.secureUrl);
                    })
                    .catch(error => {
                        console.error("Error fetching secure content URL:", error);
                    })
                    .finally(() => {
                        setIsLoading(false);
                    });
            }
        }
    }, [creator?.id, content?.id, content?.type]);

    const [isBookmarked, setIsBookmarked] = useState(false);
    const { isOpen: isTipModalOpen, openModal: openTipModal, closeModal: closeTipModal } = useModal();
    const { isOpen: isReportModalOpen, openModal: openReportModal, closeModal: closeReportModal } = useModal();
    const { isOpen: isMenuOpen, openModal: openMenu, closeModal: closeMenu } = useModal();
    const menuRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(menuRef, closeMenu);

    const handleReportSubmit = async (reason: string, details: string) => {
        try {
            await apiClient.reportContent(content.id, reason, details);
            alert('Content reported successfully. Thank you for keeping the community safe.');
            closeReportModal();
        } catch (error) {
            console.error('Failed to report content:', error);
            alert('Failed to report content. Please try again.');
        }
    };

    const handleBookmarkToggle = async () => {
        if (!user) {
            alert('Please log in to save content to your gallery.');
            return;
        }

        try {
            if (!isBookmarked) {
                // Add to gallery
                await apiClient.addContentToGallery(content.id);
                setIsBookmarked(true);
                console.log('Content added to gallery successfully');
            } else {
                // Remove from gallery
                await apiClient.removeContentFromGallery(content.id);
                setIsBookmarked(false);
                console.log('Content removed from gallery successfully');
            }
        } catch (error) {
            console.error('Failed to update gallery:', error);
            alert('Failed to update gallery. Please try again.');
        }
    };

    return (
        <>
            <ReportModal isOpen={isReportModalOpen} onClose={closeReportModal} reportType="Content" targetName={creator.profile.name} onSubmit={handleReportSubmit} />
            <TipModal isOpen={isTipModalOpen} onClose={closeTipModal} creator={creator} contentId={content.id} />
            <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col">
                <header className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40 w-full">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
                            <div className="flex items-center space-x-3">
                                <img src={creator.profile.avatar} alt={creator.profile.name} className="w-8 h-8 rounded-full" />
                                <div>
                                    <p className="text-sm font-bold leading-tight">{content.title}</p>
                                    <p className="text-xs text-gray-400 leading-tight">by {creator.profile.name}</p>
                                </div>
                            </div>
                        </div>
                        <div className="relative" ref={menuRef}>
                            <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={openMenu}><MoreVertical className="w-5 h-5" /></Button>
                            {isMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-700">
                                    <ul className="py-1">
                                        <li><Button variant="ghost" className="w-full justify-start text-red-400 hover:bg-gray-700" onClick={() => { openReportModal(); closeMenu(); }}>Report Content</Button></li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 flex flex-col lg:flex-row container mx-auto p-4 sm:p-6 lg:p-8 gap-8">
                    <div className="flex-grow flex items-center justify-center bg-black rounded-xl relative">
                        <ContentLockOverlay
                            isUnlocked={content.isUnlocked ?? true}
                            isLockedByTier={content.isLockedByTier}
                            price={content.price}
                            minTierLevel={content.min_tier_level}
                            isSubscribedToCreator={content.isSubscribedToCreator}
                            creatorUsername={creator.username}
                            variant="viewer"
                        />
                        {content.type === 'video' ? (
                            isLoading ? <div>Loading...</div> :
                                <video
                                    src={secureUrl || ''}
                                    controls
                                    autoPlay
                                    controlsList="nodownload"
                                    className="max-w-full max-h-[80vh] object-contain rounded-lg select-none"
                                    onContextMenu={(e) => e.preventDefault()}
                                    onDragStart={(e) => e.preventDefault()}
                                />
                        ) : (
                            isLoading ? <div>Loading...</div> :
                                <img
                                    src={secureUrl || content.files[0]?.thumbnailUrl}
                                    alt={content.title}
                                    className="max-w-full max-h-[80vh] object-contain rounded-lg select-none"
                                    onContextMenu={(e) => e.preventDefault()}
                                    onDragStart={(e) => e.preventDefault()}
                                />
                        )}
                    </div>

                    <div className="lg:w-96 flex-shrink-0 space-y-6">
                        <div className="bg-gray-800/50 rounded-xl p-4 flex justify-around">
                            <Button variant="ghost" onClick={handleBookmarkToggle} className={`flex-col h-auto space-y-1 w-24 ${isBookmarked ? 'text-purple-400' : 'text-gray-300'}`} leftIcon={Bookmark}>
                                {isBookmarked ? 'Saved' : 'Save'}
                            </Button>
                            <Button variant="ghost" onClick={openTipModal} className="flex-col h-auto space-y-1 text-gray-300 hover:text-pink-400 w-24" leftIcon={DollarSign}>
                                Send a Tip
                            </Button>
                        </div>

                        <div className="bg-gray-800/50 rounded-xl p-4"><p className="text-sm text-gray-300 leading-relaxed">{content.description}</p></div>

                        <div className="bg-gray-800/50 rounded-xl p-4">
                            <h3 className="font-semibold mb-3 text-gray-200">More from {creator.profile.name}</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {relatedContent.map(item => <RelatedContentCard key={item.id} item={item} />)}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default ContentViewerPage;
