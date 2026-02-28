import { Home, FileText, MessageSquare, BarChart2, BarChart3, Settings, DollarSign, ImageIcon, Briefcase, LayoutDashboard, Users, Shield, LifeBuoy } from 'lucide-react';
import { NavItem } from '../components/layout/MainLayout'; // Assuming MainLayout.tsx exports this type
import { StripeCardElementOptions } from '@stripe/stripe-js';

// --- Financials ---

/**
 * The default commission rate the platform takes from creator earnings.
 * Stored as a percentage (e.g., 20 means 20%).
 */
export const DEFAULT_COMMISSION_RATE = 12.5;

// --- Navigation ---

export const FAN_NAV_ITEMS: NavItem[] = [
    { key: 'Feed', label: 'Feed', icon: Home, href: '/fan/feed' },
    { key: 'Gallery', label: 'Gallery', icon: ImageIcon, href: '/fan/gallery' },
    { key: 'Subscriptions', label: 'Subscriptions', icon: Briefcase, href: '/fan/subscriptions' },
    { key: 'Messages', label: 'Messages', icon: MessageSquare, href: '/fan/messages' },
    { key: 'Settings', label: 'Settings', icon: Settings, href: '/fan/settings' },
];

export const CREATOR_NAV_ITEMS: NavItem[] = [
    { key: 'Dashboard', label: 'Dashboard', icon: Home, href: '/hub/dashboard' },
    { key: 'Content', label: 'Content', icon: FileText, href: '/hub/content' },
    { key: 'Messages', label: 'Messages', icon: MessageSquare, href: '/hub/messages' },
    { key: 'Analytics', label: 'Analytics', icon: BarChart2, href: '/hub/analytics' },
    { key: 'Earnings', label: 'Earnings', icon: DollarSign, href: '/hub/earnings' },
    { key: 'Settings', label: 'Settings', icon: Settings, href: '/hub/settings' },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
    { key: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
    { key: 'Users', label: 'Users', icon: Users, href: '/admin/users' },
    { key: 'Content Moderation', label: 'Content', icon: Shield, href: '/admin/content' },
    { key: 'Analytics', label: 'Analytics', icon: BarChart3, href: '/admin/analytics' },
    { key: 'Reports', label: 'Reports', icon: FileText, href: '/admin/reports' },
    { key: 'Support Tickets', label: 'Support', icon: LifeBuoy, href: '/admin/support' },
    { key: 'Settings', label: 'Settings', icon: Settings, href: '/admin/settings' },
    { key: 'Enclave Applications', label: 'Enclave', icon: Users, href: '/admin/enclave' },
];


// --- Moderation ---

export const REPORT_REASONS = [
    'Inappropriate Content',
    'Copyright Infringement',
    'Spam or Scams',
    'Violates Terms of Service',
    'Harassment',
    'Other'
];

/**
 * A centralized, branded style object for the Stripe Card Element.
 * This ensures all payment forms in the application have a consistent look and feel.
 * Colors are sourced from the Design System (Section 8 of the planning doc).
 */
export const CARD_ELEMENT_OPTIONS: StripeCardElementOptions = {
    style: {
        base: {
            // Use your brand's primary purple for the card icon
            iconColor: '#6B46C1',
            // Use a light text color that's easy to read on the dark modal background
            color: '#F3F4F6',
            fontFamily: 'sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': {
                // Use your secondary text color for placeholders
                color: '#6B7280',
            },
        },
        invalid: {
            // Use your brand's error color for validation feedback
            iconColor: '#EF4444',
            color: '#EF4444',
        },
    },
};