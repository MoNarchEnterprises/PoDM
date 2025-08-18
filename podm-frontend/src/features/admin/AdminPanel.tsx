import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';

// --- Import Shared Types ---
import { User } from '@common/types/User';
import { Content } from '@common/types/Content';
import { SupportTicket } from '@common/types/SupportTicket';

// --- Import API Client ---
import apiClient from '../../lib/apiClient';


// --- Local Types ---
type AdminData = {
    dashboard: any; // Replace with actual type for dashboard data
    users: User[];
    flaggedContent: Content[];
    analytics: any; // Replace with actual type for analytics data
    reports: any[]; // Replace with actual type for reports
    supportTickets: SupportTicket[];
    settings: {
        admins: User[]; // Assuming admins are also users
    };
};

const EMPTY: AdminData = {
    dashboard: null,
    users: [],
    flaggedContent: [],
    analytics: null,
    reports: [],
    supportTickets: [],
    settings: {
        admins: []
    },
};

const AdminContainer = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<AdminData>(EMPTY);
    const [error, setError] = useState<string | null>(null);

    useEffect(()=>{
        const fetchAdminData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                console.log('Fetching admin data...');
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
                    apiClient.get('/admin/settings/admins') // Assuming an endpoint for admins
                ]);
                console.log('Admin data fetched successfully');
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
            } catch (error) {
                console.error("Failed to fetch admin data:", error);
                setError('Failed to load admin data. Please try again later.');
                setData(EMPTY); // Reset data on error
            }
            finally {
                setIsLoading(false);
            }   
        };
        fetchAdminData();
    }, []);

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading Admin Panel...</div>;
    if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
    return (
        <div className="admin-panel">
            <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
            <Outlet context={{ data, setData }} />
        </div>
    );
};

export type { AdminData };
export default AdminContainer;


