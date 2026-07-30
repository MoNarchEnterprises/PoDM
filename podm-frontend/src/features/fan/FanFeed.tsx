import React, { useState, useEffect } from 'react';

// --- Import API Client ---
import * as apiClient from '../../lib/apiClient';

// --- Import Shared Types ---
import { ContentWithCreator } from '../../components/shared/ContentCard';

// --- Import Reusable Components ---
import PostCard from '../../components/shared/ContentCard';
import { getContentLockState } from '../../components/shared/ContentLockManager';
import FanContestList from '../contests/FanContestList';

// --- Main Fan Feed Component ---
const FanFeed = () => {
    const [posts, setPosts] = useState<ContentWithCreator[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMyFeed = async () => {
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
        fetchMyFeed();
    }, []);

    const renderContent = () => {
        if (isLoading) {
            return <div className="text-center py-12 text-gray-500">Loading...</div>;
        }
        if (error) {
            return <div className="text-center py-12 text-red-500">{error}</div>;
        }
        if (posts.length === 0) {
            return (
                <div className="text-center py-12 text-gray-500">
                    <h3 className="font-bold text-lg">Your feed is empty!</h3>
                    <p>Subscribe to some creators to see their latest content here.</p>
                </div>
            );
        }
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {posts.map(post => {
                    const lockState = getContentLockState(post, post.creator);
                    return <PostCard key={post.id} post={post} lockState={lockState} />;
                })}
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <FanContestList />
            {renderContent()}
        </div>
    );
};

export default FanFeed;