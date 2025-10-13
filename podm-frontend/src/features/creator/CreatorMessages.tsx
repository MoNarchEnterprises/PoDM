// src/features/creator/CreatorMessages.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Lock, ArrowLeft, DollarSign } from 'lucide-react';
import * as apiClient from '../../lib/apiClient';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import { socket } from '../../lib/socket';
import { Content } from '@common/types/Content';
import AttachmentModal from './components/AttachmentModal';
import { useModal } from '../../hooks/useModal';

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
  contentId: string; type: string; thumbnailUrl: string; isPaid: boolean; price: number; isUnlocked: boolean;
}
interface Message {
    _id: string; senderId: string; text?: string; content?: MessageContent;
}

// --- Reusable Sub-Components ---
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

const MessageBubble = ({ message, isMe }: { message: Message; isMe: boolean; }) => {
    const justifyClass = isMe ? 'justify-end' : 'justify-start';
    const bubbleClass = isMe ? 'bg-pink-700 text-white rounded-bl-none' : 'bg-purple-600 text-gray-200 rounded-br-none';

    return (
        <div className={`flex ${justifyClass}`}>
            <div className={`max-w-xs lg:max-w-md p-1 rounded-2xl ${bubbleClass}`}>
                {message.text && <p className="px-3 py-2">{message.text}</p>}
                {message.content && (
                    <div className="space-y-2 bg-black/20 rounded-xl p-2">
                        <img src={message.content.thumbnailUrl} alt="Content thumbnail" className="rounded-lg"/>
                        <div className="text-center text-xs p-1 font-bold text-pink-300 bg-pink-500/20 rounded-lg">
                            PPV Content - ${(message.content.price / 100).toFixed(2)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main Component ---
const CreatorMessagesPage = () => {
    const { user: currentCreator } = useAuth();
    const { isOpen: isAttachmentModalOpen, openModal: openAttachmentModal, closeModal: closeAttachmentModal } = useModal();
    const [existingContent, setExistingContent] = useState<Content[]>([]);
    const [conversations, setConversations] = useState<ConversationWithFan[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedFanId, setSelectedFanId] = useState<string | null>(null);
    const [newMessageText, setNewMessageText] = useState('');
    const [isLoadingConvos, setIsLoadingConvos] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const previousConversationId = useRef<string | null>(null);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const response = await apiClient.getMyCreatorContent();
                // Show both published and unlisted content in the attachment modal
                setExistingContent(response.data.filter((c: Content) => c.status === 'published' || c.visibility === 'unlisted'));
            } catch (error) {
                console.error("Failed to fetch creator content:", error);
            }
        };
        fetchContent();
    }, []);

    useEffect(() => {
        apiClient.getMyConversations().then(response => {
            setConversations(response.data);
            if (!selectedFanId && response.data.length > 0) {
                setSelectedFanId(response.data[0].fan._id);
            }
        }).catch(err => console.error("Failed to fetch conversations", err)).finally(() => setIsLoadingConvos(false));
    }, []);

    const activeConversation = conversations.find(c => c.fan._id === selectedFanId);

    useEffect(() => {
        socket.connect();
        socket.on('new_message', (newMessage: Message) => {
            setMessages(prev => prev.some(msg => msg._id === newMessage._id) ? prev : [...prev, newMessage]);
        });
        return () => { socket.off('new_message'); socket.disconnect(); };
    }, []);

    useEffect(() => {
        const conversationId = activeConversation?._id;
        if (previousConversationId.current && previousConversationId.current !== conversationId) {
            socket.emit('leave_conversation', previousConversationId.current);
        }
        if (conversationId) {
            setIsLoadingMessages(true);
            apiClient.getMessagesInConversation(conversationId).then(res => setMessages(res.data)).finally(() => setIsLoadingMessages(false));
            socket.emit('join_conversation', conversationId);
            previousConversationId.current = conversationId;
        } else {
            setMessages([]);
        }
    }, [activeConversation]);
    
    const handleSendMessage = async (text: string, contentPayload?: any) => {
        if (!activeConversation) return;
        try {
            await apiClient.sendMessage(activeConversation.fan._id, text, contentPayload);
        } catch (error) {
            console.error("Failed to send message", error);
            alert('Failed to send message.');
        }
    };

    const handleSendAttachment = async (content: Content, price: number, text: string) => {
        const contentPayload = {
            contentId: content._id,
            type: content.type,
            thumbnailUrl: content.files[0]?.thumbnailUrl,
            isPaid: true,
            price: price,
            isUnlocked: false,
        };
        await handleSendMessage(text, contentPayload);
    };

    const handleSendTextMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessageText.trim()) return;
        await handleSendMessage(newMessageText);
        setNewMessageText('');
    };

    return (
        <>
            <AttachmentModal
                isOpen={isAttachmentModalOpen}
                onClose={closeAttachmentModal}
                contentItems={existingContent}
                onSend={handleSendAttachment}
            />

            <div className="flex h-screen bg-gray-900 text-gray-200">
                <div className={`w-full md:w-1/3 lg:w-1/4 bg-gray-800 border-r border-gray-700 flex flex-col ${activeConversation && 'hidden md:flex'}`}>
                    <div className="p-4 border-b border-gray-700"><h2 className="text-xl font-bold">Messages</h2></div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {isLoadingConvos ? <p className="p-4 text-center">Loading...</p> : conversations.map(convo => <ConversationListItem key={convo.fan._id} conversation={convo} isActive={selectedFanId === convo.fan._id} onClick={() => setSelectedFanId(convo.fan._id)} />)}
                    </div>
                </div>
                <div className={`flex-1 flex flex-col bg-gray-900 ${!activeConversation && 'hidden md:flex'}`}>
                    {activeConversation ? (
                        <>
                            <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800"><div className="flex items-center"><button onClick={() => setSelectedFanId(null)} className="md:hidden mr-2 p-2 rounded-full hover:bg-gray-700"><ArrowLeft className="w-5 h-5" /></button><img className="w-10 h-10 rounded-full mr-3" src={activeConversation.fan.profile.avatar} alt={activeConversation.fan.profile.name} /><div><p className="font-bold">{activeConversation.fan.profile.name}</p><p className="text-xs text-green-500 font-semibold flex items-center"><DollarSign className="w-3 h-3 mr-1" /> Total Spent: ${(activeConversation.fan.totalSpent || 0).toFixed(2)}</p></div></div></div>
                            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                                {isLoadingMessages ? <p className="text-center">Loading messages...</p> : messages.map((msg) => <MessageBubble key={msg._id} message={msg} isMe={msg.senderId === currentCreator?._id} />)}
                            </div>
                            <form onSubmit={handleSendTextMessage} className="p-4 bg-gray-800 border-t border-gray-700">
                                <div className="flex items-center bg-gray-700 rounded-full p-1">
                                    <Button type="button" variant="ghost" size="sm" className="p-2 h-auto" onClick={openAttachmentModal}>
                                        <Lock className="w-6 h-6" />
                                    </Button>
                                    <input type="text" value={newMessageText} onChange={e => setNewMessageText(e.target.value)} placeholder="Type a message..." className="flex-1 bg-transparent px-3 outline-none" />
                                    <Button type="submit" size="sm" className="p-2 h-auto rounded-full ml-2"><Send className="w-5 h-5" /></Button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500"><p>Select a subscriber to start messaging</p></div>
                    )}
                </div>
            </div>
        </>
    );
};

export default CreatorMessagesPage;