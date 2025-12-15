import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, DollarSign, Eye, Bookmark, MoreVertical, ArrowUp, ArrowDown, Edit, ExternalLink, ImageIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// --- Import Shared Types ---
import { Content } from '@common/types/Content';

// --- Import Reusable Components & Helpers ---
import StatCard from '../../components/shared/StatCard';
import { formatCurrency } from '../../lib/formatters';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import * as apiClient from '../../lib/apiClient';

// --- Local Types ---
interface KeyMetrics {
    totalSubscribers: { value: number; change: number };
    monthlyRevenue: { value: number; change: number }; // in cents
    totalViews: { value: number; change: number };
    galleryAdds: { value: number; change: number };
}
type SubscriberGrowthData = { name: string; Subscribers: number };
type RevenueBreakdownData = { name: string; value: number }; // in cents
type SortKey = 'views' | 'galleryAdds' | 'tips' | 'ppvEarnings';
type SortDirection = 'asc' | 'desc';

// --- Reusable Sub-Components ---
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-800 text-white p-2 rounded-md shadow-lg border border-gray-700">
                <p className="label font-bold">{`${label}`}</p>
                <p className="intro" style={{ color: payload[0].color }}>{`${payload[0].name}: ${payload[0].value.toLocaleString()}`}</p>
            </div>
        );
    }
    return null;
};

// --- Content Row with Thumbnail and Actions ---
const ContentRow = ({ item, onViewPost, onEditPost }: {
    item: Content;
    onViewPost: (id: string) => void;
    onEditPost: (id: string) => void;
}) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(menuRef, () => setIsMenuOpen(false));

    useEffect(() => {
        const fetchImageUrl = async () => {
            const thumbnailPath = item.files?.[0]?.thumbnailUrl;
            if (thumbnailPath) {
                try {
                    const response = await apiClient.getSecureContentUrl(item.id);
                    setImageUrl(response.data.secureUrl);
                } catch (error) {
                    console.error('Failed to load thumbnail:', error);
                }
            }
        };
        fetchImageUrl();
    }, [item.id, item.files]);

    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <td className="px-4 py-3">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {imageUrl ? (
                            <img src={imageUrl} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                            <ImageIcon className="w-5 h-5 text-gray-400" />
                        )}
                    </div>
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px]">{item.title}</span>
                </div>
            </td>
            <td className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                {item.stats.views.toLocaleString()}
            </td>
            <td className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                {item.stats.galleryAdds.toLocaleString()}
            </td>
            <td className="px-4 py-3 text-center text-sm font-semibold text-blue-600 dark:text-blue-400">
                {formatCurrency(item.stats.ppvEarnings || 0)}
            </td>
            <td className="px-4 py-3 text-center text-sm font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(item.stats.tips)}
            </td>
            <td className="px-4 py-3 text-center relative">
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                    <MoreVertical className="w-5 h-5 text-gray-500" />
                </button>
                {isMenuOpen && (
                    <div
                        ref={menuRef}
                        className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-10"
                    >
                        <ul className="py-1">
                            <li>
                                <button
                                    onClick={() => { onViewPost(item.id); setIsMenuOpen(false); }}
                                    className="flex items-center space-x-3 w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    <span>View Post</span>
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => { onEditPost(item.id); setIsMenuOpen(false); }}
                                    className="flex items-center space-x-3 w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    <Edit className="w-4 h-4" />
                                    <span>Edit Post</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </td>
        </tr>
    );
};

// --- Sortable Header Component ---
const SortableHeader = ({ label, sortKey, currentSort, onSort }: {
    label: string;
    sortKey: SortKey;
    currentSort: { key: SortKey; direction: SortDirection };
    onSort: (key: SortKey) => void;
}) => {
    const isActive = currentSort.key === sortKey;

    return (
        <th
            onClick={() => onSort(sortKey)}
            className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors select-none"
        >
            <div className="flex items-center justify-center space-x-1">
                <span>{label}</span>
                {isActive && (
                    currentSort.direction === 'desc'
                        ? <ArrowDown className="w-3 h-3" />
                        : <ArrowUp className="w-3 h-3" />
                )}
            </div>
        </th>
    );
};

// --- Main Analytics Page Component ---
export interface CreatorAnalyticsPageProps {
    metrics: KeyMetrics;
    subscriberGrowth: SubscriberGrowthData[];
    revenueBreakdown: RevenueBreakdownData[];
    topContent: Content[];
}

const CreatorAnalyticsPage = ({ metrics, subscriberGrowth, revenueBreakdown, topContent }: CreatorAnalyticsPageProps) => {
    const navigate = useNavigate();
    const COLORS = ['#6B46C1', '#EC4899', '#F59E0B'];

    // Sorting state - default to Tips descending
    const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
        key: 'tips',
        direction: 'desc'
    });

    const handleSort = (key: SortKey) => {
        setSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const sortedContent = useMemo(() => {
        return [...topContent].sort((a, b) => {
            let aVal: number, bVal: number;

            switch (sort.key) {
                case 'views':
                    aVal = a.stats.views;
                    bVal = b.stats.views;
                    break;
                case 'galleryAdds':
                    aVal = a.stats.galleryAdds;
                    bVal = b.stats.galleryAdds;
                    break;
                case 'ppvEarnings':
                    aVal = a.stats.ppvEarnings || 0;
                    bVal = b.stats.ppvEarnings || 0;
                    break;
                case 'tips':
                default:
                    aVal = a.stats.tips;
                    bVal = b.stats.tips;
                    break;
            }

            return sort.direction === 'desc' ? bVal - aVal : aVal - bVal;
        });
    }, [topContent, sort]);

    const handleViewPost = (id: string) => {
        navigate(`/content/${id}`);
    };

    const handleEditPost = (id: string) => {
        navigate(`/creator/content?edit=${id}`);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Track your performance and growth.</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Subscribers" value={metrics.totalSubscribers.value.toLocaleString()} change={metrics.totalSubscribers.change} icon={Users} color="purple" />
                <StatCard title="Monthly Revenue" value={formatCurrency(metrics.monthlyRevenue.value)} change={metrics.monthlyRevenue.change / 100} icon={DollarSign} color="green" />
                <StatCard title="Total Post Views" value={metrics.totalViews.value.toLocaleString()} change={metrics.totalViews.change} icon={Eye} color="blue" />
                <StatCard title="Total Gallery Adds" value={metrics.galleryAdds.value.toLocaleString()} change={metrics.galleryAdds.change} icon={Bookmark} color="pink" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800/50 rounded-xl shadow-md p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Subscriber Growth</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={subscriberGrowth}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                            <XAxis dataKey="name" tick={{ fill: '#9ca3af' }} fontSize={12} />
                            <YAxis tick={{ fill: '#9ca3af' }} fontSize={12} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: "14px" }} />
                            <Line type="monotone" dataKey="Subscribers" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Revenue Breakdown</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={revenueBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                                {revenueBreakdown.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Top Performing Content</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Content</th>
                                <SortableHeader label="Views" sortKey="views" currentSort={sort} onSort={handleSort} />
                                <SortableHeader label="Gallery Adds" sortKey="galleryAdds" currentSort={sort} onSort={handleSort} />
                                <SortableHeader label="PPV" sortKey="ppvEarnings" currentSort={sort} onSort={handleSort} />
                                <SortableHeader label="Tips" sortKey="tips" currentSort={sort} onSort={handleSort} />
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {sortedContent.map(item => (
                                <ContentRow
                                    key={item.id}
                                    item={item}
                                    onViewPost={handleViewPost}
                                    onEditPost={handleEditPost}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CreatorAnalyticsPage;
