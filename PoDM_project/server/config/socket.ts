// server/config/socket.ts
import { Server, Socket } from 'socket.io';
import supabase from './supabaseClient';
// This will hold our initialized server instance
let io: Server;

interface SocketWithAuth extends Socket {
    data: {
        userId?: string;
    }
}

export const initSocketServer = (httpServer: any) => {
    io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                // Allow requests with no origin (like mobile apps)
                if (!origin) return callback(null, true);

                // Allow all Cloudflare Pages preview deployments
                if (origin.endsWith('.pages.dev')) {
                    return callback(null, true);
                }

                // Allow configured origins
                const allowedOrigins = [
                    'http://localhost:5173',
                    'https://podm.app',
                    process.env.CLIENT_URL
                ].filter(Boolean);

                if (allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }

                callback(new Error('Not allowed by CORS'));
            },
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Middleware to authenticate connections
    io.use(async (socket: SocketWithAuth, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: No token provided.'));
        }
        try {
            // Use Supabase to validate the token
            const { data: { user }, error } = await supabase.auth.getUser(token);

            if (error) {
                // This will catch expired or malformed tokens
                return next(new Error(`Authentication error: ${error.message}`));
            }
            if (!user) {
                return next(new Error('Authentication error: Invalid token.'));
            }

            // Attach the validated user ID to the socket object
            socket.data.userId = user.id;
            next();
        } catch (err) {
            return next(new Error('Authentication error: An unexpected error occurred.'));
        }
    });

    io.on('connection', (socket: SocketWithAuth) => {
        console.log(`[Socket.IO] User connected: ${socket.data.userId} with socket ID: ${socket.id}`);

        socket.on('join_conversation', (conversationId: string) => {
            console.log(`[Socket.IO] User ${socket.data.userId} joining room: conversation:${conversationId}`);
            socket.join(`conversation:${conversationId}`);
        });

        socket.on('leave_conversation', (conversationId: string) => {
            console.log(`[Socket.IO] User ${socket.data.userId} leaving room: conversation:${conversationId}`);
            socket.leave(`conversation:${conversationId}`);
        });

        socket.on('disconnect', () => {
            console.log(`[Socket.IO] User disconnected: ${socket.data.userId}`);
        });
    });

    return io;
};

// Export the instance so our services can use it to broadcast messages
export { io };