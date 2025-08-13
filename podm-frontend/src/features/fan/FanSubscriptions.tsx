import React, { useState, useMemo, useEffect } from 'react';
import { Home, ImageIcon, Briefcase, Settings, MessageSquare, XCircle, CheckCircle, CreditCard, RefreshCw, AlertTriangle } from 'lucide-react';

// --- Import Shared Types ---
import { Subscription } from '@common/types/Subscription';
import { Creator, SubscriptionTier } from '@common/types/Creator';

// --- Import Reusable Components & Hooks ---
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useModal } from '../../hooks/useModal';

// --- Local Types ---
interface SubscriptionWithCreator extends Subscription {
    creator: Creator;
    availableTiers: SubscriptionTier[];
}

// --- Reusable Sub-Components ---

const CancelModal = ({ isOpen, onClose, onConfirm, creatorName }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; creatorName?: string; }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} hideCloseButton>
            <div className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cancel Subscription?</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Are you sure you want to cancel your subscription to <span className="font-bold">{creatorName}</span>?
                    You will lose access to their content at the end of your current billing period.
                </p>
                <div className="flex justify-center space-x-4 mt-6">
                    <Button variant="secondary" onClick={onClose}>Nevermind</Button>
                    <Button variant="danger" onClick={onConfirm}>Yes, Cancel</Button>
                </div>
            </div>
        </Modal>
    );
};

const ResubscribeModal = ({ isOpen, onClose, onConfirm, subscription }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; subscription?: SubscriptionWithCreator; }) => {
    if (!subscription) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} hideCloseButton>
            <div className="p-6 text-center">
                <RefreshCw className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Resubscribe to {subscription.creator.profile.name}?</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    You will be charged <span className="font-bold">${subscription.price.toFixed(2)}</span> for the <span className="font-bold">{subscription.tierId}</span> and your subscription will be active immediately.
                </p>
                <div className="flex justify-center space-x-4 mt-6">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={onConfirm}>Confirm & Pay</Button>
                </div>
            </div>
        </Modal>
    );
};

const ChangeTierModal = ({ isOpen, onClose, onConfirm, subscription }: { isOpen: boolean; onClose: () => void; onConfirm: (tierName: string) => void; subscription?: SubscriptionWithCreator; }) => {
    const [selectedTierName, setSelectedTierName] = useState(subscription?.tierId);
    if (!isOpen || !subscription) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <header className="p-6 border-b border-gray-200 dark:border-gray-700"><h2 className="text-xl font-bold">Change Subscription Tier</h2></header>
            <main className="p-6 space-y-4">
                {subscription.availableTiers.map(tier => (
                    <div key={tier.name} onClick={() => setSelectedTierName(tier.name)} className={`p-4 rounded-lg border-2 cursor-pointer flex justify-between items-center ${selectedTierName === tier.name ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/50' : 'border-gray-200 dark:border-gray-600'}`}>
                        <div>
                            <p className="font-semibold">{tier.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">${tier.price.toFixed(2)}/month</p>
                        </div>
                        {selectedTierName === tier.name && <CheckCircle className="w-6 h-6 text-purple-500" />}
                    </div>
                ))}
            </main>
            <footer className="p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={() => onConfirm(selectedTierName || '')}>Confirm Change</Button>
            </footer>
        </Modal>
    );
};

