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
      scrapPhoto?: string;
      dealerLocation?: any;
      dealerSnapshot?: any;
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
          scrapPhoto: options.scrapPhoto,
          dealerLocation: options.dealerLocation,
          dealerSnapshot: options.dealerSnapshot,
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

  /**
   * Forward live dealer presence (online/offline status & location) to Kabadiwala backend
   */
  static async notifyDealerPresence(dealer: any): Promise<boolean> {
    if (!dealer || !dealer.dealerId) return false;
    const raw = typeof dealer.toObject === 'function' ? dealer.toObject() : dealer;
    const coords = raw.location?.coordinates;
    const cleanCoords = Array.isArray(coords) && coords.length === 2 ? [Number(coords[0]), Number(coords[1])] : undefined;

    try {
      await axios.post(
        `${config.kabadiwalaApiUrl}/internal/dealer-events/presence`,
        {
          dealerId: String(raw.dealerId),
          phone: raw.phone ? String(raw.phone) : undefined,
          businessName: raw.businessName,
          contactPerson: raw.contactPerson,
          profileImage: raw.profileImage || '',
          isOnline: Boolean(raw.isOnline ?? true),
          isAvailable: Boolean(raw.isAvailable ?? raw.isOnline ?? true),
          rating: raw.rating,
          totalRatings: raw.totalRatings,
          location: cleanCoords
            ? {
                type: 'Point',
                coordinates: cleanCoords,
                address: raw.location?.address || raw.address,
                landmark: raw.location?.landmark,
              }
            : undefined,
          vehicleType: raw.vehicleType,
          vehicleNumber: raw.vehicleNumber,
          scrapRates: raw.scrapRates,
          activeRadiusKm: raw.activeRadiusKm,
        },
        {
          headers: this.getHeaders(),
          timeout: 4000,
        }
      );
      return true;
    } catch (err: any) {
      console.warn(`⚠️ [Kabadiwala Cross-App Sync] Dealer presence sync warning (${err.message}).`);
      return false;
    }
  }

  /**
   * Forward dealer chat message to Kabadiwala consumer backend
   */
  static async forwardDealerChatMessage(
    orderId: string,
    dealerId: string,
    message: {
      id: string;
      sender: 'dealer';
      senderName: string;
      text: string;
      timestamp: string;
    }
  ): Promise<boolean> {
    try {
      await axios.post(
        `${config.kabadiwalaApiUrl}/internal/dealer-events/chat`,
        {
          orderId,
          dealerId,
          message,
        },
        {
          headers: this.getHeaders(),
          timeout: 5000,
        }
      );
      return true;
    } catch (err: any) {
      console.warn(`⚠️ [Kabadiwala Cross-App Sync] Chat forward sync warning (${err.message}).`);
      return false;
    }
  }
}

