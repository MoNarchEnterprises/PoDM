## E-03: Support Ticket ↔ DM Sync Sequence

Cross-service synchronization between support tickets and direct messages, including the dynamic `require()` circular dependency.

```mermaid
sequenceDiagram
    participant U as User
    participant A as Admin
    participant SC as Support Controller
    participant SS as Support Service
    participant MS as Message Service
    participant SK as Socket.IO
    participant DB as Supabase DB

    Note over A,DB: Admin replies to ticket
    A->>SC: POST /api/v1/support/tickets/:id/reply
    SC->>SS: replyToTicket(ticketId, adminId, message)
    SS->>DB: Append to support_tickets.conversation (JSONB)
    SS->>SS: Calls MessageService.sendDirectMessage()<br/>via dynamic require()
    MS->>DB: INSERT into messages table<br/>(DM from admin to user)
    MS->>SK: Broadcast new_message to user's room
    SK->>U: Real-time notification

    Note over U,DB: User replies to DM
    U->>MS: POST /api/v1/messages
    MS->>DB: INSERT message record
    MS->>MS: Detects admin receiver
    MS->>SS: appendUserMessageToActiveTicket(userId, messageText)
    SS->>DB: Append to support_tickets.conversation (JSONB)
    SS->>SS: If ticket was Pending → change status to Open
    MS->>SK: Broadcast new_message to admin's room
    SK->>A: Admin sees new message
```

Three issues are flagged: 🔴 **Dynamic `require()`** at `support.service.ts:71` instead of a static import can cause circular dependency or runtime failure; 🟡 the JSONB conversation array lacks a relational model (no separate `support_messages` table); 🟡 email notifications are not sent when a ticket is replied to despite SMTP being configured.
