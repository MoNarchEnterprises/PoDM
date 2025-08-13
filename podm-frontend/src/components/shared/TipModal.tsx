import React, { useState } from 'react';
import { X, Send, CheckCircle } from 'lucide-react';

// --- Import Shared Types ---
import { Creator } from '@common/types/Creator';

// --- Reusable Modal Component ---
// In a real app, this might be imported from a generic ui/Modal.tsx file
const Modal = ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode; }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col relative">
                {children}
            </div>
        </div>
    );
};

// --- Main Tip Modal Component ---
interface TipModalProps {
    /**
     * Controls whether the modal is visible or not.
     */
    isOpen: boolean;
    /**
     * A function to be called when the modal is requested to be closed.
     */
    onClose: () => void;
    /**
     * The creator object who will receive the tip.
     */
    creator: Creator;
    /**
     * A function to be called when the tip is submitted.
     */
    onSubmit: (amount: number, message: string) => void;
}

const TipModal = ({ isOpen, onClose, creator, onSubmit }: TipModalProps) => {
    const [amount, setAmount] = useState(10);
    const [customAmount, setCustomAmount] = useState('');
    const [message, setMessage] = useState('');
    const [step, setStep] = useState(1); // 1 for input, 2 for success

    const handleSendTip = () => {
        const finalAmount = customAmount ? parseFloat(customAmount) : amount;
        if (finalAmount > 0) {
            onSubmit(finalAmount, message);
            setStep(2);
        }
    };

    const handleClose = () => {
        // Reset state for next time modal opens
        setStep(1);
        setAmount(10);
        setCustomAmount('');
        setMessage('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            {step === 1 && (
                <>
                    <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Send a Tip</h2>
                        <button onClick={handleClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </header>
                    <main className="p-6 space-y-4">
                        <div className="text-center">
                            <img src={creator.profile.avatar} alt={creator.profile.name} className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-purple-400" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                You are tipping <span className="font-bold text-gray-800 dark:text-white">{creator.profile.name}</span>
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[5, 10, 20].map(val => (
                                <button 
                                    key={val} 
                                    onClick={() => { setAmount(val); setCustomAmount(''); }} 
                                    className={`py-2 rounded-lg font-bold transition-colors ${amount === val ? 'bg-pink-500 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                >
                                    ${val}
                                </button>
                            ))}
                        </div>
                        <input
                            type="number"
                            placeholder="Custom amount"
                            value={customAmount}
                            onChange={(e) => { setCustomAmount(e.target.value); setAmount(0); }}
                            className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-lg p-2 text-center focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                        <textarea
                            rows={3}
                            placeholder="Add an optional message..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                    </main>
                    <footer className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <button 
                            onClick={handleSendTip} 
                            className="w-full flex items-center justify-center space-x-2 bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-lg transition-colors"
                        >
                            <Send className="w-4 h-4" />
                            <span>Send Tip of ${customAmount || amount}</span>
                        </button>
                    </footer>
                </>
            )}
            {step === 2 && (
                 <div className="p-8 text-center">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tip Sent!</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        You sent <span className="font-bold text-gray-800 dark:text-white">${customAmount || amount}</span> to <span className="font-bold text-gray-800 dark:text-white">{creator.profile.name}</span>. They will be notified!
                    </p>
                    <button onClick={handleClose} className="mt-6 w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700">
                        Done
                    </button>
                </div>
            )}
        </Modal>
    );
};

export default TipModal;
