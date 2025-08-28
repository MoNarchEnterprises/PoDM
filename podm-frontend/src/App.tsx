import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useParams } from 'react-router-dom';
import * as apiClient from './lib/apiClient';
// --- Import Shared Types ---
import { Content } from '@common/types/Content';
import { Creator } from '@common/types/Creator';
import { User } from '@common/types/User';

// --- Import Reusable Layouts & Hooks ---
import MainLayout from './components/layout/MainLayout';
import { AuthProvider } from './hooks/useAuth';
import { FAN_NAV_ITEMS, CREATOR_NAV_ITEMS, ADMIN_NAV_ITEMS } from './lib/constants';
import ProtectedRoute from './components/auth/ProtectedRoute';
import CreatorRouteGuard from './components/auth/CreatorRouteGuard';

import { useAuth } from './hooks/useAuth';
import { useCreatorData } from './hooks/useCreatorData'; // Import the new hook



// --- Import Page Components (Lazy Loaded) ---
const SplashPage = React.lazy(() => import('./pages/SplashPage'));
const AdminLoginPage = React.lazy(() => import('./pages/AdminLoginPage'));
const CreatorProfilePage = React.lazy(() => import('./features/profile/CreatorProfile'));
const ContentViewerPage = React.lazy(() => import('./features/viewer/ContentViewer'));
const FanFeed = React.lazy(() => import('./features/fan/FanFeed'));
const FanGallery = React.lazy(() => import('./features/fan/FanGallery'));
const FanSubscriptions = React.lazy(() => import('./features/fan/FanSubscriptions'));
const FanMessages = React.lazy(() => import('./features/fan/FanMessages'));
const FanSettings = React.lazy(() => import('./features/fan/FanSettings'));
const CreatorOnboarding = React.lazy(() => import('./features/auth/CreatorOnboarding'));
const CreatorVerification = React.lazy(() => import('./features/auth/CreatorVerification'));
const CreatorDashboard = React.lazy(() => import('./features/creator/CreatorDashboard'));
const CreatorContent = React.lazy(() => import('./features/creator/CreatorContent'));
const CreatorMessages = React.lazy(() => import('./features/creator/CreatorMessages'));
const CreatorAnalytics = React.lazy(() => import('./features/creator/CreatorAnalytics'));
const CreatorEarnings = React.lazy(() => import('./features/creator/CreatorEarnings'));
const CreatorSettings = React.lazy(() => import('./features/creator/CreatorSettings'));

// --- Import Admin Panel Components (Lazy Loaded) ---
const AdminPanel = React.lazy(() => import('./features/admin/AdminPanel'));
const DashboardPanel = React.lazy(() => import('./features/admin/components/DashboardPanel'));
const UserManagementPanel = React.lazy(() => import('./features/admin/components/UserManagementPanel'));
const ContentModerationPanel = React.lazy(() => import('./features/admin/components/ContentModerationPanel'));
const AnalyticsPanel = React.lazy(() => import('./features/admin/components/AnalyticsPanel'));
const ReportsPanel = React.lazy(() => import('./features/admin/components/ReportsPanel'));
const SupportTicketsPanel = React.lazy(() => import('./features/admin/components/SupportTicketsPanel'));
const SettingsPanel = React.lazy(() => import('./features/admin/components/SettingsPanel'));


// --- Prop Type Definitions for Pages ---
// Note: These are kept for components that are passed props, like ContentViewerPage
interface ContentViewerPageProps { content: Content; creator: Creator; relatedContent: Content[]; }
interface FanFeedProps { posts: any[]; creatorsFollowing: Creator[]; }
interface FanGalleryProps { galleryData: any[]; }
interface FanSubscriptionsProps { initialSubscriptions: any[]; }
interface FanMessagesProps { initialConversations: any[]; currentFanId: string; }
interface FanSettingsProps { fan: User; settings: any; }
interface CreatorDashboardProps { creator: Creator; metrics: any; recentActivity: any[]; monthlyEarnings: any[]; }
interface CreatorContentProps { initialContent: Content[]; }
interface CreatorMessagesProps { initialConversations: any[]; existingContent: Content[]; currentCreatorId: string; }
interface CreatorAnalyticsProps { metrics: any; subscriberGrowth: any[]; revenueBreakdown: any[]; topContent: Content[]; }
interface CreatorEarningsProps { summary: any; monthlyEarnings: any[]; transactions: any[]; }
interface CreatorSettingsProps { creator: Creator; }


// --- Page Loader Components ---
// This component now just renders the lazy-loaded CreatorProfilePage,
// which handles its own data fetching.
const CreatorProfileLoader = () => <CreatorProfilePage />;

const ContentViewerLoader = () => {
    const { contentId } = useParams<{ contentId: string }>();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<{ content: Content; creator: Creator; relatedContent: Content[] } | null>(null);
    useEffect(() => { /* Simulate API call */ setIsLoading(false); setData({} as any); }, [contentId]);
    if (isLoading || !data) return <div>Loading Content...</div>;
    return <ContentViewerPage content={data.content} creator={data.creator} relatedContent={data.relatedContent} />;
};

const FanFeedLoader = () => { return <FanFeed posts={[]} creatorsFollowing={[]} />; };
const FanGalleryLoader = () => { return <FanGallery galleryData={[]} />; };
const FanSubscriptionsLoader = () => { return <FanSubscriptions initialSubscriptions={[]} />; };
const FanMessagesLoader = () => { return <FanMessages initialConversations={[]} currentFanId="fan123" />; };
const FanSettingsLoader = () => { const fan = {} as User; const settings = {} as any; return <FanSettings fan={fan} settings={settings} />; };

