import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, Users as UsersIcon, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '../../../lib/formatters';
import { useAdminData } from '../AdminPanel';
import * as apiClient from '../../../lib/apiClient';

const AnalyticsPanel = () => {
    // Access global admin data for the initial creators list
    const { data: adminData } = useAdminData();

    // --- State ---
    const [timeframe, setTimeframe] = useState('6m');
    const [selectedCreator, setSelectedCreator] = useState<string>('');
    const [drillDown, setDrillDown] = useState<{ year: number; month: string } | null>(null);
    const [_isLoading, setIsLoading] = useState(false);
    const [showCustomRange, setShowCustomRange] = useState(false);
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    const [analyticsData, setAnalyticsData] = useState<any>(null);

    // Filter users to get creators only
    const creators = adminData?.users.filter(u => u.role === 'creator') || [];

    // --- Fetch Data ---
    useEffect(() => {
        const fetchData = async () => {
            // Don't fetch if custom range is selected but dates aren't set yet
            if (timeframe === 'custom' && (!customStartDate || !customEndDate)) {
                return;
            }

            setIsLoading(true);
            try {
                const params: any = {
                    creatorId: selectedCreator || undefined,
                };

                // Handle custom date range
                if (timeframe === 'custom' && customStartDate && customEndDate) {
                    params.startDate = customStartDate;
                    params.endDate = customEndDate;
                } else if (timeframe !== 'custom') {
                    params.period = timeframe;
                }

                if (drillDown) {
                    params.year = drillDown.year;
                    params.month = drillDown.month;
                    params.groupBy = 'day';
                }

                const response = await apiClient.getPlatformAnalytics(params);
                // Extract the actual data from the { success: true, data: {...} } wrapper
                const data = response.data || response;
                setAnalyticsData(data);
            } catch (error) {
                console.error("Failed to fetch analytics:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [timeframe, selectedCreator, drillDown, customStartDate, customEndDate]);

    // --- Handlers ---
    const handleDrillDown = (data: any) => {
        if (!data || !data.activeLabel) return;
        if (drillDown) return; // Already drilled down

        // Parsing logic: Assumes label is like "Jan", "Feb" or "Jan 2024"
        const label = data.activeLabel;
        const parts = label.split(' ');
        const month = parts[0];
        // If year is present use it, else assume current year or deduce?
        // Our backend logic for '6m' etc implies relative to now. 
        // For simplicity, let's assume current year if not present, 
        // OR better, our backend returning "Jan 2025" is safest. 
        // My backend implementation used full format: "Month Year". 
        // Let's parse that.
        const year = parts[1] ? parseInt(parts[1]) : new Date().getFullYear();

        setDrillDown({ month, year });
    };

    const handleBackToOverview = () => {
        setDrillDown(null);
    };

    const handleTimeframeChange = (value: string) => {
        setTimeframe(value);
        if (value === 'custom') {
            setShowCustomRange(true);
        } else {
            setShowCustomRange(false);
        }
    };

    const handleApplyCustomRange = () => {
        setShowCustomRange(false);
        // Trigger refetch via useEffect dependency
    };

    if (!analyticsData) {
        return <div className="p-8 text-center text-gray-500">Loading analytics...</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        {drillDown && (
                            <button
                                onClick={handleBackToOverview}
                                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                        )}
                        {drillDown ? `${drillDown.month} ${drillDown.year} Details` : 'Platform Analytics'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {drillDown ? 'Daily breakdown of performance.' : 'Overview of platform growth and engagement.'}
                    </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                    {/* Timeframe Selector (Hidden in Drill-down) */}
                    {!drillDown && (
                        <div className="flex items-center gap-2 px-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <select
                                value={timeframe}
                                onChange={(e) => handleTimeframeChange(e.target.value)}
                                className="bg-white dark:bg-gray-800 border-none focus:ring-0 text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer"
                            >
                                <option value="30d">Last 30 Days</option>
                                <option value="6m">Last 6 Months</option>
                                <option value="ytd">Year to Date</option>
                                <option value="1y">Last Year</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>
                    )}

                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 hidden md:block"></div>

                    {/* Creator Filter */}
                    <div className="flex items-center gap-2 px-2">
                        <UsersIcon className="w-4 h-4 text-gray-500" />
                        <select
                            value={selectedCreator}
                            onChange={(e) => setSelectedCreator(e.target.value)}
                            className="bg-white dark:bg-gray-800 border-none focus:ring-0 text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer max-w-[150px]"
                        >
                            <option value="">All Creators</option>
                            {creators.map(c => (
                                <option key={c.id} value={c.id}>{c.profile.name || c.username}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Custom Date Range Modal */}
            {showCustomRange && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xl max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Custom Date Range</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div className="flex gap-3 justify-end mt-6">
                                <button
                                    onClick={() => {
                                        setShowCustomRange(false);
                                        setTimeframe('6m');
                                    }}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApplyCustomRange}
                                    disabled={!customStartDate || !customEndDate}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Chart */}
                <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Revenue</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                            data={analyticsData.revenueGrowth}
                            onClick={!drillDown ? handleDrillDown : undefined}
                            className={!drillDown ? "cursor-pointer" : ""}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                            <XAxis dataKey="name" tick={{ fill: '#9ca3af' }} fontSize={12} />
                            <YAxis tick={{ fill: '#9ca3af' }} fontSize={12} tickFormatter={(value) => `$${(value / 100).toFixed(0)}`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem' }}
                                formatter={(value: any) => formatCurrency(value ?? 0)}
                            />
                            <Line type="monotone" dataKey="Revenue" stroke="#10B981" strokeWidth={2} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                    {!drillDown && <p className="text-xs text-center text-gray-400 mt-2">Click on a data point to view daily breakdown</p>}
                </div>

                {/* Engagement Chart */}
                <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">User Engagement</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={analyticsData.engagement}
                            onClick={!drillDown ? handleDrillDown : undefined}
                            className={!drillDown ? "cursor-pointer" : ""}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                            <XAxis dataKey="name" tick={{ fill: '#9ca3af' }} fontSize={12} />
                            <YAxis tick={{ fill: '#9ca3af' }} fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem' }} />
                            <Legend wrapperStyle={{ fontSize: "14px" }} />
                            <Bar dataKey="Messages Sent" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Content Unlocked" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    {!drillDown && <p className="text-xs text-center text-gray-400 mt-2">Click on a bar to view daily breakdown</p>}
                </div>
            </div>

            {/* Top Creators */}
            <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Top Creators</h3>
                    <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        by Revenue ({drillDown ? 'Selected Month' : 'Selected Period'})
                    </span>
                </div>

                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {analyticsData.topCreators && analyticsData.topCreators.length > 0 ? (
                        analyticsData.topCreators.map((creator: any, index: number) => (
                            <li key={index} className="py-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/30 px-2 rounded-lg transition-colors">
                                <span className="font-medium flex items-center gap-3">
                                    <span className="text-gray-400 font-mono text-sm w-4">#{index + 1}</span>
                                    {creator.name}
                                </span>
                                <span className="font-semibold text-green-500">{formatCurrency(creator.revenue)}</span>
                            </li>
                        ))
                    ) : (
                        <li className="py-4 text-center text-gray-500">No revenue data for this period.</li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default AnalyticsPanel;
