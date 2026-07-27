// /common/types/Message.ts

import { ContentType } from './Content';

/**
 * Defines the structure for a piece of paid content attached to a message.
 */
export interface MessageContent {
  contentId: string; // The ID of the original Content object
  type: ContentType;
  thumbnailUrl: string; // URL to a preview thumbnail
  isPaid: boolean;
  price: number; // Price to unlock the content
  isUnlocked: boolean;
  unlockDate?: string; // ISO 8601 date string, set when the content is unlocked
  inGallery?: boolean; // Whether the content is saved in the fan's gallery
  creatorWalletAddress?: string; // Creator's crypto wallet address for payment
}

/**
 * The main Message interface, representing a single message in a conversation.
 */
export interface Message {
  id: string; // Unique identifier for the message
  conversation_id: string; // The ID of the conversation this message belongs to
  sender_id: string; // The ID of the user who sent the message
  receiver_id: string; // The ID of the user who received the message
  text?: string; // The text content of the message (optional)
  content?: MessageContent; // Attached paid content (optional)
  voiceMessageUrl?: string; // URL to voice message audio file (optional, creator-only)
  is_read: boolean;
  created_at: string; // ISO 8601 date string
  updated_at: string; // ISO 8601 date string
}