const CreatorDashboardLoader = () => {
    const { user } = useAuth(); // Get the logged-in user, who is the creator
    const { dashboardData, isLoading, error } = useCreatorData(user as Creator);

    if (isLoading) {
        return <div className="p-8 text-center">Loading dashboard...</div>;
    }
    if (error || !dashboardData) {
        return <div className="p-8 text-center text-red-500">{error || 'Could not load data.'}</div>;
    }

    return <CreatorDashboard creator={user as Creator} metrics={dashboardData.keyMetrics} recentActivity={dashboardData.recentActivity} monthlyEarnings={dashboardData.monthlyEarnings} />;
};

const CreatorContentLoader = () => {
    const [content, setContent] = useState<Content[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const response = await apiClient.getMyCreatorContent();
                const shapedContent = response.data.map((item: any) => ({
                    ...item,
                    _id: item.id.toString(),
                }));
                setContent(shapedContent);
            } catch (err) {
                setError('Failed to load your content.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchContent();
    }, []);

    if (isLoading) {
        return <div className="p-8 text-center">Loading your content...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-500">{error}</div>;
    }

    return <CreatorContent initialContent={content} />;
};

const CreatorMessagesLoader = () => { return <CreatorMessages initialConversations={[]} existingContent={[]} currentCreatorId="creator123" />; };
const CreatorAnalyticsLoader = () => { return <CreatorAnalytics metrics={{} as any} subscriberGrowth={[]} revenueBreakdown={[]} topContent={[]} />; };
const CreatorEarningsLoader = () => { return <CreatorEarnings summary={{} as any} monthlyEarnings={[]} transactions={[]} />; };
const CreatorSettingsLoader = () => { return <CreatorSettings creator={{} as any} />; };

// Corrected Loaders: These components are self-contained and don't need props passed from the router.
const CreatorOnboardingLoader = () => <CreatorOnboarding />;






// --- Layout Wrapper Components ---
const FanLayout = () => ( <MainLayout logoText="PoDM" navItems={FAN_NAV_ITEMS}><React.Suspense fallback={<div>Loading...</div>}><Outlet /></React.Suspense></MainLayout> );
const CreatorLayout = () => ( <MainLayout logoText="PoDM" navItems={CREATOR_NAV_ITEMS}><React.Suspense fallback={<div>Loading...</div>}><Outlet /></React.Suspense></MainLayout> );
const AdminLayout = () => ( <MainLayout logoText="PoDM - Admin" navItems={ADMIN_NAV_ITEMS}><React.Suspense fallback={<div>Loading...</div>}><Outlet /></React.Suspense></MainLayout> );


// --- Main App Component ---
const App = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <React.Suspense fallback={<div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading Page...</div>}>
                    <Routes>
                        {/* --- Public Routes --- */}
                        <Route path="/" element={<SplashPage />} />
                        <Route path="/creator/:username" element={<CreatorProfileLoader />} />
                        <Route path="/content/:contentId" element={<ContentViewerLoader />} />
                        
                        {/* --- Auth Routes --- */}
                        <Route path="/onboarding" element={<CreatorOnboardingLoader />} />
                        <Route path="/verification" element={<CreatorVerification />} />
                        <Route path="/admin/login" element={<AdminLoginPage />} />

                        {/* --- Fan Routes (Protected) --- */}
                        <Route path="/fan" element={<FanLayout />}>
                            <Route index element={<FanFeedLoader />} />
                            <Route path="feed" element={<FanFeedLoader />} />
                            <Route path="gallery" element={<FanGalleryLoader />} />
                            <Route path="subscriptions" element={<FanSubscriptionsLoader />} />
                            <Route path="messages" element={<FanMessagesLoader />} />
                            <Route path="settings" element={<FanSettingsLoader />} />
                        </Route>

                        {/* --- Creator Routes (Protected) --- */}
                        {/* 2. WRAP THE CREATOR ROUTES WITH THE NEW GUARD */}
                        <Route element={<CreatorRouteGuard />}>
                            <Route path="/creator" element={<CreatorLayout />}>
                               <Route index element={<CreatorDashboardLoader />} />
                               <Route path="dashboard" element={<CreatorDashboardLoader />} />
                               <Route path="content" element={<CreatorContentLoader />} />
                               <Route path="messages" element={<CreatorMessagesLoader />} />
                               <Route path="analytics" element={<CreatorAnalyticsLoader />} />
                               <Route path="earnings" element={<CreatorEarningsLoader />} />
                               <Route path="settings" element={<CreatorSettingsLoader />} />
                            </Route>
                        </Route>

                        {/* --- Admin Routes (Protected) --- */}
                        <Route element={<ProtectedRoute requiredRole="admin" />}>
                            <Route path="/admin" element={<AdminLayout />}>
                                {/* The AdminPanel now acts as a data loader and provides the Outlet */}
                                <Route element={<AdminPanel />}>
                                    <Route index element={<DashboardPanel />} />
                                    <Route path="dashboard" element={<DashboardPanel />} />
                                    <Route path="users" element={<UserManagementPanel />} />
                                    <Route path="content" element={<ContentModerationPanel />} />
                                    <Route path="analytics" element={<AnalyticsPanel />} />
                                    <Route path="reports" element={<ReportsPanel />} />
                                    <Route path="support" element={<SupportTicketsPanel />} />
                                    <Route path="settings" element={<SettingsPanel />} />
                                </Route>
                            </Route>
                        </Route>

                    </Routes>
                </React.Suspense>
            </BrowserRouter>
        </AuthProvider>
    );

};

export default App;
