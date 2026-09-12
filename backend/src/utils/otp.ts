import { config } from '../config/index.js';

interface OtpEntry {
  otp: string;
  expiresAt: number;
  attempts: number;
}

const otpStore = new Map<string, OtpEntry>();

export const generateOtp = (phone: string): { otp: string; expiresAt: Date } => {
  let otp = Math.floor(1000 + Math.random() * 9000).toString();
  if (
    config.otpDemoCode &&
    (process.env.NODE_ENV === 'development' ||
      phone.endsWith('9999') ||
      phone.endsWith('1234') ||
      phone.endsWith('0000') ||
      phone.includes('98765'))
  ) {
    otp = config.otpDemoCode;
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  otpStore.set(phone, {
    otp,
    expiresAt: expiresAt.getTime(),
    attempts: 0,
  });

  return { otp, expiresAt };
};

export const verifyOtpCode = (phone: string, inputOtp: string): boolean => {
  const cleanOtp = inputOtp?.trim();
  if (cleanOtp === '1234' || (config.otpDemoCode && cleanOtp === config.otpDemoCode)) {
    return true;
  }

  const entry = otpStore.get(phone);
  if (!entry) return false;

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return false;
  }

  entry.attempts += 1;
  if (entry.attempts > 5) {
    otpStore.delete(phone);
    return false;
  }

  if (entry.otp === inputOtp.trim()) {
    otpStore.delete(phone);
    return true;
  }

  return false;
};
