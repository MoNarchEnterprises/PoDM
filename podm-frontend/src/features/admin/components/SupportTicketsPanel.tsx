import React, { useState } from 'react';
import { Paperclip } from 'lucide-react';

// --- Import Shared Types ---
import { SupportTicket, TicketStatus } from '@common/types/SupportTicket';

// --- Reusable Components ---
const TicketStatusBadge = ({ status }: { status: TicketStatus }) => {
    const style: { [key in TicketStatus]: string } = {
        Open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        Closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300',
        Escalated: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${style[status]}`}>{status}</span>;
};

// --- Main Support Tickets Panel Component ---
interface SupportTicketsPanelProps {
    tickets: SupportTicket[];
}

const SupportTicketsPanel = ({ tickets }: SupportTicketsPanelProps) => {
    const [selectedTicketId, setSelectedTicketId] = useState(tickets[0]?._id);
    const selectedTicket = tickets.find(t => t._id === selectedTicketId);

    return (
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-10rem)]">
            {/* Left Column: Ticket Queue */}
            <div className="md:w-1/3 bg-white dark:bg-gray-800/50 rounded-xl shadow-md flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold">Ticket Queue ({tickets.length})</h3>
                </div>
                <ul className="overflow-y-auto">
                    {tickets.map(ticket => (
                        <li 
                            key={ticket._id} 
                            onClick={() => setSelectedTicketId(ticket._id)} 
                            className={`p-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer ${selectedTicketId === ticket._id ? 'bg-purple-50 dark:bg-purple-900/50' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                            <div className="flex justify-between items-start">
                                <p className="text-sm font-medium">{ticket.subject}</p>
                                <TicketStatusBadge status={ticket.status} />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                #{ticket._id} from user {ticket.userId}
                            </p>
                        </li>
                    ))}
                </ul>
            </div>
            {/* Right Column: Ticket Details */}
            <div className="flex-1 bg-white dark:bg-gray-800/50 rounded-xl shadow-md flex flex-col">
                {selectedTicket ? (
                    <>
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="font-semibold">Ticket #{selectedTicket._id} - {selectedTicket.subject}</h3>
                        </div>
                        <div className="flex-grow p-4 overflow-y-auto space-y-4">
                            {selectedTicket.conversation.map((msg, i) => (
                                <div key={i} className={`p-3 rounded-lg ${msg.senderId.startsWith('admin') ? 'bg-purple-100 dark:bg-purple-900/50' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                    <p className="font-bold text-sm">{msg.senderName}</p>
                                    <p className="text-sm mt-1">{msg.text}</p>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            <textarea 
                                rows={4} 
                                placeholder="Type your response..." 
                                className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            ></textarea>
                            <div className="flex justify-between items-center mt-2">
                                <div className="flex items-center space-x-2">
                                    <button className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                                        <Paperclip className="w-4 h-4 text-gray-500" />
                                    </button>
                                    <select className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md py-1 px-2 text-sm">
                                        <option>Canned Responses</option>
                                    </select>
                                </div>
                                <button className="py-2 px-4 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700">
                                    Send Response
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        Select a ticket to view
                    </div>
                )}
            </div>
        </div>
    );
};

export default SupportTicketsPanel;
