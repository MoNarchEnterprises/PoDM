import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as apiClient from '../../lib/apiClient';
import { formatCurrency, timeAgo } from '../../lib/formatters';
import { FileText, DollarSign, User } from 'lucide-react';
import { Content } from '@common/types/Content';
import { Transaction } from '@common/types/Transaction';

// --- Local Types ---
interface TransactionWithFan extends Transaction {
    fanName?: string;
}
type ActivityItemType = TransactionWithFan | Content;

const ActivityItem = ({ item }: { item: ActivityItemType }) => {
    let icon: React.ReactNode, description: string;

    if ('title' in item) { // It's a Content item
        icon = <FileText className="w-4 h-4 text-blue-500" />;
        description = `New post: "${item.title}"`;
    } else { // It's a Transaction item
        if (item.type === 'Subscription') {
            icon = <User className="w-4 h-4 text-green-500" />;
            description = `@${(item as TransactionWithFan).fanName} just subscribed!`;
        } else {
            icon = <DollarSign className="w-4 h-4 text-yellow-500" />;
            description = `Received ${formatCurrency(item.amount)} from @${(item as TransactionWithFan).fanName}`;
        }
    }

    return (
        <div className="flex items-center space-x-4 py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
            <div className="flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-full p-2">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{description}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{timeAgo(item.createdAt)}</p>
            </div>
        </div>
    );
};

const CreatorActivityPage = () => {
    const { user } = useAuth();
    const [activity, setActivity] = useState<ActivityItemType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        const fetchActivity = async () => {
            if (!user?._id) return;
            setIsLoading(true);
            try {
                const response = await apiClient.getCreatorActivity(user._id, page, 10); // Fetch 10 items per page
                setActivity(prev => [...prev, ...response.data]);
                setHasMore(response.data.length === 10); // Assuming 10 items per page
            } catch (err) {
                console.error("Failed to fetch creator activity:", err);
                setError("Failed to load activity. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchActivity();
    }, [user, page]);

    const handleLoadMore = () => {
        setPage(prevPage => prevPage + 1);
    };

    if (error) {
        return <div className="p-8 text-center text-red-500">{error}</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">All Activity</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">A complete log of your recent interactions and content.</p>
            </header>

            <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md p-4 sm:p-6">
                {activity.length === 0 && !isLoading && <p className="text-center text-gray-500">No recent activity found.</p>}
                {
                    activity.map((item, index) => (
                        <ActivityItem key={`${item._id}-${index}`} item={item} />
                    ))
                }
                {isLoading && <p className="text-center text-gray-500">Loading more activity...</p>}
                {hasMore && !isLoading && (
                    <div className="text-center mt-4">
                        <button onClick={handleLoadMore} className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline">
                            Load More
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreatorActivityPage;