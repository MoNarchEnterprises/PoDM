import dotenv from 'dotenv';
import path from 'path';

// --- Load Environment Variables ---
dotenv.config({ path: path.resolve(__dirname, './.env') });


console.log("--- SERVER STARTING ---");
console.log("STRIPE_SECRET_KEY loaded:", process.env.STRIPE_SECRET_KEY ? `sk_test_...${process.env.STRIPE_SECRET_KEY.slice(-4)}` : "NOT FOUND");
console.log("STRIPE_WEBHOOK_SECRET loaded:", process.env.STRIPE_WEBHOOK_SECRET ? `whsec_...${process.env.STRIPE_WEBHOOK_SECRET.slice(-4)}` : "NOT FOUND");
console.log("-----------------------");

// Use the standard "hybrid" import now that Express is updated.
import express, { Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http'; // 1. Import http
import { initSocketServer } from './config/socket'; // 2. Import our socket initializer


// Your other imports
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import stripeRoutes from './routes/stripe.routes';
import creatorRoutes from './routes/creator.routes';
import contentRoutes from './routes/content.routes';
import subscriptionRoutes from './routes/subscription.routes';
import messageRoutes from './routes/message.routes';
import paymentRoutes from './routes/payment.routes';
import adminRoutes from './routes/admin.routes';
import analyticsRoutes from './routes/analytics.routes';
import { errorHandler } from './middleware/error.middleware';
import { verifyStripeSignature } from './middleware/stripe.middleware';
import { handleStripeWebhook } from './controllers/payments.controller';

const app = express();
const httpServer = createServer(app); // 3. Create an http server from our app
const io = initSocketServer(httpServer); // 4. Initialize socket.io and attach it

const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));

// This route MUST come before app.use(express.json())
app.post(
    '/api/v1/payments/stripe/webhooks', 
    express.raw({ type: 'application/json' }), // This will now work
    verifyStripeSignature, 
    handleStripeWebhook
);

// This middleware is for all other routes
// Increase the body limit for JSON and URL-encoded requests.
// This must be large enough to accommodate the base64/multipart encoding of large files.
// We'll set it slightly larger than the multer limit as a safeguard.
app.use(express.json({ limit: '1100mb' }));
app.use(express.urlencoded({ limit: '1100mb', extended: true }));


// Register all other API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/creator', creatorRoutes);
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/stripe', stripeRoutes);

// Health Check Route - with explicit types to fix the linting error
app.get('/', (req: Request, res: Response) => {
    res.send('PoDM API is running!');
});

// Global Error Handler
app.use(errorHandler);

// 5. Start the http server, NOT the express app
httpServer.listen(PORT, () => console.log(`🚀 Server (with WebSockets) is running at http://localhost:${PORT}`));

// Start Server
//app.listen(PORT, () => console.log(`🚀 Server is running at http://localhost:${PORT}`));