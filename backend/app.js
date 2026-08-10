import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import dotenv from 'dotenv';
import compression from 'compression';

import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import planRoutes from './routes/planRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import kycRoutes from './routes/kycRoutes.js';
import { globalRateLimiter } from './middleware/rateLimiter.js';
import { sanitizeNoSQL } from './middleware/sanitizeMiddleware.js';
import { notFound } from './middleware/notFoundMiddleware.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

const app = express();

// 1. Gzip Compression
app.use(compression());

// 2. Helmet Security Headers with OpenStreetMap / Nominatim / OSRM CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://unpkg.com',
          'https://checkout.razorpay.com', // Razorpay SDK
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://unpkg.com'],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://res.cloudinary.com',
          'https://*.tile.openstreetmap.org',
          'https://a.tile.openstreetmap.org',
          'https://b.tile.openstreetmap.org',
          'https://c.tile.openstreetmap.org',
          'https://unpkg.com',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: [
          "'self'",
          'https://res.cloudinary.com',
          'https://nominatim.openstreetmap.org',
          'https://router.project-osrm.org',
          'https://api.razorpay.com',        // Razorpay API calls
          'https://checkout.razorpay.com',   // Razorpay checkout
          'https://lumberjack.razorpay.com', // Razorpay analytics/logging
        ],
        frameSrc: ['https://api.razorpay.com', 'https://checkout.razorpay.com'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// 3. CORS Configuration
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === allowedOrigin || process.env.NODE_ENV === 'test') {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

// 4. Request Logging
const morganStream = {
  write: (message) => logger.info(message.trim()),
};
app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: morganStream,
  })
);

// 5. Global Rate Limiting & Body Parsing
app.use('/api', globalRateLimiter);
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'agriconnect_cookie_secret'));

// 6. NoSQL Operator Sanitization
app.use(sanitizeNoSQL);

// 7. API Routes
app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profiles', profileRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/location', locationRoutes);
app.use('/api/v1/plans', planRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/kyc', kycRoutes);


app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to AgriConnect AI-Powered Agricultural Employment API',
    version: 'v1.0.0',
    documentation: '/api/v1/health',
  });
});

// 8. 404 Not Found Middleware
app.use(notFound);

// 9. Centralized Error Handler Middleware
app.use(errorHandler);

export default app;
