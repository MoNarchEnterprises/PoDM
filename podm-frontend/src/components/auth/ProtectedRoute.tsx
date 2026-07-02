import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
    /**
     * The role required to access this route (e.g., 'admin').
     */
    requiredRole: 'admin';
}

/**
 * Guards admin routes: requires admin role.
 * Uses the same pattern as withAuthGuard but accepts a dynamic role prop.
 */
const ProtectedRoute = ({ requiredRole }: ProtectedRouteProps) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Authenticating...</div>;
    }

    if (!user || user.role !== requiredRole) {
        return <Navigate to="/admin/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
