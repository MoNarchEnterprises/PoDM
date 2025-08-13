import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useParams } from 'react-router-dom';

// --- Import Shared Types ---
import { Content } from '@common/types/Content';
import { Creator } from '@common/types/Creator';
import { User } from '@common/types/User';
import { Subscription } from '@common/types/Subscription';
import { Conversation } from '@common/types/Conversation';

// --- Import Reusable Layouts & Hooks ---
import MainLayout from './components/layout/MainLayout';
import { AuthProvider } from './hooks/useAuth';
import { FAN_NAV_ITEMS, CREATOR_NAV_ITEMS, ADMIN_NAV_ITEMS } from './lib/constants';

// --- Prop Type Definitions for Pages ---
interface CreatorProfilePageProps { creator: Creator; content: Content[]; }
interface ContentViewerPageProps { content: Content; creator: Creator; relatedContent: Content[]; }
interface FanFeedProps { posts: any[]; creatorsFollowing: Creator[]; }
interface FanGalleryProps { galleryData: any[]; }
interface FanSubscriptionsProps { initialSubscriptions: any[]; }
interface FanMessagesProps { initialConversations: any[]; currentFanId: string; }
interface FanSettingsProps { fan: User; settings: any; }
interface CreatorOnboardingProps { onSubmit: (data: any) => void; }
interface CreatorVerificationProps { onSubmit: (data: any) => void; }
interface CreatorDashboardProps { creator: Creator; metrics: any; recentActivity: any[]; monthlyEarnings: any[]; }
interface CreatorContentProps { initialContent: Content[]; }
interface CreatorMessagesProps { initialConversations: any[]; existingContent: Content[]; currentCreatorId: string; }
interface CreatorAnalyticsProps { metrics: any; subscriberGrowth: any[]; revenueBreakdown: any[]; topContent: Content[]; }
interface CreatorEarningsProps { summary: any; monthlyEarnings: any[]; transactions: any[]; }
interface CreatorSettingsProps { creator: Creator; }

// --- Import Page Components with Type Casting ---
const CreatorProfilePage = React.lazy(() => import('./features/profile/CreatorProfile')) as React.LazyExoticComponent<React.ComponentType<CreatorProfilePageProps>>;
const ContentViewerPage = React.lazy(() => import('./features/viewer/ContentViewer')) as React.LazyExoticComponent<React.ComponentType<ContentViewerPageProps>>;
const FanFeed = React.lazy(() => import('./features/fan/FanFeed')) as React.LazyExoticComponent<React.ComponentType<FanFeedProps>>;
const FanGallery = React.lazy(() => import('./features/fan/FanGallery')) as React.LazyExoticComponent<React.ComponentType<FanGalleryProps>>;
const FanSubscriptions = React.lazy(() => import('./features/fan/FanSubscriptions')) as React.LazyExoticComponent<React.ComponentType<FanSubscriptionsProps>>;
const FanMessages = React.lazy(() => import('./features/fan/FanMessages')) as React.LazyExoticComponent<React.ComponentType<FanMessagesProps>>;
const FanSettings = React.lazy(() => import('./features/fan/FanSettings')) as React.LazyExoticComponent<React.ComponentType<FanSettingsProps>>;
const CreatorOnboarding = React.lazy(() => import('./features/auth/CreatorOnboarding')) as React.LazyExoticComponent<React.ComponentType<CreatorOnboardingProps>>;
const CreatorVerification = React.lazy(() => import('./features/auth/CreatorVerification')) as React.LazyExoticComponent<React.ComponentType<CreatorVerificationProps>>;
const CreatorDashboard = React.lazy(() => import('./features/creator/CreatorDashboard')) as React.LazyExoticComponent<React.ComponentType<CreatorDashboardProps>>;
const CreatorContent = React.lazy(() => import('./features/creator/CreatorContent')) as React.LazyExoticComponent<React.ComponentType<CreatorContentProps>>;
const CreatorMessages = React.lazy(() => import('./features/creator/CreatorMessages')) as React.LazyExoticComponent<React.ComponentType<CreatorMessagesProps>>;
const CreatorAnalytics = React.lazy(() => import('./features/creator/CreatorAnalytics')) as React.LazyExoticComponent<React.ComponentType<CreatorAnalyticsProps>>;
const CreatorEarnings = React.lazy(() => import('./features/creator/CreatorEarnings')) as React.LazyExoticComponent<React.ComponentType<CreatorEarningsProps>>;
const CreatorSettings = React.lazy(() => import('./features/creator/CreatorSettings')) as React.LazyExoticComponent<React.ComponentType<CreatorSettingsProps>>;
const AdminPanel = React.lazy(() => import('./features/admin/AdminPanel'));
import SplashPage from './pages/SplashPage';
import AdminLoginPage from './pages/AdminLoginPage';