const SubscriptionCard = ({ subscription, isSelected, onClick }: { subscription: SubscriptionWithCreator; isSelected: boolean; onClick: () => void; }) => {
    const statusStyle = { active: 'text-green-500', expired: 'text-red-500', canceled: 'text-yellow-500' }[subscription.status];
    return (
        <div onClick={onClick} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/50' : 'bg-white dark:bg-gray-800/50 border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <img src={subscription.creator.profile.avatar} alt={subscription.creator.profile.name} className="w-12 h-12 rounded-full" />
                    <div>
                        <p className="font-bold text-gray-800 dark:text-white">{subscription.creator.profile.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{subscription.tierId}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-bold text-lg text-gray-800 dark:text-white">${subscription.price}<span className="text-sm font-normal text-gray-400">/mo</span></p>
                    <div className={`flex items-center justify-end text-xs font-medium mt-1 ${statusStyle}`}>
                        {subscription.status === 'active' ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        <span className="capitalize">{subscription.status}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SubscriptionDetails = ({ subscription, onCancelClick, onResubscribeClick, onChangeTierClick, onUpdatePaymentClick }: { subscription?: SubscriptionWithCreator; onCancelClick: (sub: SubscriptionWithCreator) => void; onResubscribeClick: (sub: SubscriptionWithCreator) => void; onChangeTierClick: (sub: SubscriptionWithCreator) => void; onUpdatePaymentClick: () => void; }) => {
    if (!subscription) {
        return <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400"><p>Select a subscription to see details.</p></div>;
    }
    return (
        <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md h-full flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Subscription Details</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Managing subscription for <span className="font-bold">{subscription.creator.profile.name}</span></p>
            </div>
            <div className="p-6 space-y-4 flex-grow">
                <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-500">Current Tier</span><span className="font-semibold">{subscription.tierId}</span></div>
                <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-500">Monthly Price</span><span className="font-semibold">${subscription.price.toFixed(2)}</span></div>
                {subscription.status === 'active' && subscription.nextBillingDate && <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-500">Next Billing Date</span><span className="font-semibold">{new Date(subscription.nextBillingDate).toLocaleDateString()}</span></div>}
                <div className="pt-4">
                    {subscription.status === 'active' ? (
                        <div className="flex items-center justify-between">
                            <Button variant="ghost" onClick={() => onChangeTierClick(subscription)}>Change Tier</Button>
                            <Button variant="ghost" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50" onClick={() => onCancelClick(subscription)}>Cancel Subscription</Button>
                        </div>
                    ) : (
                        <Button className="w-full bg-green-500 hover:bg-green-600" leftIcon={RefreshCw} onClick={() => onResubscribeClick(subscription)}>Resubscribe</Button>
                    )}
                </div>
            </div>
             <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <h4 className="text-sm font-semibold mb-2">Payment Method</h4>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3"><CreditCard className="w-6 h-6 text-gray-400" /><p className="text-sm">Visa ending in 4242</p></div>
                    <Button variant="ghost" onClick={onUpdatePaymentClick}>Update</Button>
                </div>
            </div>
        </div>
    );
};

// --- Main Subscriptions Page Component ---
interface FanSubscriptionsPageProps {
    initialSubscriptions: SubscriptionWithCreator[];
}

const FanSubscriptionsPage = ({ initialSubscriptions }: FanSubscriptionsPageProps) => {
    const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
    const [selectedSub, setSelectedSub] = useState<SubscriptionWithCreator | undefined>(subscriptions.find(s => s.status === 'active'));
    const { isOpen: isCancelModalOpen, openModal: openCancelModal, closeModal: closeCancelModal } = useModal();
    const { isOpen: isResubscribeModalOpen, openModal: openResubscribeModal, closeModal: closeResubscribeModal } = useModal();
    const { isOpen: isChangeTierModalOpen, openModal: openChangeTierModal, closeModal: closeChangeTierModal } = useModal();

    const handleModalOpen = (setter: () => void, sub: SubscriptionWithCreator) => { setSelectedSub(sub); setter(); };
    
    return (
        <>
            <CancelModal isOpen={isCancelModalOpen} onClose={closeCancelModal} onConfirm={() => {}} creatorName={selectedSub?.creator.profile.name} />
            <ResubscribeModal isOpen={isResubscribeModalOpen} onClose={closeResubscribeModal} onConfirm={() => {}} subscription={selectedSub} />
            <ChangeTierModal isOpen={isChangeTierModalOpen} onClose={closeChangeTierModal} onConfirm={() => {}} subscription={selectedSub} />
            
            <div className="p-4 sm:p-6 lg:p-8">
                <header className="mb-8"><h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Subscriptions</h1><p className="text-gray-500 dark:text-gray-400 mt-1">Manage your active and expired subscriptions.</p></header>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Active ({subscriptions.filter(s=>s.status === 'active').length})</h2>
                            <div className="space-y-3">{subscriptions.filter(s=>s.status === 'active').map(sub => <SubscriptionCard key={sub._id} subscription={sub} isSelected={selectedSub?._id === sub._id} onClick={() => setSelectedSub(sub)} />)}</div>
                        </div>
                         <div>
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Inactive ({subscriptions.filter(s=>s.status !== 'active').length})</h2>
                            <div className="space-y-3">{subscriptions.filter(s=>s.status !== 'active').map(sub => <SubscriptionCard key={sub._id} subscription={sub} isSelected={selectedSub?._id === sub._id} onClick={() => setSelectedSub(sub)} />)}</div>
                        </div>
                    </div>
                    <div className="lg:col-span-2">
                        <SubscriptionDetails 
                            subscription={selectedSub} 
                            onCancelClick={(sub) => handleModalOpen(openCancelModal, sub)}
                            onResubscribeClick={(sub) => handleModalOpen(openResubscribeModal, sub)}
                            onChangeTierClick={(sub) => handleModalOpen(openChangeTierModal, sub)}
                            onUpdatePaymentClick={() => {}}
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default FanSubscriptionsPage;
