import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// --- Import Routes ---
// We will create these files next
// import authRoutes from './routes/auth.routes';
// import userRoutes from './routes/user.routes';

// --- Configuration ---
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
// Enable Cross-Origin Resource Sharing (CORS) to allow your frontend to make requests
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173' // Your frontend URL
}));

// Enable the Express app to parse JSON request bodies
app.use(express.json());

// --- API Routes ---
// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/users', userRoutes);


// --- Health Check Route ---
app.get('/', (req: Request, res: Response) => {
    res.send('PoDM API is running!');
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
