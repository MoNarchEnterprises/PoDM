import React from 'react';
import { type LucideIcon, ArrowUp, ArrowDown } from 'lucide-react';
import Card from '../ui/Card';

// --- Main Stat Card Component ---
interface StatCardProps {
    title: string;
    value: string;
    icon: LucideIcon;
    color: 'purple' | 'pink' | 'green' | 'blue';
    change?: number;
    changeLabel?: string;
}

const StatCard = ({ title, value, icon: Icon, color, change, changeLabel = 'this month' }: StatCardProps) => {
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
