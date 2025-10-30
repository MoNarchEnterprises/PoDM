import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';




const CreatorRouteGuard = () => {
    const { user, impersonatedUser, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                Verifying Creator Access...
            </div>
        );
    }

    const currentUser = impersonatedUser || user;

    // If loading is finished and there's no user, redirect to the homepage
    if (!currentUser) {
        return <Navigate to="/" replace />;
    }

    if (currentUser.role !== 'creator') {
        return <Navigate to="/fan/feed" replace />;
    }

    // --- LOGIC UPDATES START HERE ---

    // 1. If onboarding isn't done, send them there.
    if (!currentUser.onboarding_complete) {
        return <Navigate to="/onboarding" replace />;
    }
    
    // 2. If verification is NOT submitted, send them to the verification page.
    if (currentUser.status !== 'active' && currentUser.status !== 'pending verification') {
         return <Navigate to="/verification" replace />;
    }

    // 3. If status is pending or active, they can access the creator routes.
    // You can add a banner on the dashboard if their status is 'pending verification'.
    return <Outlet />;
};

export default CreatorRouteGuard;