// --- Page Loader Components ---
const CreatorProfileLoader = () => {
    const { username } = useParams<{ username: string }>();
    const [isLoading, setIsLoading] = useState(true);
    const [creator, setCreator] = useState<Creator | null>(null);
    const [content, setContent] = useState<Content[]>([]);
    useEffect(() => { /* Simulate API call */ setIsLoading(false); }, [username]);
    if (isLoading || !creator) return <div>Loading Profile...</div>;
    return <CreatorProfilePage creator={creator} content={content} />;
};

const ContentViewerLoader = () => {
    const { contentId } = useParams<{ contentId: string }>();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<{ content: Content; creator: Creator; relatedContent: Content[] } | null>(null);
    useEffect(() => { /* Simulate API call */ setIsLoading(false); }, [contentId]);
    if (isLoading || !data) return <div>Loading Content...</div>;
    return <ContentViewerPage content={data.content} creator={data.creator} relatedContent={data.relatedContent} />;
};

const FanFeedLoader = () => { return <FanFeed posts={[]} creatorsFollowing={[]} />; };
const FanGalleryLoader = () => { return <FanGallery galleryData={[]} />; };
const FanSubscriptionsLoader = () => { return <FanSubscriptions initialSubscriptions={[]} />; };
const FanMessagesLoader = () => { return <FanMessages initialConversations={[]} currentFanId="fan123" />; };
const FanSettingsLoader = () => { const fan = {} as User; const settings = {} as any; return <FanSettings fan={fan} settings={settings} />; };
const CreatorDashboardLoader = () => { return <CreatorDashboard creator={{} as any} metrics={{} as any} recentActivity={[]} monthlyEarnings={[]} />; };
const CreatorContentLoader = () => { return <CreatorContent initialContent={[]} />; };
const CreatorMessagesLoader = () => { return <CreatorMessages initialConversations={[]} existingContent={[]} currentCreatorId="creator123" />; };
const CreatorAnalyticsLoader = () => { return <CreatorAnalytics metrics={{} as any} subscriberGrowth={[]} revenueBreakdown={[]} topContent={[]} />; };
const CreatorEarningsLoader = () => { return <CreatorEarnings summary={{} as any} monthlyEarnings={[]} transactions={[]} />; };
const CreatorSettingsLoader = () => { return <CreatorSettings creator={{} as any} />; };

const CreatorOnboardingLoader = () => {
    const handleOnboardingSubmit = (data: any) => { console.log("Onboarding Submitted:", data); };
    return <CreatorOnboarding onSubmit={handleOnboardingSubmit} />;
};

const CreatorVerificationLoader = () => {
    const handleVerificationSubmit = (data: any) => { console.log("Verification Submitted:", data); };
    return <CreatorVerification onSubmit={handleVerificationSubmit} />;
};


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
                        <Route path="/verification" element={<CreatorVerificationLoader />} />

                        {/* --- Fan Routes (Protected) --- */}
                        <Route element={<FanLayout />}>
                            <Route path="/feed" element={<FanFeedLoader />} />
                            <Route path="/gallery" element={<FanGalleryLoader />} />
                            <Route path="/subscriptions" element={<FanSubscriptionsLoader />} />
                            <Route path="/messages" element={<FanMessagesLoader />} />
                            <Route path="/settings" element={<FanSettingsLoader />} />
                        </Route>

                        {/* --- Creator Routes (Protected) --- */}
                        <Route path="/creator" element={<CreatorLayout />}>
                            <Route path="dashboard" element={<CreatorDashboardLoader />} />
                            <Route path="content" element={<CreatorContentLoader />} />
                            <Route path="messages" element={<CreatorMessagesLoader />} />
                            <Route path="analytics" element={<CreatorAnalyticsLoader />} />
                            <Route path="earnings" element={<CreatorEarningsLoader />} />
                            <Route path="settings" element={<CreatorSettingsLoader />} />
                        </Route>

                        {/* --- Admin Routes (Protected) --- */}
                        <Route path="/admin/login" element={<AdminLoginPage />} />
                        <Route path="/admin" element={<AdminLayout />}>
                            <Route path="*" element={<AdminPanel />} />
                        </Route>

                    </Routes>
                </React.Suspense>
            </BrowserRouter>
        </AuthProvider>
    );
};

export default App;
