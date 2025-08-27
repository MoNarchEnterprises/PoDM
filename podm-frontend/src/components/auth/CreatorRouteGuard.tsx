import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const CreatorRouteGuard = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                Loading User...
            </div>
        );
    }
    console.log("CreatorRouteGuard - is onboarding complete?", user?.onboarding_complete);
    
    // If the user is a creator but hasn't completed onboarding, redirect them.
    if (user && user.role === 'creator' && !user.onboarding_complete) {
        return <Navigate to="/onboarding" replace />;
    }

    // If they are not a creator at all, send them to the fan feed.
    // (Or you could send them to a generic homepage or an error page)
    if (user && user.role !== 'creator') {
        return <Navigate to="/fan/feed" replace />;
    }

    // If they are an onboarded creator, show the intended page.
    return <Outlet />;
};

export default CreatorRouteGuard;