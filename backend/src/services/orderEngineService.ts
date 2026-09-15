import { DealerOrder, IDealerOrder } from '../models/DealerOrder.js';
import { Dealer } from '../models/Dealer.js';
import { dealerSocketEvents } from '../sockets/socketManager.js';
import { KabadiwalaClient } from './kabadiwalaClient.js';
import { calculateDistanceKm, estimateEtaMinutes } from '../utils/geo.js';
import { config } from '../config/index.js';
import {
  OrderStatus,
  FinalWeightItem,
  DealerLiveLocationUpdate,
} from '../types/index.js';

const ALLOWED_DEALER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
  ACCEPTED: ['DEALER_EN_ROUTE', 'CANCELLED'],
  DEALER_EN_ROUTE: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['OTP_PENDING', 'OTP_VERIFIED'],
  OTP_PENDING: ['OTP_VERIFIED'],
  OTP_VERIFIED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
  EXPIRED: [],
};

export class OrderEngineService {
  /**
   * Ingest a new pickup request alert from Kabadiwala consumer backend
   */
  static async ingestNewPickupRequest(data: {
    orderId: string;
    dealerId: string;
    consumerId: string;
    customerName?: string;
    customerPhone?: string;
    pickupAddress: string;
    pickupLocation: [number, number]; // [lng, lat]
    selectedMaterials: any[];
    estimatedTotalAmount: number;
    notes?: string;
    otpCode?: string;
  }): Promise<IDealerOrder> {
    let dealer = await Dealer.findOne({ dealerId: data.dealerId });
    if (!dealer) {
      console.warn(`⚠️ Dealer ${data.dealerId} not pre-registered. Auto-provisioning partner record.`);
      dealer = await Dealer.create({
        dealerId: data.dealerId,
        phone: '+919876543210',
        businessName: 'Scrap Collection Center',
        contactPerson: 'Partner Dealer',
        isOnline: true,
        isAvailable: true,
        location: {
          type: 'Point',
          coordinates: data.pickupLocation || [77.5058, 13.0431],
          address: data.pickupAddress || 'Service Area',
        },
        scrapRates: [],
      });
    }

    const [dealerLng, dealerLat] = dealer.location.coordinates;
    const [pickupLng, pickupLat] = data.pickupLocation;
    const distanceKm = calculateDistanceKm(dealerLat, dealerLng, pickupLat, pickupLng);

    const expiresAt = new Date(Date.now() + config.pickupRequestTimeoutSeconds * 1000);

    // Upsert or create dealer order
    const order = await DealerOrder.findOneAndUpdate(
      { orderId: data.orderId },
      {
        orderId: data.orderId,
        dealerId: data.dealerId,
        consumerId: data.consumerId,
        customerName: data.customerName || 'Consumer Customer',
        customerPhone: data.customerPhone || '+91 98765 43210',
        pickupAddress: data.pickupAddress,
        pickupLocation: {
          type: 'Point',
          coordinates: data.pickupLocation,
        },
        distanceKm,
        selectedMaterials: data.selectedMaterials,
        estimatedTotalAmount: data.estimatedTotalAmount,
        status: 'PENDING',
        statusHistory: [
          {
            status: 'PENDING',
            timestamp: new Date(),
            note: 'New pickup booking received from Kabadiwala customer.',
            updatedBy: 'CONSUMER',
          },
        ],
        otpCode: data.otpCode,
        isOtpVerified: false,
        expiresAt,
        notes: data.notes,
      },
      { upsert: true, new: true }
    );

    // Emit live audible alert to dealer socket
    dealerSocketEvents.emitIncomingPickupAlert(dealer.dealerId, order);

    return order;
  }

