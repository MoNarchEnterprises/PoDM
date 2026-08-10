import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPaths = [
    path.resolve(process.cwd(), 'server/.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../server/.env'),
];

let loadedEnv = false;
for (const p of envPaths) {
    if (fs.existsSync(p)) {
        console.log(`Loading .env from ${p}`);
        dotenv.config({ path: p });
        loadedEnv = true;
        break;
    }
}
if (!loadedEnv) {
    console.warn("WARNING: No .env file found in server directory or parent.");
}

function logToFile(message: string) {
    if (process.env.NODE_ENV !== 'production') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${message}`);
    }
}

logToFile("--- SERVER STARTING ---");

// Use the standard "hybrid" import now that Express is updated.
import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http'; // 1. Import http
import { initSocketServer } from './config/socket'; // 2. Import our socket initializer
import bodyParser from 'body-parser';


import supportRoutes from './routes/support.routes';
import aiRoutes from './routes/ai.routes';
import enclaveRoutes from './routes/enclave.routes';
import referralRoutes from './routes/referral.routes';

// Security & monitoring imports
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { authLimiter, paymentLimiter, globalLimiter } from './middleware/rateLimiter.middleware';
import { sanitizeInput } from './middleware/sanitize.middleware';
import { requestId } from './middleware/requestId.middleware';
import logger from './config/logger';
import healthRoutes from './routes/health.routes';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import creatorRoutes from './routes/creator.routes';
import contentRoutes from './routes/content.routes';
import subscriptionRoutes from './routes/subscription.routes';
import messageRoutes from './routes/message.routes';
import cryptoPaymentRoutes from './routes/cryptoPayment.routes';
import adminRoutes from './routes/admin.routes';
import analyticsRoutes from './routes/analytics.routes';
import notificationRoutes from './routes/notification.routes';
import contestRoutes from './routes/contest.routes';
import onrampRoutes from './routes/onramp.routes';
import embeddedWalletRoutes from './routes/embeddedWallet.routes';
import featureFlagRoutes from './routes/featureFlag.routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// --- Sentry Error Tracking ---
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
    Sentry.setupExpressErrorHandler(app);
    logger.info('Sentry initialized');
}

app.use(helmet());
app.use(requestId);
const httpServer = createServer(app); // 3. Create an http server from our app
const io = initSocketServer(httpServer); // 4. Initialize socket.io and attach it

const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    'http://localhost:5173',
    'https://podm.app',
    'https://www.podm.app',
    process.env.CLIENT_URL
].filter((origin): origin is string => !!origin);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow Cloudflare Pages preview deployments for the configured project
        const cfProject = process.env.CLOUDFLARE_PAGES_PROJECT;
        if (cfProject && origin.endsWith(`.${cfProject}.pages.dev`)) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(cookieParser());



// Body parser middleware for standard JSON and URL-encoded API payloads.
// Set to 10MB to protect server memory against DoS.
// Media uploads (images/videos up to 1GB) use multipart/form-data handled independently by Multer.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(globalLimiter);
app.use(sanitizeInput);

// Register all other API routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/creator', creatorRoutes);
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/payments/crypto', paymentLimiter, cryptoPaymentRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/contests', contestRoutes);
app.use('/api/v1/enclave', enclaveRoutes);
app.use('/api/v1/referrals', referralRoutes);
app.use('/api/v1/payments/onramp', paymentLimiter, onrampRoutes);
app.use('/api/v1/wallet', paymentLimiter, embeddedWalletRoutes);
app.use('/api/v1/feature-flags', featureFlagRoutes);

// Deep health check
app.use('/health', healthRoutes);

// Root health check (simple)
app.get('/', (req: Request, res: Response) => {
    res.send('PoDM API is running!');
});

// Sentry error handler (must be before our custom error handler)
if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
}

// Global Error Handler
app.use(errorHandler);

// --- Process Crash Handlers ---
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason: String(reason) });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception — shutting down', { error: error.message, stack: error.stack });
    httpServer.close(() => process.exit(1));
    setTimeout(() => process.exit(1), 5000);
});

// --- Graceful Shutdown ---
const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    httpServer.close(() => {
        logger.info('HTTP server closed');
        io.close(() => {
            logger.info('WebSocket server closed');
            process.exit(0);
        });
    });
    setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 5. Start the http server, NOT the express app
httpServer.listen(PORT, () => {
    logger.info(`🚀 Server (with WebSockets) is running on port ${PORT}`);
});