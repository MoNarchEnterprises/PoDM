import React, { useEffect, useState } from 'react';
import * as apiClient from '../../lib/apiClient';
import { Contest } from '@common/types/Contest';
import Button from '../../components/ui/Button';
import { Gift, Clock, Ticket, Check } from 'lucide-react';
import { timeAgo } from '../../lib/formatters';

const FanContestList = () => {
    const [contests, setContests] = useState<Contest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchContests = async () => {
        try {
            const response = await apiClient.getFanContests();
            setContests(response.data);
        } catch (error) {
            console.error('Failed to fetch fan contests', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchContests();
    }, []);

    const handleEnter = async (id: string) => {
        try {
            await apiClient.enterContest(id);
            // Optimistically update UI or refetch
            setContests(prev => prev.map(c => c.id === id ? { ...c, hasEntered: true } : c));
            alert('You have entered the contest! Good luck!');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to enter contest');
        }
    };

    if (isLoading) return <div className="p-4 text-center text-gray-500">Loading contests...</div>;
    if (contests.length === 0) return null; // Don't show section if empty

    return (
        <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Gift className="text-purple-500" />
                Active Contests
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {contests.map((contest) => (
                    <div key={contest.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-purple-100 dark:border-purple-900/30">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
                            <h3 className="font-bold text-lg">{contest.title}</h3>
                            <div className="text-sm opacity-90 flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                <span>Ends {timeAgo(contest.end_date)}</span>
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Prize:</p>
                                <p className="text-gray-900 dark:text-white">{contest.prize_description}</p>
                            </div>

                            <div className="mb-4 text-sm">
                                {contest.entry_type === 'weighted_spend' ? (
                                    <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded text-purple-700 dark:text-purple-300">
                                        <p className="font-semibold flex items-center gap-1">
                                            <Ticket className="w-4 h-4" /> Weighted Entry
                                        </p>
                                        <p className="text-xs mt-1">
                                            1 Base Entry + {contest.entry_multiplier} extra per $1 spent.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-600 dark:text-gray-300">
                                        <p className="font-semibold flex items-center gap-1">
                                            <Ticket className="w-4 h-4" /> Standard Entry
                                        </p>
                                        <p className="text-xs mt-1">Everyone gets 1 entry.</p>
                                    </div>
                                )}
                            </div>

                            {contest.hasEntered ? (
                                <Button className="w-full bg-green-500 hover:bg-green-600 cursor-default" disabled>
                                    <Check className="w-4 h-4 mr-2" /> Entered
                                </Button>
                            ) : (
                                <Button className="w-full" onClick={() => handleEnter(contest.id)}>
                                    Enter to Win
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FanContestList;
