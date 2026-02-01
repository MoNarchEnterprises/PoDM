import { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import apiClient from '../../lib/apiClient';

interface EnclaveApplication {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    current_platform: string[];
    follower_count: string;
    monthly_earnings: string | null;
    content_type: string[];
    why_join: string;
    how_heard: string;
    referral_code: string | null;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
    reviewed_at: string | null;
    reviewed_by: string | null;
    notes: string | null;
}

export default function EnclaveApplications() {
    const [applications, setApplications] = useState<EnclaveApplication[]>([]);
    const [filteredApps, setFilteredApps] = useState<EnclaveApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedApp, setSelectedApp] = useState<EnclaveApplication | null>(null);
    const [spotsRemaining, setSpotsRemaining] = useState<number>(50);

    useEffect(() => {
        fetchApplications();
        fetchSpotsRemaining();
    }, []);

    useEffect(() => {
        filterApplications();
    }, [applications, statusFilter, searchTerm]);

    const fetchApplications = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/api/v1/enclave/applications');
            setApplications(response.data.applications);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch applications');
        } finally {
            setLoading(false);
        }
    };

    const fetchSpotsRemaining = async () => {
        try {
            const response = await apiClient.get('/api/v1/enclave/spots-remaining');
            setSpotsRemaining(response.data.spotsRemaining);
        } catch (err) {
            console.error('Failed to fetch spots remaining:', err);
        }
    };

    const filterApplications = () => {
        let filtered = applications;

        if (statusFilter !== 'all') {
            filtered = filtered.filter(app => app.status === statusFilter);
        }

        if (searchTerm) {
            filtered = filtered.filter(app =>
                app.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                app.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredApps(filtered);
    };

    const updateApplicationStatus = async (id: string, status: 'accepted' | 'rejected', notes?: string) => {
        try {
            await apiClient.patch(`/api/v1/enclave/applications/${id}`, { status, notes });
            await fetchApplications();
            await fetchSpotsRemaining();
            setSelectedApp(null);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to update application');
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
            accepted: 'bg-green-500/20 text-green-400 border-green-500/50',
            rejected: 'bg-red-500/20 text-red-400 border-red-500/50'
        };
        const icons = {
            pending: Clock,
            accepted: CheckCircle,
            rejected: XCircle
        };
        const Icon = icons[status as keyof typeof icons];

        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
                <Icon className="w-3 h-3" />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const stats = {
        total: applications.length,
        pending: applications.filter(a => a.status === 'pending').length,
        accepted: applications.filter(a => a.status === 'accepted').length,
        rejected: applications.filter(a => a.status === 'rejected').length
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <div className="text-white text-xl">Loading applications...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0A1128] via-[#0A1128] to-purple-900/20 py-8 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">Enclave Applications</h1>
                    <p className="text-gray-400">Review and manage creator applications</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-xl p-6">
                        <div className="flex items-center gap-3">
                            <Users className="w-8 h-8 text-purple-400" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.total}</div>
                                <div className="text-sm text-gray-400">Total</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-900/40 backdrop-blur-lg border border-yellow-500/50 rounded-xl p-6">
                        <div className="flex items-center gap-3">
                            <Clock className="w-8 h-8 text-yellow-400" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.pending}</div>
                                <div className="text-sm text-gray-400">Pending</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-900/40 backdrop-blur-lg border border-green-500/50 rounded-xl p-6">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-8 h-8 text-green-400" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.accepted}</div>
                                <div className="text-sm text-gray-400">Accepted</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-900/40 backdrop-blur-lg border border-red-500/50 rounded-xl p-6">
                        <div className="flex items-center gap-3">
                            <XCircle className="w-8 h-8 text-red-400" />
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.rejected}</div>
                                <div className="text-sm text-gray-400">Rejected</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-[#6B46C1]/20 to-[#EC4899]/20 backdrop-blur-lg border border-[#6B46C1]/50 rounded-xl p-6">
                        <div>
                            <div className="text-3xl font-bold text-white">{spotsRemaining}</div>
                            <div className="text-sm text-gray-300">Spots Remaining</div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-xl p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6B46C1]"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-gray-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6B46C1]"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="accepted">Accepted</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Applications Table */}
                <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-xl overflow-hidden">
                    {error && (
                        <div className="p-4 bg-red-500/10 border-b border-red-500/50 text-red-400">
                            {error}
                        </div>
                    )}

                    {filteredApps.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            No applications found
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-800/50 border-b border-gray-700">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Phone</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Platform</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Followers</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Applied</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {filteredApps.map((app) => (
                                        <tr key={app.id} className="hover:bg-gray-800/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{app.full_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{app.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{app.phone || 'N/A'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-300">
                                                <div className="max-w-[150px]">
                                                    {app.current_platform.join(', ')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{app.follower_count}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(app.status)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                {new Date(app.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button
                                                    onClick={() => setSelectedApp(app)}
                                                    className="text-[#EC4899] hover:text-[#6B46C1] font-medium transition-colors"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {selectedApp && (
                <ApplicationDetailModal
                    application={selectedApp}
                    onClose={() => setSelectedApp(null)}
                    onUpdate={updateApplicationStatus}
                />
            )}
        </div>
    );
}

// Application Detail Modal Component
function ApplicationDetailModal({
    application,
    onClose,
    onUpdate
}: {
    application: EnclaveApplication;
    onClose: () => void;
    onUpdate: (id: string, status: 'accepted' | 'rejected', notes?: string) => Promise<void>;
}) {
    const [notes, setNotes] = useState(application.notes || '');
    const [isUpdating, setIsUpdating] = useState(false);

    const handleUpdate = async (status: 'accepted' | 'rejected') => {
        if (window.confirm(`Are you sure you want to ${status} this application?`)) {
            setIsUpdating(true);
            await onUpdate(application.id, status, notes);
            setIsUpdating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{application.full_name}</h2>
                        <p className="text-gray-400">{application.email}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <XCircle className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Contact Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-400">Email</label>
                                <p className="text-white">{application.email}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Phone</label>
                                <p className="text-white">{application.phone || 'Not provided'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Platform Info */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Platform & Audience</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-400">Current Platform(s)</label>
                                <p className="text-white">{application.current_platform.join(', ')}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Follower Count</label>
                                <p className="text-white">{application.follower_count}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Monthly Earnings</label>
                                <p className="text-white">{application.monthly_earnings || 'Not provided'}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Content Type</label>
                                <p className="text-white">{application.content_type.join(', ')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Why Join */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Why Join The Enclave</h3>
                        <p className="text-gray-300 whitespace-pre-wrap bg-gray-800/50 p-4 rounded-lg">{application.why_join}</p>
                    </div>

                    {/* Additional Info */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Additional Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-400">How They Heard</label>
                                <p className="text-white">{application.how_heard}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Referral Code</label>
                                <p className="text-white">{application.referral_code || 'None'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Admin Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Admin Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6B46C1] resize-none"
                            placeholder="Add notes about this application..."
                        />
                    </div>

                    {/* Actions */}
                    {application.status === 'pending' && (
                        <div className="flex gap-4">
                            <button
                                onClick={() => handleUpdate('accepted')}
                                disabled={isUpdating}
                                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isUpdating ? 'Processing...' : 'Accept Application'}
                            </button>
                            <button
                                onClick={() => handleUpdate('rejected')}
                                disabled={isUpdating}
                                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isUpdating ? 'Processing...' : 'Reject Application'}
                            </button>
                        </div>
                    )}

                    {application.status !== 'pending' && (
                        <div className="p-4 bg-gray-800/50 rounded-lg">
                            <p className="text-gray-400">
                                This application was {application.status} on{' '}
                                {application.reviewed_at ? new Date(application.reviewed_at).toLocaleString() : 'N/A'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
