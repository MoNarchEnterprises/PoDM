import dotenv from 'dotenv';
import path from 'path';

// --- Load Environment Variables ---
dotenv.config({ path: path.resolve(__dirname, '.env') });


import express, { Express, Request, Response } from 'express';
import cors from 'cors';

// --- Import Routes ---
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import contentRoutes from './routes/content.routes';
import subscriptionRoutes from './routes/subscription.routes';
import paymentRoutes from './routes/payment.routes';
import messageRoutes from './routes/message.routes';
import adminRoutes from './routes/admin.routes';

// --- Import Middleware ---
import { errorHandler } from './middleware/error.middleware';

// --- Configuration ---
const app: Express = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173'
}));
app.use(express.json());

// --- API Routes ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/admin', adminRoutes);


// --- Health Check Route ---
app.get('/', (req: Request, res: Response) => {
    res.send('PoDM API is running!');
});

// --- Global Error Handler ---
// This must be the last piece of middleware
app.use(errorHandler);

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
