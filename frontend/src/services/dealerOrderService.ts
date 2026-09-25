import api from './api';
import { DealerOrder, DealerProfile, FinalWeightItem, ScrapRateItem } from '../types';

export const dealerOrderService = {
  // Dealer Profile & Controls
  async getProfile(): Promise<DealerProfile> {
    try {
      const res = await api.get('/dealers/profile');
      return res.data.data;
    } catch (err) {
      const cached = localStorage.getItem('kabadidealer_dealer');
      if (cached) return JSON.parse(cached);
      throw err;
    }
  },

  async updateProfile(updates: any): Promise<DealerProfile> {
    try {
      const res = await api.patch('/dealers/profile', updates);
      return res.data.data;
    } catch (err) {
      const cached = localStorage.getItem('kabadidealer_dealer');
      if (cached) {
        const merged = { ...JSON.parse(cached), ...updates };
        localStorage.setItem('kabadidealer_dealer', JSON.stringify(merged));
        return merged;
      }
      throw err;
    }
  },

  async updateLocation(coords: [number, number], address?: string, landmark?: string): Promise<any> {
    try {
      const res = await api.put('/dealers/location', { coordinates: coords, address, landmark });
      return res.data.data;
    } catch (err) {
      const cached = localStorage.getItem('kabadidealer_dealer');
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.location = {
          type: 'Point',
          coordinates: coords,
          address: address || parsed.location?.address || '',
          landmark: landmark || parsed.location?.landmark || '',
        };
        localStorage.setItem('kabadidealer_dealer', JSON.stringify(parsed));
      }
      return { coordinates: coords, address, landmark };
    }
  },

  async setOnlineStatus(isOnline: boolean): Promise<{ isOnline: boolean }> {
    try {
      const res = await api.patch('/dealers/status', { isOnline });
      return res.data.data;
    } catch {
      return { isOnline };
    }
  },

  async getScrapPrices(): Promise<ScrapRateItem[]> {
    try {
      const res = await api.get('/dealers/prices');
      return res.data.data;
    } catch {
      const cached = localStorage.getItem('kabadidealer_dealer');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.scrapRates) return parsed.scrapRates;
      }
      return [];
    }
  },

  async updateScrapPrices(scrapRates: ScrapRateItem[]): Promise<ScrapRateItem[]> {
    try {
      const res = await api.put('/dealers/prices', { scrapRates });
      const cached = localStorage.getItem('kabadidealer_dealer');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          parsed.scrapRates = scrapRates;
          localStorage.setItem('kabadidealer_dealer', JSON.stringify(parsed));
        } catch {}
      }
      return res.data.data;
    } catch {
      const cached = localStorage.getItem('kabadidealer_dealer');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          parsed.scrapRates = scrapRates;
          localStorage.setItem('kabadidealer_dealer', JSON.stringify(parsed));
        } catch {}
      }
      return scrapRates;
    }
  },

  // Order Actions
  async getActiveOrder(): Promise<DealerOrder | null> {
    try {
      const res = await api.get('/orders/active');
      return res.data.data;
    } catch {
      const saved = localStorage.getItem('kabadidealer_active_order');
      return saved ? JSON.parse(saved) : null;
    }
  },

  async getOrderDetails(orderId: string): Promise<DealerOrder> {
    try {
      const res = await api.get(`/orders/${orderId}`);
      return res.data.data;
    } catch {
      const saved = localStorage.getItem('kabadidealer_active_order');
      if (saved) return JSON.parse(saved);
      throw new Error('Order not found');
    }
  },

  async getOrderHistory(page: number = 1, limit: number = 20): Promise<{ orders: DealerOrder[]; total: number; pages: number }> {
    try {
      const res = await api.get('/orders/history', { params: { page, limit } });
      return res.data.data;
    } catch {
      return { orders: [], total: 0, pages: 1 };
    }
  },

  async getDealerReviews(): Promise<{ reviews: any[]; count: number }> {
    try {
      const res = await api.get('/orders/reviews');
      return res.data.data;
    } catch {
      return { reviews: [], count: 0 };
    }
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

  async completeOrder(
    orderId: string,
    finalWeights: FinalWeightItem[],
    finalTotalAmount?: number,
    scrapPhoto?: string
  ): Promise<DealerOrder> {
    const res = await api.post(`/orders/${orderId}/complete`, {
      finalWeights,
      finalTotalAmount,
      scrapPhoto,
    });
    return res.data.data;
  },
};
