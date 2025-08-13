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

// --- Local Types ---
// In a real app, your API would return gallery items with full content and creator details
interface PopulatedGalleryItem extends GalleryItem {
    content: Content;
}

interface CreatorWithContent {
    creator: Creator;
    content: PopulatedGalleryItem[];
    activeSubscription: boolean;
}

// --- Reusable Sub-Components ---

const ContentThumbnail = ({ item, isLocked }: { item: PopulatedGalleryItem; isLocked: boolean }) => (
    <div className="relative group overflow-hidden rounded-xl aspect-w-1 aspect-h-1">
        <img src={item.content.files[0]?.thumbnailUrl} alt={item.content.title} className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 ${isLocked && 'blur-md'}`} />
        {isLocked && <div className="absolute inset-0 bg-black/50"></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-3 text-white">
            <h4 className="font-bold text-sm truncate">{item.content.title}</h4>
            <p className="text-xs opacity-80 capitalize">{item.content.type}</p>
        </div>
    </div>
);

const CreatorContentGroup = ({ group }: { group: CreatorWithContent }) => (
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
                <ContentThumbnail key={item.contentId} item={item} isLocked={!group.activeSubscription} />
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
                    case 'Most Viewed':
                        return b.content.stats.views - a.content.stats.views;
                    case 'Recent':
                    default:
                        return new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime();
                }
            });
        });
        
        if (sortBy === 'Creator') {
            data.sort((a, b) => a.creator.profile.name.localeCompare(b.creator.profile.name));
        }

        return data;
    }, [galleryData, contentTypeFilter, searchTerm, sortBy]);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Gallery</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">All your collected content in one place.</p>
            </header>

            <Card className="mb-8 space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    <Input
                        id="search-gallery"
                        placeholder="Search in gallery..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        leftIcon={Search}
                        containerClassName="flex-grow"
                    />
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
                    <Button variant={contentTypeFilter === 'All' ? 'secondary' : 'ghost'} size="sm" onClick={() => setContentTypeFilter('All')} leftIcon={ImageIcon}>All</Button>
                    <Button variant={contentTypeFilter === 'photo' ? 'secondary' : 'ghost'} size="sm" onClick={() => setContentTypeFilter('photo')} leftIcon={ImageIcon}>Photos</Button>
                    <Button variant={contentTypeFilter === 'video' ? 'secondary' : 'ghost'} size="sm" onClick={() => setContentTypeFilter('video')} leftIcon={Video}>Videos</Button>
                </div>
            </Card>

            <div>
                {filteredAndSortedData.length > 0 ? (
                    filteredAndSortedData.map(group => (
                        <CreatorContentGroup key={group.creator._id} group={group} />
                    ))
                ) : (
                    <div className="text-center py-16 text-gray-500"><p className="font-bold mb-2">No content found</p><p>Try adjusting your filters or add more content to your gallery!</p></div>
                )}
            </div>
        </div>
    );
};


export default function App() {
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [galleryData, setGalleryData] = useState<CreatorWithContent[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            // Simulate API call
            const data: CreatorWithContent[] = [
                 {
                    creator: { _id: 'c1', username: 'creatorone', email: '', passwordHash: '', role: 'creator', status: 'active', profile: { name: 'CreatorOne', avatar: 'https://placehold.co/100x100/7E22CE/FFFFFF?text=C1' }, creatorData: {} as any, createdAt: '', updatedAt: '' },
                    activeSubscription: true,
                    content: [
                        { contentId: 'p1', addedDate: '2025-08-09T10:00:00Z', isAccessible: true, content: { _id: 'p1', creatorId: 'c1', title: 'City Lights', type: 'photo', status: 'published', files: [{id: 'f1', url: '', thumbnailUrl: 'https://placehold.co/400x400/1F2937/FFFFFF?text=P1', size: 0, mimeType: ''}], stats: {views: 1250, galleryAdds: 0, tips: 0}, description: '', visibility: 'subscribers_only', tags: [], schedule: {isScheduled: false}, createdAt: '', updatedAt: '' } },
                        { contentId: 'p2', addedDate: '2025-08-08T11:00:00Z', isAccessible: true, content: { _id: 'p2', creatorId: 'c1', title: 'Behind the Scenes', type: 'video', status: 'published', files: [{id: 'f2', url: '', thumbnailUrl: 'https://placehold.co/400x600/1F2937/FFFFFF?text=V1', size: 0, mimeType: ''}], stats: {views: 3400, galleryAdds: 0, tips: 0}, description: '', visibility: 'subscribers_only', tags: [], schedule: {isScheduled: false}, createdAt: '', updatedAt: '' } },
                    ]
                },
                {
                    creator: { _id: 'c2', username: 'artdiva', email: '', passwordHash: '', role: 'creator', status: 'active', profile: { name: 'ArtDiva', avatar: 'https://placehold.co/100x100/BE185D/FFFFFF?text=AD' }, creatorData: {} as any, createdAt: '', updatedAt: '' },
                    activeSubscription: false,
                    content: [
                        { contentId: 'p3', addedDate: '2025-07-20T15:00:00Z', isAccessible: false, content: { _id: 'p3', creatorId: 'c2', title: 'Studio Session', type: 'photo', status: 'published', files: [{id: 'f3', url: '', thumbnailUrl: 'https://placehold.co/400x400/1F2937/FFFFFF?text=P3', size: 0, mimeType: ''}], stats: {views: 5600, galleryAdds: 0, tips: 0}, description: '', visibility: 'subscribers_only', tags: [], schedule: {isScheduled: false}, createdAt: '', updatedAt: '' } },
                    ]
                },
            ];
            setGalleryData(data);
            setIsLoading(false);
        };
        fetchData();
    }, []);

    return (
        <div className={isDarkMode ? 'dark' : ''}>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans transition-colors duration-300">
                <div className="flex">
                    <nav className="w-64 bg-white dark:bg-gray-800/30 p-4 border-r border-gray-200 dark:border-gray-700/50 hidden lg:flex flex-col">
                        <div className="text-purple-500 font-bold text-2xl mb-10">PoDM</div>
                        <ul className="space-y-2">
                            {[ { icon: <Home className="w-5 h-5" />, label: 'Feed' }, { icon: <ImageIcon className="w-5 h-5" />, label: 'Gallery', active: true }, { icon: <Briefcase className="w-5 h-5" />, label: 'Subscriptions' }, { icon: <MessageSquare className="w-5 h-5" />, label: 'Messages' }, { icon: <Settings className="w-5 h-5" />, label: 'Settings' } ].map(item => (
                                <li key={item.label}><a href="#" className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${item.active ? 'bg-purple-500 text-white shadow-lg' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{item.icon}<span className="font-medium">{item.label}</span></a></li>
                            ))}
                        </ul>
                    </nav>
                    <main className="flex-1">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full"><p className="text-gray-500">Loading Gallery...</p></div>
                        ) : (
                            <FanGalleryPage galleryData={galleryData} />
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
