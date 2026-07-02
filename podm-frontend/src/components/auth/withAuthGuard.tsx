import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '@common/types/User';

// --- Types ---

export type AuthGuardOptions = {
    /** Required role(s) to access the route. */
    roles?: UserRole[];
    /** If true, allow admin to bypass role checks (for impersonation). */
    allowAdminBypass?: boolean;
    /** Redirect URL for unauthenticated users. */
    redirectTo?: string;
    /** Redirect URL for unauthorized users (wrong role). */
    unauthorizedRedirect?: string;
    /** Minimum creator onboarding/verification status required. */
    requireOnboarding?: boolean;
    requireVerification?: boolean;
};

// --- HOC ---

/**
 * Higher-Order Component that guards routes based on authentication and role.
 *
 * Consolidates duplicate logic from:
 * - CreatorRouteGuard.tsx (role check, onboarding, verification, admin bypass)
 * - ProtectedRoute.tsx (auth check)
 *
 * @example
 * \\\	sx
 * const ProtectedFanRoute = withAuthGuard({ roles: ['fan'] });
 * const CreatorOnlyRoute = withAuthGuard({
 *   roles: ['creator'],
 *   requireOnboarding: true,
 *   requireVerification: true,
 * });
 * \\\
 */
export function withAuthGuard(options: AuthGuardOptions = {}) {
    const {
        roles,
        allowAdminBypass = true,
        redirectTo = '/',
        unauthorizedRedirect,
        requireOnboarding = false,
        requireVerification = false,
    } = options;

    const GuardedRoute: React.FC = () => {
        const { user, impersonatedUser, isLoading } = useAuth();

        // Still loading auth state
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                    Verifying access...
                </div>
            );
        }

        const currentUser = impersonatedUser || user;

        // Not authenticated
        if (!currentUser) {
            return <Navigate to={redirectTo} replace />;
        }

        // Admin bypass: admins can access any route
        if (allowAdminBypass && currentUser.role === 'admin') {
            return <Outlet />;
        }

        // Role check
        if (roles && roles.length > 0 && !roles.includes(currentUser.role)) {
            const fallback = unauthorizedRedirect ||
                (currentUser.role === 'creator' ? '/hub/dashboard' : '/fan/feed');
            return <Navigate to={fallback} replace />;
        }

        // Creator-specific checks
        if (requireOnboarding && !currentUser.onboarding_complete) {
            return <Navigate to="/onboarding" replace />;
        }

        if (requireVerification &&
            currentUser.status !== 'active' &&
            currentUser.status !== 'pending verification') {
            return <Navigate to="/verification" replace />;
        }

        return <Outlet />;
    };

    return GuardedRoute;
}

export default withAuthGuard;
