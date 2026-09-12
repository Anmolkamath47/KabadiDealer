import api from './api';
import { DealerOrder, DealerProfile, FinalWeightItem, ScrapRateItem } from '../types';

export const dealerOrderService = {
  // Dealer Profile & Controls
  async getProfile(): Promise<DealerProfile> {
    const res = await api.get('/dealers/profile');
    return res.data.data;
  },

  async updateProfile(updates: any): Promise<DealerProfile> {
    const res = await api.patch('/dealers/profile', updates);
    return res.data.data;
  },

  async updateLocation(coords: [number, number], address?: string, landmark?: string): Promise<any> {
    const res = await api.put('/dealers/location', { coordinates: coords, address, landmark });
    return res.data.data;
  },

  async setOnlineStatus(isOnline: boolean): Promise<{ isOnline: boolean }> {
    const res = await api.patch('/dealers/status', { isOnline });
    return res.data.data;
  },

  async getScrapPrices(): Promise<ScrapRateItem[]> {
    const res = await api.get('/dealers/prices');
    return res.data.data;
  },

  async updateScrapPrices(scrapRates: ScrapRateItem[]): Promise<ScrapRateItem[]> {
    const res = await api.put('/dealers/prices', { scrapRates });
    return res.data.data;
  },

  // Order Actions
  async getActiveOrder(): Promise<DealerOrder | null> {
    const res = await api.get('/orders/active');
    return res.data.data;
  },

  async getOrderDetails(orderId: string): Promise<DealerOrder> {
    const res = await api.get(`/orders/${orderId}`);
    return res.data.data;
  },

  async getOrderHistory(page: number = 1, limit: number = 20): Promise<{ orders: DealerOrder[]; total: number; pages: number }> {
    const res = await api.get('/orders/history', { params: { page, limit } });
    return res.data.data;
  },

  async acceptOrder(orderId: string, coords?: [number, number]): Promise<DealerOrder> {
    const res = await api.post(`/orders/${orderId}/accept`, { coordinates: coords });
    return res.data.data;
  },

  async rejectOrder(orderId: string, reason?: string): Promise<DealerOrder> {
    const res = await api.post(`/orders/${orderId}/reject`, { reason });
    return res.data.data;
  },

  async startTrip(orderId: string): Promise<DealerOrder> {
    const res = await api.post(`/orders/${orderId}/start-trip`);
    return res.data.data;
  },

  async sendLiveLocation(orderId: string, coords: [number, number], heading: number = 0, speed: number = 0): Promise<any> {
    const res = await api.post(`/orders/${orderId}/location`, {
      coordinates: coords,
      heading,
      speed,
    });
    return res.data.data;
  },

  async markArrived(orderId: string): Promise<DealerOrder> {
    const res = await api.post(`/orders/${orderId}/arrived`);
    return res.data.data;
  },

  async verifyOtp(orderId: string, otp: string): Promise<DealerOrder> {
    const res = await api.post(`/orders/${orderId}/verify-otp`, { otp });
    return res.data.data;
  },

  async completeOrder(orderId: string, finalWeights: FinalWeightItem[], finalTotalAmount?: number): Promise<DealerOrder> {
    const res = await api.post(`/orders/${orderId}/complete`, {
      finalWeights,
      finalTotalAmount,
    });
    return res.data.data;
  },
};
