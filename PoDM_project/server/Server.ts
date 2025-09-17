import dotenv from 'dotenv';
import path from 'path';

// --- Load Environment Variables ---
dotenv.config({ path: path.resolve(__dirname, './.env') });

console.log("--- SERVER STARTING ---");
console.log("STRIPE_SECRET_KEY loaded:", process.env.STRIPE_SECRET_KEY ? `sk_test_...${process.env.STRIPE_SECRET_KEY.slice(-4)}` : "NOT FOUND");
console.log("STRIPE_PRODUCT_ID loaded:", process.env.STRIPE_SUBSCRIPTION_PRODUCT_ID);
console.log("-----------------------");


import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

// --- Import Routes ---
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import creatorRoutes from './routes/creator.routes'; 
import contentRoutes from './routes/content.routes';
import subscriptionRoutes from './routes/subscription.routes';
import paymentRoutes from './routes/payment.routes';
import messageRoutes from './routes/message.routes';
import adminRoutes from './routes/admin.routes';
import analyticsRoutes from './routes/analytics.routes'; 

// --- Import Middleware ---
import { errorHandler } from './middleware/error.middleware';
import { verifyStripeSignature } from './middleware/stripe.middleware';
import { handleStripeWebhook } from './controllers/payments.controller';

// --- Configuration ---
const app: Express = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173'
}));

// --- Stripe Webhook Route ---
// This route must be registered BEFORE express.json() to receive the raw body.
// We define it here directly to avoid the import issues in other files.
//app.post('/api/v1/payments/stripe/webhooks', express.raw({type: 'application/json'}), verifyStripeSignature, handleStripeWebhook);
app.use('/webhook', bodyParser.raw({ type: 'application/json' }));
// --- Global Middleware ---
// This will parse the body for all other routes.
app.use(express.json());

// --- Other API Routes ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/creator', creatorRoutes);
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/payments', paymentRoutes); // For other payment routes like /tip
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/admin', adminRoutes);


// --- Health Check Route ---
app.get('/', (req: Request, res: Response) => {
    res.send('PoDM API is running!');
});

// --- Global Error Handler ---
app.use(errorHandler);

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
