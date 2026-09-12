import api from './api';
import { DealerProfile } from '../types';

export const dealerAuthService = {
  async requestOtp(phone: string): Promise<{ message: string; expiresAt: string; demoOtp?: string }> {
    const res = await api.post('/auth/send-otp', { phone });
    return res.data.data;
  },

  async verifyOtp(
    phone: string,
    otp: string,
    businessName?: string,
    contactPerson?: string
  ): Promise<{
    dealer: DealerProfile;
    accessToken: string;
    refreshToken: string;
    isNewDealer: boolean;
  }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await api.post(
        '/auth/verify-otp',
        {
          phone,
          otp,
          businessName,
          contactPerson,
        },
        { signal: controller.signal }
      );
      clearTimeout(timer);
      return res.data.data;
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'CanceledError' || controller.signal.aborted) {
        throw new Error('Verification request timed out. Please check your connection and try again.');
      }
      throw err;
    }
  },

  async getMe(): Promise<DealerProfile> {
    const res = await api.get('/auth/me');
    return res.data.data.dealer;
  },
};
