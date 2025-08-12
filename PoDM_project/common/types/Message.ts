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
}

/**
 * The main Message interface, representing a single message in a conversation.
 */
export interface Message {
  _id: string; // Unique identifier for the message
  conversationId: string; // The ID of the conversation this message belongs to
  senderId: string; // The ID of the user who sent the message
  receiverId: string; // The ID of the user who received the message
  text?: string; // The text content of the message (optional)
  content?: MessageContent; // Attached paid content (optional)
  isRead: boolean;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
}
