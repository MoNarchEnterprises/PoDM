import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Bookmark, DollarSign, PlayCircle, Maximize, Volume2, Settings, MoreVertical } from 'lucide-react';

// --- Import Shared Types ---
import { Content } from '@common/types/Content';
import { Creator } from '@common/types/Creator';

// --- Import Reusable Components & Hooks ---
import Button from '../../components/ui/Button';
import ReportModal from '../../components/shared/ReportModal';
import TipModal from '../../components/shared/TipModal';
import { useModal } from '../../hooks/useModal';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';

// --- Reusable Sub-Components ---
const RelatedContentCard = ({ item }: { item: Content }) => (
    <div className="relative group overflow-hidden rounded-xl aspect-w-1 aspect-h-1">
        <img src={item.files[0]?.thumbnailUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-2 text-white">
            <h4 className="font-bold text-xs truncate">{item.title}</h4>
        </div>
    </div>
);

// --- Main Content Viewer Component ---
interface ContentViewerPageProps {
    content: Content;
    creator: Creator;
    relatedContent: Content[];
}

const ContentViewerPage = ({ content, creator, relatedContent }: ContentViewerPageProps) => {
    const [isBookmarked, setIsBookmarked] = useState(false);
    const { isOpen: isTipModalOpen, openModal: openTipModal, closeModal: closeTipModal } = useModal();
    const { isOpen: isReportModalOpen, openModal: openReportModal, closeModal: closeReportModal } = useModal();
    const { isOpen: isMenuOpen, openModal: openMenu, closeModal: closeMenu } = useModal();
    const menuRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(menuRef, closeMenu);

    return (
        <>
            <ReportModal isOpen={isReportModalOpen} onClose={closeReportModal} reportType="Content" targetName={creator.profile.name} onSubmit={() => {}} />
            <TipModal isOpen={isTipModalOpen} onClose={closeTipModal} creator={creator} onSubmit={() => {}} />
            <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col">
                <header className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40 w-full">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <Button variant="ghost" size="sm" className="p-2 h-auto"><ArrowLeft className="w-5 h-5" /></Button>
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
                            <div className="relative w-full max-w-5xl aspect-video bg-black rounded-lg overflow-hidden group">
                                <img src={content.files[0]?.url} alt={content.title} className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"><PlayCircle className="w-20 h-20 text-white/70" /></div>
                                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between px-4">
                                    <div className="flex items-center space-x-4"><PlayCircle className="w-6 h-6 text-white" /><Volume2 className="w-6 h-6 text-white" /></div>
                                    <div className="flex items-center space-x-4"><Settings className="w-6 h-6 text-white" /><Maximize className="w-6 h-6 text-white" /></div>
                                </div>
                            </div>
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
                                {relatedContent.map(item => <RelatedContentCard key={item._id} item={item} />)}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default ContentViewerPage;
