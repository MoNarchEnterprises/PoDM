import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, CheckCircle, RefreshCw, AlertTriangle, MessageSquare } from 'lucide-react';
import * as apiClient from '../../lib/apiClient';
import { Subscription } from '@common/types/Subscription';
import { Creator, SubscriptionTier } from '@common/types/Creator';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useModal } from '../../hooks/useModal';
import { formatDate } from '../../lib/formatters';

// --- Local Types ---
interface SubscriptionWithCreator extends Subscription {
    creator: Creator;
    availableTiers: SubscriptionTier[];
    tierName: string;
}

// --- Reusable Sub-Components (Modals & Cards) ---

const CancelModal = ({ isOpen, onClose, onConfirm, creatorName }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; creatorName?: string; }) => (
    <Modal isOpen={isOpen} onClose={onClose} hideCloseButton>
        <div className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold">Cancel Subscription?</h2>
            <p className="text-gray-400 mt-2">
                Are you sure you want to cancel your subscription to <span className="font-bold text-white">{creatorName}</span>?
                You will lose access to their content at the end of your current billing period.
            </p>
            <div className="flex justify-center space-x-4 mt-6">
                <Button variant="secondary" onClick={onClose}>Nevermind</Button>
                <Button variant="danger" onClick={onConfirm}>Yes, Cancel</Button>
            </div>
        </div>
    </Modal>
);

const ResubscribeModal = ({ isOpen, onClose, onConfirm, subscription }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; subscription?: SubscriptionWithCreator; }) => {
    if (!subscription) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} hideCloseButton>
            <div className="p-6 text-center">
                <RefreshCw className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <h2 className="text-xl font-bold">Resubscribe to {subscription.creator.profile.name}?</h2>
                <p className="text-gray-400 mt-2">
                    You will be charged <span className="font-bold text-white">${Number(subscription.price || 0).toFixed(2)}</span> for the <span className="font-bold text-white">{subscription.tierName}</span> tier and your subscription will be active immediately.
                </p>
                <div className="flex justify-center space-x-4 mt-6">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={onConfirm}>Confirm & Pay</Button>
                </div>
            </div>
        </Modal>
    );
};

const ChangeTierModal = ({ isOpen, onClose, onConfirm, subscription, isLoading }: { isOpen: boolean; onClose: () => void; onConfirm: (tierId: string) => void; subscription?: SubscriptionWithCreator; isLoading: boolean; }) => {
    const [selectedTierId, setSelectedTierId] = useState(subscription?.tier_id);
    if (!isOpen || !subscription) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <header className="p-6 border-b border-gray-700"><h2 className="text-xl font-bold">Change Subscription Tier</h2></header>
            <main className="p-6 space-y-4">
                {subscription.availableTiers.map(tier => (
                    <div key={tier.id} onClick={() => setSelectedTierId(tier.id)} className={`p-4 rounded-lg border-2 cursor-pointer flex justify-between items-center ${selectedTierId === tier.id ? 'border-purple-500 bg-purple-900/50' : 'border-gray-600'}`}>
                        <div>
                            <p className="font-semibold">{tier.name}</p>
                            <p className="text-sm text-gray-400">${Number(tier.price || 0).toFixed(2)}/month</p>
                        </div>
                        {selectedTierId === tier.id && <CheckCircle className="w-6 h-6 text-purple-500" />}
                    </div>
                ))}
            </main>
            <footer className="p-6 bg-gray-800 border-t border-gray-700 flex justify-end space-x-3">
                <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
                <Button onClick={() => onConfirm(selectedTierId || '')} isLoading={isLoading} disabled={selectedTierId === subscription.tier_id}>Confirm Change</Button>
            </footer>
        </Modal>
    );
};


