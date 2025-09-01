import React, { useState, useEffect } from 'react';
import { Compass, Star, ThumbsUp } from 'lucide-react';

// --- Import API Client ---
import * as apiClient from '../../lib/apiClient';

// --- Import Shared Types ---
import { ContentWithCreator } from '../../components/shared/ContentCard';

// --- Import Reusable Components ---
import PostCard from '../../components/shared/ContentCard';
import Button from '../../components/ui/Button';

// --- Main Fan Feed Component ---
const FanFeed = () => {
    const [posts, setPosts] = useState<ContentWithCreator[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState('Following');
    const filters = ['Following', 'For You', 'Trending'];

    useEffect(() => {
        // We only fetch data for the 'Following' tab for now
        if (activeFilter === 'Following') {
            const fetchFeed = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const response = await apiClient.getFanFeed(1);
                    setPosts(response.data);
                } catch (err) {
                    setError("Could not load your feed. Please try again later.");
                    console.error(err);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchFeed();
        } else {
            // For other filters, we can just clear the posts for now
            setPosts([]);
            setIsLoading(false);
        }
    }, [activeFilter]);

    const renderContent = () => {
        if (isLoading) {
            return <div className="text-center py-12 text-gray-500">Loading your feed...</div>;
        }
        if (error) {
            return <div className="text-center py-12 text-red-500">{error}</div>;
        }
        if (posts.length === 0) {
            return (
                <div className="text-center py-12 text-gray-500">
                    <h3 className="font-bold text-lg">It's quiet in here...</h3>
                    <p>Your feed is empty. Subscribe to creators to see their content here!</p>
                </div>
            );
        }
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {posts.map(post => (
                    <PostCard key={post._id} post={post} />
                ))}
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center space-x-2 mb-8 overflow-x-auto pb-2">
                {filters.map(filter => (
                    <Button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        variant={activeFilter === filter ? 'primary' : 'secondary'}
                        size="sm"
                        className="rounded-full"
                        leftIcon={filter === 'Following' ? Star : filter === 'For You' ? ThumbsUp : Compass}
                    >
                        {filter}
                    </Button>
                ))}
            </div>
            {renderContent()}
        </div>
    );
};

export default FanFeed;