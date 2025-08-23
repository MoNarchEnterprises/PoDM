import React, { useState, useMemo, useRef } from 'react';
import { Search, MoreVertical, Eye, Percent, Ban, Slash, Undo, Shield, X } from 'lucide-react';

// --- Import Shared Types ---
import { User } from '@common/types/User';

// --- Import Reusable Components & Hooks ---
import StatusBadge from '../../../components/shared/StatusBadge';
import VerificationDetailPanel from './VerificationDetailPanel';
import { useModal } from '../../../hooks/useModal';
import { useOnClickOutside } from '../../../hooks/useOnClickOutside';
import { formatDate } from '../../../lib/formatters';
import { useAdminData } from '../AdminPanel';

// --- Reusable Sub-Components ---

const ManageCommissionModal = ({ isOpen, onClose, user }: { isOpen: boolean; onClose: () => void; user: User | null }) => {
    if (!isOpen || !user) return null;
    return (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
                 <header className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Manage Commission for {user.profile.name}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-6 h-6 text-gray-500" /></button>
                </header>
                <main className="p-6">
                    <p>Commission settings for {user.profile.name} would be here.</p>
                </main>
            </div>
        </div>
    ); 
};

const UserActionsMenu = ({ user, onManageCommission, onViewVerification }: { user: User; onManageCommission: () => void; onViewVerification: () => void; }) => {
    const { isOpen, openModal, closeModal } = useModal();
    const menuRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(menuRef, closeModal);

    const actions = [
        { label: 'View Verification', icon: Shield, show: user.status === 'pending verification', action: onViewVerification },
        { label: 'Impersonate User', icon: Eye, show: true, action: () => {} },
        { label: 'Manage Commission', icon: Percent, show: user.role === 'creator', action: onManageCommission },
        { label: 'Suspend User', icon: Ban, show: user.status === 'active', action: () => {} },
        { label: 'Un-suspend User', icon: Undo, show: user.status === 'suspended', action: () => {} },
        { label: 'Ban User', icon: Slash, show: user.status !== 'banned', action: () => {} },
        { label: 'Un-ban User', icon: Undo, show: user.status === 'banned', action: () => {} },
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
    const { data } = useAdminData();
    const [viewingVerificationId, setViewingVerificationId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ type: 'All', status: 'All' });
    const { isOpen: isCommissionModalOpen, openModal: openCommissionModal, closeModal: closeCommissionModal } = useModal();
    const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);

    if (!data) {
        return <div className="p-8 text-center text-gray-500">Loading user data...</div>;
    }

    const users = data.users;

    const handleManageCommission = (user: User) => { 
        setSelectedUserForModal(user);
        openCommissionModal(); 
    };
    
    const handleApprove = (userId: string) => { console.log(`Approving user ${userId}`); setViewingVerificationId(null); };
    const handleReject = (userId: string) => { console.log(`Rejecting user ${userId}`); setViewingVerificationId(null); };

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            if (!user || !user.profile) return false;
            console.log('User management panel: User name:', user.profile.name, 'Email:', user.email, 'Role:', user.role, 'Status:', user.status);
            const lowercasedTerm = searchTerm.toLowerCase();
            const searchMatch = (user.profile.name?.toLowerCase() || '').includes(lowercasedTerm) || 
                                (user.email?.toLowerCase() || '').includes(lowercasedTerm);

            const typeMatch = filters.type === 'All' || user.role === filters.type.toLowerCase();
            const statusMatch = filters.status === 'All' || user.status === filters.status.toLowerCase().replace(' ', '-');
            
            return searchMatch && typeMatch && statusMatch;
        });
    }, [searchTerm, filters, users]);
    
    const userToVerify = users.find(u => u._id === viewingVerificationId);

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
            <ManageCommissionModal isOpen={isCommissionModalOpen} onClose={closeCommissionModal} user={selectedUserForModal} />
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
                            <select onChange={e => setFilters(f => ({...f, type: e.target.value}))} className="bg-gray-100 dark:bg-gray-700 border-transparent rounded-full py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                                <option>All</option><option>Fan</option><option>Creator</option><option>Admin</option>
                            </select>
                            <select onChange={e => setFilters(f => ({...f, status: e.target.value}))} className="bg-gray-100 dark:bg-gray-700 border-transparent rounded-full py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
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
                                   <tr key={user._id}>
                                       <td className="px-4 py-3"><div className="flex items-center"><img src={user.profile.avatar} alt={user.profile.name} className="w-8 h-8 rounded-full mr-3" /><span className="font-medium">{user.profile.name}</span></div></td>
                                       <td className="px-4 py-3 text-center"><StatusBadge status={user.status} /></td>
                                       <td className="px-4 py-3 text-center text-sm">{formatDate(user.createdAt)}</td>
                                       <td className="px-4 py-3 text-center"><UserActionsMenu user={user} onManageCommission={() => handleManageCommission(user)} onViewVerification={() => setViewingVerificationId(user._id)} /></td>
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
