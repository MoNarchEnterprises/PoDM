import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

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

    // If the user is a creator but hasn't completed onboarding, redirect them.
    if (user.role === 'creator' && !user.onboarding_complete) {
        return <Navigate to="/onboarding" replace />;
    }

    // If the user is a logged-in creator who is onboarded, show the page.
    if (user.role === 'creator') {
        return <Outlet />;
    }

    // If the user is logged in but NOT a creator, send them to the fan feed.
    return <Navigate to="/fan/feed" replace />;
};

export default CreatorRouteGuard;