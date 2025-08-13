import React from 'react';
import { Users, BarChart3, LifeBuoy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- Import Reusable Components & Helpers ---
import StatCard from '../../../components/shared/StatCard';
import { formatCurrency } from '../../../lib/formatters';

// --- Local Types ---
// This defines the shape of the data this specific component expects to receive.
interface DashboardData {
    keyMetrics: {
        totalUsers: number;
        activeCreators: number;
        monthlyRevenue: number; // in cents
        openTickets: number;
    };
    userGrowth: { name: string; Users: number; }[];
}

// --- Main Dashboard Panel Component ---
interface DashboardPanelProps {
    data: DashboardData;
}

const DashboardPanel = ({ data }: DashboardPanelProps) => (
    <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                title="Total Users" 
                value={data.keyMetrics.totalUsers.toLocaleString()} 
                icon={Users} 
                color="purple" 
            />
            <StatCard 
                title="Active Creators" 
                value={data.keyMetrics.activeCreators.toLocaleString()} 
                icon={Users} 
                color="pink" 
            />
            <StatCard 
                title="Monthly Revenue" 
                value={formatCurrency(data.keyMetrics.monthlyRevenue)} 
                icon={BarChart3} 
                color="green" 
            />
            <StatCard 
                title="Open Support Tickets" 
                value={data.keyMetrics.openTickets.toLocaleString()} 
                icon={LifeBuoy} 
                color="blue" 
            />
        </div>
        <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">User Growth</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af' }} fontSize={12} />
                    <YAxis tick={{ fill: '#9ca3af' }} fontSize={12} />
                    <Tooltip 
                        cursor={{ fill: 'rgba(107, 70, 193, 0.1)' }} 
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem' }} 
                    />
                    <Bar dataKey="Users" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
);

export default DashboardPanel;