  /**
   * Dealer accepts the pickup request
   */
  static async acceptOrder(
    orderId: string,
    dealerId: string,
    coords?: [number, number]
  ): Promise<IDealerOrder> {
    const order = await DealerOrder.findOne({ orderId, dealerId });
    if (!order) {
      throw new Error(`Order ${orderId} not found for dealer ${dealerId}.`);
    }

    if (order.status !== 'PENDING') {
      throw new Error(`Order is not pending (current: ${order.status}). Cannot accept.`);
    }

    if (new Date() > new Date(order.expiresAt)) {
      order.status = 'EXPIRED';
      await order.save();
      throw new Error('This pickup request has expired.');
    }

    // Determine initial real dealer location (from current GPS or registered hub)
    let dealerCoords: [number, number] = coords && coords.length === 2 ? coords : [0, 0];
    const dealer = await Dealer.findOne({ dealerId });

    if (!coords || coords[0] === 0) {
      if (dealer?.location?.coordinates && dealer.location.coordinates.length === 2) {
        dealerCoords = dealer.location.coordinates;
      } else {
        dealerCoords = [77.2150, 28.6250];
      }
    }

    const [pickupLng, pickupLat] = order.pickupLocation.coordinates;
    const [dealerLng, dealerLat] = dealerCoords;
    const distanceKm = calculateDistanceKm(dealerLat, dealerLng, pickupLat, pickupLng);
    const etaMinutes = estimateEtaMinutes(distanceKm);

    const locationUpdate: DealerLiveLocationUpdate = {
      coordinates: dealerCoords,
      heading: 0,
      speed: 0,
      updatedAt: new Date(),
      etaMinutes,
      distanceKm,
    };

    order.dealerLiveLocation = locationUpdate;
    order.status = 'ACCEPTED';
    order.statusHistory.push({
      status: 'ACCEPTED',
      timestamp: new Date(),
      note: 'Dealer accepted scrap pickup request.',
      updatedBy: 'DEALER',
    });

    await order.save();

    // Mark dealer busy
    await Dealer.findOneAndUpdate(
      { dealerId },
      { isBusy: true, location: { type: 'Point', coordinates: dealerCoords, address: dealer?.location?.address || 'Active Duty' } }
    );

    // Sync status & real initial location with Kabadiwala consumer backend
    await KabadiwalaClient.notifyStatusUpdate(order.orderId, dealerId, 'ACCEPTED', {
      note: 'Dealer confirmed pickup and is preparing vehicle.',
      dealerLocation: locationUpdate,
    });

    // Also send immediate location event
    await KabadiwalaClient.sendLiveLocation(orderId, dealerId, dealerCoords, 0, 0);

    // Emit live events to dealer socket room
    dealerSocketEvents.emitLiveLocation(orderId, dealerId, locationUpdate);
    dealerSocketEvents.emitOrderStatusUpdate(orderId, dealerId, 'ACCEPTED', { order });

    return order;
  }

  /**
   * Dealer rejects the pickup request
   */
  static async rejectOrder(
    orderId: string,
    dealerId: string,
    reason: string = 'Dealer declined pickup'
  ): Promise<IDealerOrder> {
    const order = await DealerOrder.findOne({ orderId, dealerId });
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    if (order.status !== 'PENDING') {
      throw new Error(`Cannot reject order in ${order.status} state.`);
    }

    order.status = 'REJECTED';
    order.rejectionReason = reason;
    order.statusHistory.push({
      status: 'REJECTED',
      timestamp: new Date(),
      note: reason,
      updatedBy: 'DEALER',
    });

    await order.save();

    // Sync with Kabadiwala
    await KabadiwalaClient.notifyStatusUpdate(order.orderId, dealerId, 'REJECTED', {
      note: reason,
    });

    dealerSocketEvents.emitOrderStatusUpdate(orderId, dealerId, 'REJECTED', { order });

    return order;
  }

  /**
   * Dealer starts travel towards customer (DEALER_EN_ROUTE)
   */
  static async startTrip(orderId: string, dealerId: string): Promise<IDealerOrder> {
    const order = await DealerOrder.findOne({ orderId, dealerId });
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    if (order.status !== 'ACCEPTED') {
      throw new Error(`Order must be ACCEPTED before starting trip (current: ${order.status}).`);
    }

    order.status = 'DEALER_EN_ROUTE';
    order.statusHistory.push({
      status: 'DEALER_EN_ROUTE',
      timestamp: new Date(),
      note: 'Dealer is driving towards customer pickup address.',
      updatedBy: 'DEALER',
    });

    await order.save();

    await KabadiwalaClient.notifyStatusUpdate(order.orderId, dealerId, 'DEALER_EN_ROUTE', {
      note: 'Dealer en route on electric scrap loader.',
    });

    dealerSocketEvents.emitOrderStatusUpdate(orderId, dealerId, 'DEALER_EN_ROUTE', { order });

    return order;
  }

