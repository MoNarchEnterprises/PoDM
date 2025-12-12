// /common/types/SupportTicket.ts

/**
 * Defines the possible statuses for a support ticket.
 */
export type TicketStatus = 'Open' | 'Pending' | 'Closed' | 'Escalated' | 'Resolved';

/**
 * Defines the priority levels for a support ticket.
 */
export type TicketPriority = 'Low' | 'Medium' | 'High';

/**
 * Defines the structure for a single message within a support ticket's conversation.
 */
export interface TicketMessage {
  senderId: string; // ID of the user or admin who sent the message
  senderName: string; // Display name of the sender
  text: string;
  timestamp: string; // ISO 8601 date string
}

/**
 * The main SupportTicket interface, representing a single support request from a user.
 */
export interface SupportTicket {
  id: string; // Unique identifier for the ticket
  user_id: string; // The ID of the user who submitted the ticket
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigned_admin_id?: string; // The ID of the admin assigned to this ticket
  conversation: TicketMessage[];
  created_at: string; // ISO 8601 date string
  updated_at: string; // ISO 8601 date string
}
