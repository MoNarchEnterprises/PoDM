import React, { useState, useEffect, useRef } from 'react';
import { Search, LogIn, UserPlus, Bell, MessageSquare, LogOut, User as UserIcon, Settings } from 'lucide-react';

// --- Import Shared Types ---
import { User } from '@common/types/User';

// --- Import Hooks ---
import { useAuth } from '../../hooks/useAuth';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';

// --- Reusable Sub-Components ---

const ProfileDropdown = ({ user }: { user: User }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { logout } = useAuth(); // Get the logout function
    useOnClickOutside(menuRef, () => setIsOpen(false));

    const handleLogout = (e: React.MouseEvent) => {
        e.preventDefault();
        logout();
        setIsOpen(false);
    };

    const dropdownItems = [
        { label: 'Profile', icon: UserIcon, href: `/creator/${user.username}` },
        { label: 'Settings', icon: Settings, href: '/settings' },
    ];

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-300 dark:border-gray-600 hover:border-purple-500 transition-colors">
                <img src={user.profile.avatar} alt={user.profile.name} className="w-full h-full object-cover" />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg z-20 border border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <p className="font-semibold text-sm text-gray-800 dark:text-white">{user.profile.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">@{user.username}</p>
                    </div>
                    <ul className="py-1">
                        {dropdownItems.map(item => (
                            <li key={item.label}>
                                <a href={item.href} className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <item.icon className="w-4 h-4" />
                                    <span>{item.label}</span>
                                </a>
                            </li>
                        ))}
                         <li>
                            <a href="#" onClick={handleLogout} className="flex items-center space-x-3 px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <LogOut className="w-4 h-4" />
                                <span>Log Out</span>
                            </a>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};

// --- Main Header Component ---

interface HeaderProps {
    user?: User | null; // User can be null if not logged in
    logoText?: string;
    onLoginClick: () => void;
    onSignUpClick: () => void;
}

const Header = ({ user, logoText = "PoDM", onLoginClick, onSignUpClick }: HeaderProps) => {
    return (
        <header className="bg-white dark:bg-gray-800/50 backdrop-blur-sm sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                <div className="text-purple-500 font-bold text-2xl">{logoText}</div>
                
                {user ? (
                    // Logged-in state
                    <div className="flex items-center space-x-2">
                        <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                            <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>
                        <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>
                        <ProfileDropdown user={user} />
                    </div>
                ) : (
                    // Logged-out state
                    <div className="flex items-center space-x-2">
                        <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Search className="w-5 h-5 text-gray-500" />
                        </button>
                        <button onClick={onLoginClick} className="hidden sm:block px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                            Log In
                        </button>
                        <button onClick={onSignUpClick} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700">
                            Sign Up
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
