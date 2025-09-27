// src/features/fan/FanMessages.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // <-- 1. IMPORT useLocation
import { useStripe, useElements } from '@stripe/react-stripe-js'; // <-- IMPORT STRIPE HOOKS
import { Send, ArrowLeft, Lock, Search } from 'lucide-react';
import * as apiClient from '../../lib/apiClient';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/ui/Input';
import Button, { ButtonProps } from '../../components/ui/Button';

// --- Local Types ---
interface MessageContent {
  contentId: string;
  type: string;
  thumbnailUrl: string;
  isPaid: boolean;
  price: number;
  isUnlocked: boolean;
}
interface ConversationWithCreator {
    _id: string | null;
    creator: { _id: string; profile: { name: string; avatar: string; }; };
    lastMessage?: { text?: string; isRead: boolean; };
    updatedAt: string;
}

interface Message {
    _id: string;
    senderId: string;
    text?: string;
    content?: MessageContent; // <-- CORRECTED TYPE
}

const ConversationListItem = ({ conversation, isActive, onClick }: { conversation: ConversationWithCreator; isActive: boolean; onClick: () => void; }) => (
    <div onClick={onClick} className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors duration-200 ${isActive ? 'bg-purple-900/50' : 'hover:bg-gray-700/50'}`}>
        <div className="relative mr-3">
            <img className="w-12 h-12 rounded-full" src={conversation.creator.profile.avatar} alt={conversation.creator.profile.name} />
            {conversation.lastMessage && !conversation.lastMessage.isRead && <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-pink-500 border-2 border-gray-800"></span>}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
                <p className={`font-bold text-sm ${isActive ? 'text-purple-200' : 'text-gray-200'}`}>{conversation.creator.profile.name}</p>
                <p className="text-xs text-gray-500">{new Date(conversation.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <p className="text-sm text-gray-400 truncate">{conversation.lastMessage?.text || 'Sent content'}</p>
        </div>
    </div>
);

const MessageBubble = ({ message, isFan, onUnlock }: { message: Message; isFan: boolean; onUnlock: (messageId: string) => Promise<void>; }) => {
    const bubbleClass = isFan ? 'bg-purple-600 text-white rounded-br-lg' : 'bg-gray-700 text-gray-200 rounded-bl-lg';
    return (
        <div className={`flex ${isFan ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md p-1 rounded-2xl ${bubbleClass}`}>
                {message.text && <p className="px-3 py-2">{message.text}</p>}
                {message.content && (
                    <div className="space-y-2 bg-black/20 rounded-xl p-2">
                        <img src={message.content.thumbnailUrl} alt="Content thumbnail" className={`rounded-lg ${!message.content.isUnlocked && message.content.isPaid && 'blur-md'}`} />
                        {!message.content.isUnlocked && message.content.isPaid && !isFan && (
                            <Button onClick={() => onUnlock(message._id)} className="w-full bg-pink-500 hover:bg-pink-600" size="sm" leftIcon={Lock}>
                                Unlock for ${(message.content.price / 100).toFixed(2)}
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const FanMessagesPage = () => {
    const { user: currentFan } = useAuth();
    const location = useLocation();
    const stripe = useStripe(); // <-- GET STRIPE INSTANCE
    const initialState = location.state;

    const [conversations, setConversations] = useState<ConversationWithCreator[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
    const [newMessageText, setNewMessageText] = useState('');
    const [isLoadingConvos, setIsLoadingConvos] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    useEffect(() => {
        const fetchAndInitialize = async () => {
            setIsLoadingConvos(true);
            try {
                const response = await apiClient.getMyConversations();
                let convos: ConversationWithCreator[] = response.data;
                let creatorToSelect: string | null = null;

                if (initialState?.creatorId) {
                    const existingConvo = convos.find((c) => c.creator._id === initialState.creatorId);
                    if (!existingConvo) {
                        const newPlaceholderConvo: ConversationWithCreator = {
                            _id: null,
                            creator: {
                                _id: initialState.creatorId,
                                profile: { name: initialState.creatorName, avatar: initialState.creatorAvatar },
                            },
                            updatedAt: new Date().toISOString(),
                        };
                        convos = [newPlaceholderConvo, ...convos];
                    }
                    creatorToSelect = initialState.creatorId;
                }
                
                setConversations(convos);
                setSelectedCreatorId(creatorToSelect);

            } catch (error) {
                console.error("Failed to fetch conversations", error);
            } finally {
                setIsLoadingConvos(false);
            }
        };
        fetchAndInitialize();
    }, [initialState]);

    const activeConversation = conversations.find(c => c.creator._id === selectedCreatorId);

    useEffect(() => {
        if (!activeConversation || !activeConversation._id) { 
            setMessages([]);
            return;
        }
        const fetchMessages = async () => {
            setIsLoadingMessages(true);
            try {
                const response = await apiClient.getMessagesInConversation(activeConversation._id!);
                setMessages(response.data);
            } catch (error) {
                console.error("Failed to fetch messages", error);
            } finally {
                setIsLoadingMessages(false);
            }
        };
        fetchMessages();
    }, [activeConversation]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessageText.trim() || !activeConversation) return;

        const creatorId = activeConversation.creator._id;
        const originalText = newMessageText;
        setNewMessageText('');

        try {
            const tempMessage = { _id: `temp-${Date.now()}`, senderId: currentFan!._id, text: originalText };
            setMessages(prev => [...prev, tempMessage]);
            const response = await apiClient.sendMessage(creatorId, originalText);
            
            const convosRes = await apiClient.getMyConversations();
            setConversations(convosRes.data);
            
            setMessages(prev => prev.map(msg => msg._id.startsWith('temp-') ? response.data : msg));
        } catch (error) {
            console.error("Failed to send message", error);
            setNewMessageText(originalText);
            alert('Failed to send message.');
        }
    };


    const handleUnlockContent = async (messageId: string) => {
        if (!stripe) {
            alert("Payment system is not ready. Please try again in a moment.");
            return;
        }

        try {
            // 1. Get the client secret from our backend
            const response = await apiClient.unlockMessageContent(messageId);
            const { clientSecret } = response.data;

            // 2. Use Stripe.js to confirm the payment on the frontend
            const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret);

            if (stripeError) {
                throw new Error(stripeError.message);
            }

            if (paymentIntent?.status === 'succeeded') {
                // 3. Update the UI optimistically now that payment is confirmed
                setMessages(prevMessages =>
                    prevMessages.map(msg =>
                        msg._id === messageId
                            ? { ...msg, content: { ...msg.content!, isUnlocked: true } }
                            : msg
                    )
                );
                alert("Content unlocked successfully!");
                // The webhook will handle the permanent database update.
            }
        } catch (error: any) {
            alert(`Payment failed: ${error.message}`);
            console.error(error);
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 text-gray-200">
            <div className={`w-full md:w-1/3 lg:w-1/4 bg-gray-800 border-r border-gray-700 flex flex-col ${activeConversation && 'hidden md:flex'}`}>
                <div className="p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">Messages</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {isLoadingConvos ? <p className="p-4 text-center">Loading conversations...</p> :
                        // --- FIX #2: Use the creator's ID as the key ---
                        conversations.map(convo => <ConversationListItem key={convo.creator._id} conversation={convo} isActive={selectedCreatorId === convo.creator._id} onClick={() => setSelectedCreatorId(convo.creator._id)} />)}
                </div>
            </div>

            <div className={`flex-1 flex flex-col bg-gray-900 ${!activeConversation && 'hidden md:flex'}`}>
                {activeConversation ? (
                    <>
                        <div className="flex items-center p-3 border-b border-gray-700 bg-gray-800">
                            <button onClick={() => setSelectedCreatorId(null)} className="md:hidden mr-2 p-2 rounded-full hover:bg-gray-700"><ArrowLeft className="w-5 h-5" /></button>
                            <img className="w-10 h-10 rounded-full mr-3" src={activeConversation.creator.profile.avatar} alt={activeConversation.creator.profile.name} />
                            <p className="font-bold">{activeConversation.creator.profile.name}</p>
                        </div>
                        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                            {isLoadingMessages ? <p className="text-center">Loading messages...</p> :
                                messages.map((msg) => 
                                    <MessageBubble 
                                        key={msg._id} 
                                        message={msg} 
                                        isFan={msg.senderId === currentFan?._id}
                                        onUnlock={handleUnlockContent} // <-- Pass the REAL handler
                                    />
                                )}
                        </div>
                        <form onSubmit={handleSendMessage} className="p-4 bg-gray-800 border-t border-gray-700">
                            <div className="flex items-center bg-gray-700 rounded-full p-1">
                                <input type="text" value={newMessageText} onChange={e => setNewMessageText(e.target.value)} placeholder="Type a message..." className="flex-1 bg-transparent px-3 outline-none" />
                                <Button type="submit" size="sm" className="p-2 h-auto rounded-full ml-2"><Send className="w-5 h-5" /></Button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500"><p>Select a conversation to start messaging</p></div>
                )}
            </div>
        </div>
    );
};

export default FanMessagesPage;