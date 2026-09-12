import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrderEngineService } from '../services/orderEngineService.js';
import { Dealer } from '../models/Dealer.js';
import { DealerOrder } from '../models/DealerOrder.js';

export const IncomingPickupSchema = z.object({
  orderId: z.string(),
  dealerId: z.string(),
  consumerId: z.string(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  pickupAddress: z.string(),
  pickupLocation: z.tuple([z.number(), z.number()]),
  selectedMaterials: z.array(z.any()),
  estimatedTotalAmount: z.number(),
  otpCode: z.string().optional(),
  notes: z.string().optional(),
});

export const DealerRatingSubmissionSchema = z.object({
  orderId: z.string(),
  score: z.number().min(1).max(5),
  feedback: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export class InternalConsumerController {
  static async handleIncomingPickup(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const order = await OrderEngineService.ingestNewPickupRequest(req.body);
      res.status(201).json({
        success: true,
        message: 'Pickup request received and alerted to dealer',
        data: {
          orderId: order.orderId,
          dealerId: order.dealerId,
          status: order.status,
          expiresAt: order.expiresAt,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to ingest incoming pickup request',
      });
    }
  }

  static async handleRatingSubmission(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dealerId = req.params.dealerId || req.body.dealerId;
      const { orderId, score, feedback, tags } = req.body;

      const dealer = await Dealer.findOne({ dealerId });
      if (!dealer) {
        res.status(404).json({
          success: false,
          message: `Dealer ${dealerId} not found to record rating`,
        });
        return;
      }

      const currentTotal = dealer.totalRatings || 0;
      const currentRating = dealer.rating || 5;
      const newTotal = currentTotal + 1;
      const newAvg = Math.round(((currentRating * currentTotal + score) / newTotal) * 10) / 10;

      dealer.rating = newAvg;
      dealer.totalRatings = newTotal;
      await dealer.save();

      // Optionally attach note to DealerOrder status history if present
      await DealerOrder.findOneAndUpdate(
        { orderId },
        {
          $push: {
            statusHistory: {
              status: 'RATED',
              timestamp: new Date(),
              note: `Customer submitted ${score}-star rating${feedback ? `: "${feedback}"` : ''}`,
              updatedBy: 'CONSUMER',
            },
          },
        }
      );

      res.status(200).json({
        success: true,
        message: 'Rating successfully synchronized to dealer profile',
        data: {
          dealerId: dealer.dealerId,
          rating: dealer.rating,
          totalRatings: dealer.totalRatings,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to process rating submission',
      });
    }
  }
}

