import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// A simple component to show while pending
const PendingVerificationPage = () => (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white p-8 text-center">
        <div>
            <h1 className="text-3xl font-bold text-purple-400 mb-4">Verification Submitted</h1>
            <p className="max-w-md text-gray-300">
                Your documents are under review. This usually takes 24-48 hours. We'll email you once the process is complete. You can now access your dashboard.
            </p>
        </div>
    </div>
);


const CreatorRouteGuard = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                Verifying Creator Access...
            </div>
        );
    }

    // If loading is finished and there's no user, redirect to the homepage
    if (!user) {
        return <Navigate to="/" replace />;
    }

    if (user.role !== 'creator') {
        return <Navigate to="/fan/feed" replace />;
    }

    // --- LOGIC UPDATES START HERE ---

    // 1. If onboarding isn't done, send them there.
    if (!user.onboarding_complete) {
        return <Navigate to="/onboarding" replace />;
    }
    
    // 2. If verification is NOT submitted, send them to the verification page.
    if (user.status !== 'active' && user.status !== 'pending verification') {
         return <Navigate to="/verification" replace />;
    }

    // 3. If status is pending or active, they can access the creator routes.
    // You can add a banner on the dashboard if their status is 'pending verification'.
    return <Outlet />;
};

export default CreatorRouteGuard;