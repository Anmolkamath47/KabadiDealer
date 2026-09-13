import { Dealer, IDealer } from '../models/Dealer.js';
import { generateOtp, verifyOtpCode } from '../utils/otp.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { KabadiwalaClient } from './kabadiwalaClient.js';

export class DealerAuthService {
  /**
   * Request OTP for dealer phone
   */
  static async requestOtp(phone: string): Promise<{ message: string; expiresAt: Date; demoOtp?: string }> {
    const cleanPhone = phone.replace(/\s+/g, '').trim();
    const { otp, expiresAt } = generateOtp(cleanPhone);

    console.log(`📱 [Dealer SMS Gateway Simulator] OTP for ${cleanPhone} is: ${otp}`);

    return {
      message: 'OTP sent successfully to your dealer mobile number',
      expiresAt,
      ...(process.env.NODE_ENV === 'development' ? { demoOtp: otp } : {}),
    };
  }

  /**
   * Verify OTP and Login / Register Dealer Partner
   */
  static async verifyOtpAndLogin(
    phone: string,
    otp: string,
    businessName?: string,
    contactPerson?: string
  ): Promise<{
    dealer: IDealer;
    accessToken: string;
    refreshToken: string;
    isNewDealer: boolean;
  }> {
    const cleanPhone = phone.replace(/\s+/g, '').trim();
    const raw10Digits = cleanPhone.replace(/\D/g, '').slice(-10);
    const standardPhone = `+91${raw10Digits}`;

    const isValid =
      verifyOtpCode(cleanPhone, otp) ||
      verifyOtpCode(standardPhone, otp) ||
      verifyOtpCode(raw10Digits, otp);

    if (!isValid) {
      throw new Error('Invalid or expired OTP. Please try again.');
    }

    let isNewDealer = false;
    let dealer = await Dealer.findOne({
      $or: [{ phone: standardPhone }, { phone: raw10Digits }, { phone: cleanPhone }],
    });

    if (dealer && dealer.phone !== standardPhone) {
      dealer.phone = standardPhone;
    }

    if (!dealer) {
      isNewDealer = true;
      const dealerId = `DLR-${Date.now().toString().slice(-6)}`;

      dealer = await Dealer.create({
        dealerId,
        phone: standardPhone,
        businessName: businessName?.trim() || 'Scrap Collection Center',
        contactPerson: contactPerson?.trim() || 'Partner Dealer',
        isOnline: true,
        isBusy: false,
        rating: 5.0,
        totalRatings: 0,
        activeRadiusKm: 15,
        location: {
          type: 'Point',
          coordinates: [77.2090, 28.6139],
          address: 'Location not configured - Update in Settings',
          landmark: '',
        },
        vehicleType: 'Three-Wheeler Auto',
        vehicleNumber: '',
        scrapRates: [
          { category: 'Paper', name: 'Newspaper (Raddi)', unit: 'kg', pricePerKg: 14, minQuantityKg: 5, icon: 'newspaper' },
          { category: 'Paper', name: 'Books & Notebooks', unit: 'kg', pricePerKg: 12, minQuantityKg: 5, icon: 'book' },
          { category: 'Cardboard', name: 'Corrugated Cardboard (Gatta)', unit: 'kg', pricePerKg: 10, minQuantityKg: 5, icon: 'box' },
          { category: 'Plastic', name: 'Hard Plastics / Buckets / Mugs', unit: 'kg', pricePerKg: 16, minQuantityKg: 2, icon: 'wine' },
          { category: 'Plastic', name: 'PET Bottles (Water / Soda)', unit: 'kg', pricePerKg: 20, minQuantityKg: 2, icon: 'bottle' },
          { category: 'Metal', name: 'Iron / Steel Scrap (Loha)', unit: 'kg', pricePerKg: 34, minQuantityKg: 5, icon: 'wrench' },
          { category: 'Aluminium', name: 'Aluminium Cans & Utensils', unit: 'kg', pricePerKg: 145, minQuantityKg: 1, icon: 'utensils' },
          { category: 'Copper', name: 'Pure Copper Wire (Taamba)', unit: 'kg', pricePerKg: 490, minQuantityKg: 0.5, icon: 'zap' },
          { category: 'Brass', name: 'Brass Items (Peetal)', unit: 'kg', pricePerKg: 340, minQuantityKg: 0.5, icon: 'shield' },
          { category: 'E-Waste', name: 'Old Electronics & CPU Boards', unit: 'kg', pricePerKg: 55, minQuantityKg: 1, icon: 'cpu' },
        ],
      });
    }

    const payload = { dealerId: dealer.dealerId, phone: dealer.phone };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    dealer.refreshTokenHash = refreshToken;
    dealer.lastActiveAt = new Date();
    await dealer.save();

    KabadiwalaClient.notifyDealerPresence(dealer).catch(() => {});

    return {
      dealer,
      accessToken,
      refreshToken,
      isNewDealer,
    };
  }

  /**
   * Refresh Token
   */
  static async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = verifyRefreshToken(refreshToken);
      const dealer = await Dealer.findOne({ dealerId: payload.dealerId });

      if (!dealer || dealer.refreshTokenHash !== refreshToken) {
        throw new Error('Invalid refresh token.');
      }

      const newAccessToken = generateAccessToken({
        dealerId: dealer.dealerId,
        phone: dealer.phone,
      });

      return { accessToken: newAccessToken };
    } catch {
      throw new Error('Invalid or expired refresh token.');
    }
  }
}
