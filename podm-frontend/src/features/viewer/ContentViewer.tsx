import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Bookmark, DollarSign, PlayCircle, Maximize, Volume2, Settings, MoreVertical } from 'lucide-react';
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

import { Link, useNavigate } from 'react-router-dom';

// --- Reusable Sub-Components ---
const RelatedContentCard = ({ item }: { item: Content }) => (
    <Link to={`/content/${item._id}`} className="relative group overflow-hidden rounded-xl aspect-w-1 aspect-h-1">
        <img src={item.files[0]?.thumbnailUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
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
    console.log('ContentViewerPage content:', content);
    const { user } = useAuth();
    const navigate = useNavigate();
    const [secureUrl, setSecureUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (content && content._id) {
            apiClient.logAnalyticsEvent({
                eventType: 'post_view',
                creatorId: creator._id,
                contentId: content._id,
            });

            if (content.type === 'video') {
                setIsLoading(true);
                apiClient.getSecureContentViewUrl(content._id)
                    .then(response => {
                        setSecureUrl(response.data.secureUrl);
                    })
                    .catch(error => {
                        console.error("Error fetching secure video URL:", error);
                    })
                    .finally(() => {
                        setIsLoading(false);
                    });
            }
        }
    }, [creator?._id, content?._id, content?.type]);

    const [isBookmarked, setIsBookmarked] = useState(false);
    const { isOpen: isTipModalOpen, openModal: openTipModal, closeModal: closeTipModal } = useModal();
    const { isOpen: isReportModalOpen, openModal: openReportModal, closeModal: closeReportModal } = useModal();
    const { isOpen: isMenuOpen, openModal: openMenu, closeModal: closeMenu } = useModal();
    const menuRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(menuRef, closeMenu);

    const handleTipSubmit = async (amount: number, message: string, paymentMethodId?: string) => {
        return apiClient.sendTip(creator._id, amount, message, content._id, paymentMethodId);
    };

    const handleReportSubmit = async (reason: string) => {
        try {
            await apiClient.reportContent(content._id, reason);
            alert('Content reported successfully. Thank you for keeping the community safe.');
            closeReportModal();
        } catch (error) {
            console.error('Failed to report content:', error);
            alert('Failed to report content. Please try again.');
        }
    };

    return (
        <>
            <ReportModal isOpen={isReportModalOpen} onClose={closeReportModal} reportType="Content" targetName={creator.profile.name} onSubmit={handleReportSubmit} />
            <TipModal isOpen={isTipModalOpen} onClose={closeTipModal} creator={creator} onSubmit={handleTipSubmit} />
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
                    <div className="flex-grow flex items-center justify-center bg-black rounded-xl">
                        {content.type === 'video' ? (
                            isLoading ? <div>Loading...</div> :
                                <video src={secureUrl || ''} controls autoPlay className="max-w-full max-h-[80vh] object-contain rounded-lg" />
                        ) : (
                            <img src={content.files[0]?.url} alt={content.title} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
                        )}
                    </div>

                    <div className="lg:w-96 flex-shrink-0 space-y-6">
                        <div className="bg-gray-800/50 rounded-xl p-4 flex justify-around">
                            <Button variant="ghost" onClick={() => setIsBookmarked(!isBookmarked)} className={`flex-col h-auto space-y-1 w-24 ${isBookmarked ? 'text-purple-400' : 'text-gray-300'}`} leftIcon={Bookmark}>
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
