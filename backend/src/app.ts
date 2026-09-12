import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import dealerRoutes from './routes/dealerRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import internalConsumerRoutes from './routes/internalConsumerRoutes.js';
import { notFoundHandler, globalErrorHandler } from './middleware/errorMiddleware.js';

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-dealer-api-key', 'x-internal-key'],
  })
);
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', generalLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Kabadidealer Partner Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/internal/consumer-events', internalConsumerRoutes);
app.use('/api/internal/consumer', internalConsumerRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
