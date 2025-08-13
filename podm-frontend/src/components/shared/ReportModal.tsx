import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

// --- Reusable Modal Component ---
// In a real app, this might be imported from a generic ui/Modal.tsx file
const Modal = ({ isOpen, onClose, children, className = '' }: { isOpen: boolean; onClose: () => void; children: React.ReactNode; className?: string }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col relative ${className}`}>
                {children}
            </div>
        </div>
    );
};


// --- Main Report Modal Component ---
interface ReportModalProps {
    /**
     * Controls whether the modal is visible or not.
     */
    isOpen: boolean;
    /**
     * A function to be called when the modal is requested to be closed.
     */
    onClose: () => void;
    /**
     * The type of item being reported (e.g., 'Content', 'User').
     */
    reportType: 'Content' | 'User';
    /**
     * The name of the user or content being reported, for display purposes.
     */
    targetName: string;
    /**
     * A function to be called when the report is submitted.
     */
    onSubmit: (reason: string, details: string) => void;
}

const ReportModal = ({ isOpen, onClose, reportType, targetName, onSubmit }: ReportModalProps) => {
    const [reason, setReason] = useState('Inappropriate Content');
    const [details, setDetails] = useState('');

    const handleSubmit = () => {
        // In a real app, you would perform validation here before submitting.
        onSubmit(reason, details);
        onClose(); // Close the modal after submission
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <header className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-3 text-red-500" />
                    Report {reportType}
                </h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                    <X className="w-6 h-6 text-gray-500" />
                </button>
            </header>
            <main className="p-6 space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    You are reporting {reportType === 'Content' ? `a post by` : ''} <span className="font-bold text-gray-700 dark:text-gray-200">{targetName}</span>.
                </p>
                <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Reason for report
                    </label>
                    <select 
                        id="reason" 
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option>Inappropriate Content</option>
                        <option>Copyright Infringement</option>
                        <option>Spam or Scams</option>
                        <option>Violates Terms of Service</option>
                        <option>Other</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="details" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Additional Details (Optional)
                    </label>
                    <textarea 
                        id="details" 
                        rows={4} 
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        placeholder="Please provide any additional information..." 
                        className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    ></textarea>
                </div>
            </main>
            <footer className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button 
                    onClick={handleSubmit} 
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                    Submit Report
                </button>
            </footer>
        </Modal>
    );
};

export default ReportModal;
