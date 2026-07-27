import React from 'react';
import { DollarSign } from 'lucide-react';

// --- Types ---

/**
 * The shape of a participant that works for both creator and fan conversation shapes.
 */
export interface ConversationParticipant {
    _id: string;
    profile: { name: string; avatar: string; };
    /** Optional: fan-specific field for total spent. */
    totalSpent?: number;
}

/**
 * Flexible conversation item that supports both Creator (fan participant) and Fan (creator participant) shapes.
 */
export interface ConversationItem {
    _id: string | null;
    /** Either participant, fan (CreatorMessages), or creator (FanMessages). */
    participant?: ConversationParticipant;
    fan?: ConversationParticipant;
    creator?: ConversationParticipant;
    lastMessage?: { text?: string; isRead: boolean; };
    updatedAt: string;
}

export interface ConversationListItemProps {
    conversation: ConversationItem;
    isActive: boolean;
    onClick: () => void;
    /** Optional: allows overriding the "no messages" text (e.g., 'Sent content'). */
    emptyMessage?: string;
}

// --- Helpers ---

function getParticipant(conversation: ConversationItem): ConversationParticipant | undefined {
    return conversation.participant || conversation.fan || conversation.creator;
}

// --- Component ---

/**
 * A reusable conversation list item for messaging.
 *
 * Consolidates the nearly identical ConversationListItem sub-components in:
 * - CreatorMessages.tsx (conversation.fan)
 * - FanMessages.tsx (conversation.creator)
 *
 * @example
 * ```tsx
 * <ConversationListItem
 *   conversation={conversation}
 *   isActive={selectedId === (conversation.fan?._id || conversation.creator?._id)}
 *   onClick={() => setSelectedId(conversation.fan?._id || conversation.creator?._id)}
 * />
 * ```
 */
const ConversationListItem: React.FC<ConversationListItemProps> = ({
    conversation,
    isActive,
    onClick,
    emptyMessage = 'No messages yet',
}) => {
    const participant = getParticipant(conversation);
    const { lastMessage, updatedAt } = conversation;

    const formatTime = (dateStr: string | undefined | null) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            return d.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return '';
        }
    };

    const name = participant?.profile?.name || 'Unknown';
    const avatar = participant?.profile?.avatar || 'https://via.placeholder.com/150';

    return (
        <div
            onClick={onClick}
            className={
                'flex items-center p-3 rounded-lg cursor-pointer transition-colors duration-200 ' +
                (isActive ? 'bg-purple-900/50' : 'hover:bg-gray-700/50')
            }
        >
            <div className="relative mr-3">
                <img
                    className="w-12 h-12 rounded-full"
                    src={avatar}
                    alt={name}
                />
                {lastMessage && !lastMessage.isRead && (
                    <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-pink-500 border-2 border-gray-800" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                    <p
                        className={
                            'font-bold text-sm ' +
                            (isActive ? 'text-purple-200' : 'text-gray-200')
                        }
                    >
                        {name}
                    </p>
                    <p className="text-xs text-gray-500">{formatTime(updatedAt)}</p>
                </div>
                <p className="text-sm text-gray-400 truncate">
                    {lastMessage?.text || emptyMessage}
                </p>
                {participant?.totalSpent !== undefined && (
                    <div className="flex items-center mt-1 text-xs text-green-400 font-semibold">
                        <DollarSign className="w-3 h-3 mr-1" />
                        {participant.totalSpent.toFixed(2)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConversationListItem;