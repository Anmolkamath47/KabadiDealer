import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrderEngineService } from '../services/orderEngineService.js';
import { Dealer } from '../models/Dealer.js';
import { DealerOrder } from '../models/DealerOrder.js';
import { dealerSocketEvents } from '../sockets/socketManager.js';

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

      const ratingRecord = {
        score,
        feedback: feedback ? String(feedback).trim() : '',
        tags: Array.isArray(tags) ? tags : [],
        createdAt: new Date(),
      };

      // Save structured rating onto DealerOrder record
      await DealerOrder.findOneAndUpdate(
        { orderId },
        {
          $set: {
            rating: ratingRecord,
          },
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

      // Instantly broadcast live rating event to dealer socket
      dealerSocketEvents.emitOrderRated(dealer.dealerId, {
        orderId,
        dealerId: dealer.dealerId,
        score,
        feedback: ratingRecord.feedback,
        tags: ratingRecord.tags,
        rating: dealer.rating,
        totalRatings: dealer.totalRatings,
        createdAt: ratingRecord.createdAt.toISOString(),
      });

      res.status(200).json({
        success: true,
        message: 'Rating successfully synchronized to dealer profile',
        data: {
          dealerId: dealer.dealerId,
          orderId,
          rating: dealer.rating,
          totalRatings: dealer.totalRatings,
          customerRating: ratingRecord,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to process rating submission',
      });
    }
  }

  static async handleOrderCancelled(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      const { orderId, dealerId, reason, cancelledBy } = req.body;
      const order = await DealerOrder.findOne({ orderId });
      if (order) {
        order.status = 'CANCELLED';
        order.statusHistory.push({
          status: 'CANCELLED',
          timestamp: new Date(),
          note: reason || 'Order was cancelled by customer.',
          updatedBy: (cancelledBy as any) || 'CONSUMER',
        });
        await order.save();
      }

      // Free the dealer
      const targetDealerId = dealerId || order?.dealerId;
      if (targetDealerId) {
        await Dealer.findOneAndUpdate({ dealerId: targetDealerId }, { isBusy: false });
      }

      // Broadcast to dealer socket
      if (targetDealerId) {
        dealerSocketEvents.emitOrderStatusUpdate(targetDealerId, orderId, 'CANCELLED', {
          orderId,
          dealerId: targetDealerId,
          status: 'CANCELLED',
          reason: reason || 'Customer cancelled this pickup request.',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Dealer order cancelled and alerted successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to cancel dealer order',
      });
    }
  }

  static async handleConsumerChatMessage(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      const { orderId, dealerId, message } = req.body;
      const order = await DealerOrder.findOne({ orderId });
      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }

      const msgObj = {
        id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        sender: 'consumer' as const,
        senderName: message.senderName || order.customerName || 'Customer',
        text: message.text,
        timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
      };

      if (!order.chatMessages) {
        order.chatMessages = [];
      }

      if (!order.chatMessages.some((m) => m.id === msgObj.id)) {
        order.chatMessages.push(msgObj);
        await order.save();
      }

      // Broadcast to dealer socket
      const targetDealerId = dealerId || order.dealerId;
      dealerSocketEvents.emitChatMessage(targetDealerId, order.orderId, {
        ...msgObj,
        orderId: order.orderId,
        formattedTime: msgObj.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      res.status(200).json({
        success: true,
        message: 'Chat message received and broadcasted to dealer',
        data: msgObj,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

