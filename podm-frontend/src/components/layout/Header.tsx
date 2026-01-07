import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, MessageSquare, Bell, LogOut, User as UserIcon, Settings, Home, List } from 'lucide-react';

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
    const navigate = useNavigate();
    useOnClickOutside(menuRef, () => setIsOpen(false));

    const handleLogout = (e: React.MouseEvent) => {
        e.preventDefault();
        logout();
        setIsOpen(false);
        navigate('/');
    };

    // Determine menu items based on Role
    let dropdownItems = [];
    if (user.role === 'creator') {
        dropdownItems = [
            { label: 'My Profile', icon: UserIcon, href: `/creator/${user.username}` },
            { label: 'Creator Settings', icon: Settings, href: '/creator/settings' },
        ];
    } else {
        // Fan Role
        dropdownItems = [
            { label: 'Fan Feed', icon: List, href: '/fan/feed' },
            { label: 'Settings', icon: Settings, href: '/fan/settings' },
        ];
    }

    // Fallback for avatar if it's a generic placeholder that the user dislikes
    // Ideally the backend provides a valid avatar URL.
    const avatarSrc = user.profile.avatar;

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-300 dark:border-gray-600 hover:border-purple-500 transition-colors">
                <img src={avatarSrc} alt={user.username} className="w-full h-full object-cover" />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg z-20 border border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        {/* Display Username which is more reliable than 'name' for fans */}
                        <p className="font-semibold text-sm text-gray-800 dark:text-white truncate">{user.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.username}</p>
                    </div>
                    <ul className="py-1">
                        {dropdownItems.map(item => (
                            <li key={item.label}>
                                <Link
                                    to={item.href}
                                    className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <item.icon className="w-4 h-4" />
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        ))}
                        <li>
                            <button onClick={handleLogout} className="flex items-center space-x-3 w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <LogOut className="w-4 h-4" />
                                <span>Log Out</span>
                            </button>
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
    impersonatedUser?: User | null;
    logoText?: string;
    onLoginClick: () => void;
    onSignUpClick: () => void;
}

const Header = ({ user, impersonatedUser, logoText = "PoDM", onLoginClick, onSignUpClick }: HeaderProps) => {
    const currentUser = impersonatedUser || user;
    const navigate = useNavigate();

    const handleMessageClick = () => {
        if (currentUser?.role === 'creator') {
            navigate('/hub/messages');
        } else {
            navigate('/fan/messages');
        }
    };

    return (
        <header className="bg-gray-900/80 dark:bg-gray-800/50 backdrop-blur-sm sticky top-0 z-40 border-b border-gray-700 dark:border-gray-700 transition-all duration-300">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
                <Link to="/" className="flex items-center gap-2 group">
                    <img src="/assets/PoDM-logo.png" alt="PoDM Logo" className="h-12 w-auto transition-transform group-hover:scale-105" />
                </Link>

                {currentUser ? (
                    // Logged-in state
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <button
                            onClick={handleMessageClick}
                            className="p-2 rounded-full hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                        >
                            <MessageSquare className="w-5 h-5 text-gray-300" />
                        </button>
                        <button className="p-2 rounded-full hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors">
                            <Bell className="w-5 h-5 text-gray-300" />
                        </button>
                        <ProfileDropdown user={currentUser} />
                    </div>
                ) : (
                    // Logged-out state
                    <div className="flex items-center space-x-3">
                        <div className="hidden sm:flex relative">
                            {/* Search removed for Anti-Algorithm strategy */}
                        </div>
                        <button onClick={onLoginClick} className="hidden sm:block px-4 py-2 text-sm font-medium text-gray-200 hover:text-white transition-colors">
                            Log In
                        </button>
                        <button onClick={onSignUpClick} className="px-5 py-2 text-sm font-bold text-white bg-purple-600 rounded-full hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40">
                            Sign Up
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
