import React, { useState, useMemo, useEffect } from 'react';
import { Home, ImageIcon, Briefcase, Settings, MessageSquare, Search, Video, Star, RefreshCw } from 'lucide-react';

// --- Import Shared Types ---
import { GalleryItem } from '@common/types/Gallery';
import { Content, ContentType } from '@common/types/Content';
import { Creator } from '@common/types/Creator';

// --- Import Reusable Components ---
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';

import ContentViewerModal from './components/ContentViewerModal'; // <-- 1. IMPORT THE NEW MODAL


// --- Local Types ---
interface PopulatedGalleryItem {
    contentId: string;
    addedDate: string;
    content: Content;
}

interface CreatorWithContent {
    creator: Creator;
    content: PopulatedGalleryItem[];
    activeSubscription: boolean;
}

// --- Reusable Sub-Components ---

const ContentThumbnail = ({ item, isLocked, onClick }: { item: PopulatedGalleryItem; isLocked: boolean; onClick: () => void; }) => (
    <div 
        className="relative group overflow-hidden rounded-xl aspect-w-1 aspect-h-1 cursor-pointer"
        onClick={onClick}
    >
        <img src={item.content.files[0]?.thumbnailUrl} alt={item.content.title} className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 ${isLocked ? 'blur-md brightness-50' : ''}`} />
        {isLocked && <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white"><p className="text-xs font-bold bg-black/50 px-2 py-1 rounded">Resubscribe to View</p></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-3 text-white">
            <h4 className="font-bold text-sm truncate">{item.content.title}</h4>
        </div>
    </div>
);

const CreatorContentGroup = ({ group, onThumbnailClick }: { group: CreatorWithContent; onThumbnailClick: (item: PopulatedGalleryItem) => void; }) => (
    <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
                <img src={group.creator.profile.avatar} alt={group.creator.profile.name} className="w-12 h-12 rounded-full mr-4" />
                <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">{group.creator.profile.name}</h3>
                    <p className={`text-sm font-medium ${group.activeSubscription ? 'text-green-500' : 'text-red-500'}`}>
                        {group.activeSubscription ? 'Subscription Active' : 'Subscription Expired'}
                    </p>
                </div>
            </div>
            {!group.activeSubscription && (
                <Button variant="secondary" className="bg-pink-500 hover:bg-pink-600 text-white" leftIcon={RefreshCw}>
                    Resubscribe
                </Button>
            )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {group.content.map(item => (
                <ContentThumbnail 
                    key={item.contentId} 
                    item={item} 
                    isLocked={!group.activeSubscription} 
                    onClick={() => { if (!group.activeSubscription) return; onThumbnailClick(item); }}
                />
            ))}
        </div>
    </div>
);



// --- Main Gallery Interface Component ---
interface FanGalleryPageProps {
    galleryData: CreatorWithContent[];
}

const FanGalleryPage = ({ galleryData }: FanGalleryPageProps) => {
    const [contentTypeFilter, setContentTypeFilter] = useState<'All' | ContentType>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('Recent');

    // --- STATE FOR MODAL AND NAVIGATION ---
    const [currentContentIndex, setCurrentContentIndex] = useState<number | null>(null);

    const filteredAndSortedData = useMemo(() => {
        let data = [...galleryData];

        data = data.map(group => {
            let content = group.content;
            if (contentTypeFilter !== 'All') {
                content = content.filter(item => item.content.type === contentTypeFilter);
            }
            if (searchTerm) {
                content = content.filter(item => item.content.title.toLowerCase().includes(searchTerm.toLowerCase()));
            }
            return { ...group, content };
        }).filter(group => group.content.length > 0);

        data.forEach(group => {
            group.content.sort((a, b) => {
                switch (sortBy) {
                    case 'Most Viewed': return (b.content.stats?.views || 0) - (a.content.stats?.views || 0);
                    case 'Recent': default: return new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime();
                }
            });
        });
        
        if (sortBy === 'Creator') {
            data.sort((a, b) => a.creator.profile.name.localeCompare(b.creator.profile.name));
        }

        return data;
    }, [galleryData, contentTypeFilter, searchTerm, sortBy]);

    // Create a single, "flattened" list of all visible content items for navigation
    const flattenedGalleryItems = useMemo(() => {
        return filteredAndSortedData.flatMap(group => 
            group.activeSubscription ? group.content : [] // Only include content from active subscriptions
        );
    }, [filteredAndSortedData]);

    // --- HANDLERS FOR MODAL CONTROL ---
    const handleThumbnailClick = (item: PopulatedGalleryItem) => {
        const index = flattenedGalleryItems.findIndex(galleryItem => galleryItem.contentId === item.contentId);
        if (index !== -1) {
            setCurrentContentIndex(index);
        }
    };
    
    const handleCloseModal = () => setCurrentContentIndex(null);

    const handleNext = () => {
        if (currentContentIndex !== null && currentContentIndex < flattenedGalleryItems.length - 1) {
            setCurrentContentIndex(currentContentIndex + 1);
        }
    };

    const handlePrevious = () => {
        if (currentContentIndex !== null && currentContentIndex > 0) {
            setCurrentContentIndex(currentContentIndex - 1);
        }
    };

    return (
        <>
            <ContentViewerModal 
                galleryItems={flattenedGalleryItems}
                currentIndex={currentContentIndex}
                onClose={handleCloseModal}
                onNext={handleNext}
                onPrevious={handlePrevious}
            />

            <div className="p-4 sm:p-6 lg:p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Gallery</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">All your collected content in one place.</p>
                </header>

                <Card className="mb-8 space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <Input id="search-gallery" placeholder="Search in gallery..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} leftIcon={Search} containerClassName="flex-grow"/>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Sort by:</span>
                            <select onChange={(e) => setSortBy(e.target.value)} value={sortBy} className="bg-gray-100 dark:bg-gray-700 border-transparent rounded-full py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                                <option>Recent</option>
                                <option>Creator</option>
                                <option>Most Viewed</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant={contentTypeFilter === 'All' ? 'secondary' : 'ghost'} size="sm" onClick={() => setContentTypeFilter('All')}>All</Button>
                        <Button variant={contentTypeFilter === 'photo' ? 'secondary' : 'ghost'} size="sm" onClick={() => setContentTypeFilter('photo')} leftIcon={ImageIcon}>Photos</Button>
                        <Button variant={contentTypeFilter === 'video' ? 'secondary' : 'ghost'} size="sm" onClick={() => setContentTypeFilter('video')} leftIcon={Video}>Videos</Button>
                    </div>
                </Card>

                <div>
                    {filteredAndSortedData.length > 0 ? (
                        filteredAndSortedData.map(group => (
                            <CreatorContentGroup 
                                key={group.creator._id} 
                                group={group} 
                                onThumbnailClick={handleThumbnailClick}
                            />
                        ))
                    ) : (
                        <div className="text-center py-16 text-gray-500">
                            <p className="font-bold mb-2">No Content Found</p>
                            <p>Try adjusting your filters or add content to your gallery from a creator's page.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default FanGalleryPage;
