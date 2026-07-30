import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// --- Load Environment Variables ---
// --- Load Environment Variables ---
const envPath = path.resolve(__dirname, '.env');
const parentEnvPath = path.resolve(__dirname, '../.env'); // In case running from dist/server or server/

if (fs.existsSync(envPath)) {
    console.log(`Loading .env from ${envPath}`);
    dotenv.config({ path: envPath });
} else if (fs.existsSync(parentEnvPath)) {
    console.log(`Loading .env from ${parentEnvPath}`);
    dotenv.config({ path: parentEnvPath });
} else {
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

// Your other imports
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

        // Allow all Cloudflare Pages preview deployments (*.pages.dev)
        if (origin.endsWith('.pages.dev')) {
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


// Register all other API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/creator', creatorRoutes);
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/payments/crypto', cryptoPaymentRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/contests', contestRoutes);
app.use('/api/v1/enclave', enclaveRoutes);
app.use('/api/v1/referrals', referralRoutes);
app.use('/api/v1/payments/onramp', onrampRoutes);
app.use('/api/v1/wallet', embeddedWalletRoutes);
app.use('/api/v1/feature-flags', featureFlagRoutes);

// Health Check Route - with explicit types to fix the linting error
app.get('/', (req: Request, res: Response) => {
    res.send('PoDM API is running!');
});

// Global Error Handler
app.use(errorHandler);

// 5. Start the http server, NOT the express app
httpServer.listen(PORT, () => {
    if (process.env.NODE_ENV === 'production') {
        console.log(`🚀 Server (with WebSockets) is running on port ${PORT}`);
    } else {
        console.log(`🚀 Server (with WebSockets) is running at http://localhost:${PORT}`);
    }
});