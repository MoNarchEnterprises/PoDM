import React from 'react';
import { Users, BarChart3, LifeBuoy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- Import Reusable Components & Hooks ---
import StatCard from '../../../components/shared/StatCard';
import { formatCurrency } from '../../../lib/formatters';
import { useAdminData } from '../AdminPanel'; // Import the custom hook

// --- Main Dashboard Panel Component ---
const DashboardPanel = () => {
    // Get the admin data directly from the parent context
    const { data } = useAdminData();

    // Handle the case where data might not be loaded yet
    if (!data || !data.dashboard) {
        return <div className="p-8 text-center text-gray-500">Loading dashboard data...</div>;
    }

    const dashboardData = data.dashboard;

    // --- THIS IS THE FIX ---
    // An "open" ticket is any ticket that is not 'Closed'.
    // This now correctly includes 'Open', 'Pending', and 'Escalated' statuses.
    const openTicketsCount = data.supportTickets?.filter(
        ticket => ticket.status !== 'Closed'
    ).length || 0;
    // --- END OF FIX ---

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">A high-level overview of your platform's key metrics.</p>
            </header>
            <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                        title="Total Users" 
                        value={dashboardData.keyMetrics.totalUsers.toLocaleString()} 
                        icon={Users} 
                        color="purple" 
                    />
                    <StatCard 
                        title="Active Creators" 
                        value={dashboardData.keyMetrics.activeCreators.toLocaleString()} 
                        icon={Users} 
                        color="pink" 
                    />
                    <StatCard 
                        title="Monthly Revenue" 
                        value={formatCurrency(dashboardData.keyMetrics.monthlyRevenue)} 
                        icon={BarChart3} 
                        color="green" 
                    />
                    <StatCard 
                        title="Open Support Tickets" 
                        // Use the newly calculated count here
                        value={openTicketsCount.toLocaleString()} 
                        icon={LifeBuoy} 
                        color="blue" 
                    />
                </div>
                <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">User Growth</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dashboardData.userGrowth}>
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
        </div>
    );
};

export default DashboardPanel;