// src/features/fan/FanMessages.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useStripe } from '@stripe/react-stripe-js';
import { Send, ArrowLeft, Lock } from 'lucide-react';
import * as apiClient from '../../lib/apiClient';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import { socket } from '../../lib/socket';

// --- Types (remain the same) ---
interface MessageContent {
  contentId: string; type: string; thumbnailUrl: string; isPaid: boolean; price: number; isUnlocked: boolean;
}
interface ConversationWithCreator {
    _id: string | null; creator: { _id: string; profile: { name: string; avatar: string; }; }; lastMessage?: { text?: string; isRead: boolean; }; updatedAt: string;
}
interface Message {
    _id: string; senderId: string; text?: string; content?: MessageContent;
}

// --- Components (remain the same) ---
const ConversationListItem = ({ conversation, isActive, onClick }: { conversation: ConversationWithCreator; isActive: boolean; onClick: () => void; }) => (
    <div onClick={onClick} className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors duration-200 ${isActive ? 'bg-purple-900/50' : 'hover:bg-gray-700/50'}`}><div className="relative mr-3"><img className="w-12 h-12 rounded-full" src={conversation.creator.profile.avatar} alt={conversation.creator.profile.name} />{conversation.lastMessage && !conversation.lastMessage.isRead && <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-pink-500 border-2 border-gray-800"></span>}</div><div className="flex-1 min-w-0"><div className="flex justify-between items-center"><p className={`font-bold text-sm ${isActive ? 'text-purple-200' : 'text-gray-200'}`}>{conversation.creator.profile.name}</p><p className="text-xs text-gray-500">{new Date(conversation.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div><p className="text-sm text-gray-400 truncate">{conversation.lastMessage?.text || 'Sent content'}</p></div></div>
);
const MessageBubble = ({ message, isMe, onUnlock }: { message: Message; isMe: boolean; onUnlock: (messageId: string) => Promise<void>; }) => {
    const justifyClass = isMe ? 'justify-end' : 'justify-start';
    const bubbleClass = isMe ? 'bg-purple-600 text-white rounded-br-none' : 'bg-pink-700 text-gray-200 rounded-bl-none';
    return (<div className={`flex ${justifyClass}`}><div className={`max-w-xs lg:max-w-md p-1 rounded-2xl ${bubbleClass}`}>{message.text && <p className="px-3 py-2">{message.text}</p>}{message.content && (<div className="space-y-2 bg-black/20 rounded-xl p-2"><img src={message.content.thumbnailUrl} alt="Content thumbnail" className={`rounded-lg ${!message.content.isUnlocked && message.content.isPaid && 'blur-md'}`} />{!message.content.isUnlocked && message.content.isPaid && !isMe && (<Button onClick={() => onUnlock(message._id)} className="w-full bg-pink-500 hover:bg-pink-600" size="sm" leftIcon={Lock}>Unlock for ${(message.content.price / 100).toFixed(2)}</Button>)}</div>)}</div></div>);
};

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

    useEffect(() => {
        apiClient.getMyConversations().then(response => {
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
            setMessages(prev => {
                if (prev.some(msg => msg._id === newMessage._id)) return prev;
                return [...prev, newMessage];
            });
        });

        return () => {
            socket.off('connect');
            socket.off('connect_error');
            socket.off('new_message');
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
            apiClient.getMessagesInConversation(conversationId).then(response => setMessages(response.data))
                .catch(err => console.error("Failed to fetch messages", err)).finally(() => setIsLoadingMessages(false));
            socket.emit('join_conversation', conversationId);
            previousConversationId.current = conversationId;
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
    
    const handleUnlockContent = async (messageId: string) => {
        if (!stripe) return;
        try {
            const { data } = await apiClient.unlockMessageContent(messageId);
            const { error } = await stripe.confirmCardPayment(data.clientSecret);
            if (error) throw new Error(error.message);
            setMessages(prev => prev.map(msg => msg._id === messageId ? { ...msg, content: { ...msg.content!, isUnlocked: true } } : msg));
        } catch (error: any) {
            console.error(error);
            alert(`Payment failed: ${error.message}`);
        }
    };

    return (
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
                        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                            {isLoadingMessages ? <p className="text-center">Loading messages...</p> : messages.map((msg) => <MessageBubble key={msg._id} message={msg} isMe={msg.senderId === currentFan?._id} onUnlock={handleUnlockContent} />)}
                        </div>
                        <form onSubmit={handleSendMessage} className="p-4 bg-gray-800 border-t border-gray-700"><div className="flex items-center bg-gray-700 rounded-full p-1"><input type="text" value={newMessageText} onChange={e => setNewMessageText(e.target.value)} placeholder="Type a message..." className="flex-1 bg-transparent px-3 outline-none" /><Button type="submit" size="sm" className="p-2 h-auto rounded-full ml-2"><Send className="w-5 h-5" /></Button></div></form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500"><p>Select a conversation to start messaging</p></div>
                )}
            </div>
        </div>
    );
};

export default FanMessagesPage;