import React from 'react';
import Card from '../ui/Card';

// --- Types ---

export interface SettingsCardProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    footerContent?: React.ReactNode;
    className?: string;
}

/**
 * A reusable settings card layout component.
 *
 * Eliminates the identical SettingsCard sub-component duplicated in:
 * - CreatorSettings.tsx (lines 36-45)
 * - FanSettings.tsx (lines 25-34)
 *
 * @example
 * \\\	sx
 * <SettingsCard title="Profile" subtitle="Manage your profile settings">
 *   <SettingsField ... />
 *   <SettingsField ... />
 * </SettingsCard>
 * \\\
 */
const SettingsCard: React.FC<SettingsCardProps> = ({
    title,
    subtitle,
    children,
    footerContent,
    className = '',
}) => (
    <Card noPadding className={className}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            {subtitle && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
            )}
        </div>
        <div className="p-6 space-y-4">{children}</div>
        {footerContent && (
            <footer className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center gap-4">
                {footerContent}
            </footer>
        )}
    </Card>
);

export default SettingsCard;
