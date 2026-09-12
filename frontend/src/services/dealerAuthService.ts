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
    const res = await api.post('/auth/verify-otp', {
      phone,
      otp,
      businessName,
      contactPerson,
    });
    return res.data.data;
  },

  async getMe(): Promise<DealerProfile> {
    const res = await api.get('/auth/me');
    return res.data.data.dealer;
  },
};
