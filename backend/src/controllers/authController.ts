import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DealerAuthService } from '../services/dealerAuthService.js';
import { AuthenticatedDealerRequest } from '../middleware/authMiddleware.js';

export const RequestOtpSchema = z.object({
  phone: z.string().min(10).max(15),
});

export const VerifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(4),
  businessName: z.string().optional(),
  contactPerson: z.string().optional(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export class AuthController {
  static async requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone } = req.body;
      const result = await DealerAuthService.requestOtp(phone);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, otp, businessName, contactPerson } = req.body;
      const result = await DealerAuthService.verifyOtpAndLogin(
        phone,
        otp,
        businessName,
        contactPerson
      );

      res.status(200).json({
        success: true,
        message: result.isNewDealer
          ? 'Dealer account created and verified'
          : 'Dealer login successful',
        data: {
          dealer: {
            dealerId: result.dealer.dealerId,
            phone: result.dealer.phone,
            businessName: result.dealer.businessName,
            contactPerson: result.dealer.contactPerson,
            profileImage: result.dealer.profileImage || '',
            email: result.dealer.email || '',
            isProfileCompleted: result.dealer.isProfileCompleted || false,
            isOnline: result.dealer.isOnline,
            rating: result.dealer.rating,
            totalRatings: result.dealer.totalRatings,
            location: result.dealer.location,
            vehicleType: result.dealer.vehicleType,
            vehicleNumber: result.dealer.vehicleNumber,
            scrapRates: result.dealer.scrapRates,
          },
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          isNewDealer: result.isNewDealer,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'OTP verification failed',
      });
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const result = await DealerAuthService.refreshToken(refreshToken);
      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message || 'Failed to refresh token',
      });
    }
  }

  static async getMe(
    req: AuthenticatedDealerRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.dealer) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          dealer: {
            dealerId: req.dealer.dealerId,
            phone: req.dealer.phone,
            businessName: req.dealer.businessName,
            contactPerson: req.dealer.contactPerson,
            profileImage: req.dealer.profileImage || '',
            email: req.dealer.email || '',
            isProfileCompleted: req.dealer.isProfileCompleted || false,
            isOnline: req.dealer.isOnline,
            isBusy: req.dealer.isBusy,
            rating: req.dealer.rating,
            totalRatings: req.dealer.totalRatings,
            activeRadiusKm: req.dealer.activeRadiusKm,
            location: req.dealer.location,
            vehicleType: req.dealer.vehicleType,
            vehicleNumber: req.dealer.vehicleNumber,
            scrapRates: req.dealer.scrapRates,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
