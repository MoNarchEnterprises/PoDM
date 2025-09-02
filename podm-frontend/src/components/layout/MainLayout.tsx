import React from 'react';
import { Link, useLocation } from 'react-router-dom'; // Import Link and useLocation
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth'; // 1. Import useAuth
import VerificationBanner from '../shared/VerificationBanner';

// --- Types ---

export interface NavItem {
    key: string;
    label: string;
    icon: LucideIcon;
    href: string;
}

interface SidebarProps {
    logoText: string;
    navItems: NavItem[];
}

interface MainLayoutProps {
    logoText: string;
    navItems: NavItem[];
    children: React.ReactNode;
}

// --- Sidebar Component ---

const Sidebar = ({ logoText, navItems }: SidebarProps) => {
    const location = useLocation(); // Get the current location
    const { user } = useAuth(); // 2. Get the current user from the auth context

    return (
        <nav className="w-64 bg-white dark:bg-gray-800/30 p-4 border-r border-gray-200 dark:border-gray-700/50 hidden lg:flex flex-col">
            <div className="text-purple-500 font-bold text-2xl mb-10">{logoText}</div>
            <ul className="space-y-2">
                {navItems.map(item => {
                    // Hide messages link for creators who are not fully verified ('active')
                    if (item.key === 'messages' && user?.role === 'creator' && user.status !== 'active') {
                        return null;
                    }
                    // Determine if the link is active by checking if the current path starts with the link's href
                    const isActive = location.pathname.startsWith(item.href);
                    
                    return (
                        <li key={item.key}>
                            <Link 
                                to={item.href} 
                                className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                                    isActive 
                                    ? 'bg-purple-600 text-white shadow-lg' 
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};


// --- Main Layout Component ---

const MainLayout = ({ logoText, navItems, children }: MainLayoutProps) => {
    // 2. Get the full user object from the auth context
    const { user } = useAuth();

    // 3. Determine if the banner should be shown
    const shouldShowBanner = user && user.role === 'creator' && user.status !== 'active';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans transition-colors duration-300">
            <div className="flex">
                <Sidebar logoText={logoText} navItems={navItems} />
                <main className="flex-1 h-screen overflow-y-auto">
                    {/* 4. Conditionally render the banner at the top of the main content area */}
                    {shouldShowBanner && (
                        <VerificationBanner status={user.status as 'pending verification' | 'suspended' | 'banned'} />
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
