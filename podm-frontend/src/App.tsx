import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useParams } from 'react-router-dom';
import * as apiClient from './lib/apiClient';
// --- Import Shared Types ---
import { Content } from '@common/types/Content';
import { Creator } from '@common/types/Creator';
import { GalleryItem } from '@common/types/Gallery';

// --- Reusable Layouts & Hooks ---
import MainLayout from './components/layout/MainLayout';
import { AuthProvider } from './hooks/useAuth';
import { FAN_NAV_ITEMS, CREATOR_NAV_ITEMS, ADMIN_NAV_ITEMS } from './lib/constants';
import ProtectedRoute from './components/auth/ProtectedRoute';
import CreatorRouteGuard from './components/auth/CreatorRouteGuard';

import { useAuth } from './hooks/useAuth';
import { useCreatorData } from './hooks/useCreatorData'; // Import the new hook
import { ToastProvider } from './context/ToastContext';
import { EmbeddedWalletProvider } from './context/EmbeddedWalletContext';
import { useEmbeddedWalletEnabled } from './shared/hooks/useFeatureFlag';

const EmbeddedWalletWrapper = ({ children }: { children: React.ReactNode }) => {
    const { enabled } = useEmbeddedWalletEnabled();
    if (enabled) {
        return <EmbeddedWalletProvider>{children}</EmbeddedWalletProvider>;
    }
    return <>{children}</>;
};// --- Import Page Components (Lazy Loaded) ---
const SplashPage = React.lazy(() => import('./pages/SplashPage'));
const Enclave = React.lazy(() => import('./pages/Enclave'));
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
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
const BulkUploadPage = React.lazy(() => import('./features/creator/pages/BulkUploadPage'));


// --- Import Admin Panel Components (Lazy Loaded) ---
const AdminPanel = React.lazy(() => import('./features/admin/AdminPanel'));
const DashboardPanel = React.lazy(() => import('./features/admin/components/DashboardPanel'));
const UserManagementPanel = React.lazy(() => import('./features/admin/components/UserManagementPanel'));
const ContentModerationPanel = React.lazy(() => import('./features/admin/components/ContentModerationPanel'));
const AnalyticsPanel = React.lazy(() => import('./features/admin/components/AnalyticsPanel'));
const ReportsPanel = React.lazy(() => import('./features/admin/components/ReportsPanel'));
const EnclaveApplications = React.lazy(() => import('./features/admin/EnclaveApplications'));
const SupportTicketsPanel = React.lazy(() => import('./features/admin/components/SupportTicketsPanel'));
const SettingsPanel = React.lazy(() => import('./features/admin/components/SettingsPanel'));


// --- Page Loader Components ---
// This component now just renders the lazy-loaded CreatorProfilePage,
// which handles its own data fetching.
const CreatorProfileLoader = () => <CreatorProfilePage />;

