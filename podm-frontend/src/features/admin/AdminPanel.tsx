import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LayoutDashboard, Users, Shield, BarChart3, FileText, LifeBuoy, Settings } from 'lucide-react';

// --- Import Shared Types ---
import { User } from '@common/types/User';
import { Content } from '@common/types/Content';
import { SupportTicket } from '@common/types/SupportTicket';

// --- Import API Client ---
import apiClient from '../../lib/apiClient';

// --- Import Panel Components ---
import DashboardPanel from './components/DashboardPanel';
import UserManagementPanel from './components/UserManagementPanel';
import VerificationDetailPanel from './components/VerificationDetailPanel';
import ContentModerationPanel from './components/ContentModerationPanel';
import AnalyticsPanel from './components/AnalyticsPanel';
import ReportsPanel from './components/ReportsPanel';
import SupportTicketsPanel from './components/SupportTicketsPanel';
import SettingsPanel from './components/SettingsPanel';

// --- Local Types ---
interface ViewContext {
  subview?: string;
  userId?: string;
}

// --- Main Admin Panel Component ---
const AdminPanel = () => {
    const [view, setView] = useState<{ panel: string; context: ViewContext | null }>({ panel: 'Dashboard', context: null });
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>({}); // A single state object to hold all fetched data

    useEffect(() => {
        const fetchAdminData = async () => {
            setIsLoading(true);
            try {
                // Use Promise.all to fetch all necessary data concurrently
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
                // Optionally, set an error state here to show an error message in the UI
            } finally {
                setIsLoading(false);
            }
        };
        fetchAdminData();
    }, []);

    const menuItems = [
        { key: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { key: 'Users', label: 'Users', icon: Users },
        { key: 'Content Moderation', label: 'Content', icon: Shield },
        { key: 'Analytics', label: 'Analytics', icon: BarChart3 },
        { key: 'Reports', label: 'Reports', icon: FileText },
        { key: 'Support Tickets', label: 'Support', icon: LifeBuoy },
        { key: 'Settings', label: 'Settings', icon: Settings },
    ];
    
    const handleSetView = (panel: string, context: ViewContext | null = null) => {
        setView({ panel, context });
    };

    const renderContent = () => {
        if (isLoading) return <div className="text-center p-8 text-gray-500">Loading Admin Panel...</div>;

        if (view.panel === 'Users' && view.context?.subview === 'Verification') {
            const userToVerify = data.users.find((u: User) => u._id === view.context!.userId!);
            return <VerificationDetailPanel user={userToVerify} onBack={() => handleSetView('Users')} onApprove={() => {}} onReject={() => {}} />;
        }

        switch (view.panel) {
            case 'Dashboard': return <DashboardPanel data={data.dashboard} />;
            case 'Users': return <UserManagementPanel users={data.users} onViewVerification={(userId) => handleSetView('Users', { subview: 'Verification', userId })} />;
            case 'Content Moderation': return <ContentModerationPanel flaggedContent={data.flaggedContent} />;
            case 'Analytics': return <AnalyticsPanel data={data.analytics} />;
            case 'Reports': return <ReportsPanel reports={data.reports} />;
            case 'Support Tickets': return <SupportTicketsPanel tickets={data.supportTickets} />;
            case 'Settings': return <SettingsPanel admins={data.settings.admins} />;
            default: return <div className="text-center p-8 bg-white dark:bg-gray-800/50 rounded-xl">This section is under construction.</div>;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <nav className="w-64 bg-white dark:bg-gray-800 p-4 border-r border-gray-200 dark:border-gray-700 hidden lg:flex flex-col">
                <div className="text-purple-500 font-bold text-2xl mb-10">PoDM - Admin</div>
                <ul className="space-y-2">
                    {menuItems.map(item => (
                        <li key={item.key}>
                            <a href="#" onClick={() => handleSetView(item.key)} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${view.panel === item.key ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                <item.icon className="w-5 h-5" />
                                <span className="font-medium">{item.label}</span>
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{view.context?.subview || view.panel}</h1>
                </header>
                {renderContent()}
            </main>
        </div>
    );
};

export default AdminPanel;
