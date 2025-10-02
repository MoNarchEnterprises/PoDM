// src/lib/socket.ts
import { io } from 'socket.io-client';

const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:5000';

// We create the socket instance here but don't connect yet.
// We will connect manually from our components.
export const socket = io(URL!, {
    autoConnect: false,
    // This is how we send the auth token to the backend middleware
    auth: (cb) => {
        cb({ token: localStorage.getItem('authToken') });
    }
});