const ContentViewerLoader = () => {
    const { contentId } = useParams<{ contentId: string }>();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<{ content: Content; creator: Creator; relatedContent: Content[] } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!contentId) return;
            setIsLoading(true);
            try {
                const response = await apiClient.getContentViewerData(contentId);
                setData(response.data);
            } catch (err) {
                setError("Failed to load content.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [contentId]);

    if (isLoading) return <div>Loading Content...</div>;
    if (error || !data) return <div>{error || "Content not found"}</div>;

    return <ContentViewerPage
        content={data.content}
        creator={data.creator}
        relatedContent={data.relatedContent}
    />;
};



// --- Fan Loader Components ---

import { CreatorWithContent } from './features/fan/FanGallery';
const FanGalleryLoader = () => {
    const [galleryData, setGalleryData] = useState<CreatorWithContent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchGallery = async () => {
            setIsLoading(true);
            try {
                const response = await apiClient.getFanGallery();
                setGalleryData(response.data);
            } catch (err) {
                setError("Failed to load your gallery.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchGallery();
    }, []);

    if (isLoading) {
        return <div className="p-8 text-center">Loading Gallery...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-500">{error}</div>;
    }

    return <FanGallery galleryData={galleryData} />;
};


import { FanSettingsData } from './features/fan/FanSettings';
import { User as FanUser } from '@common/types/User';

const FanSettingsLoader = () => {
    const [settingsData, setSettingsData] = useState<{ fan: FanUser; settings: FanSettingsData } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                const response = await apiClient.getFanSettings();
                setSettingsData(response.data);
            } catch (err) {
                setError("Failed to load your settings.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    if (isLoading || !settingsData) {
        return <div className="p-8 text-center">Loading Settings...</div>;
    }
    if (error) {
        return <div className="p-8 text-center text-red-500">{error}</div>;
    }

    return <FanSettings fan={settingsData.fan} initialSettings={settingsData.settings} />;
};

const CreatorDashboardLoader = () => {
    const { user, impersonatedUser } = useAuth();
    const currentUser = (impersonatedUser || user) as Creator;
    const { dashboardData, isLoading, error } = useCreatorData(currentUser);

    if (isLoading) {
        return <div className="p-8 text-center">Loading dashboard...</div>;
    }
    if (error || !dashboardData) {
        return <div className="p-8 text-center text-red-500">{error || 'Could not load data.'}</div>;
    }

    return <CreatorDashboard creator={currentUser} metrics={dashboardData.keyMetrics} recentActivity={dashboardData.recentActivity} monthlyEarnings={dashboardData.monthlyEarnings} />;
};


import { CreatorAnalyticsPageProps } from './features/creator/CreatorAnalytics';
import { CreatorEarningsPageProps } from './features/creator/CreatorEarnings';

const CreatorAnalyticsLoader = () => {
    const [data, setData] = useState<CreatorAnalyticsPageProps | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await apiClient.getCreatorAnalyticsData();
                setData(response.data);
            } catch (err) {
                setError('Could not load analytics data.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) return <div className="p-8 text-center">Loading Analytics...</div>;
    if (error || !data) return <div className="p-8 text-center text-red-500">{error || 'Data could not be loaded.'}</div>;

    return <CreatorAnalytics metrics={data.metrics} subscriberGrowth={data.subscriberGrowth} revenueBreakdown={data.revenueBreakdown} topContent={data.topContent} />;
};

const CreatorEarningsLoader = () => {
    const [data, setData] = useState<CreatorEarningsPageProps | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await apiClient.getCreatorEarningsData();
                setData(response.data);
            } catch (err) {
                setError('Could not load earnings data.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) {
        return <div className="p-8 text-center">Loading Earnings...</div>;
    }
    if (error || !data) {
        return <div className="p-8 text-center text-red-500">{error || 'Data could not be loaded.'}</div>;
    }

    return <CreatorEarnings
        summary={data.summary}
        monthlyEarnings={data.monthlyEarnings}
        transactions={data.transactions}
    />;
};

const CreatorSettingsLoader = () => {
    // 1. Get the currently logged-in user (or impersonated user)
    const { user, impersonatedUser, isLoading } = useAuth();
    const currentUser = (impersonatedUser || user) as Creator;

    // 2. Handle the loading state while the user session is being verified
    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading Settings...</div>;
    }

    // 3. Handle the case where the user is not found
    if (!currentUser) {
        return <div className="p-8 text-center text-red-500">Could not load creator data. Please try logging in again.</div>;
    }

    // 4. Pass the real, complete user object as the creator prop
    return <CreatorSettings creator={currentUser} />;
};

// Corrected Loaders: These components are self-contained and don't need props passed from the router.
const CreatorOnboardingLoader = () => <CreatorOnboarding />;






// --- Layout Wrapper Components ---
const FanLayout = () => (<MainLayout logoText="PoDM" navItems={FAN_NAV_ITEMS}><React.Suspense fallback={<div>Loading...</div>}><Outlet /></React.Suspense></MainLayout>);
const CreatorLayout = () => (<MainLayout logoText="PoDM" navItems={CREATOR_NAV_ITEMS}><React.Suspense fallback={<div>Loading...</div>}><Outlet /></React.Suspense></MainLayout>);
const AdminLayout = () => (<MainLayout logoText="PoDM - Admin" navItems={ADMIN_NAV_ITEMS}><React.Suspense fallback={<div>Loading...</div>}><Outlet /></React.Suspense></MainLayout>);

// --- Main App Component ---
const App = () => {
    return (
        <ToastProvider>
            <BrowserRouter>
                    <AuthProvider>
                        <React.Suspense fallback={<div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading Page...</div>}>
                            <EmbeddedWalletWrapper>
                                <Routes>
                                    {/* --- Public Routes --- */}
                                    <Route path="/" element={<SplashPage />} />
                                    <Route path="/enclave" element={<Enclave />} />
                                    <Route path="/terms-of-service" element={<TermsOfService />} />
                                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                                    <Route path="/creator/:username" element={<CreatorProfileLoader />} />
                                    <Route path="/content/:contentId" element={<ContentViewerLoader />} />

                                    {/* --- Auth Routes --- */}
                                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                                    <Route path="/onboarding" element={<CreatorOnboardingLoader />} />
                                    <Route path="/verification" element={<CreatorVerification />} />
                                    <Route path="/admin/login" element={<AdminLoginPage />} />

                                    {/* --- Fan Routes (Protected) --- */}
                                    <Route path="/fan" element={<FanLayout />}>
                                        <Route index element={<FanFeed />} />
                                        <Route path="feed" element={<FanFeed />} />
                                        <Route path="gallery" element={<FanGalleryLoader />} />
                                        <Route path="subscriptions" element={<FanSubscriptions />} />
                                        <Route path="messages" element={<FanMessages />} />
                                        <Route path="settings" element={<FanSettingsLoader />} />
                                    </Route>

                                    {/* --- Creator Routes (Protected) --- */}
                                    <Route element={<CreatorRouteGuard />}>
                                        <Route path="/hub" element={<CreatorLayout />}>
                                            {/* The nested routes are now correct relative to "/hub" */}
                                            <Route index element={<CreatorDashboardLoader />} />
                                            <Route path="dashboard" element={<CreatorDashboardLoader />} />
                                            <Route path="content" element={<CreatorContent />} />
                                            <Route path="messages" element={<CreatorMessages />} />
                                            <Route path="analytics" element={<CreatorAnalyticsLoader />} />
                                            <Route path="earnings" element={<CreatorEarningsLoader />} />
                                            <Route path="settings" element={<CreatorSettingsLoader />} />
                                            <Route path="bulk-upload" element={<BulkUploadPage />} />

                                        </Route>
                                    </Route>

                                    {/* --- Admin Routes (Protected) --- */}
                                    <Route element={<ProtectedRoute requiredRole="admin" />}>
                                        <Route path="/admin" element={<AdminLayout />}>
                                            {/* Enclave route - standalone, doesn't need AdminPanel data */}
                                            <Route path="enclave" element={<EnclaveApplications />} />
                                            <Route path="enclave-applications" element={<EnclaveApplications />} />

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
                            </EmbeddedWalletWrapper>
                        </React.Suspense>
                    </AuthProvider>
                </BrowserRouter>
        </ToastProvider>
    );
};

export default App;