import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as apiClient from '../../lib/apiClient';
import { Contest } from '@common/types/Contest';
import Button from '../../components/ui/Button';
import CreateContestModal from './CreateContestModal';
import { Plus, Trophy, Calendar, MessageCircle } from 'lucide-react';
import { formatDate } from '../../lib/formatters';

const CreatorContestList = () => {
    const navigate = useNavigate();
    const [contests, setContests] = useState<Contest[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchContests = async () => {
        try {
            const response = await apiClient.getMyContests();
            setContests(response.data);
        } catch (error) {
            console.error('Failed to fetch contests', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchContests();
    }, []);

    const handlePublish = async (id: string) => {
        if (confirm('Are you sure you want to publish this contest? It will be visible to your audience immediately.')) {
            await apiClient.publishContest(id);
            fetchContests();
        }
    };

    const handleFinalize = async (id: string) => {
        if (confirm('Are you sure you want to pick a winner now? This will end the contest.')) {
            await apiClient.finalizeContest(id);
            alert('Winner has been selected!');
            fetchContests();
        }
    };

    const handleMessageWinner = (contest: Contest) => {
        if (!contest.winner_id || !contest.winner_details) return;

        const message = `Congrats, ${contest.winner_details.username}, you won the ${contest.title} contest! 🎉`;
        navigate(`/hub/messages?userId=${contest.winner_id}&text=${encodeURIComponent(message)}&autoSend=true`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Contests</h2>
                <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={Plus} size="sm">New Contest</Button>
            </div>

            {isLoading ? (
                <div className="text-center py-8">Loading...</div>
            ) : contests.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <Trophy className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No contests yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Create your first contest to engage your audience.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {contests.map((contest) => (
                        <div key={contest.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-lg dark:text-white">{contest.title}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${contest.status === 'active' ? 'bg-green-100 text-green-800' :
                                        contest.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {contest.status.toUpperCase()}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{contest.prize_description}</p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>Ends: {formatDate(contest.end_date)}</span>
                                    </div>
                                    {contest.entry_type === 'weighted_spend' && (
                                        <span className="text-purple-600 dark:text-purple-400 font-medium">Weighted Entry ({contest.entry_multiplier}x)</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {contest.status === 'draft' && (
                                    <Button size="sm" onClick={() => handlePublish(contest.id)}>Publish</Button>
                                )}
                                {contest.status === 'active' && (
                                    <Button size="sm" variant="secondary" onClick={() => handleFinalize(contest.id)}>Pick Winner</Button>
                                )}
                                {contest.status === 'completed' && (
                                    <div className="flex flex-col items-end">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleMessageWinner(contest)}
                                            leftIcon={MessageCircle}
                                        >
                                            {contest.winner_details ? `Message @${contest.winner_details.username}` : 'Winner Selected'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <CreateContestModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchContests}
            />
        </div>
    );
};

export default CreatorContestList;
