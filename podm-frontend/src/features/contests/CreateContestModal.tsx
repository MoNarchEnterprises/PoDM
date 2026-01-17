import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import * as apiClient from '../../lib/apiClient';
import { Calendar, Gift, Award, Info } from 'lucide-react';
import { SubscriptionTier } from '@common/types/Creator';

interface CreateContestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateContestModal = ({ isOpen, onClose, onSuccess }: CreateContestModalProps) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [prizeDescription, setPrizeDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Weighted Entry State
    const [isWeighted, setIsWeighted] = useState(false);
    const [spendThreshold, setSpendThreshold] = useState(10); // Dollars
    const [entriesPerThreshold, setEntriesPerThreshold] = useState(1);

    // Requirement State
    const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
    const [selectedTierId, setSelectedTierId] = useState<string>('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchTiers();
        }
    }, [isOpen]);

    const fetchTiers = async () => {
        try {
            const response = await apiClient.getCreatorTiers();
            if (response.success) {
                setTiers(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch tiers', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await apiClient.createContest({
                title,
                description,
                prize_description: prizeDescription,
                start_date: new Date(startDate).toISOString(),
                end_date: new Date(endDate).toISOString(),
                entry_requirements: {
                    min_tier_id: selectedTierId || undefined,
                    all_subscribers: !selectedTierId
                },
                entry_type: isWeighted ? 'weighted_spend' : 'standard',
                spend_threshold: Math.round(spendThreshold * 100), // Convert to cents
                additional_entries: entriesPerThreshold
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create contest');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold dark:text-white">Create New Contest</h2>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        id="title"
                        label="Contest Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Summer Giveaway"
                        leftIcon={Award}
                        required
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Rules and details..."
                            required
                        />
                    </div>

                    <Input
                        id="prize"
                        label="Prize Details"
                        value={prizeDescription}
                        onChange={(e) => setPrizeDescription(e.target.value)}
                        placeholder="e.g. 1-on-1 Zoom Call"
                        leftIcon={Gift}
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            id="start"
                            type="datetime-local"
                            label="Start Date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            leftIcon={Calendar}
                            required
                        />
                        <Input
                            id="end"
                            type="datetime-local"
                            label="End Date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            leftIcon={Calendar}
                            required
                        />
                    </div>

                    {/* Entry Requirements */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Minimum Subscription Tier</label>
                        <select
                            value={selectedTierId}
                            onChange={(e) => setSelectedTierId(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="">All Subscribers</option>
                            {tiers.map((tier) => (
                                <option key={tier.id} value={tier.id}>
                                    {tier.name} (${tier.price})
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Only subscribers at this tier or higher can enter (if implemented).</p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="flex items-start">
                            <div className="flex items-center h-5">
                                <input
                                    id="weighted"
                                    type="checkbox"
                                    checked={isWeighted}
                                    onChange={(e) => setIsWeighted(e.target.checked)}
                                    className="focus:ring-purple-500 h-4 w-4 text-purple-600 border-gray-300 rounded"
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="weighted" className="font-medium text-gray-700 dark:text-gray-200">Weighted Entries</label>
                                <p className="text-gray-500 dark:text-gray-400">Give extra entries based on fan spending.</p>
                            </div>
                        </div>

                        {isWeighted && (
                            <div className="mt-4 pl-7 space-y-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm">Every</span>
                                    <div className="relative w-24">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                        <input
                                            type="number"
                                            min="1"
                                            value={spendThreshold}
                                            onChange={(e) => setSpendThreshold(Math.max(1, parseInt(e.target.value) || 0))}
                                            className="w-full pl-6 pr-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                        />
                                    </div>
                                    <span className="text-sm">spent grants</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={entriesPerThreshold}
                                        onChange={(e) => setEntriesPerThreshold(Math.max(1, parseInt(e.target.value) || 0))}
                                        className="w-20 px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                    />
                                    <span className="text-sm">entries.</span>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Example: With settings $10 and 1 entry, a fan who spends $50 gets 5 extra entries plus their base entry.
                                </p>
                            </div>
                        )}
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div className="flex justify-end pt-4">
                        <Button type="button" variant="secondary" onClick={onClose} className="mr-2">Cancel</Button>
                        <Button type="submit" isLoading={isLoading}>Create Draft</Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default CreateContestModal;