  /**
   * Dealer streams live GPS location
   */
  static async updateLiveLocation(
    orderId: string,
    dealerId: string,
    coords: [number, number],
    heading: number = 0,
    speed: number = 0
  ): Promise<IDealerOrder> {
    const order = await DealerOrder.findOne({ orderId, dealerId });
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    const [pickupLng, pickupLat] = order.pickupLocation.coordinates;
    const [dealerLng, dealerLat] = coords;

    const distanceKm = calculateDistanceKm(dealerLat, dealerLng, pickupLat, pickupLng);
    const etaMinutes = estimateEtaMinutes(distanceKm);

    const locationUpdate: DealerLiveLocationUpdate = {
      coordinates: coords,
      heading,
      speed,
      updatedAt: new Date(),
      etaMinutes,
      distanceKm,
    };

    // 1. Immediately stream live location to dealer socket and sync to consumer backend
    dealerSocketEvents.emitLiveLocation(orderId, dealerId, locationUpdate);
    const syncPromise = KabadiwalaClient.sendLiveLocation(orderId, dealerId, coords, heading, speed);

    // 2. Persist to DB in parallel
    order.dealerLiveLocation = locationUpdate;
    await Promise.all([
      order.save(),
      Dealer.findOneAndUpdate(
        { dealerId },
        { location: { type: 'Point', coordinates: coords, address: 'In Transit' } }
      ),
      syncPromise,
    ]);

    return order;
  }

  /**
   * Dealer marks arrived at customer doorstep
   */
  static async markArrived(orderId: string, dealerId: string): Promise<IDealerOrder> {
    const order = await DealerOrder.findOne({ orderId, dealerId });
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    if (order.status !== 'DEALER_EN_ROUTE' && order.status !== 'ACCEPTED') {
      throw new Error(`Cannot mark arrived from ${order.status}.`);
    }

    order.status = 'ARRIVED';
    order.statusHistory.push({
      status: 'ARRIVED',
      timestamp: new Date(),
      note: 'Dealer reached customer doorstep with electronic scale.',
      updatedBy: 'DEALER',
    });

    await order.save();

    await KabadiwalaClient.notifyStatusUpdate(order.orderId, dealerId, 'ARRIVED', {
      note: 'Dealer arrived at pickup location.',
    });

    dealerSocketEvents.emitOrderStatusUpdate(orderId, dealerId, 'ARRIVED', { order });

    return order;
  }

  /**
   * Generic status update with strict transition validation and Kabadiwala notification
   */
  static async updateOrderStatus(
    orderId: string,
    dealerId: string,
    newStatus: OrderStatus,
    note?: string
  ): Promise<IDealerOrder> {
    const order = await DealerOrder.findOne({ orderId, dealerId });
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    const allowed = ALLOWED_DEALER_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(
        `Cannot transition from ${order.status} to ${newStatus}. Allowed: [${allowed?.join(', ') || 'none'}]`
      );
    }

    order.status = newStatus;
    order.statusHistory.push({
      status: newStatus,
      timestamp: new Date(),
      note: note || `Order status updated to ${newStatus}`,
      updatedBy: 'DEALER',
    });

