import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FileText, MessageSquare, DollarSign, User, Link, Copy, Share2, PlusCircle, Eye, QrCode, Check, BarChart2 } from 'lucide-react';

// --- Import Shared Types ---
import { Creator } from '../../../common/types/Creator';
import { Content } from '../../../common/types/Content';
import { Transaction } from '../../../common/types/Transaction';

// --- Import Reusable Components & Helpers ---
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatCard from '../../components/shared/StatCard';
import { formatCurrency, timeAgo } from '../../lib/formatters';

// --- Local Types ---
interface TransactionWithFan extends Transaction {
    fanName?: string;
}
type ActivityItemType = TransactionWithFan | Content;
interface KeyMetrics {
    subscribers: { value: number; change: number };
    earnings: { value: number; change: number }; // in cents
    postViews: { value: number; change: number };
    profileVisits: { value: number; change: number };
}
type EarningsData = { name: string; earnings: number };

// --- Reusable Sub-Components ---

const ActivityItem = ({ item }: { item: ActivityItemType }) => {
    let icon: React.ReactNode, description: string;

    if ('status' in item && 'title' in item) { // It's a Content item
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
        <div className="flex items-center space-x-4 py-3">
            <div className="flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-full p-2">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{description}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{timeAgo(item.createdAt)}</p>
            </div>
        </div>
    );
};

// --- Main Dashboard Component ---

interface CreatorDashboardProps {
    creator: Creator;
    metrics: KeyMetrics;
    recentActivity: ActivityItemType[];
    monthlyEarnings: EarningsData[];
}

const CreatorDashboard = ({ creator, metrics, recentActivity, monthlyEarnings }: CreatorDashboardProps) => {
    const [copied, setCopied] = useState(false);
    const profileLink = `https://yourplatform.com/creator/${creator.username}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(profileLink).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => console.error('Failed to copy text: ', err));
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back, {creator.profile.name}! Here's your performance overview.</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard icon={User} title="Subscribers" value={metrics.subscribers.value.toLocaleString()} change={metrics.subscribers.change} color="purple" />
                <StatCard icon={DollarSign} title="Earnings (Month)" value={formatCurrency(metrics.earnings.value)} change={metrics.earnings.change / 100} color="green" />
                <StatCard icon={Eye} title="Post Views" value={metrics.postViews.value.toLocaleString()} change={metrics.postViews.change} color="blue" />
                <StatCard icon={BarChart2} title="Profile Visits" value={metrics.profileVisits.value.toLocaleString()} change={metrics.profileVisits.change} color="pink" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card className="p-4 sm:p-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Monthly Earnings</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={monthlyEarnings} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                                <XAxis dataKey="name" tick={{ fill: '#9ca3af' }} fontSize={12} />
                                <YAxis tick={{ fill: '#9ca3af' }} fontSize={12} tickFormatter={(value) => `$${value/1000}k`} />
                                <Tooltip cursor={{ fill: 'rgba(107, 70, 193, 0.1)' }} contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem', color: '#f9fafb' }} />
                                <Legend wrapperStyle={{fontSize: "14px"}}/>
                                <Bar dataKey="earnings" fill="#8B5CF6" name="Earnings" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>

                    <Card noPadding>
                        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700"><h3 className="text-lg font-semibold text-gray-800 dark:text-white">Quick Actions</h3></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 sm:p-6">
                            <Button variant="ghost" className="flex-col h-auto space-y-2 py-4"><PlusCircle className="w-6 h-6 text-green-500" /><span>Create Post</span></Button>
                            <Button variant="ghost" className="flex-col h-auto space-y-2 py-4"><MessageSquare className="w-6 h-6 text-blue-500" /><span>View Messages</span></Button>
                            <Button variant="ghost" className="flex-col h-auto space-y-2 py-4"><DollarSign className="w-6 h-6 text-purple-500" /><span>Check Earnings</span></Button>
                            <Button variant="ghost" className="flex-col h-auto space-y-2 py-4"><Share2 className="w-6 h-6 text-pink-500" /><span>Share Profile</span></Button>
                        </div>
                    </Card>
                </div>

                <div className="space-y-8">
                    <Card>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Your Profile Link</h3>
                        <div className="flex items-center bg-gray-100 dark:bg-gray-900 rounded-md p-2">
                            <Link className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />
                            <input type="text" value={profileLink} readOnly className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none" />
                            <Button size="sm" onClick={handleCopy} className="p-2 h-auto">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button>
                        </div>
                        <div className="flex items-center justify-around mt-4 text-gray-500 dark:text-gray-400">
                             <Button variant="ghost" className="flex-col h-auto space-y-1"><QrCode className="w-5 h-5" /><span className="text-xs">QR Code</span></Button>
                             <Button variant="ghost" className="flex-col h-auto space-y-1"><Share2 className="w-5 h-5" /><span className="text-xs">Share</span></Button>
                        </div>
                    </Card>

                    <Card noPadding>
                         <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700"><h3 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Activity</h3></div>
                        <div className="p-4 sm:p-6 divide-y divide-gray-200 dark:divide-gray-700">
                            {recentActivity.map((item) => <ActivityItem key={item._id} item={item} />)}
                        </div>
                        <div className="p-4 text-center border-t border-gray-200 dark:border-gray-700"><a href="#" className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline">View all</a></div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CreatorDashboard;
