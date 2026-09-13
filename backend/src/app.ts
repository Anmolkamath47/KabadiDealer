import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import { config } from './config/index.js';

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

// Real-time cross-app connectivity diagnostic check
app.get('/api/health/connectivity', async (_req, res) => {
  const startTime = Date.now();
  let consumerConnected = false;
  let consumerLatencyMs = 0;
  let consumerError: string | null = null;
  let consumerData: any = null;

  try {
    const consumerRes = await axios.get(`${config.kabadiwalaApiUrl}/health`, {
      timeout: 4000,
      headers: { 'x-dealer-api-key': config.dealerServiceApiKey },
    });
    consumerConnected = consumerRes.status >= 200 && consumerRes.status < 300;
    consumerLatencyMs = Date.now() - startTime;
    consumerData = consumerRes.data;
  } catch (err: any) {
    consumerError = err.message || 'Connection failed';
    consumerLatencyMs = Date.now() - startTime;
  }

  res.status(consumerConnected ? 200 : 207).json({
    status: 'healthy',
    service: 'Kabadidealer Partner Backend',
    uptime: process.uptime(),
    crossAppConnectivity: {
      consumerBackendUrl: config.kabadiwalaApiUrl,
      connected: consumerConnected,
      latencyMs: consumerLatencyMs,
      error: consumerError,
      consumerResponse: consumerData,
    },
    timestamp: new Date().toISOString(),
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
