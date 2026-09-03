import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, MoreVertical, Eye, Percent, Ban, Slash, Undo, Shield, X, MessageSquare } from 'lucide-react';


// --- Import Shared Types ---
import { User, UserStatus } from '@common/types/User';

// --- Import Reusable Components & Hooks ---
import StatusBadge from '../../../components/shared/StatusBadge';
import VerificationDetailPanel from './VerificationDetailPanel';
import { useModal } from '../../../hooks/useModal';
import { useOnClickOutside } from '../../../hooks/useOnClickOutside';
import { formatDate } from '../../../lib/formatters';
import { useAdminData } from '../AdminPanel';
import * as apiClient from '../../../lib/apiClient';
import Input from '../../../components/ui/Input'; // Add Input import
import Button from '../../../components/ui/Button'; // Add Button import
import { DEFAULT_COMMISSION_RATE, ENCLAVE_COMMISSION_RATE } from '../../../lib/constants'; // Import default rate
import { useAuth } from '../../../hooks/useAuth';
import { Creator } from '@common/types/Creator';

// --- Reusable Sub-Components ---

const ManageCommissionModal = ({ isOpen, onClose, user, onSave }: { isOpen: boolean; onClose: () => void; user: User | null; onSave: (userId: string, rate: number | null) => Promise<void>; }) => {
    const [rate, setRate] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const isEnclaveMember = Boolean(user?.is_enclave_member);

    useEffect(() => {
        // When the modal opens, set the input value to the user's current rate
        // or the platform default if they don't have a custom one.
        // Enclave members are locked at their Enclave rate.
        if (user) {
            setRate(isEnclaveMember ? ENCLAVE_COMMISSION_RATE.toString() : (user as Creator).commission_rate?.toString() || DEFAULT_COMMISSION_RATE.toString());
        }
    }, [user, isEnclaveMember]);

    if (!isOpen || !user) return null;

    const handleSave = async () => {
        setIsLoading(true);
        const newRate = rate === '' ? null : parseFloat(rate);
        await onSave(user.id, newRate);
        setIsLoading(false);
        onClose();
    };

    const handleResetToDefault = () => {
        setRate('');
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
                <header className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Manage Commission</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-6 h-6 text-gray-500" /></button>
                </header>
                <main className="p-6 space-y-4">
                    <p className="text-sm text-gray-500">
                        Set a custom commission rate for <span className="font-bold">{user.profile.name}</span>.
                        Standard creators automatically tier based on monthly volume (15% &rarr; 12.5% &rarr; 10%). Setting an explicit custom rate overrides automatic volume tiering.
                    </p>
                    {isEnclaveMember && (
                        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-800 text-sm text-purple-800 dark:text-purple-200">
                            <span className="font-bold">Enclave member</span> — locked at {ENCLAVE_COMMISSION_RATE}% commission as part of the 90/10 revenue split.
                        </div>
                    )}
                    <Input
                        id="commission-rate"
                        label="Custom Rate (%)"
                        type="number"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        leftIcon={Percent}
                        placeholder={`${DEFAULT_COMMISSION_RATE}`}
                        disabled={isEnclaveMember}
                    />
                    {!isEnclaveMember && (
                        <Button variant="ghost" size="sm" onClick={handleResetToDefault}>
                            Reset to Default
                        </Button>
                    )}
                </main>
                <footer className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <Button onClick={handleSave} isLoading={isLoading} disabled={isEnclaveMember}>Save Commission Rate</Button>
                </footer>
            </div>
        </div>
    );
};




const MessageUserModal = ({ isOpen, onClose, user, onSend }: { isOpen: boolean; onClose: () => void; user: User | null; onSend: (userId: string, subject: string, message: string) => Promise<void>; }) => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSubject('');
            setMessage('');
        }
    }, [isOpen]);

    if (!isOpen || !user) return null;

    const handleSend = async () => {
        if (!subject.trim() || !message.trim()) {
            alert('Subject and message are required.');
            return;
        }
        setIsLoading(true);
        await onSend(user.id, subject, message);
        setIsLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">
                <header className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Message {user.profile.name}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-6 h-6 text-gray-500" /></button>
                </header>
                <main className="p-6 space-y-4">
                    <Input
                        id="message-subject"
                        label="Subject"
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Subject..."
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                        <textarea
                            className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            rows={6}
                            placeholder="Type your message here..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>
                </main>
                <footer className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <Button onClick={handleSend} isLoading={isLoading} leftIcon={MessageSquare}>Send Email</Button>
                </footer>
            </div>
        </div>
    );
};

