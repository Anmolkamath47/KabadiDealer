import dotenv from 'dotenv';
dotenv.config();

const normalizeApiUrl = (url?: string, defaultUrl: string = 'http://localhost:5000/api'): string => {
  const target = url?.trim() || defaultUrl;
  let clean = target.replace(/\/+$/, '');
  if (!clean.endsWith('/api')) {
    clean = `${clean}/api`;
  }
  return clean;
};

const defaultKabadiwalaApi =
  process.env.NODE_ENV === 'production'
    ? 'https://kabadiwala-backend.onrender.com/api'
    : 'http://localhost:5000/api';

const resolvedKabadiwalaApiUrl = normalizeApiUrl(
  process.env.KABADIWALA_API_URL,
  defaultKabadiwalaApi
);

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientAppUrl: process.env.CLIENT_APP_URL || 'http://localhost:5174',
  kabadiwalaApiUrl: resolvedKabadiwalaApiUrl,
  kabadiwalaSocketUrl: process.env.KABADIWALA_SOCKET_URL || (process.env.NODE_ENV === 'production' ? 'https://kabadiwala-backend.onrender.com' : 'http://localhost:5000'),
  dealerServiceApiKey: process.env.DEALER_SERVICE_API_KEY || 'kbad_shared_internal_secret_key_9988',
  jwtSecret: process.env.JWT_SECRET || 'kabadidealer_super_secure_jwt_secret_key_2026_dealer',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'kabadidealer_refresh_token_secret_key_2026',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kabadidealer_db',
  useMemoryDb: process.env.USE_MEMORY_DB === 'true' || process.env.NODE_ENV === 'test',
  otpDemoCode: process.env.OTP_DEMO_CODE || '1234',
  pickupRequestTimeoutSeconds: parseInt(process.env.PICKUP_REQUEST_TIMEOUT_SECONDS || '60', 10),
};

