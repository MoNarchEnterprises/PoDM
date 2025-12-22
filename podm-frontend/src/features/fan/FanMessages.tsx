// src/features/fan/FanMessages.tsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useStripe } from '@stripe/react-stripe-js';
import { Send, ArrowLeft } from 'lucide-react';
import * as apiClient from '../../lib/apiClient';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import { socket } from '../../lib/socket';
import ContentViewerModal from './components/ContentViewerModal';
import { formatMessageTimestamp, formatDate } from '../../lib/formatters';
import MessageBubble from '../messages/components/MessageBubble';
import { Message, MessageContent } from '@common/types/Message';

// --- Types ---
interface ConversationWithCreator {
    _id: string | null;
    creator: { _id: string; profile: { name: string; avatar: string; }; };
    lastMessage?: { text?: string; isRead: boolean; };
    updatedAt: string;
}

// --- Components ---
const ConversationListItem = ({ conversation, isActive, onClick }: { conversation: ConversationWithCreator; isActive: boolean; onClick: () => void; }) => (
    <div onClick={onClick}
        className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors duration-200 ${isActive ? 'bg-purple-900/50' : 'hover:bg-gray-700/50'}`}>
        <div className="relative mr-3">
            <img className="w-12 h-12 rounded-full" src={conversation.creator.profile.avatar} alt={conversation.creator.profile.name} />
            {conversation.lastMessage && !conversation.lastMessage.isRead &&
                <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-pink-500 border-2 border-gray-800"></span>}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
                <p className={`font-bold text-sm ${isActive ? 'text-purple-200' : 'text-gray-200'}`}>
                    {conversation.creator.profile.name}
                </p>
                <p className="text-xs text-gray-500">
                    {formatMessageTimestamp(conversation.updatedAt)}
                </p>
            </div>
            <p className="text-sm text-gray-400 truncate">
                {conversation.lastMessage?.text || 'Sent content'}
            </p>
        </div>
    </div>
);

// --- Main Component ---
const FanMessagesPage = () => {
    const { user: currentFan } = useAuth();
    const location = useLocation();
    const stripe = useStripe();
    const initialState = location.state;
    const [conversations, setConversations] = useState<ConversationWithCreator[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
    const [newMessageText, setNewMessageText] = useState('');
    const [isLoadingConvos, setIsLoadingConvos] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const previousConversationId = useRef<string | null>(null);

    const [viewingContent, setViewingContent] = useState<MessageContent | null>(null);

    const galleryItemsForModal = useMemo(() => {
        if (!viewingContent) return [];
        return [{
            contentId: viewingContent.contentId,
            content: {
                _id: viewingContent.contentId,
                title: 'Attached Content',
                files: [{ thumbnailUrl: viewingContent.thumbnailUrl }],
            }
        }];
    }, [viewingContent]);

    const handleContentClick = (content: MessageContent) => {
        setViewingContent(content);
    };
    const handleCloseViewer = () => {
        setViewingContent(null);
    };

    useEffect(() => {
        console.log('[FanMessages] Fetching conversations...');
        apiClient.getMyConversations().then(response => {
            console.log('[FanMessages] Conversations loaded:', response.data);
            let convos = response.data;
            if (initialState?.creatorId) {
                const existing = convos.find((c: any) => c.creator._id === initialState.creatorId);
                if (!existing) { convos = [{ _id: null, creator: { _id: initialState.creatorId, profile: { name: initialState.creatorName, avatar: initialState.creatorAvatar } }, updatedAt: new Date().toISOString() }, ...convos]; }
                setSelectedCreatorId(initialState.creatorId);
            }
            setConversations(convos);
        }).catch(err => console.error("Failed to fetch conversations", err)).finally(() => setIsLoadingConvos(false));
    }, [initialState]);

    const activeConversation = conversations.find(c => c.creator._id === selectedCreatorId);

    useEffect(() => {
        socket.connect();
        socket.on('connect', () => console.log('[Socket.IO] Connected to server!'));
        socket.on('connect_error', (err) => console.error('[Socket.IO] Connection Error:', err.message));

        socket.on('new_message', (newMessage: Message) => {
            setMessages(prev => prev.some(msg => msg.id === newMessage.id) ? prev : [...prev, newMessage]);
        });

        socket.on('message_updated', (updatedMessage: Message) => {
            setMessages(prev => prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg));
        });

        socket.on('message_deleted', ({ messageId }: { messageId: string }) => {
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
        });

        socket.on('conversation_read', ({ conversationId }: { conversationId: string }) => {
            setConversations(prev => prev.map(c =>
                c._id === conversationId && c.lastMessage
                    ? { ...c, lastMessage: { ...c.lastMessage, isRead: true } }
                    : c
            ));
        });

        return () => {
            socket.off('connect');
            socket.off('connect_error');
            socket.off('new_message');
            socket.off('message_updated');
            socket.off('message_deleted');
            socket.off('conversation_read');
            socket.disconnect();
            console.log('[Socket.IO] Disconnected from server.');
        };
    }, []);

    useEffect(() => {
        const conversationId = activeConversation?._id;
        if (previousConversationId.current && previousConversationId.current !== conversationId) {
            socket.emit('leave_conversation', previousConversationId.current);
        }
        if (conversationId) {
            setIsLoadingMessages(true);
            console.log('[FanMessages] Fetching messages for conversation:', conversationId);
            apiClient.getMessagesInConversation(conversationId).then(response => setMessages(response.data))
                .catch(err => console.error("Failed to fetch messages", err)).finally(() => setIsLoadingMessages(false));
            socket.emit('join_conversation', conversationId);
            previousConversationId.current = conversationId;
            apiClient.markConversationAsRead(conversationId).catch(err =>
                console.error("Failed to mark conversation as read", err));
        } else {
            setMessages([]);
        }
        return () => {
            if (conversationId) socket.emit('leave_conversation', conversationId);
        };
    }, [activeConversation]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessageText.trim() || !activeConversation) return;
        const textToSend = newMessageText;
        setNewMessageText('');
        try {
            await apiClient.sendMessage(activeConversation.creator._id, textToSend);
        } catch (error) {
            console.error("Failed to send message", error);
            setNewMessageText(textToSend);
        }
    };

    const handleUnlockContent = async (message: Message) => {
        if (!stripe || !message.content) { return; }

        try {
            const { data } = await apiClient.unlockMessageContent(message.id);
            const { clientSecret, status, paymentIntentId } = data;

            let finalStatus = status;
            let finalPaymentIntentId = paymentIntentId;

            if (status === 'requires_action') {
                console.log("Stripe requires 3D Secure authentication. Opening modal...");
                const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret);

                if (error) {
                    throw new Error(error.message);
                }
                finalStatus = paymentIntent?.status;
                if (paymentIntent) finalPaymentIntentId = paymentIntent.id;
            }

            if (finalStatus === 'succeeded') {
                setMessages(prev => prev.map(msg =>
                    msg.id === message.id
                        ? { ...msg, content: { ...msg.content!, isUnlocked: true } }
                        : msg
                ));

                await apiClient.addContentToGallery(message.content.contentId);

                if (finalPaymentIntentId) {
                    await apiClient.confirmTransaction(finalPaymentIntentId);
                }

                alert("Content unlocked and added to your gallery!");
            }

        } catch (error: any) {
            alert(`Payment failed: ${error.message}`);
            console.error(error);
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        try {
            await apiClient.deleteMessage(messageId);
        } catch (error) {
            console.error("Failed to delete message:", error);
            alert("Could not delete the message. Please try again.");
        }
    };

    const isNewDay = (date1: string, date2: string) => {
        if (!date1 || !date2) return false;
        const d1 = new Date(date1.replace(' ', 'T'));
        const d2 = new Date(date2.replace(' ', 'T'));
        return d1.getFullYear() !== d2.getFullYear() ||
            d1.getMonth() !== d2.getMonth() ||
            d1.getDate() !== d2.getDate();
    };

    return (
        <>
            <ContentViewerModal
                galleryItems={galleryItemsForModal}
                currentIndex={viewingContent ? 0 : null}
                onClose={handleCloseViewer}
                onNext={() => { }}
                onPrevious={() => { }}
            />
            <div className="flex h-screen bg-gray-900 text-gray-200">
                <div className={`w-full md:w-1/3 lg:w-1/4 bg-gray-800 border-r border-gray-700 flex flex-col ${activeConversation && 'hidden md:flex'}`}>
                    <div className="p-4 border-b border-gray-700"><h2 className="text-xl font-bold">Messages</h2></div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {isLoadingConvos ? <p className="p-4 text-center">Loading...</p> : conversations.map(convo => <ConversationListItem key={convo.creator._id} conversation={convo} isActive={selectedCreatorId === convo.creator._id} onClick={() => setSelectedCreatorId(convo.creator._id)} />)}
                    </div>
                </div>
                <div className={`flex-1 flex flex-col bg-gray-900 ${!activeConversation && 'hidden md:flex'}`}>
                    {activeConversation ? (
                        <>
                            <div className="flex items-center p-3 border-b border-gray-700 bg-gray-800"><button onClick={() => setSelectedCreatorId(null)} className="md:hidden mr-2 p-2 rounded-full hover:bg-gray-700"><ArrowLeft className="w-5 h-5" /></button><img className="w-10 h-10 rounded-full mr-3" src={activeConversation.creator.profile.avatar} alt={activeConversation.creator.profile.name} /><p className="font-bold">{activeConversation.creator.profile.name}</p></div>
                            <div className="flex-1 p-4 space-y-2 overflow-y-auto flex flex-col-reverse">
                                <div className="space-y-4">
                                    {isLoadingMessages ? <p className="text-center">Loading messages...</p> :
                                        [...messages].map((msg, index) => {
                                            const nextMsg = [...messages][index + 1];
                                            const showDateSeparator = !nextMsg || isNewDay(msg.created_at, nextMsg.created_at);
                                            const isMe = msg.sender_id === currentFan?.id;
                                            const senderRole = isMe ? 'fan' : 'creator';

                                            return (
                                                <React.Fragment key={msg.id}>
                                                    <MessageBubble
                                                        message={msg}
                                                        isMe={isMe}
                                                        senderRole={senderRole}
                                                        canSaveToGallery={true}
                                                        onUnlock={handleUnlockContent}
                                                        onContentClick={handleContentClick}
                                                        onSaveToGallery={(contentId) => apiClient.addContentToGallery(contentId)}
                                                        onDelete={handleDeleteMessage}
                                                    />
                                                    {showDateSeparator && (
                                                        <div className="text-center text-xs text-gray-500 font-bold py-4">
                                                            {formatDate(msg.created_at)}
                                                        </div>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
                                    }
                                </div>
                            </div>
                            <form onSubmit={handleSendMessage} className="p-4 bg-gray-800 border-t border-gray-700"><div className="flex items-center bg-gray-700 rounded-full p-1"><input type="text" value={newMessageText} onChange={e => setNewMessageText(e.target.value)} placeholder="Type a message..." className="flex-1 bg-transparent px-3 outline-none" /><Button type="submit" size="sm" className="p-2 h-auto rounded-full ml-2"><Send className="w-5 h-5" /></Button></div></form>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500"><p>Select a conversation to start messaging</p></div>
                    )}
                </div>
            </div>
        </>
    );
};

export default FanMessagesPage;