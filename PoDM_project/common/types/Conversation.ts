// /common/types/Conversation.ts
import { Message } from './Message';

export interface Conversation {
  _id: string; // Unique identifier for the conversation
  participants: string[]; // An array of user IDs involved in the chat
  lastMessage?: Message; // A copy of the most recent message for preview purposes
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string, updated with each new message
}