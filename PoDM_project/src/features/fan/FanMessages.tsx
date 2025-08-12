import React, { useState, useMemo, useEffect } from 'react';
import { Home, ImageIcon, Briefcase, Settings, MessageSquare, Send, DollarSign, Lock, CheckCircle, ArrowLeft, Search } from 'lucide-react';

// --- Import Shared Types ---
import { Conversation } from '../../../common/types/Conversation';
import { Message } from '../../../common/types/Message';
import { Creator } from '../../../common/types/Creator';

// --- Import Reusable Components ---
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

// --- Local Types ---
interface ConversationWithCreator extends Conversation {
    creator: Creator;
    messageHistory: Message[];
}

// --- Reusable Sub-Components ---

const ConversationListItem = ({ conversation, isActive, onClick }: { conversation: ConversationWithCreator; isActive: boolean; onClick: () => void; }) => (
    <div
        onClick={onClick}
        className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors duration-200 ${isActive ? 'bg-purple-100 dark:bg-purple-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
    >
        <div className="relative mr-3">
            <img className="w-12 h-12 rounded-full" src={conversation.creator.profile.avatar} alt={conversation.creator.profile.name} />
            {conversation.lastMessage && !conversation.lastMessage.isRead && <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-pink-500 border-2 border-white dark:border-gray-800"></span>}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
                <p className={`font-bold text-sm flex items-center ${isActive ? 'text-purple-800 dark:text-purple-200' : 'text-gray-800 dark:text-gray-200'}`}>
                    {conversation.creator.profile.name}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(conversation.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{conversation.lastMessage?.text || 'Sent content'}</p>
        </div>
    </div>
);

const MessageBubble = ({ message, isFan, onUnlock }: { message: Message; isFan: boolean; onUnlock: (messageId: string) => void; }) => (
    <div className={`flex ${isFan ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-xs lg:max-w-md p-3 rounded-2xl ${isFan ? 'bg-purple-600 text-white rounded-br-lg' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-lg'}`}>
            {message.text && <p>{message.text}</p>}
            {message.content && (
                <div className="space-y-2">
                    <p className="font-bold">New {message.content.type} from Creator</p>
                    <img src={message.content.thumbnailUrl} alt="Content thumbnail" className={`rounded-lg ${!message.content.isUnlocked && 'blur-sm'}`} />
                    {!message.content.isUnlocked ? (
                        <Button onClick={() => onUnlock(message._id)} className="w-full" leftIcon={Lock}>
                            Unlock for ${(message.content.price / 100).toFixed(2)}
                        </Button>
                    ) : (
                        <div className="text-center text-sm p-2 bg-green-500/20 text-green-700 dark:text-green-300 rounded-lg">
                            Content Unlocked
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
);

// --- Main Messaging Interface Component ---
interface FanMessagingInterfaceProps {
    initialConversations: ConversationWithCreator[];
    currentFanId: string;
}

const FanMessagingInterface = ({ initialConversations, currentFanId }: FanMessagingInterfaceProps) => {
    const [conversations, setConversations] = useState(initialConversations);
    const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(initialConversations[0]?._id);
    const [searchTerm, setSearchTerm] = useState('');

    const handleUnlock = (messageId: string) => {
        setConversations(prevData => {
            return prevData.map(convo => {
                if (convo._id === selectedConversationId) {
                    return {
                        ...convo,
                        messageHistory: convo.messageHistory.map(msg => {
                            if (msg._id === messageId && msg.content) {
                                return { ...msg, content: { ...msg.content, isUnlocked: true } };
                            }
                            return msg;
                        })
                    };
                }
                return convo;
            });
        });
    };

    const filteredConversations = useMemo(() => {
        return conversations.filter(c =>
            c.creator.profile.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, conversations]);
    
    const activeConversation = conversations.find(c => c._id === selectedConversationId);

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <nav className="w-64 bg-white dark:bg-gray-800/30 p-4 border-r border-gray-200 dark:border-gray-700/50 hidden lg:flex flex-col">
                <div className="text-purple-500 font-bold text-2xl mb-10">PoDM</div>
                <ul className="space-y-2">
                    {[ { icon: <Home className="w-5 h-5" />, label: 'Feed' }, { icon: <ImageIcon className="w-5 h-5" />, label: 'Gallery' }, { icon: <Briefcase className="w-5 h-5" />, label: 'Subscriptions' }, { icon: <MessageSquare className="w-5 h-5" />, label: 'Messages', active: true }, { icon: <Settings className="w-5 h-5" />, label: 'Settings' } ].map(item => (
                        <li key={item.label}><a href="#" className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${item.active ? 'bg-purple-500 text-white shadow-lg' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{item.icon}<span className="font-medium">{item.label}</span></a></li>
                    ))}
                </ul>
            </nav>

            <div className="flex-1 flex flex-col md:flex-row">
                <div className={`w-full md:w-1/3 lg:w-1/4 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${activeConversation && 'hidden md:flex'}`}>
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold">Messages</h2>
                        <Input 
                            id="search-creators"
                            placeholder="Search creators..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            leftIcon={Search}
                            containerClassName="mt-4"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {filteredConversations.map(convo => (
                            <ConversationListItem key={convo._id} conversation={convo} isActive={selectedConversationId === convo._id} onClick={() => setSelectedConversationId(convo._id)} />
                        ))}
                    </div>
                </div>

                <div className={`flex-1 flex flex-col bg-gray-100 dark:bg-gray-900 ${!activeConversation && 'hidden md:flex'}`}>
                    {activeConversation ? (
                        <>
                            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="flex items-center">
                                    <Button variant="ghost" size="sm" className="md:hidden mr-2 p-2 h-auto" onClick={() => setSelectedConversationId(undefined)}><ArrowLeft className="w-5 h-5" /></Button>
                                    <img className="w-10 h-10 rounded-full mr-3" src={activeConversation.creator.profile.avatar} alt={activeConversation.creator.profile.name} />
                                    <p className="font-bold">{activeConversation.creator.profile.name}</p>
                                </div>
                                <Button variant="ghost" size="sm" className="p-2 h-auto"><DollarSign className="w-5 h-5 text-gray-500" /></Button>
                            </div>
                            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                                {activeConversation.messageHistory.map((msg) => (
                                    <MessageBubble key={msg._id} message={msg} isFan={msg.senderId === currentFanId} onUnlock={handleUnlock} />
                                ))}
                            </div>
                            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full p-1">
                                    <Input id="message-input" placeholder="Type a message..." containerClassName="flex-1" className="bg-transparent border-transparent focus:ring-0" />
                                    <Button size="sm" className="p-2 h-auto rounded-full ml-2"><Send className="w-5 h-5" /></Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500"><p>Select a conversation to view messages</p></div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FanMessagingInterface;
