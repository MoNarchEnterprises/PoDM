import React, { useState, useEffect } from 'react';
import { Home, ImageIcon, Briefcase, Settings, MessageSquare, Compass, Star, ThumbsUp, Plus, LucideIcon } from 'lucide-react';

// --- Import Shared Types ---
import { Content } from '@common/types/Content';
import { Creator } from '@common/types/Creator';

// --- Import Reusable Components ---
import PostCard, { ContentWithCreator } from '../../components/shared/ContentCard';
import Button from '../../components/ui/Button';

// --- Reusable Sub-Components ---
const FilterPill = ({ icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void; }) => (
    <Button
        onClick={onClick}
        variant={active ? 'primary' : 'secondary'}
        size="sm"
        className="rounded-full"
        leftIcon={icon}
    >
        {label}
    </Button>
);

// --- Main Fan Feed Component ---
interface FanFeedProps {
    posts: ContentWithCreator[];
    creatorsFollowing: Creator[];
}

const FanFeed = ({ posts, creatorsFollowing }: FanFeedProps) => {
    const [activeFilter, setActiveFilter] = useState('Following');
    const filters = ['Following', 'For You', 'Trending'];

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Recent Updates</h2>
                <div className="flex space-x-4 overflow-x-auto pb-4 -mx-4 px-4">
                    <div className="flex-shrink-0 flex flex-col items-center space-y-1">
                        <button className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-400 text-gray-500 hover:border-purple-500 hover:text-purple-500 transition">
                            <Plus className="w-8 h-8" />
                        </button>
                        <span className="text-xs text-gray-600 dark:text-gray-400">Discover</span>
                    </div>
                    {creatorsFollowing.map(creator => (
                        <div key={creator._id} className="flex-shrink-0 flex flex-col items-center space-y-1">
                            <div className="w-16 h-16 rounded-full p-1 bg-gradient-to-tr from-yellow-400 to-pink-600">
                                <img src={creator.profile.avatar} alt={creator.profile.name} className="w-full h-full rounded-full border-2 border-white dark:border-gray-800" />
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">{creator.profile.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex items-center space-x-2 mb-8 overflow-x-auto pb-2">
                {filters.map(filter => (
                    <FilterPill
                        key={filter}
                        icon={filter === 'Following' ? Star : filter === 'For You' ? ThumbsUp : Compass}
                        label={filter}
                        active={activeFilter === filter}
                        onClick={() => setActiveFilter(filter)}
                    />
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {posts.map(post => (
                    <PostCard key={post._id} post={post} />
                ))}
            </div>
        </div>
    );
};

export default FanFeed;
