import React from 'react';
import { type  LucideIcon, ArrowUp, ArrowDown } from 'lucide-react';

// --- Reusable Card Component (base) ---
// In a real app, this might be imported from a generic ui/Card.tsx file
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-gray-800/50 rounded-xl shadow-md p-4 ${className}`}>
        {children}
    </div>
);

// --- Main Stat Card Component ---
interface StatCardProps {
    /**
     * The title of the metric being displayed.
     */
    title: string;
    /**
     * The main value of the metric.
     */
    value: string;
    /**
     * The icon to display in the corner of the card.
     */
    icon: LucideIcon;
    /**
     * The color theme for the icon.
     */
    color: 'purple' | 'pink' | 'green' | 'blue';
    /**
     * Optional: A numerical value representing the change over a period.
     * Positive for an increase, negative for a decrease.
     */
    change?: number;
    /**
     * Optional: A label for the change value (e.g., "this month").
     */
    changeLabel?: string;
}

const StatCard = ({ title, value, icon: Icon, color, change, changeLabel = "this month" }: StatCardProps) => {
    const isPositiveChange = change !== undefined && change >= 0;

    return (
        <Card>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
                <Icon className={`w-5 h-5 text-${color}-500`} />
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
            {change !== undefined && (
                <div className={`flex items-center text-xs mt-1 ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositiveChange ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                    <span>
                        {isPositiveChange ? '+' : ''}{change.toLocaleString()} {changeLabel}
                    </span>
                </div>
            )}
        </Card>
    );
};

export default StatCard;
