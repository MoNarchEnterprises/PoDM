import React from 'react';

// --- Types ---

export interface ToggleSwitchProps {
    label: string;
    description?: string;
    enabled: boolean;
    setEnabled: (enabled: boolean) => void;
}

/**
 * A reusable toggle switch component for settings pages.
 *
 * Exists as a sub-component in:
 * - CreatorSettings.tsx (lines 47-54)
 * - FanSettings.tsx (lines 36-41)
 *
 * @example
 * \\\	sx
 * <ToggleSwitch
 *   label="Email Notifications"
 *   description="Receive email updates about new content"
 *   enabled={notifications.email}
 *   setEnabled={(v) => setNotifications({...notifications, email: v})}
 * />
 * \\\
 */
const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
    label,
    description,
    enabled,
    setEnabled,
}) => (
    <div className="flex items-center justify-between py-2">
        <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
            {description && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
            )}
        </div>
        <button
            onClick={() => setEnabled(!enabled)}
            className={
                'relative inline-flex items-center h-6 rounded-full w-11 transition-colors ' +
                (enabled
                    ? 'bg-purple-600'
                    : 'bg-gray-200 dark:bg-gray-600')
            }
        >
            <span
                className={
                    'inline-block w-4 h-4 transform bg-white rounded-full transition-transform ' +
                    (enabled ? 'translate-x-6' : 'translate-x-1')
                }
            />
        </button>
    </div>
);

export default ToggleSwitch;
