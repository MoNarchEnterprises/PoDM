import React, { useState, useEffect } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';

// --- Import Shared Types ---
import { User } from '@common/types/User';
import { Content } from '@common/types/Content';
import { SupportTicket } from '@common/types/SupportTicket';

// --- Import API Client ---
import apiClient from '../../lib/apiClient';


// --- Local Types ---
export type AdminData = {
    dashboard: {
        keyMetrics: {
            totalUsers: number;
            activeCreators: number;
            monthlyRevenue: number;
            openTickets: number;
        };
        userGrowth: { name: string; Users: number; }[];
    };
    users: User[];
    flaggedContent: Content[];
    analytics: {
        revenueGrowth: { name: string; Revenue: number; }[];
        engagement: { name: string; 'Messages Sent': number; 'Content Unlocked': number; }[];
        topCreators: { name: string; revenue: number; }[];
    };
    reports: any[];
    supportTickets: SupportTicket[];
    settings: {
        admins: User[];
    };
};

// --- Helper to provide a default empty state ---
// This prevents "cannot read properties of undefined" errors on initial render
const EMPTY_DATA: AdminData = {
    dashboard: {
        keyMetrics: { totalUsers: 0, activeCreators: 0, monthlyRevenue: 0, openTickets: 0 },
        userGrowth: []
    },
    users: [],
    flaggedContent: [],
    analytics: {
        revenueGrowth: [],
        engagement: [],
        topCreators: []
    },
    reports: [],
    supportTickets: [],
    settings: {
        admins: []
    },
};

/**
 * A container component that fetches all data for the admin panel
 * and provides it to the child routes via context.
 */
const AdminPanel = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<AdminData>(EMPTY_DATA);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAdminData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Use Promise.all to fetch all data concurrently for better performance
                const [
                    dashboardRes,
                    usersRes,
                    flaggedContentRes,
                    analyticsRes,
                    reportsRes,
                    supportTicketsRes,
                    settingsRes
                ] = await Promise.all([
                    apiClient.get('/admin/dashboard'),
                    apiClient.get('/admin/users'),
                    apiClient.get('/admin/content/flagged'),
                    apiClient.get('/admin/analytics'),
                    apiClient.get('/admin/reports'),
                    apiClient.get('/admin/support-tickets'),
                    apiClient.get('/admin/settings/admins')
                ]);

                // Populate the state with the data from the API responses
                setData({
                    dashboard: dashboardRes.data.data,
                    users: usersRes.data.data,
                    flaggedContent: flaggedContentRes.data.data,
                    analytics: analyticsRes.data.data,
                    reports: reportsRes.data.data,
                    supportTickets: supportTicketsRes.data.data,
                    settings: {
                        admins: settingsRes.data.data
                    }
                });
            } catch (err) {
                console.error("Failed to fetch admin data:", err);
                setError('Failed to load admin data. Please try again later.');
                setData(EMPTY_DATA); // Reset data on error to prevent crashes
            } finally {
                setIsLoading(false);
            }
        };

        fetchAdminData();
    }, []);

    // Display loading or error states to the user
    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading Admin Panel...</div>;
    if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

    // If data is loaded, render the child route (e.g., DashboardPanel)
    // and provide the fetched data and a setter function via context.
    return <Outlet context={{ data, setData }} />;
};

/**
 * A custom hook to easily access the admin data from child components.
 * This avoids having to pass props down through multiple levels.
 */
export function useAdminData() {
    return useOutletContext<{ data: AdminData; setData: React.Dispatch<React.SetStateAction<AdminData>> }>();
}

export default AdminPanel;
