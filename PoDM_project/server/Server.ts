import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// --- Load Environment Variables ---
dotenv.config({ path: path.resolve(__dirname, './.env') });

function logToFile(message: string) {
    const logPath = path.resolve(__dirname, 'debug.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
}

logToFile("--- SERVER STARTING ---");
console.log("--- SERVER STARTING ---");

// Use the standard "hybrid" import now that Express is updated.
import express, { Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http'; // 1. Import http
import { initSocketServer } from './config/socket'; // 2. Import our socket initializer
import bodyParser from 'body-parser';


import supportRoutes from './routes/support.routes';

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
import { handleWebhook } from './controllers/stripe.controller';

const app = express();
const httpServer = createServer(app); // 3. Create an http server from our app
const io = initSocketServer(httpServer); // 4. Initialize socket.io and attach it

const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    'http://localhost:5173',
    'https://podm.app',
    process.env.CLIENT_URL
].filter((origin): origin is string => !!origin);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Stripe webhook routes MUST come before app.use(express.json())
// Custom middleware to capture raw body for Stripe webhooks
app.use('/api/v1/payments/stripe/webhooks', (req, res, next) => {
    logToFile('!!! HIT WEBHOOK (Custom Capture) !!!');
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => {
        chunks.push(chunk);
    });
    req.on('end', () => {
        const rawBody = Buffer.concat(chunks);
        (req as any).rawBody = rawBody;
        logToFile(`Captured raw body length: ${rawBody.length}`);
        next();
    });
});

app.post(
    '/api/v1/payments/stripe/webhooks',
    verifyStripeSignature,
    handleStripeWebhook
);

// Alternative webhook endpoint for Stripe CLI
app.post(
    '/api/v1/webhooks/stripe',
    (req, res, next) => {
        logToFile('👉 Hit /api/v1/webhooks/stripe');
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
            (req as any).rawBody = Buffer.concat(chunks);
            next();
        });
    },
    handleWebhook
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
app.use('/api/v1/support', supportRoutes);

// Health Check Route - with explicit types to fix the linting error
app.get('/', (req: Request, res: Response) => {
    res.send('PoDM API is running!');
});

// Global Error Handler
app.use(errorHandler);

// 5. Start the http server, NOT the express app
httpServer.listen(PORT, () => console.log(`🚀 Server (with WebSockets) is running at http://localhost:${PORT}`));