const SubscriptionCard = ({ subscription, isSelected, onClick }: { subscription: SubscriptionWithCreator; isSelected: boolean; onClick: () => void; }) => {
    const statusMap: Record<string, string> = { active: 'text-green-500', expired: 'text-red-500', canceled: 'text-yellow-500', pending: 'text-yellow-500' };
    const statusStyle = statusMap[subscription.status] || 'text-gray-400';
    return (
        <div onClick={onClick} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-purple-500 bg-purple-900/50' : 'bg-gray-800/50 border-transparent hover:border-gray-600'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <img src={subscription.creator.profile.avatar} alt={subscription.creator.profile.name} className="w-12 h-12 rounded-full" />
                    <div>
                        <p className="font-bold text-white">{subscription.creator.profile.name}</p>
                        <p className="text-sm text-gray-400">{subscription.tierName}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-bold text-lg text-white">${Number(subscription.price || 0).toFixed(2)}<span className="text-sm font-bold text-gray-500">/mo</span></p>
                    <div className={`flex items-center justify-end text-xs font-bold mt-1 ${statusStyle}`}>
                        {subscription.status === 'active' ? <CheckCircle className="w-5 h-3 mr-1" /> : <XCircle className="w-5 h-3 mr-1" />}
                        <span className="capitalize">{subscription.status}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SubscriptionDetails = ({ subscription, onCancelClick, onResubscribeClick, onChangeTierClick }: { subscription?: SubscriptionWithCreator; onCancelClick: (sub: SubscriptionWithCreator) => void; onResubscribeClick: (sub: SubscriptionWithCreator) => void; onChangeTierClick: (sub: SubscriptionWithCreator) => void; }) => {
    const navigate = useNavigate();

    const handleNavigateToMessage = () => {
        if (!subscription) return;
        navigate('/fan/messages', {
            state: {
                creatorId: subscription.creator.id,
                creatorName: subscription.creator.profile.name,
                creatorAvatar: subscription.creator.profile.avatar
            }
        });
    };

    if (!subscription) {
        return <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md h-full flex items-center justify-center text-gray-500 dark:text-gray-400"><p>Select a subscription to see details.</p></div>;
    }

    // --- COLOR AND STYLE FIXES ARE APPLIED BELOW ---
    return (
        <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md h-full flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Subscription Details</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Managing subscription for <span className="font-bold text-gray-700 dark:text-gray-200">{subscription.creator.profile.name}</span></p>
                </div>
                <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={handleNavigateToMessage}>
                    <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </Button>
            </div>
            <div className="p-6 space-y-4 flex-grow">
                <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Tier</span><span className="font-semibold text-gray-800 dark:text-gray-200">{subscription.tierName}</span></div>
                <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Monthly Price</span><span className="font-semibold text-gray-800 dark:text-gray-200">${Number(subscription.price || 0).toFixed(2)}</span></div>
                {subscription.status === 'active' && subscription.next_billing_date && <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Next Billing Date</span><span className="font-semibold text-gray-800 dark:text-gray-200">{formatDate(subscription.next_billing_date)}</span></div>}
                <div className="pt-4">
                    {subscription.status === 'active' ? (
                        <div className="flex items-center justify-between">
                            <Button variant="secondary" onClick={() => onChangeTierClick(subscription)}>Change Tier</Button>
                            <Button variant="ghost" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50" onClick={() => onCancelClick(subscription)}>Cancel Subscription</Button>
                        </div>
                    ) : (
                        <Button className="w-full bg-green-500 hover:bg-green-600" leftIcon={RefreshCw} onClick={() => onResubscribeClick(subscription)}>Resubscribe</Button>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- Main Subscriptions Page Component ---
const FanSubscriptionsPage = () => {
    const [subscriptions, setSubscriptions] = useState<SubscriptionWithCreator[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false); // For modal actions
    const [error, setError] = useState<string | null>(null);
    const [selectedSub, setSelectedSub] = useState<SubscriptionWithCreator | undefined>();

    const { isOpen: isCancelModalOpen, openModal: openCancelModal, closeModal: closeCancelModal } = useModal();
    const { isOpen: isResubscribeModalOpen, openModal: openResubscribeModal, closeModal: closeResubscribeModal } = useModal();
    const { isOpen: isChangeTierModalOpen, openModal: openChangeTierModal, closeModal: closeChangeTierModal } = useModal();

    useEffect(() => {
        const fetchSubscriptions = async () => {
            setIsLoading(true);
            try {
                const response = await apiClient.getFanSubscriptions();
                setSubscriptions(response.data);
                setSelectedSub(response.data.find((s: SubscriptionWithCreator) => s.status === 'active'));
            } catch (err) {
                setError("Failed to load your subscriptions.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSubscriptions();
    }, []);

    const handleModalOpen = (setter: () => void, sub: SubscriptionWithCreator) => { setSelectedSub(sub); setter(); };

    const handleConfirmCancel = () => { alert('Canceling subscription...'); closeCancelModal(); };
    const handleConfirmResubscribe = () => { alert('Resubscribing...'); closeResubscribeModal(); };

    const handleConfirmChangeTier = async (newTierId: string) => {
        if (!selectedSub) return;
        setActionLoading(true);
        try {
            const response = await apiClient.updateFanSubscription(selectedSub.id.toString(), newTierId);
            const updatedSub = response.data;

            const newSubscriptions = subscriptions.map(sub =>
                sub.id === updatedSub._id ? updatedSub : sub
            );
            setSubscriptions(newSubscriptions);
            setSelectedSub(updatedSub);

            closeChangeTierModal();
        } catch (err: any) {
            alert(`Error: ${err.response?.data?.message || 'Could not change tier.'}`);
        } finally {
            setActionLoading(false);
        }
    };

    const activeSubs = useMemo(() => subscriptions.filter(s => s.status === 'active'), [subscriptions]);
    const inactiveSubs = useMemo(() => subscriptions.filter(s => s.status !== 'active'), [subscriptions]);

    if (isLoading) return <div className="p-8 text-center">Loading Subscriptions...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <>
            <CancelModal isOpen={isCancelModalOpen} onClose={closeCancelModal} onConfirm={handleConfirmCancel} creatorName={selectedSub?.creator.profile.name} />
            <ResubscribeModal isOpen={isResubscribeModalOpen} onClose={closeResubscribeModal} onConfirm={handleConfirmResubscribe} subscription={selectedSub} />
            <ChangeTierModal
                isOpen={isChangeTierModalOpen}
                onClose={closeChangeTierModal}
                onConfirm={handleConfirmChangeTier}
                subscription={selectedSub}
                isLoading={actionLoading}
            />

            <div className="p-4 sm:p-6 lg:p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold">My Subscriptions</h1>
                    <p className="text-gray-400 mt-1">Manage your active and expired subscriptions.</p>
                </header>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        {activeSubs.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold text-white mb-3">Active ({activeSubs.length})</h2>
                                <div className="space-y-3">
                                    {activeSubs.map(sub => <SubscriptionCard key={`active-${sub.id}`} subscription={sub} isSelected={selectedSub?.id === sub.id} onClick={() => setSelectedSub(sub)} />)}
                                </div>
                            </div>
                        )}
                        {inactiveSubs.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold text-white mb-3">Inactive ({inactiveSubs.length})</h2>
                                <div className="space-y-3">
                                    {inactiveSubs.map(sub => <SubscriptionCard key={`inactive-${sub.id}`} subscription={sub} isSelected={selectedSub?.id === sub.id} onClick={() => setSelectedSub(sub)} />)}
                                </div>
                            </div>
                        )}
                        {subscriptions.length === 0 && (
                            <div className="text-center py-16 text-gray-500">
                                <p className="font-semibold">No Subscriptions Found</p>
                                <p className="text-sm">Your subscriptions will appear here once you subscribe to a creator.</p>
                            </div>
                        )}
                    </div>
                    <div className="lg:col-span-2">
                        <SubscriptionDetails
                            subscription={selectedSub}
                            onCancelClick={(sub) => handleModalOpen(openCancelModal, sub)}
                            onResubscribeClick={(sub) => handleModalOpen(openResubscribeModal, sub)}
                            onChangeTierClick={(sub) => handleModalOpen(openChangeTierModal, sub)}
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default FanSubscriptionsPage;