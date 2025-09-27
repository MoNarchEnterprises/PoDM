// src/features/creator/CreatorMessages.tsx

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Send, Paperclip, Lock, ArrowLeft, Search, DollarSign, MoreVertical, AlertTriangle } from 'lucide-react';
import * as apiClient from '../../lib/apiClient';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

// --- Local Types ---
interface ConversationWithFan {
    _id: string | null;
    fan: {
        _id: string;
        profile: { name: string; avatar: string; };
        totalSpent: number;
        isNewSubscriber: boolean;
    };
    lastMessage?: { text?: string; isRead: boolean; };
    updatedAt: string;
}

interface MessageContent {
  contentId: string;
  type: string;
  thumbnailUrl: string;
  isPaid: boolean;
  price: number;
  isUnlocked: boolean;
}

interface Message {
    _id: string;
    senderId: string;
    text?: string;
    content?: MessageContent;
}


const ConversationListItem = ({ conversation, isActive, onClick }: { conversation: ConversationWithFan; isActive: boolean; onClick: () => void; }) => (
    <div onClick={onClick} className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors duration-200 ${isActive ? 'bg-purple-900/50' : 'hover:bg-gray-700/50'}`}>
        <div className="relative mr-3">
            <img className="w-12 h-12 rounded-full" src={conversation.fan.profile.avatar} alt={conversation.fan.profile.name} />
            {conversation.lastMessage && !conversation.lastMessage.isRead && <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-pink-500 border-2 border-gray-800"></span>}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
                <p className={`font-bold text-sm ${isActive ? 'text-purple-200' : 'text-gray-200'}`}>{conversation.fan.profile.name}</p>
                <p className="text-xs text-gray-500">{new Date(conversation.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <p className="text-sm text-gray-400 truncate">{conversation.lastMessage?.text || 'No messages yet'}</p>
            <div className="flex items-center mt-1 text-xs text-green-400 font-semibold">
                <DollarSign className="w-3 h-3 mr-1" />
                {(conversation.fan.totalSpent || 0).toFixed(2)}
            </div>
        </div>
    </div>
);

// --- Re-using the advanced MessageBubble ---
const MessageBubble = ({ message, isCreator }: { message: Message; isCreator: boolean; }) => {
    const bubbleClass = isCreator
        ? 'bg-purple-600 text-white rounded-br-lg'
        : 'bg-gray-700 text-gray-200 rounded-bl-lg';

    return (
        <div className={`flex ${isCreator ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md p-1 rounded-2xl ${bubbleClass}`}>
                {message.text && <p className="px-3 py-2">{message.text}</p>}
                {message.content && (
                    <div className="space-y-2 bg-black/20 rounded-xl p-2">
                        <img 
                            src={message.content.thumbnailUrl} 
                            alt="Content thumbnail" 
                            className="rounded-lg"
                        />
                        <div className="text-center text-xs p-1 font-bold text-pink-300 bg-pink-500/20 rounded-lg">
                            PPV Content - ${(message.content.price / 100).toFixed(2)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const CreatorMessagesPage = () => {
    const { user: currentCreator } = useAuth();
    const [conversations, setConversations] = useState<ConversationWithFan[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedFanId, setSelectedFanId] = useState<string | null>(null);
    const [newMessageText, setNewMessageText] = useState('');
    const [isLoadingConvos, setIsLoadingConvos] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    
    useEffect(() => {
        const fetchConversations = async () => {
            setIsLoadingConvos(true);
            try {
                const response = await apiClient.getMyConversations();
                setConversations(response.data);
                // Select the first conversation by default if none is selected
                if (!selectedFanId && response.data.length > 0) {
                    setSelectedFanId(response.data[0].fan._id);
                }
            } catch (error) {
                console.error("Failed to fetch conversations", error);
            } finally {
                setIsLoadingConvos(false);
            }
        };
        fetchConversations();
    }, []);

    const activeConversation = conversations.find(c => c.fan._id === selectedFanId);

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

        const fanId = activeConversation.fan._id;
        const originalText = newMessageText;
        setNewMessageText('');

        try {
            const tempMessage = { _id: `temp-${Date.now()}`, senderId: currentCreator!._id, text: originalText };
            setMessages(prev => [...prev, tempMessage]);
            const response = await apiClient.sendMessage(fanId, originalText);
            
            setMessages(prev => prev.map(msg => msg._id.startsWith('temp-') ? response.data : msg));

             // Also update conversation in the list to bring it to the top
            const convosRes = await apiClient.getMyConversations();
            setConversations(convosRes.data);

            setMessages(prev => prev.map(msg => msg._id.startsWith('temp-') ? response.data : msg));

        } catch (error) {
            console.error("Failed to send message", error);
            setNewMessageText(originalText);
            alert('Failed to send message.');
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 text-gray-200">
            <div className={`w-full md:w-1/3 lg:w-1/4 bg-gray-800 border-r border-gray-700 flex flex-col ${activeConversation && 'hidden md:flex'}`}>
                <div className="p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">Messages</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {isLoadingConvos ? <p className="p-4 text-center">Loading subscribers...</p> :
                        conversations.map(convo => <ConversationListItem key={convo.fan._id} conversation={convo} isActive={selectedFanId === convo.fan._id} onClick={() => setSelectedFanId(convo.fan._id)} />)}
                </div>
            </div>

            <div className={`flex-1 flex flex-col bg-gray-900 ${!activeConversation && 'hidden md:flex'}`}>
                {activeConversation ? (
                    <>
                        <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
                            <div className="flex items-center">
                                <button onClick={() => setSelectedFanId(null)} className="md:hidden mr-2 p-2 rounded-full hover:bg-gray-700"><ArrowLeft className="w-5 h-5" /></button>
                                <img className="w-10 h-10 rounded-full mr-3" src={activeConversation.fan.profile.avatar} alt={activeConversation.fan.profile.name} />
                                <div>
                                    <p className="font-bold">{activeConversation.fan.profile.name}</p>
                                    <p className="text-xs text-green-500 font-semibold flex items-center"><DollarSign className="w-3 h-3 mr-1" /> Total Spent: ${(activeConversation.fan.totalSpent || 0).toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                            {isLoadingMessages ? <p className="text-center">Loading messages...</p> :
                                messages.map((msg) => <MessageBubble key={msg._id} message={msg} isCreator={msg.senderId === currentCreator?._id} />)}
                        </div>
                        <form onSubmit={handleSendMessage} className="p-4 bg-gray-800 border-t border-gray-700">
                            <div className="flex items-center bg-gray-700 rounded-full p-1">
                                <Button type="button" variant="ghost" size="sm" className="p-2 h-auto"><Paperclip className="w-6 h-6" /></Button>
                                <input type="text" value={newMessageText} onChange={e => setNewMessageText(e.target.value)} placeholder="Type a message..." className="flex-1 bg-transparent px-3 outline-none" />
                                <Button type="button" variant="ghost" size="sm" className="p-2 h-auto"><Lock className="w-6 h-6" /></Button>
                                <Button type="submit" size="sm" className="p-2 h-auto rounded-full ml-2"><Send className="w-5 h-5" /></Button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500"><p>Select a subscriber to start messaging</p></div>
                )}
            </div>
        </div>
    );
};

export default CreatorMessagesPage;