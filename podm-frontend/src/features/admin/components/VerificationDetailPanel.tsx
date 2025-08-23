import React from 'react';
import { ArrowLeft } from 'lucide-react';

// --- Import Shared Types ---
import { User } from '@common/types/User';

// --- Import Reusable Components ---
import Button from '../../../components/ui/Button';

// --- Local Types ---
// In a real application, the URLs for verification documents would likely
// be stored on the user object, perhaps in a 'verification' field.
interface VerificationDetailPanelProps {
    /**
     * The user object for the creator whose verification is being reviewed.
     */
    user: User;
    /**
     * A callback function to return to the main user list.
     */
    onBack: () => void;
    /**
     * A callback function to approve the user's verification.
     */
    onApprove: (userId: string) => void;
    /**
     * A callback function to reject the user's verification.
     */
    onReject: (userId: string) => void;
}

// --- Main Verification Detail Panel Component ---
const VerificationDetailPanel = ({ user, onBack, onApprove, onReject }: VerificationDetailPanelProps) => {
    if (!user) return null;

    // Placeholder data for document URLs, as the final data structure is not defined.
    // In a real app, these would come from `user.verification.idUrl` or similar.
    const verificationDocs = {
        idUrl: 'https://placehold.co/600x400/1F2937/FFFFFF?text=ID+Document',
        selfieUrl: 'https://placehold.co/600x400/1F2937/FFFFFF?text=Selfie+with+ID',
        signature: user.profile.name, // Use the user's name as a placeholder signature
    };

    return (
        <div>
            <header className="mb-8">
                <button onClick={onBack} className="flex items-center space-x-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to User List</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Verification for {user.profile.name}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Review the submitted documents and approve or reject the creator's application.</p>
            </header>
            
            <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md">
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold mb-2">Government ID</h4>
                        <img src={verificationDocs.idUrl} alt="Government ID" className="rounded-lg w-full border dark:border-gray-700" />
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Selfie with ID</h4>
                        <img src={verificationDocs.selfieUrl} alt="Selfie with ID" className="rounded-lg w-full border dark:border-gray-700" />
                    </div>
                    <div className="md:col-span-2">
                        <h4 className="font-semibold mb-2">Signed Affidavit</h4>
                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Signed as: <span className="font-mono bg-gray-100 dark:bg-gray-700 p-1 rounded">{verificationDocs.signature}</span>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end space-x-3">
                    <Button 
                        variant="danger"
                        onClick={() => onReject(user._id)}
                    >
                        Reject
                    </Button>
                    <Button 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => onApprove(user._id)}
                    >
                        Approve
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default VerificationDetailPanel;
