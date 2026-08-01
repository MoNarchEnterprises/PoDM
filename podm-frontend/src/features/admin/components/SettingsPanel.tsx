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
type AdminUser = User;

// --- Reusable Sub-Components ---

const AdminProfileSettings = () => {
    const { user, setUser } = useAuth(); // Get the currently logged-in admin and the state setter
    const { setData } = useAdminData(); // 2. GET THE SETTER FUNCTION

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
        if (!user) return;

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // --- This part remains the same ---
            const profileData = { name, email };
            // We only update text fields if they have changed.
            if (name !== user.profile.name || email !== user.email) {
                await apiClient.updateMe(profileData);
            }

            // If a new password is entered, attempt to change it
            if (newPassword && currentPassword) {
                await apiClient.changePassword({ currentPassword, newPassword });
                // Clear the password fields on success
                setCurrentPassword('');
                setNewPassword('');
            }
            // If an avatar file was selected, upload it.
            if (avatarFile) {
                console.log("Avatar upload requested. Sending file to backend...");
                const updatedUserFromAvatar = await apiClient.uploadAvatar(avatarFile);
                const freshUser = updatedUserFromAvatar.data;

                // This updates the local auth context (for the header, etc.)
                setUser(freshUser);

                // --- 3. ADD THIS LOGIC ---
                // This updates the shared AdminPanel state so User Management has the fresh data
                setData(prevData => ({
                    ...prevData,
                    users: prevData.users.map(u =>
                        u.id === freshUser._id ? freshUser : u
                    ),
                }));
            }

            setSuccess("Profile updated successfully!");

        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to update profile.";
            setError(msg);
        } finally {
            setIsLoading(false);
            // Clear success message and reset the avatar file state
            setTimeout(() => setSuccess(null), 3000);
            setAvatarFile(null);
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
    // State for financial settings
    const [commissionRate, setCommissionRate] = useState('');
    const [platformWalletAddress, setPlatformWalletAddress] = useState('');
    const [platformWalletBalance, setPlatformWalletBalance] = useState(0);
    const [isSaving, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // State for AI settings
    const [aiProvider, setAiProvider] = useState('openrouter');
    const [aiModelId, setAiModelId] = useState('');
    const [hasAiApiKey, setHasAiApiKey] = useState(false);
    const [hasNvidiaApiKey, setHasNvidiaApiKey] = useState(false);
    const [hasOpenaiApiKey, setHasOpenaiApiKey] = useState(false);
    const [isAiSaving, setIsAiSaving] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiSuccess, setAiSuccess] = useState<string | null>(null);

    // FETCH CURRENT SETTINGS ON LOAD
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await apiClient.getPlatformSettings();
                setCommissionRate(response.data.commissionRate.toString());
                setPlatformWalletAddress(response.data.platformWalletAddress || '');
                setPlatformWalletBalance(response.data.platformWalletBalance || 0);
                setAiProvider(response.data.aiProvider || 'openrouter');
                setAiModelId(response.data.aiModelId || '');
                setHasAiApiKey(Boolean(response.data.hasAiApiKey));
                setHasNvidiaApiKey(Boolean(response.data.hasNvidiaApiKey));
                setHasOpenaiApiKey(Boolean(response.data.hasOpenaiApiKey));
            } catch (err) {
                console.error("Failed to fetch settings:", err);
                setError("Could not load current settings.");
            }
        };
        fetchSettings();
    }, []);

    // HANDLER FOR SAVING FINANCIAL SETTINGS
    const handleSaveFinancialSettings = async () => {
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const rate = parseFloat(commissionRate);
            if (isNaN(rate)) {
                throw new Error("Commission rate must be a valid number.");
            }
            await apiClient.updatePlatformSettings({ commissionRate: rate });
            setSuccess("Settings saved successfully!");
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: unknown) {
            setError((err as Error).message || "Failed to save settings.");
        } finally {
            setIsLoading(false);
        }
    };

    // HANDLER FOR SAVING AI MODEL SETTINGS
    const handleSaveAiSettings = async () => {
        setIsAiSaving(true);
        setAiError(null);
        setAiSuccess(null);
        try {
            if (!aiModelId.trim()) {
                throw new Error("AI Model ID cannot be empty.");
            }
            await apiClient.updatePlatformSettings({
                aiProvider,
                aiModelId: aiModelId.trim(),
            });
            setAiSuccess("AI settings updated!");
            setTimeout(() => setAiSuccess(null), 3000);
        } catch (err: unknown) {
            setAiError((err as Error).message || "Failed to update AI settings.");
        } finally {
            setIsAiSaving(false);
        }
    };

    if (!data || !data.settings) {
        return <div className="p-8 text-center text-gray-500">Loading settings data...</div>;
    }

    const admins = data.settings.admins as AdminUser[];

    const providerPlaceholder =
        aiProvider === 'nvidia'
            ? 'meta/llama-3.2-11b-vision-instruct'
            : aiProvider === 'openai'
            ? 'gpt-4o-mini'
            : 'google/gemma-3-27b-it:free';

    const currentKeyConfigured =
        aiProvider === 'nvidia'
            ? hasNvidiaApiKey
            : aiProvider === 'openai'
            ? hasOpenaiApiKey
            : hasAiApiKey;

    const currentEnvVarName =
        aiProvider === 'nvidia'
            ? 'NVIDIA_API_KEY'
            : aiProvider === 'openai'
            ? 'OPENAI_API_KEY'
            : 'AI_API_KEY';

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
                            value={commissionRate}
                            onChange={(e) => setCommissionRate(e.target.value)}
                            containerClassName="md:w-1/3"
                        />
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Platform Wallet</h4>
                            <div className="space-y-2 md:w-1/2">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Address</span>
                                    <span className="text-sm font-mono font-medium text-gray-900 dark:text-white break-all">
                                        {platformWalletAddress
                                            ? platformWalletAddress
                                            : 'Not configured'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">USDC Balance</span>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {platformWalletBalance.toFixed(2)} USDC
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end items-center gap-4">
                            {success && <p className="text-sm text-green-600">{success}</p>}
                            {error && <p className="text-sm text-red-600">{error}</p>}
                            <Button
                                leftIcon={Save}
                                onClick={handleSaveFinancialSettings}
                                isLoading={isSaving}
                            >
                                Save Financial Settings
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card noPadding>
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold">AI Captioning</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Provider
                            </label>
                            <select
                                value={aiProvider}
                                onChange={(e) => setAiProvider(e.target.value)}
                                className="w-full md:w-1/3 px-4 py-3 rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                            >
                                <option value="openrouter">OpenRouter</option>
                                <option value="nvidia">NVIDIA</option>
                                <option value="openai">OpenAI Direct</option>
                            </select>
                        </div>

                        <Input
                            id="ai-model-id"
                            label="Model ID"
                            type="text"
                            value={aiModelId}
                            onChange={(e) => setAiModelId(e.target.value)}
                            containerClassName="md:w-1/2"
                            placeholder={providerPlaceholder}
                        />

                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 md:w-1/2 flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-300">
                                Environment key (<code className="font-mono text-purple-600 dark:text-purple-400">{currentEnvVarName}</code>)
                            </span>
                            <span className={`font-semibold px-2 py-0.5 rounded ${currentKeyConfigured ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'}`}>
                                {currentKeyConfigured ? 'Configured' : 'Missing in .env'}
                            </span>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Provider and model changes apply immediately — no server restart needed. API keys are loaded from environment variables in <code className="font-mono">.env</code>.
                        </p>

                        <div className="flex justify-end items-center gap-4">
                            {aiSuccess && <p className="text-sm text-green-600">{aiSuccess}</p>}
                            {aiError && <p className="text-sm text-red-600">{aiError}</p>}
                            <Button
                                leftIcon={Save}
                                onClick={handleSaveAiSettings}
                                isLoading={isAiSaving}
                            >
                                Save AI Settings
                            </Button>
                        </div>
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
                                <li key={admin.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800">
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
