// /common/types/Conversation.ts
import { Message } from './Message';

export interface Conversation {
  id: string; // Unique identifier for the conversation
  participants: string[]; // An array of user IDs involved in the chat
  last_message?: Message; // A copy of the most recent message for preview purposes
  created_at: string; // ISO 8601 date string
  updated_at: string; // ISO 8601 date string, updated with each new message
}