import { Dealer, IDealer } from '../models/Dealer.js';
import { ScrapRateItem } from '../types/index.js';
import { calculateDistanceKm, estimateEtaMinutes } from '../utils/geo.js';

export class DealerService {
  static async getProfile(dealerId: string): Promise<IDealer | null> {
    return Dealer.findOne({ dealerId }).select('-refreshTokenHash');
  }

  static async updateProfile(
    dealerId: string,
    updates: {
      businessName?: string;
      contactPerson?: string;
      profileImage?: string;
      email?: string;
      isProfileCompleted?: boolean;
      vehicleType?: string;
      vehicleNumber?: string;
      activeRadiusKm?: number;
    }
  ): Promise<IDealer | null> {
    const dealer = await Dealer.findOne({ dealerId });
    if (!dealer) return null;

    if (updates.businessName !== undefined) dealer.businessName = updates.businessName.trim();
    if (updates.contactPerson !== undefined) dealer.contactPerson = updates.contactPerson.trim();
    if (updates.profileImage !== undefined) dealer.profileImage = updates.profileImage;
    if (updates.email !== undefined) dealer.email = updates.email.trim();
    if (updates.isProfileCompleted !== undefined) dealer.isProfileCompleted = updates.isProfileCompleted;
    if (updates.vehicleType !== undefined) dealer.vehicleType = updates.vehicleType.trim();
    if (updates.vehicleNumber !== undefined) dealer.vehicleNumber = updates.vehicleNumber.trim();
    if (updates.activeRadiusKm !== undefined) dealer.activeRadiusKm = updates.activeRadiusKm;

    await dealer.save();
    return dealer;
  }

  static async updateLocation(
    dealerId: string,
    coordinates: [number, number],
    address?: string,
    landmark?: string
  ): Promise<IDealer | null> {
    const dealer = await Dealer.findOne({ dealerId });
    if (!dealer) return null;

    dealer.location = {
      type: 'Point',
      coordinates,
      address: address || dealer.location.address,
      landmark: landmark || dealer.location.landmark,
    };
    dealer.lastActiveAt = new Date();

    await dealer.save();
    return dealer;
  }

  static async setOnlineStatus(dealerId: string, isOnline: boolean): Promise<IDealer | null> {
    const dealer = await Dealer.findOne({ dealerId });
    if (!dealer) return null;

    dealer.isOnline = isOnline;
    if (!isOnline) {
      dealer.isBusy = false;
    }
    dealer.lastActiveAt = new Date();
    await dealer.save();
    return dealer;
  }

  static async updateScrapRates(
    dealerId: string,
    scrapRates: ScrapRateItem[]
  ): Promise<IDealer | null> {
    const dealer = await Dealer.findOne({ dealerId });
    if (!dealer) return null;

    dealer.scrapRates = scrapRates;
    await dealer.save();
    return dealer;
  }

  /**
   * Public endpoint for Kabadiwala to discover nearby active dealers
   */
  static async getNearbyActiveDealers(
    lat: number,
    lng: number,
    radiusKm: number = 15
  ): Promise<any[]> {
    const DUMMY_IDS = new Set(['DLR-BLR-001', 'DLR-RAMESH-001', 'DLR-SURESH-002', 'DLR-530794']);
    const DUMMY_NAMES = new Set(['GreenEarth Scrap Hub', 'Ramesh Green Recycling', 'Verma Scrap & Metals', 'Arun Scrap Traders']);

    const activeDealers = await Dealer.find({ isOnline: true }).lean();
    const results: any[] = [];

    for (const dealer of activeDealers) {
      if (DUMMY_IDS.has(dealer.dealerId) || DUMMY_NAMES.has(dealer.businessName)) continue;

      const [dealerLng, dealerLat] = dealer.location.coordinates;
      const distance = calculateDistanceKm(lat, lng, dealerLat, dealerLng);

      const effectiveRadius = radiusKm >= 100 ? radiusKm : Math.max(radiusKm, dealer.activeRadiusKm || 15);
      if (distance <= effectiveRadius) {
        results.push({
          dealerId: dealer.dealerId,
          businessName: dealer.businessName,
          contactPerson: dealer.contactPerson,
          phone: dealer.phone,
          profileImage: dealer.profileImage || '',
          rating: dealer.rating || 5.0,
          totalRatings: dealer.totalRatings || 0,
          isAvailable: dealer.isOnline,
          isOnline: dealer.isOnline,
          isBusy: dealer.isBusy,
          distanceKm: distance,
          etaMinutes: estimateEtaMinutes(distance),
          location: {
            coordinates: [dealerLng, dealerLat],
          },
          address: dealer.location.address,
          vehicleType: dealer.vehicleType,
          scrapRates: dealer.scrapRates,
        });
      }
    }

    return results.sort((a, b) => a.distanceKm - b.distanceKm);
  }
}
