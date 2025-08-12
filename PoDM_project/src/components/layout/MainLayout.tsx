import React from 'react';
import { LucideIcon } from 'lucide-react';

// --- Types ---

export interface NavItem {
    key: string;
    label: string;
    icon: LucideIcon;
    href: string;
    active?: boolean;
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
    return (
        <nav className="w-64 bg-white dark:bg-gray-800/30 p-4 border-r border-gray-200 dark:border-gray-700/50 hidden lg:flex flex-col">
            <div className="text-purple-500 font-bold text-2xl mb-10">{logoText}</div>
            <ul className="space-y-2">
                {navItems.map(item => (
                    <li key={item.key}>
                        <a 
                            href={item.href} 
                            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                                item.active 
                                ? 'bg-purple-600 text-white shadow-lg' 
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
};


// --- Main Layout Component ---

const MainLayout = ({ logoText, navItems, children }: MainLayoutProps) => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans transition-colors duration-300">
            <div className="flex">
                <Sidebar logoText={logoText} navItems={navItems} />
                <main className="flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
