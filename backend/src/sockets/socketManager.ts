import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';
import { OrderStatus, DealerLiveLocationUpdate } from '../types/index.js';

let ioInstance: Server | null = null;

export const initSocketServer = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token && typeof token === 'string') {
      try {
        const payload = verifyAccessToken(token);
        (socket as any).dealerId = payload.dealerId;
        (socket as any).phone = payload.phone;
      } catch {
        console.warn('⚠️ Dealer socket connection with invalid/unverified token.');
      }
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    const dealerId = (socket as any).dealerId;
    console.log(`🔌 Dealer Socket connected: ${socket.id} (Dealer: ${dealerId || 'Anonymous'})`);

    if (dealerId) {
      socket.join(`dealer:${dealerId}`);
      socket.join('dealers:all');
    }

    socket.on('join:dealer', ({ dealerId: dId }: { dealerId: string }) => {
      if (dId) {
        socket.join(`dealer:${dId}`);
        socket.join('dealers:all');
        console.log(`🚛 Socket ${socket.id} joined dealer room: dealer:${dId}`);
      }
    });

    socket.on('join:order', ({ orderId }: { orderId: string }) => {
      if (orderId) {
        socket.join(`order:${orderId}`);
        console.log(`📦 Dealer socket ${socket.id} joined order room: ${orderId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Dealer socket disconnected: ${socket.id} (${reason})`);
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = (): Server => {
  if (!ioInstance) {
    throw new Error('Dealer Socket.IO is not initialized! Call initSocketServer first.');
  }
  return ioInstance;
};

export const dealerSocketEvents = {
  /**
   * Broadcast urgent new incoming pickup alert to dealer with sound siren trigger
   */
  emitIncomingPickupAlert: (dealerId: string, orderData: any) => {
    if (!ioInstance) return;
    console.log(`🚨 Emitting pickup:new to room dealer:${dealerId}`);
    ioInstance.to(`dealer:${dealerId}`).to('dealers:all').emit('pickup:new', {
      orderId: orderData.orderId,
      dealerId: orderData.dealerId,
      consumerId: orderData.consumerId,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      pickupAddress: orderData.pickupAddress,
      pickupLocation: orderData.pickupLocation,
      distanceKm: orderData.distanceKm,
      selectedMaterials: orderData.selectedMaterials,
      estimatedTotalAmount: orderData.estimatedTotalAmount,
      expiresAt: orderData.expiresAt,
      createdAt: orderData.createdAt,
    });
  },

  /**
   * Broadcast order status update
   */
  emitOrderStatusUpdate: (
    orderId: string,
    dealerId: string,
    status: OrderStatus,
    extraData?: any
  ) => {
    if (!ioInstance) return;
    const payload = {
      orderId,
      dealerId,
      status,
      timestamp: new Date(),
      ...extraData,
    };

    ioInstance.to(`order:${orderId}`).to(`dealer:${dealerId}`).emit('pickup:status', payload);

    if (status === 'ACCEPTED') {
      ioInstance.to(`order:${orderId}`).to(`dealer:${dealerId}`).emit('pickup:accepted', payload);
    } else if (status === 'REJECTED') {
      ioInstance.to(`order:${orderId}`).to(`dealer:${dealerId}`).emit('pickup:rejected', payload);
    } else if (status === 'ARRIVED') {
      ioInstance.to(`order:${orderId}`).to(`dealer:${dealerId}`).emit('pickup:arrived', payload);
    } else if (status === 'OTP_VERIFIED') {
      ioInstance.to(`order:${orderId}`).to(`dealer:${dealerId}`).emit('pickup:otp_verified', payload);
    } else if (status === 'COMPLETED') {
      ioInstance.to(`order:${orderId}`).to(`dealer:${dealerId}`).emit('pickup:completed', payload);
    } else if (status === 'EXPIRED') {
      ioInstance.to(`order:${orderId}`).to(`dealer:${dealerId}`).emit('pickup:expired', payload);
    }
  },

  /**
   * Stream live dealer GPS location
   */
  emitLiveLocation: (
    orderId: string,
    dealerId: string,
    locationData: DealerLiveLocationUpdate
  ) => {
    if (!ioInstance) return;
    ioInstance.to(`order:${orderId}`).to(`dealer:${dealerId}`).emit('dealer:location', {
      orderId,
      dealerId,
      coordinates: locationData.coordinates,
      heading: locationData.heading || 0,
      speed: locationData.speed || 0,
      etaMinutes: locationData.etaMinutes,
      distanceKm: locationData.distanceKm,
      updatedAt: locationData.updatedAt,
    });
  },

  /**
   * Broadcast customer rating and review live to dealer
   */
  emitOrderRated: (dealerId: string, ratingData: any) => {
    if (!ioInstance) return;
    console.log(`⭐ Emitting pickup:rated to dealer:${dealerId}`);
    ioInstance.to(`dealer:${dealerId}`).to('dealers:all').emit('pickup:rated', ratingData);
    if (ratingData.orderId) {
      ioInstance.to(`order:${ratingData.orderId}`).emit('pickup:rated', ratingData);
    }
  },
};
