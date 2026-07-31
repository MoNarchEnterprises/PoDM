import React, { useState, useEffect } from 'react';
import { Users, BarChart3, LifeBuoy, Crown, CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- Import Reusable Components & Hooks ---
import StatCard from '../../../components/shared/StatCard';
import { formatCurrency, formatDate } from '../../../lib/formatters';
import { useAdminData } from '../AdminPanel'; // Import the custom hook
import apiClient from '../../../lib/apiClient';

interface EnclaveApplication {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    current_platform: string[];
    follower_count: string;
    monthly_earnings: string | null;
    content_type: string[];
    why_join: string;
    how_heard: string;
    referral_code: string | null;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
}

// --- Main Dashboard Panel Component ---
const DashboardPanel = () => {
    // Get the admin data directly from the parent context
    const { data } = useAdminData();

    // Enclave applications state
    const [enclaveApps, setEnclaveApps] = useState<EnclaveApplication[]>([]);
    const [selectedApp, setSelectedApp] = useState<EnclaveApplication | null>(null);
    const [spotsRemaining, setSpotsRemaining] = useState<number>(50);

    // Fetch Enclave applications
    useEffect(() => {
        const fetchEnclaveData = async () => {
            try {
                const [appsRes, spotsRes] = await Promise.all([
                    apiClient.get('/enclave/applications?status=pending'),
                    apiClient.get('/enclave/spots-remaining')
                ]);
                setEnclaveApps(appsRes.data.applications || []);
                setSpotsRemaining(spotsRes.data.spotsRemaining);
            } catch (err) {
                console.error('Failed to fetch enclave data:', err);
            }
        };
        fetchEnclaveData();
    }, []);

    const updateApplicationStatus = async (id: string, status: 'accepted' | 'rejected') => {
        if (!window.confirm(`Are you sure you want to ${status} this application?`)) return;

        try {
            await apiClient.patch(`/enclave/applications/${id}`, { status });
            // Refresh data
            const [appsRes, spotsRes] = await Promise.all([
                apiClient.get('/enclave/applications?status=pending'),
                apiClient.get('/enclave/spots-remaining')
            ]);
            setEnclaveApps(appsRes.data.applications || []);
            setSpotsRemaining(spotsRes.data.spotsRemaining);
            setSelectedApp(null);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to update application');
        }
    };

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

                {/* Enclave Applications Section */}
                <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 dark:bg-gray-800/50 rounded-xl shadow-md p-4 sm:p-6 border border-purple-500/30">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Crown className="w-6 h-6 text-purple-400" />
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Enclave Applications</h3>
                        </div>
                        <div className="text-sm text-gray-400">
                            <span className="font-semibold text-purple-400">{spotsRemaining}</span> spots remaining
                        </div>
                    </div>

                    {enclaveApps.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No pending applications</p>
                    ) : (
                        <div className="space-y-3">
                            {enclaveApps.slice(0, 5).map((app) => (
                                <div key={app.id} className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-lg p-4 hover:border-purple-500/50 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-white truncate">{app.full_name}</h4>
                                                <span className="text-xs text-gray-400">•</span>
                                                <span className="text-sm text-gray-400">{Array.isArray(app.current_platform) ? app.current_platform.join(', ') : app.current_platform}</span>
                                            </div>
                                            <p className="text-sm text-gray-400 mb-2">{app.email}</p>
                                            <p className="text-xs text-gray-500">
                                                {app.follower_count} followers • Applied {formatDate(app.created_at)}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setSelectedApp(app)}
                                                className="px-3 py-1.5 text-xs font-medium text-purple-400 hover:text-purple-300 border border-purple-500/50 hover:border-purple-400 rounded-lg transition-colors"
                                            >
                                                View
                                            </button>
                                            <button
                                                onClick={() => updateApplicationStatus(app.id, 'accepted')}
                                                className="px-3 py-1.5 text-xs font-medium text-green-400 hover:text-green-300 border border-green-500/50 hover:border-green-400 rounded-lg transition-colors"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => updateApplicationStatus(app.id, 'rejected')}
                                                className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 border border-red-500/50 hover:border-red-400 rounded-lg transition-colors"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {enclaveApps.length > 5 && (
                                <p className="text-center text-sm text-gray-400 pt-2">
                                    + {enclaveApps.length - 5} more pending applications
                                </p>
                            )}
                        </div>
                    )}
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

            {/* Application Detail Modal */}
            {selectedApp && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white">{selectedApp.full_name}</h2>
                                <p className="text-gray-400">{selectedApp.email}</p>
                            </div>
                            <button onClick={() => setSelectedApp(null)} className="text-gray-400 hover:text-white">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Contact Information */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Contact Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-400">Email</label>
                                        <p className="text-white">{selectedApp.email}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400">Phone</label>
                                        <p className="text-white">{selectedApp.phone || 'Not provided'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Platform & Audience */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Platform & Audience</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-400">Current Platform(s)</label>
                                        <p className="text-white">{Array.isArray(selectedApp.current_platform) ? selectedApp.current_platform.join(', ') : selectedApp.current_platform}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400">Follower Count</label>
                                        <p className="text-white">{selectedApp.follower_count}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400">Monthly Earnings</label>
                                        <p className="text-white">{selectedApp.monthly_earnings || 'Not provided'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400">Content Type</label>
                                        <p className="text-white">{selectedApp.content_type.join(', ')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Why Join */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Why Join The Enclave</h3>
                                <p className="text-gray-300 whitespace-pre-wrap bg-gray-800/50 p-4 rounded-lg">{selectedApp.why_join}</p>
                            </div>

                            {/* Additional Information */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Additional Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-400">How They Heard</label>
                                        <p className="text-white">{selectedApp.how_heard}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400">Referral Code</label>
                                        <p className="text-white">{selectedApp.referral_code || 'None'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => updateApplicationStatus(selectedApp.id, 'accepted')}
                                    className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                                >
                                    Accept Application
                                </button>
                                <button
                                    onClick={() => updateApplicationStatus(selectedApp.id, 'rejected')}
                                    className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                                >
                                    Reject Application
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPanel;
