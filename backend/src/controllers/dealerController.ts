import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DealerService } from '../services/dealerService.js';
import { AuthenticatedDealerRequest } from '../middleware/authMiddleware.js';

export const UpdateProfileSchema = z.object({
  businessName: z.string().min(2).optional(),
  contactPerson: z.string().min(2).optional(),
  profileImage: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  isProfileCompleted: z.boolean().optional(),
  vehicleType: z.string().optional(),
  vehicleNumber: z.string().optional(),
  activeRadiusKm: z.number().min(1).max(50).optional(),
});

export const UpdateLocationSchema = z.object({
  coordinates: z.tuple([z.number(), z.number()]),
  address: z.string().optional(),
  landmark: z.string().optional(),
});

export const SetStatusSchema = z.object({
  isOnline: z.boolean(),
});

export const UpdatePricesSchema = z.object({
  scrapRates: z.array(
    z.object({
      category: z.enum([
        'Paper',
        'Plastic',
        'Metal',
        'Aluminium',
        'Copper',
        'Brass',
        'E-Waste',
        'Cardboard',
        'Glass',
        'Other',
      ]),
      name: z.string(),
      unit: z.enum(['kg', 'piece']).default('kg'),
      pricePerKg: z.number().positive(),
      minQuantityKg: z.number().optional(),
      icon: z.string().optional(),
    })
  ),
});

export class DealerController {
  static async getProfile(
    req: AuthenticatedDealerRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dealer = await DealerService.getProfile(req.dealer!.dealerId);
      res.status(200).json({ success: true, data: dealer });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(
    req: AuthenticatedDealerRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const updated = await DealerService.updateProfile(req.dealer!.dealerId, req.body);
      res.status(200).json({
        success: true,
        message: 'Dealer profile updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateLocation(
    req: AuthenticatedDealerRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { coordinates, address, landmark } = req.body;
      const updated = await DealerService.updateLocation(
        req.dealer!.dealerId,
        coordinates,
        address,
        landmark
      );
      res.status(200).json({
        success: true,
        message: 'Dealer location updated successfully',
        data: updated?.location,
      });
    } catch (error) {
      next(error);
    }
  }

  static async setStatus(
    req: AuthenticatedDealerRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { isOnline } = req.body;
      const updated = await DealerService.setOnlineStatus(req.dealer!.dealerId, isOnline);
      res.status(200).json({
        success: true,
        message: isOnline ? 'You are now ONLINE and ready for pickups' : 'You are now OFFLINE',
        data: { isOnline: updated?.isOnline },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPrices(
    req: AuthenticatedDealerRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: req.dealer!.scrapRates,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePrices(
    req: AuthenticatedDealerRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const updated = await DealerService.updateScrapRates(
        req.dealer!.dealerId,
        req.body.scrapRates
      );
      res.status(200).json({
        success: true,
        message: 'Scrap buying rates updated successfully',
        data: updated?.scrapRates,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Public discovery endpoint for Kabadiwala backend
   */
  static async getNearbyActiveDealers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const radius = req.query.radius ? parseFloat(req.query.radius as string) : 15;

      if (isNaN(lat) || isNaN(lng)) {
        res.status(400).json({
          success: false,
          message: 'Valid lat and lng query parameters required.',
        });
        return;
      }

      const dealers = await DealerService.getNearbyActiveDealers(lat, lng, radius);
      res.status(200).json({
        success: true,
        data: {
          count: dealers.length,
          dealers,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Public endpoint to fetch dealer details and current scrap rates by dealerId
   */
  static async getPublicDealerById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dealerId = req.params.dealerId as string;
      const dealer = await DealerService.getProfile(dealerId);

      if (!dealer) {
        res.status(404).json({
          success: false,
          message: `Dealer with ID ${dealerId} not found`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          dealerId: dealer.dealerId,
          businessName: dealer.businessName,
          contactPerson: dealer.contactPerson,
          phone: dealer.phone,
          rating: dealer.rating,
          totalRatings: dealer.totalRatings,
          isAvailable: dealer.isOnline,
          isOnline: dealer.isOnline,
          isBusy: dealer.isBusy,
          activeRadiusKm: dealer.activeRadiusKm,
          location: dealer.location,
          address: dealer.location?.address,
          vehicleType: dealer.vehicleType,
          vehicleNumber: dealer.vehicleNumber,
          scrapRates: dealer.scrapRates,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
