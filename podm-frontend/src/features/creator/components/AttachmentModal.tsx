// src/features/creator/components/AttachmentModal.tsx

import React, { useState, useMemo } from 'react';
import { Send, DollarSign, Music } from 'lucide-react';
import { Content } from '@common/types/Content';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

interface AttachmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    contentItems: Content[];
    onSend: (content: Content, price: number, text: string) => void;
}

const AttachmentModal = ({ isOpen, onClose, contentItems, onSend }: AttachmentModalProps) => {
    const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
    const [price, setPrice] = useState('');
    const [messageText, setMessageText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const selectedContent = useMemo(
        () => contentItems.find(c => c.id === selectedContentId),
        [selectedContentId, contentItems]
    );

    // Helper to get thumbnail URL - handles both signed URLs and relative paths
    const getThumbnailUrl = (item: Content): string => {
        const thumbnailUrl = item.files[0]?.thumbnailUrl;
        if (!thumbnailUrl) return '';

        // If it's already a full URL (starts with http), use it as-is
        if (thumbnailUrl.startsWith('http')) {
            return thumbnailUrl;
        }

        // Otherwise, it might be a relative path - return empty for now
        // The backend should be providing signed URLs for thumbnails
        return thumbnailUrl;
    };

    const handleSend = () => {
        setError(null); // Clear previous errors
        if (!selectedContent) {
            setError('Please select a piece of content to send.');
            return;
        }
        const priceInCents = Math.round(parseFloat(price) * 100);
        if (isNaN(priceInCents) || priceInCents < 0) {
            setError('Price must be a non-negative number.');
            return;
        }

        onSend(selectedContent, priceInCents, messageText);
        handleClose(); // Reset and close the modal on success
    };

    // Resets the modal's state when closed
    const handleClose = () => {
        setSelectedContentId(null);
        setPrice('');
        setMessageText('');
        setError(null);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} className="max-w-3xl">
            <div className="flex flex-col max-h-[90vh]">
                <header className="p-6 border-b border-gray-700 bg-pink-700">
                    <h2 className="text-xl font-bold text-white">Attach PPV Content</h2>
                </header>
                <main className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Side: Content Selection */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-gray-400">Select From Your Vault</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Showing unlisted vault items not yet in this fan's gallery.</p>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-1 gap-2 max-h-96 overflow-y-auto pr-2 rounded-lg bg-gray-900/50 p-2">
                            {contentItems.length > 0 ? contentItems.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedContentId(item.id)}
                                    className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${selectedContentId === item.id ? 'border-pink-500 scale-105' : 'border-transparent hover:border-gray-600'}`}
                                >
                                    {item.type === 'audio' ? (
                                        <div className="w-full h-full bg-purple-600 flex items-center justify-center">
                                            <Music className="w-12 h-12 text-white" />
                                        </div>
                                    ) : (
                                        <img
                                            src={getThumbnailUrl(item)}
                                            alt={item.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                // Fallback to a placeholder if image fails to load
                                                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23374151" width="100" height="100"/%3E%3Ctext fill="%239CA3AF" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                                            }}
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-black/30"></div>
                                </div>
                            )) : (
                                <p className="col-span-full text-center text-gray-400 py-12 text-sm">
                                    No new vault content available for this fan.
                                </p>
                            )}
                        </div>
                    </div>
                    {/* Right Side: Details */}
                    <div className="space-y-6">
                        {selectedContent ? (
                            <>
                                <div>
                                    <h3 className="font-semibold text-pink-700 mb-2">{selectedContent.title}</h3>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-400">Set Price</h3>
                                    <Input
                                        id="ppv-price"
                                        type="number"
                                        placeholder="10.00"
                                        leftIcon={DollarSign}
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-400">Add Optional Message</h3>
                                    <textarea
                                        rows={4}
                                        placeholder="e.g., Here's that special video you asked for!"
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        className="w-full bg-gray-200 text-gray-900 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    ></textarea>
                                </div>
                                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full bg-gray-800/50 rounded-lg text-gray-400">
                                <p>Please select an item from the left.</p>
                            </div>
                        )}
                    </div>
                </main>
                <footer className="p-6 border-t border-gray-700 bg-gray-800 flex justify-end">
                    <Button
                        onClick={handleSend}
                        disabled={!selectedContent}
                        leftIcon={Send}
                        className="bg-pink-500 hover:bg-pink-600"
                    >
                        Send Message
                    </Button>
                </footer>
            </div>
        </Modal>
    );
};

export default AttachmentModal;