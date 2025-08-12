import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LayoutDashboard, Users, Shield, BarChart3, FileText, LifeBuoy, Settings } from 'lucide-react';

// --- Import Shared Types ---
import { User } from '../../../common/types/User';
import { Content } from '../../../common/types/Content';
import { SupportTicket } from '../../../common/types/SupportTicket';

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
        const fetchData = async () => {
            setIsLoading(true);
            // In a real app, you'd fetch data for all panels from your API here
            // This simulates a single, comprehensive API call
            setData({
                dashboard: { keyMetrics: { totalUsers: 12345, activeCreators: 1234, monthlyRevenue: 123456.78, openTickets: 45 }, userGrowth: [ { name: 'Mar', Users: 8500 }, { name: 'Apr', Users: 9200 }, { name: 'May', Users: 10500 } ] },
                users: [
                    { _id: '1', profile: { name: 'Fan123', avatar: 'https://placehold.co/100x100/7C3AED/FFFFFF?text=F1' }, role: 'fan', status: 'Active', createdAt: '2025-08-09T00:00:00Z' },
                    { _id: '6', profile: { name: 'PendingCreator', avatar: 'https://placehold.co/100x100/f59e0b/FFFFFF?text=PC' }, role: 'creator', status: 'pending verification', createdAt: '2025-08-11T00:00:00Z', verificationDocs: { idUrl: 'https://placehold.co/600x400/1F2937/FFFFFF?text=ID+Card', selfieUrl: 'https://placehold.co/600x400/1F2937/FFFFFF?text=Selfie+with+ID', signature: 'Pending Creator' } },
                ],
                flaggedContent: [
                    { _id: 'fc1', title: 'Flagged Post 1', creator: { _id: 'c1', profile: { name: 'CreatorOne', avatar: 'https://placehold.co/100x100/7E22CE/FFFFFF?text=C1' } }, files: [{thumbnailUrl: 'https://placehold.co/400x400/1F2937/FFFFFF?text=Content'}], reportCount: 5, reason: 'Inappropriate content' },
                ],
                analytics: { revenueGrowth: [ { name: 'Mar', Revenue: 85000 } ], engagement: [ { name: 'Mar', 'Messages Sent': 15000, 'Content Unlocked': 5000 } ], topCreators: [ { name: 'CreatorOne', revenue: 12500.50 } ] },
                reports: [ { id: 1, name: 'Monthly Revenue Report', lastRun: '2025-08-01' } ],
                supportTickets: [
                    { _id: 't1', userId: 'u1', subject: 'Billing Issue', status: 'Open', priority: 'High', conversation: [{ senderId: 'u1', senderName: 'Fan123', text: 'I was charged twice.', timestamp: '2025-08-10T10:30:00Z' }] }
                ],
                settings: {
                    admins: [ { _id: 'a1', profile: {name: 'AdminUser'}, email: 'admin@podm.com', role: 'Super Admin' } ]
                }
            });
            setIsLoading(false);
        };
        fetchData();
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

export default function App() {
    const [isDarkMode, setIsDarkMode] = useState(true);
    return (
        <div className={isDarkMode ? 'dark' : ''}>
            <AdminPanel />
        </div>
    );
}
