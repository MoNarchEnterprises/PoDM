import React, { useState, useEffect } from 'react';
import { Home, FileText, MessageSquare, BarChart2, Settings, DollarSign, Users, Eye, Bookmark, MoreVertical } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// --- Import Shared Types ---
import { Content } from '@common/types/Content';

// --- Import Reusable Components & Helpers ---
import StatCard from '../../components/shared/StatCard';
import { formatCurrency } from '../../lib/formatters';

// --- Local Types ---
interface KeyMetrics {
    totalSubscribers: { value: number; change: number };
    monthlyRevenue: { value: number; change: number }; // in cents
    totalViews: { value: number; change: number };
    galleryAdds: { value: number; change: number };
}
type SubscriberGrowthData = { name: string; Subscribers: number };
type RevenueBreakdownData = { name: string; value: number }; // in cents

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

// --- Main Analytics Page Component ---
interface CreatorAnalyticsPageProps {
    metrics: KeyMetrics;
    subscriberGrowth: SubscriberGrowthData[];
    revenueBreakdown: RevenueBreakdownData[];
    topContent: Content[];
}

const CreatorAnalyticsPage = ({ metrics, subscriberGrowth, revenueBreakdown, topContent }: CreatorAnalyticsPageProps) => {
    const COLORS = ['#6B46C1', '#EC4899', '#F59E0B'];

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
                            <Legend wrapperStyle={{fontSize: "14px"}}/>
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
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Views</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gallery Adds</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Earnings</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                           {topContent.map(item => (
                               <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                   <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{item.title}</td>
                                   <td className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">{item.stats.views.toLocaleString()}</td>
                                   <td className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">{item.stats.galleryAdds.toLocaleString()}</td>
                                   <td className="px-4 py-3 text-center text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(item.stats.tips)}</td>
                                   <td className="px-4 py-3 text-center">
                                       <button className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                                           <MoreVertical className="w-5 h-5 text-gray-500" />
                                       </button>
                                   </td>
                               </tr>
                           ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CreatorAnalyticsPage;
