import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useParams } from 'react-router-dom';

// --- Import Shared Types ---
import { Content } from '@common/types/Content';
import { Creator } from '@common/types/Creator';
import { User } from '@common/types/User';
import { Subscription } from '@common/types/Subscription';
import { Conversation } from '@common/types/Conversation';
import { Transaction } from '@common/types/Transaction';

// --- Import Reusable Layouts & Hooks ---
import MainLayout from './components/layout/MainLayout';
import { AuthProvider } from './hooks/useAuth';
import { FAN_NAV_ITEMS, CREATOR_NAV_ITEMS, ADMIN_NAV_ITEMS } from './lib/constants';

// --- Import Page Components ---
// Public Pages
import SplashPage from './pages/SplashPage';
import AdminLoginPage from './pages/AdminLoginPage';

// Feature Pages (Lazy load for better performance)
const CreatorProfilePage = React.lazy(() => import('./features/profile/CreatorProfile'));
const ContentViewerPage = React.lazy(() => import('./features/viewer/ContentViewer'));

// Fan Pages
const FanFeed = React.lazy(() => import('./features/fan/FanFeed'));
const FanGallery = React.lazy(() => import('./features/fan/FanGallery'));
const FanSubscriptions = React.lazy(() => import('./features/fan/FanSubscriptions'));
const FanMessages = React.lazy(() => import('./features/fan/FanMessages'));
const FanSettings = React.lazy(() => import('./features/fan/FanSettings'));

// Creator Pages
const CreatorOnboarding = React.lazy(() => import('./features/auth/CreatorOnboarding'));
const CreatorVerification = React.lazy(() => import('./features/auth/CreatorVerification'));
const CreatorDashboard = React.lazy(() => import('./features/creator/CreatorDashboard'));
const CreatorContent = React.lazy(() => import('./features/creator/CreatorContent'));
const CreatorMessages = React.lazy(() => import('./features/creator/CreatorMessages'));
const CreatorAnalytics = React.lazy(() => import('./features/creator/CreatorAnalytics'));
const CreatorEarnings = React.lazy(() => import('./features/creator/CreatorEarnings'));
const CreatorSettings = React.lazy(() => import('./features/creator/CreatorSettings'));

// Admin Pages
const AdminPanel = React.lazy(() => import('./features/admin/AdminPanel'));

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

// --- Page Loader Components ---

const CreatorProfileLoader = () => {
    const { username } = useParams<{ username: string }>();
    const [isLoading, setIsLoading] = useState(true);
    const [creator, setCreator] = useState<Creator | null>(null);
    const [content, setContent] = useState<Content[]>([]);
    useEffect(() => { /* Simulate API call */ setIsLoading(false); setCreator({} as Creator); setContent([]); }, [username]);
    if (isLoading || !creator) return <div>Loading Profile...</div>;
    return <CreatorProfilePage creator={creator} content={content} />;
};

const ContentViewerLoader = () => {
    const { contentId } = useParams<{ contentId: string }>();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<{ content: Content; creator: Creator; relatedContent: Content[] } | null>(null);
    useEffect(() => { /* Simulate API call */ setIsLoading(false); setData({} as any); }, [contentId]);
    if (isLoading || !data) return <div>Loading Content...</div>;
    return <ContentViewerPage content={data.content} creator={data.creator} relatedContent={data.relatedContent} />;
};

const FanFeedLoader = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<{ posts: any[], creatorsFollowing: Creator[] } | null>(null);
    useEffect(() => { /* Simulate API call */ setIsLoading(false); setData({ posts: [], creatorsFollowing: [] }); }, []);
    if (isLoading || !data) return <div>Loading Feed...</div>;
    return <FanFeed posts={data.posts} creatorsFollowing={data.creatorsFollowing} />;
};

const FanGalleryLoader = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [galleryData, setGalleryData] = useState<any[]>([]);
    useEffect(() => { /* Simulate API call */ setIsLoading(false); }, []);
    if (isLoading) return <div>Loading Gallery...</div>;
    return <FanGallery galleryData={galleryData} />;
};

