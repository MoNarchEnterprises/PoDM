import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Save, User as UserIcon, KeyRound, Mail, Camera, AlertCircle, CheckCircle } from 'lucide-react';

// --- Import Shared Types ---
import { User } from '@common/types/User';

// --- Import Reusable UI Components & Hooks ---
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useAdminData } from '../AdminPanel';
import { useAuth } from '../../../hooks/useAuth';
import * as apiClient from '../../../lib/apiClient'; // Import the api client

// --- Local Types ---
interface AdminUser extends User {}

// --- Reusable Sub-Components ---

const AdminProfileSettings = () => {
    const { user, setUser } = useAuth(); // Get the currently logged-in admin and the state setter
    
    // State for the form fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for API call feedback
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setName(user.profile?.name || '');
            setEmail(user.email || '');
            setAvatarPreview(user.profile?.avatar || null);
        }
    }, [user]);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveProfile = async () => {
        console.log("SettingsPanel: user before update:", user);
        if (!user) return;

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // 1. Update Profile Information (Name, Email)
            console.log("SettingsPanel: Updating profile with:", { name, email, currentPassword, newPassword, avatarFile });
            const profileData = { name, email };
            const updatedUserResponse = await apiClient.updateMe(profileData);
            
            // 2. Update the user in the global auth context
            setUser(updatedUserResponse.data);

            // TODO: Implement password change logic
            // This would require a separate, dedicated API endpoint
            if (newPassword && currentPassword) {
                console.log("Password change requested. API endpoint needed.");
                // await apiClient.changePassword(currentPassword, newPassword);
            }

            // TODO: Implement avatar upload logic
            // This would require a separate API endpoint that handles file uploads
            if (avatarFile) {
                console.log("Avatar upload requested. API endpoint needed.");
                // const formData = new FormData();
                // formData.append('avatar', avatarFile);
                // await apiClient.uploadAvatar(formData);
            }

            setSuccess("Profile updated successfully!");

        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to update profile.");
        } finally {
            setIsLoading(false);
            // Clear success message after a few seconds
            setTimeout(() => setSuccess(null), 3000);
        }
    };

    if (!user) {
        return null;
    }

    return (
        <Card noPadding>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold">My Profile</h3>
            </div>
            <div className="p-6 space-y-6">
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <img src={avatarPreview || user.profile.avatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/png, image/jpeg, image/webp"
                        />
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleAvatarClick}
                            className="absolute bottom-0 right-0 p-1.5 h-auto rounded-full"
                        >
                            <Camera className="w-4 h-4" />
                        </Button>
                    </div>
                    <Input
                        id="admin-name"
                        label="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        containerClassName="flex-grow"
                        leftIcon={UserIcon}
                    />
                </div>
                <Input
                    id="admin-email"
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={Mail}
                />
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                     <h4 className="text-md font-semibold mb-2">Change Password</h4>
                     <div className="space-y-4">
                        <Input 
                            id="current-password" 
                            type="password" 
                            placeholder="Current Password" 
                            leftIcon={KeyRound}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                        <Input 
                            id="new-password" 
                            type="password" 
                            placeholder="New Password" 
                            leftIcon={KeyRound}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                     </div>
                </div>
            </div>
             <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center gap-4">
                {success && <p className="text-sm text-green-600 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{success}</p>}
                {error && <p className="text-sm text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}
                <Button leftIcon={Save} onClick={handleSaveProfile} isLoading={isLoading}>Save My Profile</Button>
            </div>
        </Card>
    );
};


// --- Main Settings Panel Component ---
const SettingsPanel = () => {
    const { data } = useAdminData();

    if (!data || !data.settings) {
        return <div className="p-8 text-center text-gray-500">Loading settings data...</div>;
    }

    const admins = data.settings.admins as AdminUser[];

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Platform Settings</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Manage global configurations and administrator accounts.</p>
            </header>
            <div className="space-y-8">
                <AdminProfileSettings />

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
                        {admins
                            .filter(admin => admin && admin.profile)
                            .map(admin => (
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
        </div>
    );
};

export default SettingsPanel;
