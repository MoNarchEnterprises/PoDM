import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Home, FileText, MessageSquare, BarChart2, Settings, DollarSign, User, Send, Paperclip, Lock, ArrowLeft, Search, CheckCircle, MoreVertical, AlertTriangle, X, UploadCloud, Check } from 'lucide-react';

// --- Import Shared Types ---
import { Conversation } from '@common/types/Conversation';
import { Message } from '@common/types/Message';
import { Content } from '@common/types/Content';
import { User as FanUser } from '@common/types/User';

// --- Import Reusable Components & Hooks ---
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useModal } from '../../hooks/useModal';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';

// --- Local Types ---
interface FanWithSpent extends FanUser {
    totalSpent: number;
    isNewSubscriber: boolean;
}
interface ConversationWithFan extends Conversation {
    fan: FanWithSpent;
    messageHistory: Message[];
}

// --- Reusable Sub-Components ---

const ReportModal = ({ isOpen, onClose, user }: { isOpen: boolean; onClose: () => void; user?: FanUser }) => {
    if (!isOpen || !user) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <header className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold">Report {user.profile.name}</h2>
            </header>
            <main className="p-6 space-y-4">
                <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                    <select id="reason" className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option>Harassment</option>
                        <option>Spam or Scams</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="details" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Details</label>
                    <textarea id="details" rows={4} className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
                </div>
            </main>
            <footer className="p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <Button variant="danger" onClick={onClose}>Submit Report</Button>
            </footer>
        </Modal>
    );
};

const AttachContentModal = ({ isOpen, onClose, onAttach, existingContent }: { isOpen: boolean; onClose: () => void; onAttach: (content: Content, price: number) => void; existingContent: Content[] }) => {
    // Modal logic would go here
    return <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg"><div className="p-8">Attach Content Modal</div></Modal>
};

const ConversationListItem = ({ conversation, isActive, onClick }: { conversation: ConversationWithFan; isActive: boolean; onClick: () => void; }) => (
    <div onClick={onClick} className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors duration-200 ${isActive ? 'bg-purple-100 dark:bg-purple-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
        <div className="relative mr-3">
            <img className="w-12 h-12 rounded-full" src={conversation.fan.profile.avatar} alt={conversation.fan.profile.name} />
            {conversation.lastMessage && !conversation.lastMessage.isRead && <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-pink-500 border-2 border-white dark:border-gray-800"></span>}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
                <p className={`font-bold text-sm ${isActive ? 'text-purple-800 dark:text-purple-200' : 'text-gray-800 dark:text-gray-200'}`}>{conversation.fan.profile.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(conversation.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{conversation.lastMessage?.text || 'Sent content'}</p>
            <div className="flex items-center mt-1 text-xs text-green-600 dark:text-green-400 font-semibold">
                <DollarSign className="w-3 h-3 mr-1" />
                {conversation.fan.totalSpent.toFixed(2)}
            </div>
        </div>
    </div>
);

const MessageBubble = ({ message, isCreator }: { message: Message; isCreator: boolean; }) => (
    <div className={`flex ${isCreator ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-xs lg:max-w-md p-3 rounded-2xl ${isCreator ? 'bg-purple-600 text-white rounded-br-lg' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-lg'}`}>
            {message.text && <p>{message.text}</p>}
        </div>
    </div>
);

// --- Main Messaging Interface Component ---
interface MessagingInterfaceProps {
    initialConversations: ConversationWithFan[];
    existingContent: Content[];
    currentCreatorId: string;
}

const MessagingInterface = ({ initialConversations, existingContent, currentCreatorId }: MessagingInterfaceProps) => {
    const [conversations, setConversations] = useState(initialConversations);
    const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(initialConversations.find(c => c.fan.isNewSubscriber)?._id || initialConversations[0]?._id);
    const [searchTerm, setSearchTerm] = useState('');
    const { isOpen: isAttachModalOpen, openModal: openAttachModal, closeModal: closeAttachModal } = useModal();
    const { isOpen: isReportModalOpen, openModal: openReportModal, closeModal: closeReportModal } = useModal();
    const { isOpen: isActionsMenuOpen, openModal: openActionsMenu, closeModal: closeActionsMenu } = useModal();
    const menuRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(menuRef, closeActionsMenu);

    const sortedConversations = useMemo(() => {
        return conversations
            .filter(c => c.fan.profile.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                if (a.fan.isNewSubscriber && !b.fan.isNewSubscriber) return -1;
                if (!a.fan.isNewSubscriber && b.fan.isNewSubscriber) return 1;
                return b.fan.totalSpent - a.fan.totalSpent;
            });
    }, [conversations, searchTerm]);
    
    const activeConversation = conversations.find(c => c._id === selectedConversationId);

    return (
        <>
            <AttachContentModal isOpen={isAttachModalOpen} onClose={closeAttachModal} onAttach={() => {}} existingContent={existingContent} />
            <ReportModal isOpen={isReportModalOpen} onClose={closeReportModal} user={activeConversation?.fan} />
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                <div className="flex-1 flex flex-col md:flex-row">
                    <div className={`w-full md:w-1/3 lg:w-1/4 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${activeConversation && 'hidden md:flex'}`}>
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold">Messages</h2>
                            <Input id="search-fans" placeholder="Search fans..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} leftIcon={Search} containerClassName="mt-4" />
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {sortedConversations.map(convo => <ConversationListItem key={convo._id} conversation={convo} isActive={selectedConversationId === convo._id} onClick={() => setSelectedConversationId(convo._id)} />)}
                        </div>
                    </div>

                    <div className={`flex-1 flex flex-col bg-gray-100 dark:bg-gray-900 ${!activeConversation && 'hidden md:flex'}`}>
                        {activeConversation ? (
                            <>
                                <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                    <div className="flex items-center">
                                        <button onClick={() => setSelectedConversationId(undefined)} className="md:hidden mr-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><ArrowLeft className="w-5 h-5" /></button>
                                        <img className="w-10 h-10 rounded-full mr-3" src={activeConversation.fan.profile.avatar} alt={activeConversation.fan.profile.name} />
                                        <div>
                                            <p className="font-bold">{activeConversation.fan.profile.name}</p>
                                            <p className="text-xs text-green-500 font-semibold flex items-center"><DollarSign className="w-3 h-3 mr-1" /> Total Spent: ${activeConversation.fan.totalSpent.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="relative" ref={menuRef}>
                                        <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={openActionsMenu}><MoreVertical className="w-5 h-5 text-gray-500" /></Button>
                                        {isActionsMenuOpen && (
                                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                                                <ul className="py-1">
                                                    <li><a href="#" onClick={(e) => { e.preventDefault(); openReportModal(); closeActionsMenu(); }} className="flex items-center space-x-3 px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"><AlertTriangle className="w-4 h-4" /><span>Report Fan</span></a></li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                                    {activeConversation.messageHistory.map((msg) => <MessageBubble key={msg._id} message={msg} isCreator={msg.senderId === currentCreatorId} />)}
                                </div>
                                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full p-1">
                                        <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={openAttachModal}><Paperclip className="w-6 h-6" /></Button>
                                        <input type="text" placeholder="Type a message..." className="flex-1 bg-transparent px-3 outline-none" />
                                        <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={openAttachModal}><Lock className="w-6 h-6" /></Button>
                                        <Button size="sm" className="p-2 h-auto rounded-full ml-2"><Send className="w-5 h-5" /></Button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-500"><p>Select a conversation to start messaging</p></div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default MessagingInterface;
