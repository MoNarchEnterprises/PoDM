import React, { useState } from 'react';
import { CheckCircle, Trash2, AlertTriangle, Slash } from 'lucide-react';
import * as apiClient from '../../../lib/apiClient';

// --- Import Shared Types ---
import { Content } from '@common/types/Content';
import { User } from '@common/types/User';

// --- Import Custom Hooks ---
import { useAdminData } from '../AdminPanel';

// --- Local Types ---
// This interface extends the base Content type with additional data
// that would be joined on the backend for the moderation queue.
interface FlaggedContent extends Content {
    creator: User;
    reportCount: number;
    reason: string;
}

// --- Main Content Moderation Panel Component ---
const ContentModerationPanel = () => {
    // Get the admin data directly from the parent context
    const { data, setData } = useAdminData();
    const flaggedContent = data.flaggedContent as FlaggedContent[];

    const [selectedContentId, setSelectedContentId] = useState(flaggedContent[0]?.id);
    const selectedContent = flaggedContent.find(c => c.id === selectedContentId);

    // Handle the case where the data might not be loaded yet
    if (!data) {
        return <div className="p-8 text-center text-gray-500">Loading moderation queue...</div>;
    }

    const handleApprove = async () => {
        if (!selectedContent) return;
        if (!confirm("Are you sure you want to approve this content and dismiss the reports?")) return;

        try {
            // Dismiss reports by setting status to 'published'
            await apiClient.updateContentStatus(selectedContent.id, 'published');
            alert("Reports dismissed. Content approved.");

            // Remove from local state
            setData((prev: any) => ({
                ...prev,
                flaggedContent: prev.flaggedContent.filter((c: any) => c.id !== selectedContent.id)
            }));
            setSelectedContentId('');
        } catch (error) {
            console.error("Failed to approve content:", error);
            alert("Failed to approve content.");
        }
    };

    const handleDelete = async () => {
        if (!selectedContent) return;
        if (!confirm("Are you sure you want to DELETE this content? This cannot be undone.")) return;

        try {
            await apiClient.updateContentStatus(selectedContent.id, 'removed');
            alert("Content deleted (status set to removed).");

            // Remove from local state
            setData((prev: any) => ({
                ...prev,
                flaggedContent: prev.flaggedContent.filter((c: any) => c.id !== selectedContent.id)
            }));
            setSelectedContentId('');
        } catch (error) {
            console.error("Failed to delete content:", error);
            alert("Failed to delete content.");
        }
    };

    const handleBanCreator = async () => {
        if (!selectedContent) return;
        if (!confirm(`Are you sure you want to BAN the creator "${selectedContent.creator.profile.name}"?`)) return;

        try {
            await apiClient.updateUserStatus(selectedContent.creator.id, 'banned');
            alert(`Creator ${selectedContent.creator.profile.name} has been banned.`);
        } catch (error) {
            console.error("Failed to ban creator:", error);
            alert("Failed to ban creator.");
        }
    };

    const handleWarnCreator = () => {
        alert("Warning feature coming soon (requires notification system).");
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Content Moderation</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Review content that has been flagged by users.</p>
            </header>
            <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-12rem)]">
                {/* Left Column: Queue */}
                <div className="md:w-1/3 bg-white dark:bg-gray-800/50 rounded-xl shadow-md flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold">Moderation Queue ({flaggedContent.length})</h3>
                    </div>
                    <ul className="overflow-y-auto">
                        {flaggedContent.map(item => (
                            <li
                                key={item.id}
                                onClick={() => setSelectedContentId(item.id)}
                                className={`p-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer ${selectedContentId === item.id ? 'bg-purple-50 dark:bg-purple-900/50' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <div className="flex items-center space-x-3">
                                    <img src={item.creator.profile.avatar} alt={item.creator.profile.name} className="w-8 h-8 rounded-full" />
                                    <div>
                                        <p className="text-sm font-medium">{item.creator.profile.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Reports: {item.reportCount}</p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                {/* Right Column: Details & Actions */}
                <div className="flex-1 bg-white dark:bg-gray-800/50 rounded-xl shadow-md flex flex-col">
                    {selectedContent ? (
                        <>
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="font-semibold">Content Details</h3>
                            </div>
                            <div className="p-4 flex-grow overflow-y-auto space-y-4">
                                <img src={selectedContent.files[0]?.thumbnailUrl} alt="Flagged content" className="w-full rounded-lg" />
                                <div className="p-3 bg-red-50 dark:bg-red-900/50 rounded-lg">
                                    <p className="text-sm font-bold text-red-700 dark:text-red-200">Reason for Report</p>
                                    <p className="text-sm text-red-600 dark:text-red-300">{selectedContent.reason}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Decision Notes</h4>
                                    <textarea
                                        rows={3}
                                        placeholder="Add internal notes about your decision..."
                                        className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                    ></textarea>
                                </div>
                            </div>
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 grid grid-cols-2 gap-3">
                                <button onClick={handleApprove} className="flex items-center justify-center space-x-2 py-2 px-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Approve</span>
                                </button>
                                <button onClick={handleDelete} className="flex items-center justify-center space-x-2 py-2 px-3 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
                                    <Trash2 className="w-4 h-4" />
                                    <span>Delete Content</span>
                                </button>
                                <button onClick={handleWarnCreator} className="flex items-center justify-center space-x-2 py-2 px-3 text-sm font-medium text-white bg-yellow-500 rounded-lg hover:bg-yellow-600">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>Warn Creator</span>
                                </button>
                                <button onClick={handleBanCreator} className="flex items-center justify-center space-x-2 py-2 px-3 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-800">
                                    <Slash className="w-4 h-4" />
                                    <span>Ban Creator</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <p>Select an item from the queue to review.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContentModerationPanel;
