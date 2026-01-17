import React, { useState, useEffect } from 'react';
import { X, Users, AlertCircle } from 'lucide-react';
import Button from '../../../components/ui/Button';
import * as apiClient from '../../../lib/apiClient';

interface WrapperProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const BroadcastModal: React.FC<WrapperProps> = ({ isOpen, onClose, onSuccess }) => {
    const [tiers, setTiers] = useState<{ id: string; name: string; price: number }[]>([]);
    const [selectedTier, setSelectedTier] = useState<string>('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoadingTiers, setIsLoadingTiers] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchTiers();
        }
    }, [isOpen]);

    const fetchTiers = async () => {
        setIsLoadingTiers(true);
        try {
            const response = await apiClient.getCreatorTiers();
            setTiers(response.data);
        } catch (error) {
            console.error("Failed to fetch tiers", error);
        } finally {
            setIsLoadingTiers(false);
        }
    };

    const handleSend = async () => {
        if (!message.trim()) return;

        setIsSending(true);
        try {
            await apiClient.broadcastMessage(message, selectedTier);
            alert("Broadcast sent successfully!");
            setMessage('');
            setSelectedTier('');
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to broadcast message", error);
            alert("Failed to send broadcast. Please try again.");
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-600" />
                        Broadcast Message
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Minimum Tier (Optional)
                        </label>
                        <select
                            value={selectedTier}
                            onChange={(e) => setSelectedTier(e.target.value)}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2.5"
                            disabled={isLoadingTiers}
                        >
                            <option value="">All Subscribers</option>
                            {tiers.map((tier) => (
                                <option key={tier.id} value={tier.id}>
                                    {tier.name} (${tier.price})
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Only subscribers at this tier or higher will receive the message.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Message
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={5}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-3"
                            placeholder="Hey {{ username }}, check out my new exclusive content!"
                        />
                        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 flex items-start gap-1.5 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>
                                <strong>Tip:</strong> Use <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{ username }}'}</code> to automatically insert the fan's name.
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
                    <Button variant="ghost" onClick={onClose} disabled={isSending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSend} isLoading={isSending} disabled={!message.trim()}>
                        Send Broadcast
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default BroadcastModal;
