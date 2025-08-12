import React from 'react';
import { ArrowLeft } from 'lucide-react';

// --- Import Shared Types ---
import { User } from '../../../../common/types/User';

// --- Local Types ---
// In a real app, this would be a more detailed object
interface VerificationDocs {
    idUrl: string;
    selfieUrl: string;
    signature: string;
}

interface VerificationDetailPanelProps {
    user: User & { verificationDocs: VerificationDocs };
    onBack: () => void;
    onApprove: (userId: string) => void;
    onReject: (userId: string) => void;
}

// --- Main Verification Detail Panel Component ---
const VerificationDetailPanel = ({ user, onBack, onApprove, onReject }: VerificationDetailPanelProps) => {
    if (!user) return null;

    return (
        <div>
            <button onClick={onBack} className="flex items-center space-x-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to User List</span>
            </button>
            <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold">Verification for {user.profile.name} (@{user.username})</h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold mb-2">Government ID</h4>
                        <img src={user.verificationDocs.idUrl} alt="Government ID" className="rounded-lg w-full" />
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Selfie with ID</h4>
                        <img src={user.verificationDocs.selfieUrl} alt="Selfie with ID" className="rounded-lg w-full" />
                    </div>
                    <div className="md:col-span-2">
                        <h4 className="font-semibold mb-2">Signed Affidavit</h4>
                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Signed as: <span className="font-mono bg-gray-100 dark:bg-gray-700 p-1 rounded">{user.verificationDocs.signature}</span>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end space-x-3">
                    <button 
                        onClick={() => onReject(user._id)}
                        className="py-2 px-4 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                    >
                        Reject
                    </button>
                    <button 
                        onClick={() => onApprove(user._id)}
                        className="py-2 px-4 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                    >
                        Approve
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VerificationDetailPanel;