const UserActionsMenu = ({ user, currentUser, onManageCommission, onViewVerification, onUpdateStatus, onImpersonate, onMessageUser }: {
    user: User;
    currentUser: User | null;
    onManageCommission: () => void;
    onViewVerification: () => void;
    onUpdateStatus: (user: User, status: UserStatus) => void;
    onImpersonate: (user: User) => void;
    onMessageUser: (user: User) => void;
}) => {
    const { isOpen, openModal, closeModal } = useModal();
    const menuRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(menuRef, closeModal);

    const actions = [
        { label: 'View Verification', icon: Shield, show: user.status === 'pending verification', action: onViewVerification },
        { label: 'Message User', icon: MessageSquare, show: true, action: () => onMessageUser(user) },
        { label: 'Impersonate User', icon: Eye, show: user.id !== currentUser?.id, action: () => onImpersonate(user) },
        { label: 'Manage Commission', icon: Percent, show: user.role === 'creator', action: onManageCommission },
        { label: 'Suspend User', icon: Ban, show: user.status === 'active', action: () => onUpdateStatus(user, 'suspended') },
        { label: 'Un-suspend User', icon: Undo, show: user.status === 'suspended', action: () => onUpdateStatus(user, 'active') },
        { label: 'Ban User', icon: Slash, show: user.status !== 'banned', action: () => onUpdateStatus(user, 'banned') },
        { label: 'Un-ban User', icon: Undo, show: user.status === 'banned', action: () => onUpdateStatus(user, 'active') },
    ];

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={openModal} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                    <ul className="py-1">
                        {actions.filter(action => action.show).map(action => (
                            <li key={action.label}>
                                <a href="#" onClick={(e) => { e.preventDefault(); action.action(); closeModal(); }} className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <action.icon className="w-4 h-4" />
                                    <span>{action.label}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};


// --- Main User Management Panel Component ---
const UserManagementPanel = () => {
    const { data, setData } = useAdminData();
    const { user: currentUser, startImpersonation } = useAuth();
    const [viewingVerificationId, setViewingVerificationId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ type: 'All', status: 'All' });
    const { isOpen: isCommissionModalOpen, openModal: openCommissionModal, closeModal: closeCommissionModal } = useModal();
    const { isOpen: isMessageModalOpen, openModal: openMessageModal, closeModal: closeMessageModal } = useModal();
    const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);

    // 3. CREATE THE HANDLER FUNCTION
    const handleUpdateStatus = async (user: User, status: UserStatus) => {
        if (!confirm(`Are you sure you want to ${status} the user "${user.profile.name}"?`)) {
            return;
        }

        try {
            const updatedUser = await apiClient.updateUserStatus(user.id, status);
            // Update the user in the shared admin panel state
            setData(prevData => ({
                ...prevData,
                users: prevData.users.map(u =>
                    u.id === updatedUser.data.id ? updatedUser.data : u
                ),
            }));
            alert(`User has been ${status}.`);
        } catch (error) {
            console.error("Failed to update user status:", error);
            alert("An error occurred. Please try again.");
        }
    };

    const users = data?.users || [];

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            if (!user || !user.profile) return false;
            const lowercasedTerm = searchTerm.toLowerCase();
            const searchMatch = (user.profile.name?.toLowerCase() || '').includes(lowercasedTerm) ||
                (user.email?.toLowerCase() || '').includes(lowercasedTerm);

            const typeMatch = filters.type === 'All' || user.role === filters.type.toLowerCase();
            const statusMatch = filters.status === 'All' || user.status === filters.status.toLowerCase().replace(' ', '-');

            return searchMatch && typeMatch && statusMatch;
        });
    }, [searchTerm, filters, users]);

    if (!data) {
        return <div className="p-8 text-center text-gray-500">Loading user data...</div>;
    }

    const handleManageCommission = (user: User) => {
        setSelectedUserForModal(user);
        openCommissionModal();
    };

    const handleMessageUser = (user: User) => {
        setSelectedUserForModal(user);
        openMessageModal();
    };

    const handleSendMessage = async (userId: string, subject: string, message: string) => {
        try {
            await apiClient.messageUser(userId, subject, message);
            alert('Email sent successfully!');
        } catch (error) {
            console.error("Failed to send email:", error);
            alert("Failed to send email. Please try again.");
        }
    };


    const handleUpdateCommission = async (userId: string, commissionRate: number | null) => {
        try {
            const response = await apiClient.updateCreatorCommission(userId, commissionRate);
            const updatedUser = response.data;

            setData(prevData => ({
                ...prevData,
                users: prevData.users.map(u => u.id === updatedUser.id ? updatedUser : u),
            }));
        } catch (error) {
            console.error("Failed to update commission:", error);
            alert("An error occurred while updating the commission rate.");
        }
    };

    const handleApprove = async (userId: string) => {
        try {
            const response = await apiClient.updateUserStatus(userId, 'active');
            const updatedUser = response.data;
            // Update the state to reflect the change
            setData(prevData => ({
                ...prevData,
                users: prevData.users.map(u => u.id === updatedUser.id ? updatedUser : u),
            }));
            // Close the verification panel
            setViewingVerificationId(null);
            alert('Creator has been approved and is now active.');
        } catch (error) {
            console.error("Failed to approve user:", error);
            alert("An error occurred. Please try again.");
        }
    };

    const handleReject = async (userId: string) => {
        // We'll set the status to 'suspended' upon rejection for this example
        try {
            const response = await apiClient.updateUserStatus(userId, 'suspended');
            const updatedUser = response.data;
            // Update the state
            setData(prevData => ({
                ...prevData,
                users: prevData.users.map(u => u.id === updatedUser.id ? updatedUser : u),
            }));
            // Close the verification panel
            setViewingVerificationId(null);
            alert('Creator has been rejected and their account is suspended.');
        } catch (error) {
            console.error("Failed to reject user:", error);
            alert("An error occurred. Please try again.");
        }
    };

    const handleImpersonate = async (targetUser: User) => {
        console.log('[Impersonate] Starting impersonation for user:', targetUser);
        // Temporarily disable confirmation to test the flow
        // if (!window.confirm(`Are you sure you want to impersonate "${targetUser.profile.name}"? You will be logged in as them.`)) {
        //     console.log('[Impersonate] User cancelled confirmation');
        //     return;
        // }
        console.log('[Impersonate] Confirmation accepted (skipped), calling startImpersonation...');
        try {
            await startImpersonation(targetUser);
            console.log('[Impersonate] startImpersonation completed successfully');
        } catch (error: any) {
            console.error('[Impersonate] Error during impersonation:', error);
            alert(`Failed to start impersonation: ${error.message}`);
            console.error(error);
        }
    };


    const userToVerify = users.find(u => u.id === viewingVerificationId);

    if (viewingVerificationId && userToVerify) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <VerificationDetailPanel
                    user={userToVerify}
                    onBack={() => setViewingVerificationId(null)}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            </div>
        );
    }

    return (
        <>
            <ManageCommissionModal
                isOpen={isCommissionModalOpen}
                onClose={closeCommissionModal}
                user={selectedUserForModal}
                onSave={handleUpdateCommission}
            />
            <MessageUserModal
                isOpen={isMessageModalOpen}
                onClose={closeMessageModal}
                user={selectedUserForModal}
                onSend={handleSendMessage}
            />
            <div className="p-4 sm:p-6 lg:p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Search, filter, and manage all users on the platform.</p>
                </header>
                <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative flex-grow w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input type="text" placeholder="Search users..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-full pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        </div>
                        <div className="flex items-center space-x-2">
                            <select onChange={e => setFilters(f => ({ ...f, type: e.target.value }))} className="bg-gray-100 dark:bg-gray-700 border-transparent rounded-full py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                                <option>All</option><option>Fan</option><option>Creator</option><option>Admin</option>
                            </select>
                            <select onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="bg-gray-100 dark:bg-gray-700 border-transparent rounded-full py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                                <option>All</option><option>Active</option><option>Suspended</option><option>Banned</option><option>Pending Verification</option>
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Join Date</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredUsers.map(user => (
                                    <tr key={user.id}>
                                        <td className="px-4 py-3"><div className="flex items-center"><img src={user.profile.avatar} alt={user.profile.name} className="w-8 h-8 rounded-full mr-3" /><div><span className="font-medium">{user.profile.name}</span>{user.is_enclave_member && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">Enclave</span>}</div></div></td>
                                        <td className="px-4 py-3 text-center"><StatusBadge status={user.status} /></td>
                                        <td className="px-4 py-3 text-center text-sm">{formatDate(user.created_at)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <UserActionsMenu
                                                user={user}
                                                currentUser={currentUser}
                                                onManageCommission={() => handleManageCommission(user)}
                                                onViewVerification={() => setViewingVerificationId(user.id)}
                                                onUpdateStatus={handleUpdateStatus}
                                                onImpersonate={handleImpersonate}
                                                onMessageUser={handleMessageUser}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
};

export default UserManagementPanel;
