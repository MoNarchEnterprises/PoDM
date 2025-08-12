import { Home, FileText, MessageSquare, BarChart2, BarChart3, Settings, DollarSign, ImageIcon, Briefcase, LayoutDashboard, Users, Shield, LifeBuoy } from 'lucide-react';
import { NavItem } from '../components/layout/MainLayout'; // Assuming MainLayout.tsx exports this type

// --- Financials ---

/**
 * The default commission rate the platform takes from creator earnings.
 * Stored as a percentage (e.g., 20 means 20%).
 */
export const DEFAULT_COMMISSION_RATE = 12.5;

// --- Navigation ---

export const FAN_NAV_ITEMS: NavItem[] = [
    { key: 'Feed', label: 'Feed', icon: Home, href: '/feed' },
    { key: 'Gallery', label: 'Gallery', icon: ImageIcon, href: '/gallery' },
    { key: 'Subscriptions', label: 'Subscriptions', icon: Briefcase, href: '/subscriptions' },
    { key: 'Messages', label: 'Messages', icon: MessageSquare, href: '/messages' },
    { key: 'Settings', label: 'Settings', icon: Settings, href: '/settings' },
];

export const CREATOR_NAV_ITEMS: NavItem[] = [
    { key: 'Dashboard', label: 'Dashboard', icon: Home, href: '/creator/dashboard' },
    { key: 'Content', label: 'Content', icon: FileText, href: '/creator/content' },
    { key: 'Messages', label: 'Messages', icon: MessageSquare, href: '/creator/messages' },
    { key: 'Analytics', label: 'Analytics', icon: BarChart2, href: '/creator/analytics' },
    { key: 'Earnings', label: 'Earnings', icon: DollarSign, href: '/creator/earnings' },
    { key: 'Settings', label: 'Settings', icon: Settings, href: '/creator/settings' },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
    { key: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
    { key: 'Users', label: 'Users', icon: Users, href: '/admin/users' },
    { key: 'Content Moderation', label: 'Content', icon: Shield, href: '/admin/content' },
    { key: 'Analytics', label: 'Analytics', icon: BarChart3, href: '/admin/analytics' },
    { key: 'Reports', label: 'Reports', icon: FileText, href: '/admin/reports' },
    { key: 'Support Tickets', label: 'Support', icon: LifeBuoy, href: '/admin/support' },
    { key: 'Settings', label: 'Settings', icon: Settings, href: '/admin/settings' },
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
