import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// --- Import Reusable Components & Helpers ---
import StatCard from '../../../components/shared/StatCard';
import { formatCurrency } from '../../../lib/formatters';

// --- Local Types ---
// This defines the shape of the data this specific component expects to receive.
interface AnalyticsData {
    revenueGrowth: { name: string; Revenue: number; }[];
    engagement: { name: string; 'Messages Sent': number; 'Content Unlocked': number; }[];
    topCreators: { name: string; revenue: number; }[];
}

// --- Main Analytics Panel Component ---
interface AnalyticsPanelProps {
    data: AnalyticsData;
}

const AnalyticsPanel = ({ data }: AnalyticsPanelProps) => (
    <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Revenue Growth</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.revenueGrowth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                        <XAxis dataKey="name" tick={{ fill: '#9ca3af' }} fontSize={12} />
                        <YAxis tick={{ fill: '#9ca3af' }} fontSize={12} tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem' }} 
                            formatter={(value: number) => formatCurrency(value * 100)} // Assuming value is in dollars
                        />
                        <Line type="monotone" dataKey="Revenue" stroke="#10B981" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
             <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">User Engagement</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.engagement}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                        <XAxis dataKey="name" tick={{ fill: '#9ca3af' }} fontSize={12} />
                        <YAxis tick={{ fill: '#9ca3af' }} fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem' }} />
                        <Legend wrapperStyle={{fontSize: "14px"}}/>
                        <Bar dataKey="Messages Sent" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Content Unlocked" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
        <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Top Creators by Revenue (This Month)</h3>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.topCreators.map(creator => (
                    <li key={creator.name} className="py-3 flex justify-between items-center">
                        <span className="font-medium">{creator.name}</span>
                        <span className="font-semibold text-green-500">{formatCurrency(creator.revenue * 100)}</span>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

export default AnalyticsPanel;
