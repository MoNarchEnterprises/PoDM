import React from 'react';
import { PlusCircle, Save } from 'lucide-react';

// --- Import Shared Types ---
import { User } from '../../../../common/types/User';

// --- Import Reusable UI Components ---
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

// --- Local Types ---
// In a real app, you might have a more specific Admin type
interface AdminUser extends User {
    // Any admin-specific properties would go here
}

// --- Main Settings Panel Component ---
interface SettingsPanelProps {
    admins: AdminUser[];
}

const SettingsPanel = ({ admins }: SettingsPanelProps) => (
    <div className="space-y-8">
        <Card noPadding>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold">Financial Settings</h3>
            </div>
            <div className="p-6 space-y-4">
                <Input
                    id="commission-rate"
                    label="Platform Commission Rate (%)"
                    type="number"
                    defaultValue="20"
                    containerClassName="md:w-1/3"
                />
                 <Button leftIcon={Save}>
                    Save Financial Settings
                </Button>
            </div>
        </Card>
        <Card noPadding>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Admin Accounts</h3>
                <Button leftIcon={PlusCircle}>
                    Add Admin
                </Button>
            </div>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {admins.map(admin => (
                    <li key={admin._id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div>
                            <p className="font-medium">{admin.profile.name} <span className="text-xs text-gray-500">({admin.email})</span></p>
                            <p className="text-xs font-semibold text-purple-600 capitalize">{admin.role}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50">
                            Remove
                        </Button>
                    </li>
                ))}
            </ul>
        </Card>
    </div>
);

export default SettingsPanel;
