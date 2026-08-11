import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom'; // Import Link and useLocation
import { LucideIcon, Menu, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth'; // 1. Import useAuth
import VerificationBanner from '../shared/VerificationBanner';
import ImpersonationBanner from '../shared/ImpersonationBanner';
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
    isOpen: boolean;
    onClose: () => void;
}

interface MainLayoutProps {
    logoText: string;
    navItems: NavItem[];
    children: React.ReactNode;
}

// --- Sidebar Component ---

const Sidebar = ({ logoText, navItems, isOpen, onClose }: SidebarProps) => {
    const location = useLocation(); // Get the current location
    const { user, impersonatedUser } = useAuth(); // 2. Get the current user from the auth context

    const currentUser = impersonatedUser || user;

    return (
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar / Drawer */}
            <nav className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 p-4 border-r border-gray-200 dark:border-gray-700/50 flex flex-col transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0 lg:static lg:bg-white/50 lg:dark:bg-gray-800/30
            `}>
                <div className="flex items-center justify-between mb-10">
                    <div className="text-purple-500 font-bold text-2xl">{logoText}</div>
                    <button onClick={onClose} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <ul className="space-y-2 overflow-y-auto flex-1">
                    {navItems.map(item => {
                        // Hide messages link for creators who are not fully verified ('active')
                        if (item.key === 'messages' && currentUser?.role === 'creator' && currentUser.status !== 'active') {
                            return null;
                        }
                        // Determine if the link is active by checking if the current path starts with the link's href
                        const isActive = location.pathname.startsWith(item.href);

                        return (
                            <li key={item.key}>
                                <Link
                                    to={item.href}
                                    onClick={() => onClose()} // Close menu on mobile when link is clicked 
                                    className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${isActive
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
        </>
    );
};


// --- Main Layout Component ---

const MainLayout = ({ logoText, navItems, children }: MainLayoutProps) => {
    const { user } = useAuth();
    const shouldShowVerificationBanner = user && user.role === 'creator' && user.status !== 'active';

    // Mobile menu state
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    // Close mobile menu when route changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans transition-colors duration-300 flex flex-col lg:flex-row">

            {/* Mobile Header */}
            <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between sticky top-0 z-30">
                <div className="text-purple-500 font-bold text-xl">{logoText}</div>
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <Sidebar
                    logoText={logoText}
                    navItems={navItems}
                    isOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                />

                <main className="flex-1 h-[calc(100vh-65px)] lg:h-screen overflow-y-auto relative">
                    {/* 2. ADD THE IMPERSONATION BANNER HERE */}
                    <ImpersonationBanner />
                    {shouldShowVerificationBanner && (
                        <VerificationBanner status={user.status as 'pending verification' | 'suspended' | 'banned'} />
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
