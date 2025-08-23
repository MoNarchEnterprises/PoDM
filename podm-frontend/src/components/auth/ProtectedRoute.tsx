import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
    /**
     * The role required to access this route (e.g., 'admin').
     */
    requiredRole: 'admin';
}

const ProtectedRoute = ({ requiredRole }: ProtectedRouteProps) => {
    const { user, isLoading } = useAuth();

    // While the auth state is loading, show a loading message.
    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Authenticating...</div>;
    }

    // If the user is not logged in, or doesn't have the required role, redirect them.
    if (!user || user.role !== requiredRole) {
        // For admins, redirect to the specific admin login page.
        return <Navigate to="/admin/login" replace />;
    }

    // If the user is authenticated and has the correct role, render the child routes.
    return <Outlet />;
};

export default ProtectedRoute;
