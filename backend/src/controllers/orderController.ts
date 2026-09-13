import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrderEngineService } from '../services/orderEngineService.js';
import { AuthenticatedDealerRequest } from '../middleware/authMiddleware.js';

export const RejectOrderSchema = z.object({
  reason: z.string().optional(),
});

export const LocationUpdateSchema = z.object({
  coordinates: z.tuple([z.number(), z.number()]),
  heading: z.number().optional(),
  speed: z.number().optional(),
});

export const VerifyOtpSchema = z.object({
  otp: z.string().length(4, 'OTP must be 4 digits'),
});

export const CompleteOrderSchema = z.object({
  finalWeights: z
    .array(
      z.object({
        category: z.string(),
        name: z.string(),
        unit: z.enum(['kg', 'piece']).default('kg'),
        pricePerKg: z.number().positive(),
        actualWeightKg: z.number().positive('Weighed scrap must be > 0'),
        finalAmount: z.number().positive(),
      })
    )
    .min(1, 'At least one weighed scrap item required'),
  finalTotalAmount: z.number().optional(),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum([
    'ACCEPTED',
    'DEALER_EN_ROUTE',
    'ARRIVED',
    'OTP_PENDING',
    'CANCELLED',
    'REJECTED',
  ]),
  note: z.string().optional(),
});

export class OrderController {
  static async getActiveOrder(
    req: AuthenticatedDealerRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const active = await OrderEngineService.getActiveOrderForDealer(req.dealer!.dealerId);
      res.status(200).json({
        success: true,
        data: active,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getOrderDetails(
    req: AuthenticatedDealerRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const order = await OrderEngineService.getOrder(orderId, req.dealer!.dealerId);
      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }
      res.status(200).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  static async getOrderHistory(
    req: AuthenticatedDealerRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await OrderEngineService.getDealerOrderHistory(
        req.dealer!.dealerId,
        page,
        limit
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getDealerReviews(
    req: AuthenticatedDealerRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await OrderEngineService.getDealerReviews(
        req.dealer!.dealerId
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async acceptOrder(
    req: AuthenticatedDealerRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const { coordinates } = req.body || {};
      const order = await OrderEngineService.acceptOrder(
        orderId,
        req.dealer!.dealerId,
        Array.isArray(coordinates) && coordinates.length === 2 ? [Number(coordinates[0]), Number(coordinates[1])] as [number, number] : undefined
      );
      res.status(200).json({
        success: true,
        message: 'Pickup request accepted successfully',
        data: order,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to accept order',
      });
    }
  }

  static async rejectOrder(
    req: AuthenticatedDealerRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const { reason } = req.body;
      const order = await OrderEngineService.rejectOrder(
        orderId,
        req.dealer!.dealerId,
        reason || 'Dealer declined request'
      );
      res.status(200).json({
        success: true,
        message: 'Pickup request rejected',
        data: order,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to reject order',
      });
    }
  }

  static async startTrip(
    req: AuthenticatedDealerRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const order = await OrderEngineService.startTrip(orderId, req.dealer!.dealerId);
      res.status(200).json({
        success: true,
        message: 'Order status updated to DEALER_EN_ROUTE',
        data: order,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to start trip',
      });
    }
  }

  static async updateLocation(
    req: AuthenticatedDealerRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const { coordinates, heading, speed } = req.body;
      const order = await OrderEngineService.updateLiveLocation(
        orderId,
        req.dealer!.dealerId,
        coordinates,
        heading,
        speed
      );
      res.status(200).json({
        success: true,
        data: order.dealerLiveLocation,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update live location',
      });
    }
  }

  static async markArrived(
    req: AuthenticatedDealerRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const order = await OrderEngineService.markArrived(orderId, req.dealer!.dealerId);
      res.status(200).json({
        success: true,
        message: 'Order status updated to ARRIVED. Please collect OTP from customer.',
        data: order,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update status to ARRIVED',
      });
    }
  }

  static async verifyOtp(
    req: AuthenticatedDealerRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const { otp } = req.body;
      const order = await OrderEngineService.verifyPickupOtp(
        orderId,
        req.dealer!.dealerId,
        otp
      );
      res.status(200).json({
        success: true,
        message: 'OTP verified successfully! You may now weigh the scrap on digital scale.',
        data: order,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'OTP verification failed',
      });
    }
  }

  static async completeOrder(
    req: AuthenticatedDealerRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const { finalWeights, finalTotalAmount } = req.body;
      const order = await OrderEngineService.completeOrder(
        orderId,
        req.dealer!.dealerId,
        finalWeights as any,
        finalTotalAmount
      );
      res.status(200).json({
        success: true,
        message: 'Pickup completed! Final receipt generated.',
        data: order,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to complete order',
      });
    }
  }

  static async updateStatus(
    req: AuthenticatedDealerRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const { status, note } = req.body;
      const order = await OrderEngineService.updateOrderStatus(
        orderId,
        req.dealer!.dealerId,
        status,
        note
      );
      res.status(200).json({
        success: true,
        message: `Order status updated to ${status}`,
        data: order,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update order status',
      });
    }
  }
}
