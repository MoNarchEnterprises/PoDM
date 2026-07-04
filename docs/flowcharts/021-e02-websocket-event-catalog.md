## E-02: WebSocket Event Catalog

A catalog of all Socket.IO events in the system, organized by direction and annotated with dead/ missing events.

```mermaid
flowchart TD
    subgraph Server_to_Client["Server → Client (emitted)"]
        new_message["new_message<br/>Sent to conversation room<br/>when message is created"]
        message_deleted["message_deleted<br/>Sent to conversation room<br/>when message is deleted"]
        conversation_read["conversation_read<br/>Sent when conversation<br/>is marked as read"]
    end

    subgraph Client_to_Server["Client → Server (received)"]
        join_conversation["join_conversation<br/>Client joins a room<br/>(conversation ID as room name)"]
        leave_conversation["leave_conversation<br/>Client leaves a room"]
    end

    subgraph Dead_Events["Dead Events"]
        message_updated["message_updated 🔴<br/>Frontend listener exists<br/>but server never emits it"]
    end

    subgraph Server_Handling["Server Handling"]
        socket_ts["socket.ts<br/>Connection handler,<br/>room management"]
    end

    subgraph Client_Handling["Client Handling"]
        FanMessages["FanMessages.tsx<br/>Socket.IO listeners"]
        CreatorMessages["CreatorMessages.tsx<br/>Socket.IO listeners"]
    end

    join_conversation --> socket_ts
    leave_conversation --> socket_ts
    socket_ts --> new_message
    socket_ts --> message_deleted
    socket_ts --> conversation_read
    FanMessages --> message_updated
    CreatorMessages --> message_updated

    style message_updated fill:#ff4444,color:#fff
    style new_message fill:#4caf50,color:#fff
    style message_deleted fill:#4caf50,color:#fff
    style conversation_read fill:#4caf50,color:#fff
```

The catalog reveals three issues: `message_updated` is registered on the frontend but never emitted by the server (🔴), typing indicators (`typing`/`stop_typing`) do not exist (🟡), and offline delivery is not supported — messages are loaded on next page load via REST (🟡).