    if (newStatus === 'ACCEPTED') {
      await Dealer.findOneAndUpdate({ dealerId }, { isBusy: true });
    } else if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(newStatus)) {
      await Dealer.findOneAndUpdate({ dealerId }, { isBusy: false });
    }

    await order.save();

    // Notify Kabadiwala backend about the status update
    await KabadiwalaClient.notifyStatusUpdate(order.orderId, dealerId, newStatus, {
      note: note || `Dealer transitioned status to ${newStatus}`,
    });

    dealerSocketEvents.emitOrderStatusUpdate(orderId, dealerId, newStatus, { order });

    return order;
  }

  /**
   * Dealer submits 4-digit OTP provided by consumer
   */
  static async verifyPickupOtp(
    orderId: string,
    dealerId: string,
    inputOtp: string
  ): Promise<IDealerOrder> {
    const order = await DealerOrder.findOne({ orderId, dealerId });
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    if (order.status !== 'ARRIVED' && order.status !== 'OTP_PENDING') {
      throw new Error(`Dealer must reach doorstep before verifying OTP (status: ${order.status}).`);
    }

    // Attempt verification via Kabadiwala Client API contract
    const isVerifiedAtKabadiwala = await KabadiwalaClient.verifyPickupOtp(
      orderId,
      dealerId,
      inputOtp.trim()
    );

    // If Kabadiwala responded true, or if local stored OTP code matches
    const isLocallyValid = order.otpCode ? order.otpCode === inputOtp.trim() : true;

    if (!isVerifiedAtKabadiwala && !isLocallyValid) {
      throw new Error('Invalid OTP. Please ask customer to show their 4-digit pickup OTP.');
    }

    order.status = 'OTP_VERIFIED';
    order.isOtpVerified = true;
    order.otpVerifiedAt = new Date();
    order.statusHistory.push({
      status: 'OTP_VERIFIED',
      timestamp: new Date(),
      note: 'OTP verified. Scrap weighing & inspection started.',
      updatedBy: 'DEALER',
    });

    await order.save();

    dealerSocketEvents.emitOrderStatusUpdate(orderId, dealerId, 'OTP_VERIFIED', { order });

    return order;
  }

  /**
   * Dealer completes order with final digital weights & payout
   */
  static async completeOrder(
    orderId: string,
    dealerId: string,
    finalWeights: FinalWeightItem[],
    finalTotalAmount?: number,
    scrapPhoto?: string
  ): Promise<IDealerOrder> {
    const order = await DealerOrder.findOne({ orderId, dealerId });
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    if (order.status !== 'OTP_VERIFIED') {
      throw new Error(`OTP must be verified before completing pickup (status: ${order.status}).`);
    }

    const calculatedTotal =
      finalTotalAmount ?? finalWeights.reduce((acc, item) => acc + item.finalAmount, 0);

    order.status = 'COMPLETED';
    order.finalWeights = finalWeights;
    order.finalTotalAmount = calculatedTotal;
    if (scrapPhoto) {
      order.scrapPhoto = scrapPhoto;
    }
    order.statusHistory.push({
      status: 'COMPLETED',
      timestamp: new Date(),
      note: `Scrap pickup completed. Paid ₹${calculatedTotal} to customer.`,
      updatedBy: 'DEALER',
    });

    await order.save();

    // Release dealer busy status
    await Dealer.findOneAndUpdate({ dealerId }, { isBusy: false });

    // Sync with Kabadiwala
    await KabadiwalaClient.notifyStatusUpdate(order.orderId, dealerId, 'COMPLETED', {
      note: 'Scrap weighed and payment settled.',
      finalWeights,
      finalTotalAmount: calculatedTotal,
      scrapPhoto,
    });

    dealerSocketEvents.emitOrderStatusUpdate(orderId, dealerId, 'COMPLETED', {
      order,
      finalTotalAmount: calculatedTotal,
    });

    return order;
  }

  /**
   * Get single order by orderId
   */
  static async getOrder(orderId: string, dealerId: string): Promise<IDealerOrder | null> {
    return DealerOrder.findOne({ orderId, dealerId });
  }

  /**
   * Get active order for dealer (if any)
   */
  static async getActiveOrderForDealer(dealerId: string): Promise<IDealerOrder | null> {
    return DealerOrder.findOne({
      dealerId,
      status: { $in: ['PENDING', 'ACCEPTED', 'DEALER_EN_ROUTE', 'ARRIVED', 'OTP_PENDING', 'OTP_VERIFIED'] },
    }).sort({ createdAt: -1 });
  }

  /**
   * Get dealer completed order history
   */
  static async getDealerOrderHistory(
    dealerId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ orders: IDealerOrder[]; total: number; pages: number }> {
    const query = { dealerId };
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      DealerOrder.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      DealerOrder.countDocuments(query),
    ]);

    return {
      orders: orders as any,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all customer reviews and ratings for a dealer
   */
  static async getDealerReviews(
    dealerId: string
  ): Promise<{ reviews: any[]; count: number }> {
    const orders = await DealerOrder.find({
      dealerId,
      'rating.score': { $exists: true },
    })
      .sort({ 'rating.createdAt': -1, updatedAt: -1 })
      .select('orderId customerName pickupAddress rating finalTotalAmount estimatedTotalAmount createdAt updatedAt')
      .lean();

    const reviews = orders.map((o: any) => ({
      orderId: o.orderId,
      customerName: o.customerName || 'Customer',
      pickupAddress: o.pickupAddress,
      amountPaid: o.finalTotalAmount || o.estimatedTotalAmount,
      score: o.rating?.score || 5,
      feedback: o.rating?.feedback || '',
      tags: o.rating?.tags || [],
      date: o.rating?.createdAt || o.updatedAt || o.createdAt,
    }));

    return {
      reviews,
      count: reviews.length,
    };
  }
}
