import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();

// Trust proxy for Vercel
app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased from 100 to 1000 to accommodate polling and multiple concurrent requests
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter limiter for Auth
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 login attempts per hour
    message: 'Too many login attempts from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);

// Database connection management for serverless context
let cachedPromise = null;

export const connectDB = async () => {
    // 1. If already connected, return immediately
    if (mongoose.connection.readyState === 1) return mongoose.connection;
    
    // 2. If already connecting, return the existing promise
    if (cachedPromise) return cachedPromise;

    // 3. Otherwise, create a new connection promise
    console.log('Initializing new MongoDB connection...');
    cachedPromise = mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo')
        .then((m) => {
            console.log('Connected to MongoDB successfully.');
            return m;
        })
        .catch((err) => {
            console.error('MongoDB connection error:', err);
            cachedPromise = null; // Reset on failure so next request can retry
            throw err;
        });

    return cachedPromise;
};

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// Routes
app.use('/api', apiRoutes);

// Enhanced Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    const status = err.status || 500;
    const message = err.message || 'Something went wrong on the server.';
    res.status(status).json({ 
        error: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

export default app;
