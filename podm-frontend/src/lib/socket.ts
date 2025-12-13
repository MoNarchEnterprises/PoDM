// src/lib/socket.ts
import { io } from 'socket.io-client';

// Get the WebSocket URL from the API base URL
// Remove /api/v1 suffix if present to get the base server URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const SOCKET_URL = API_URL.replace('/api/v1', '');

// We create the socket instance here but don't connect yet.
// We will connect manually from our components.
export const socket = io(SOCKET_URL, {
    autoConnect: false,
    // This is how we send the auth token to the backend middleware
    auth: (cb) => {
        cb({ token: localStorage.getItem('authToken') });
    }
});