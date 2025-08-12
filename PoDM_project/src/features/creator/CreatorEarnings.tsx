import React, { useState, useEffect, useMemo } from 'react';
import { Home, FileText, MessageSquare, BarChart2, Settings, DollarSign, Banknote, Clock, Download, TrendingUp, X, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- Import Shared Types ---
import { Transaction } from '../../../common/types/Transaction';

// --- Import Reusable Components & Hooks ---
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useModal } from '../../hooks/useModal';
import { formatCurrency, formatDate } from '../../lib/formatters';


// --- Local Types ---
interface EarningsSummary {
    availableForPayout: number;
    pending: number;
    lifetimeEarnings: number;
    nextPayoutDate: string;
}
type MonthlyEarningsData = { name: string; Earnings: number };
interface TransactionWithFan extends Transaction {
    fanName?: string; // This would be joined on the backend
}

// --- Reusable Sub-Components ---

const WithdrawModal = ({ isOpen, onClose, availableBalance }: { isOpen: boolean; onClose: () => void; availableBalance: number; }) => {
    const [amount, setAmount] = useState('');
    const [step, setStep] = useState(1);

    const processingFee = (parseFloat(amount) || 0) * 0.02;
    const totalPayout = (parseFloat(amount) || 0) - processingFee;

    const handleRequestPayout = () => setStep(2);
    const handleClose = () => { setStep(1); setAmount(''); onClose(); };

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            {step === 1 && (
                <>
                    <header className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Request Payout</h2>
                    </header>
                    <main className="p-6 space-y-4">
                        <div className="text-center bg-green-50 dark:bg-green-900/50 p-4 rounded-lg">
                            <p className="text-sm text-green-700 dark:text-green-300">Available Balance</p>
                            <p className="text-3xl font-bold text-green-600 dark:text-green-200">{formatCurrency(availableBalance)}</p>
                        </div>
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Withdrawal Amount</label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><DollarSign className="h-5 w-5 text-gray-400" /></div>
                                <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-3 pl-10 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                        </div>
                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
                            <h4 className="font-semibold text-sm">Payout Summary</h4>
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Amount:</span><span>{formatCurrency((parseFloat(amount) || 0) * 100)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Processing Fee (2%):</span><span className="text-red-500">-{formatCurrency(processingFee * 100)}</span></div>
                            <hr className="border-gray-200 dark:border-gray-600"/>
                            <div className="flex justify-between font-bold"><span >You will receive:</span><span>{formatCurrency(totalPayout > 0 ? totalPayout * 100 : 0)}</span></div>
                        </div>
                    </main>
                    <footer className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                         <Button onClick={handleRequestPayout} disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) * 100 > availableBalance} className="w-full" size="lg">Request Payout</Button>
                    </footer>
                </>
            )}
            {step === 2 && (
                <div className="p-8 text-center">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Success!</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Your payout request for <span className="font-bold text-gray-700 dark:text-gray-200">{formatCurrency(totalPayout * 100)}</span> has been submitted.</p>
                    <p className="text-xs text-gray-400 mt-1">It should arrive in your bank account within 3-5 business days.</p>
                    <Button onClick={handleClose} className="mt-6 w-full">Done</Button>
                </div>
            )}
        </Modal>
    );
};

const EarningsCard = ({ title, value, Icon, color, note }: { title: string; value: string; Icon: React.ElementType; color: string; note: string; }) => (
    <Card className="p-6">
        <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/50`}><Icon className={`w-6 h-6 text-${color}-500`} /></div>
            <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
            </div>
        </div>
        {note && <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">{note}</p>}
    </Card>
);

const TransactionRow = ({ transaction }: { transaction: TransactionWithFan }) => {
    // This component would use the StatusBadge component
    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(transaction.createdAt)}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{transaction.type}</td>
            <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">{transaction.fanName || transaction.fanId}</td>
            <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400 text-right">{formatCurrency(transaction.creatorPayout)}</td>
            <td className="px-4 py-3 text-center text-xs font-medium capitalize">{transaction.status}</td>
        </tr>
    );
};

// --- Main Earnings Page Component ---
interface CreatorEarningsPageProps {
    summary: EarningsSummary;
    monthlyEarnings: MonthlyEarningsData[];
    transactions: TransactionWithFan[];
}

const CreatorEarningsPage = ({ summary, monthlyEarnings, transactions }: CreatorEarningsPageProps) => {
    const [filter, setFilter] = useState('All');
    const { isOpen, openModal, closeModal } = useModal();
    
    const filteredTransactions = useMemo(() => {
        if (filter === 'All') return transactions;
        return transactions.filter(t => t.type === filter);
    }, [filter, transactions]);

    return (
        <>
            <WithdrawModal isOpen={isOpen} onClose={closeModal} availableBalance={summary.availableForPayout} />
            <div className="p-4 sm:p-6 lg:p-8">
                <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Earnings</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your payments and view your transaction history.</p>
                    </div>
                    <Button onClick={openModal} leftIcon={Banknote} className="mt-4 sm:mt-0">
                        Withdraw Funds
                    </Button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <EarningsCard title="Available for Payout" value={formatCurrency(summary.availableForPayout)} Icon={Banknote} color="green" note="Funds that have cleared and can be withdrawn." />
                    <EarningsCard title="Pending" value={formatCurrency(summary.pending)} Icon={Clock} color="yellow" note="Earnings from recent transactions are held for a 7-day clearing period." />
                    <EarningsCard title="Lifetime Earnings" value={formatCurrency(summary.lifetimeEarnings)} Icon={TrendingUp} color="purple" note={`Next scheduled payout is on ${formatDate(summary.nextPayoutDate)}.`} />
                </div>

                <Card noPadding className="mb-8">
                    <div className="p-4 sm:p-6"><h3 className="text-lg font-semibold text-gray-800 dark:text-white">Monthly Earnings</h3></div>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={monthlyEarnings}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                            <XAxis dataKey="name" tick={{ fill: '#9ca3af' }} fontSize={12} />
                            <YAxis tick={{ fill: '#9ca3af' }} fontSize={12} tickFormatter={(value) => `$${value/1000}k`} />
                            <Tooltip cursor={{ fill: 'rgba(107, 70, 193, 0.1)' }} contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem' }} formatter={(value: number) => formatCurrency(value * 100)} />
                            <Bar dataKey="Earnings" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
                
                <Card noPadding>
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Transaction History</h3>
                        <div className="flex items-center space-x-2">
                            <select onChange={(e) => setFilter(e.target.value)} value={filter} className="bg-gray-100 dark:bg-gray-700 border-transparent rounded-full py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                                <option value="All">All Types</option>
                                <option value="Subscription">Subscriptions</option>
                                <option value="Tip">Tips</option>
                                <option value="PPV Message">PPV Messages</option>
                            </select>
                            <Button variant="ghost" size="sm" className="p-2 h-auto"><Download className="w-5 h-5 text-gray-500" /></Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fan</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                               {filteredTransactions.map(item => <TransactionRow key={item._id} transaction={item} />)}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </>
    );
};

export default CreatorEarningsPage;
