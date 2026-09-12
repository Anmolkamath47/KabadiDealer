import axios from 'axios';
import { config } from '../config/index.js';
import { OrderStatus, FinalWeightItem } from '../types/index.js';

export class KabadiwalaClient {
  private static getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-dealer-api-key': config.dealerServiceApiKey,
    };
  }

  /**
   * Forward order status change to Kabadiwala backend
   */
  static async notifyStatusUpdate(
    orderId: string,
    dealerId: string,
    status: OrderStatus,
    options: {
      note?: string;
      finalWeights?: FinalWeightItem[];
      finalTotalAmount?: number;
      dealerLocation?: any;
    } = {}
  ): Promise<boolean> {
    try {
      await axios.post(
        `${config.kabadiwalaApiUrl}/internal/dealer-events/status`,
        {
          orderId,
          dealerId,
          status,
          note: options.note,
          finalWeights: options.finalWeights,
          finalTotalAmount: options.finalTotalAmount,
          dealerLocation: options.dealerLocation,
        },
        {
          headers: this.getHeaders(),
          timeout: 5000,
        }
      );
      return true;
    } catch (err: any) {
      console.warn(`⚠️ [Kabadiwala Cross-App Sync] Status webhook sync warning (${err.message}). Local state remains valid.`);
      return false;
    }
  }

  /**
   * Forward live dealer GPS location to Kabadiwala backend
   */
  static async sendLiveLocation(
    orderId: string,
    dealerId: string,
    coordinates: [number, number],
    heading: number = 0,
    speed: number = 0
  ): Promise<boolean> {
    try {
      await axios.post(
        `${config.kabadiwalaApiUrl}/internal/dealer-events/location`,
        {
          orderId,
          dealerId,
          coordinates,
          heading,
          speed,
        },
        {
          headers: this.getHeaders(),
          timeout: 4000,
        }
      );
      return true;
    } catch (err: any) {
      console.warn(`⚠️ [Kabadiwala Cross-App Sync] Location ping sync warning (${err.message}).`);
      return false;
    }
  }

  /**
   * Submit pickup OTP verification to Kabadiwala backend
   */
  static async verifyPickupOtp(orderId: string, dealerId: string, otp: string): Promise<boolean> {
    try {
      const res = await axios.post(
        `${config.kabadiwalaApiUrl}/internal/dealer-events/verify-otp`,
        {
          orderId,
          dealerId,
          otp,
        },
        {
          headers: this.getHeaders(),
          timeout: 5000,
        }
      );
      return res.data.success;
    } catch (err: any) {
      console.warn(`⚠️ [Kabadiwala Cross-App Sync] OTP verification sync warning (${err.message}).`);
      return false;
    }
  }
}
