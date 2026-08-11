import { withAuthGuard } from './withAuthGuard';

/**
 * Guards creator routes: requires creator role, onboarding, and verification.
 * Admins can bypass (for impersonation).
 */
const CreatorRouteGuard = withAuthGuard({
    roles: ['creator'],
    allowAdminBypass: true,
    requireOnboarding: true,
    requireVerification: true,
    redirectTo: '/',
    unauthorizedRedirect: '/fan/feed',
});

export default CreatorRouteGuard;