const FanSubscriptionsLoader = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    useEffect(() => { /* Simulate API call */ setIsLoading(false); }, []);
    if (isLoading) return <div>Loading Subscriptions...</div>;
    return <FanSubscriptions initialSubscriptions={subscriptions} />;
};

const FanMessagesLoader = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [conversations, setConversations] = useState<any[]>([]);
    useEffect(() => { /* Simulate API call */ setIsLoading(false); }, []);
    if (isLoading) return <div>Loading Messages...</div>;
    return <FanMessages initialConversations={conversations} currentFanId="fan123" />;
};

const FanSettingsLoader = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [fan, setFan] = useState<User | null>(null);
    const [settings, setSettings] = useState<any>(null);
    useEffect(() => { /* Simulate API call */ setIsLoading(false); setFan({} as User); setSettings({}); }, []);
    if (isLoading || !fan) return <div>Loading Settings...</div>;
    return <FanSettings fan={fan} settings={settings} />;
};

const CreatorDashboardLoader = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    useEffect(() => { /* Simulate API call */ setIsLoading(false); setData({ creator: {}, metrics: {}, recentActivity: [], monthlyEarnings: [] }); }, []);
    if (isLoading || !data) return <div>Loading Dashboard...</div>;
    return <CreatorDashboard creator={data.creator} metrics={data.metrics} recentActivity={data.recentActivity} monthlyEarnings={data.monthlyEarnings} />;
};

const CreatorContentLoader = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [content, setContent] = useState<Content[]>([]);
    useEffect(() => { /* Simulate API call */ setIsLoading(false); }, []);
    if (isLoading) return <div>Loading Content...</div>;
    return <CreatorContent initialContent={content} />;
};

const CreatorMessagesLoader = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    useEffect(() => { /* Simulate API call */ setIsLoading(false); setData({ conversations: [], existingContent: [] }); }, []);
    if (isLoading || !data) return <div>Loading Messages...</div>;
    return <CreatorMessages initialConversations={data.conversations} existingContent={data.existingContent} currentCreatorId="creator123" />;
};

const CreatorAnalyticsLoader = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    useEffect(() => { /* Simulate API call */ setIsLoading(false); setData({ metrics: {}, subscriberGrowth: [], revenueBreakdown: [], topContent: [] }); }, []);
    if (isLoading || !data) return <div>Loading Analytics...</div>;
    return <CreatorAnalytics metrics={data.metrics} subscriberGrowth={data.subscriberGrowth} revenueBreakdown={data.revenueBreakdown} topContent={data.topContent} />;
};

const CreatorEarningsLoader = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    useEffect(() => { /* Simulate API call */ setIsLoading(false); setData({ summary: {}, monthlyEarnings: [], transactions: [] }); }, []);
    if (isLoading || !data) return <div>Loading Earnings...</div>;
    return <CreatorEarnings summary={data.summary} monthlyEarnings={data.monthlyEarnings} transactions={data.transactions} />;
};

const CreatorSettingsLoader = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [creator, setCreator] = useState<Creator | null>(null);
    useEffect(() => { /* Simulate API call */ setIsLoading(false); setCreator({} as Creator); }, []);
    if (isLoading || !creator) return <div>Loading Settings...</div>;
    return <CreatorSettings creator={creator} />;
};

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
                        <Route path="/fan" element={<FanLayout />}>
                            <Route index element={<FanFeedLoader />} />
                            <Route path="feed" element={<FanFeedLoader />} />
                            <Route path="gallery" element={<FanGalleryLoader />} />
                            <Route path="subscriptions" element={<FanSubscriptionsLoader />} />
                            <Route path="messages" element={<FanMessagesLoader />} />
                            <Route path="settings" element={<FanSettingsLoader />} />
                        </Route>

                        {/* --- Creator Routes (Protected) --- */}
                        <Route path="/creator" element={<CreatorLayout />}>
                           <Route index element={<CreatorDashboardLoader />} />
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
