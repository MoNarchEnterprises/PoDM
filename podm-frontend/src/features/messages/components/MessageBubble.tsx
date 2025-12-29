// src/features/messages/components/MessageBubble.tsx

import React, { useState } from 'react';
import { Message, MessageContent } from '@common/types/Message';
import Button from '../../../components/ui/Button';
import AudioPlayer from '../../../components/ui/AudioPlayer';
import { Lock, Bookmark, Trash2 } from 'lucide-react';
import { formatMessageTimestamp } from '../../../lib/formatters';

interface MessageBubbleProps {
    message: Message;
    isMe: boolean;
    senderRole: 'creator' | 'fan';
    canSaveToGallery: boolean; // <-- NEW PROP
    onUnlock: (message: Message) => Promise<void>;
    onContentClick: (content: MessageContent) => void;
    onSaveToGallery: (contentId: string) => void;
    onDelete: (messageId: string) => void;
}

const MessageBubble = ({ message, isMe, senderRole, canSaveToGallery, onUnlock, onContentClick, onSaveToGallery, onDelete }: MessageBubbleProps) => {
    const justifyClass = isMe ? 'justify-end' : 'justify-start';

    const bubbleClass = senderRole === 'creator'
        ? `bg-pink-700 text-white ${isMe ? 'rounded-br-none' : 'rounded-bl-none'}`
        : `bg-purple-600 text-gray-200 ${isMe ? 'rounded-br-none' : 'rounded-bl-none'}`;

    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const handleSave = async () => {
        if (!message.content) return;
        setIsSaving(true);
        try {
            await onSaveToGallery(message.content.contentId);
            setIsSaved(true);
        } catch (error) {
            alert("Failed to save to gallery.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}>
            <div className={`flex items-end gap-2`}>
                {isMe && (
                    <button
                        onClick={() => onDelete(message.id)}
                        className="p-1 mb-1 rounded-full text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-700 hover:text-red-400"
                        title="Delete Message"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
                <div className={`max-w-xs lg:max-w-md p-1 rounded-2xl ${bubbleClass}`}>
                    {message.text && <p className="px-3 py-2">{message.text}</p>}
                    {message.voiceMessageUrl && (
                        <div className="px-3 py-2">
                            <AudioPlayer src={message.voiceMessageUrl} />
                        </div>
                    )}
                    {message.content && (
                        <div className="space-y-2 bg-black/20 rounded-xl p-2">
                            {/* Show AudioPlayer for audio content, thumbnail for others */}
                            {message.content.type === 'audio' ? (
                                <div className="py-2">
                                    {(message.content.isUnlocked || isMe) ? (
                                        <AudioPlayer src={message.content.thumbnailUrl} />
                                    ) : (
                                        <div className="text-center text-white/70 py-4">
                                            🎵 Audio Content (Locked)
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="relative cursor-pointer" onClick={() => (message.content?.isUnlocked || isMe) && onContentClick(message.content as MessageContent)}>
                                    <img src={message.content.thumbnailUrl} alt="Content thumbnail" className={`rounded-lg ${!message.content.isUnlocked && message.content.isPaid && !isMe && 'blur-md'}`} />
                                </div>
                            )}
                            {/* --- THIS IS THE FIX --- */}
                            {!message.content.isUnlocked && message.content.isPaid && !isMe ? (
                                <Button onClick={() => onUnlock(message)} className="w-full bg-pink-500 hover:bg-pink-600" size="sm" leftIcon={Lock}>
                                    Unlock for ${(message.content.price / 100).toFixed(2)}
                                </Button>
                            ) : (canSaveToGallery && message.content.isUnlocked && !isMe) && ( // Show only if fan has unlocked
                                <Button onClick={handleSave} disabled={isSaving || isSaved} variant="secondary" size="sm" leftIcon={Bookmark} className="w-full">
                                    {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save to Gallery'}
                                </Button>
                            )}
                            {/* --- END OF FIX --- */}
                        </div>
                    )}
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-1 px-2">{formatMessageTimestamp(message.created_at)}</p>
        </div>
    );
};

export default MessageBubble;