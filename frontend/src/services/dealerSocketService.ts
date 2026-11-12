import { io, Socket } from 'socket.io-client';
import { OrderStatus, DealerLiveLocation, DealerOrder } from '../types';

const isPrivateNetworkHost = (host: string): boolean => {
  return /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host);
};

const resolveSocketUrl = (): string => {
  const envUrl = import.meta.env.VITE_SOCKET_URL;

  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
        return envUrl.replace(/\/$/, '');
      }
      if (typeof window !== 'undefined' && window.location) {
        const currentHost = window.location.hostname;
        if (isPrivateNetworkHost(currentHost)) {
          parsed.hostname = currentHost;
          return parsed.toString().replace(/\/$/, '');
        }
      }
      return envUrl.replace(/\/$/, '');
    } catch {
      return envUrl;
    }
  }

  if (typeof window !== 'undefined' && window.location) {
    const currentHost = window.location.hostname;
    if (isPrivateNetworkHost(currentHost)) {
      return `http://${currentHost}:5001`;
    }
    if (window.location.protocol === 'https:' || currentHost.includes('vercel.app')) {
      return 'https://kabadidealer-backend.onrender.com';
    }
  }

  return 'http://localhost:5001';
};

const SOCKET_URL = resolveSocketUrl();

class DealerSocketService {
  private socket: Socket | null = null;
  private currentDealerId: string | null = null;
  private currentOrderId: string | null = null;

  connect(dealerId?: string, token?: string) {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const authToken = token || localStorage.getItem('kabadidealer_token') || '';
    if (dealerId) this.currentDealerId = dealerId;

    this.socket = io(SOCKET_URL, {
      auth: { token: authToken },
      query: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('⚡ Dealer Socket Connected:', this.socket?.id);
      if (this.currentDealerId) {
        this.socket?.emit('join:dealer', { dealerId: this.currentDealerId });
      }
      if (this.currentOrderId) {
        this.socket?.emit('join:order', { orderId: this.currentOrderId });
      }
    });

    return this.socket;
  }

  joinOrderRoom(orderId: string) {
    this.currentOrderId = orderId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('join:order', { orderId });
    }
  }

  onIncomingPickup(callback: (order: DealerOrder) => void) {
    if (!this.socket) this.connect();
    this.socket?.on('pickup:new', callback);
    return () => {
      this.socket?.off('pickup:new', callback);
    };
  }

  onOrderStatus(callback: (data: { orderId: string; status: OrderStatus; order?: any }) => void) {
    if (!this.socket) this.connect();
    this.socket?.on('pickup:status', callback);
    this.socket?.on('pickup:cancelled', callback);
    return () => {
      this.socket?.off('pickup:status', callback);
      this.socket?.off('pickup:cancelled', callback);
    };
  }

  onLiveLocation(callback: (data: DealerLiveLocation & { orderId: string }) => void) {
    if (!this.socket) this.connect();
    this.socket?.on('dealer:location', callback);
    return () => {
      this.socket?.off('dealer:location', callback);
    };
  }

  sendLiveLocation(
    orderId: string,
    dealerId: string,
    coordinates: [number, number],
    heading: number = 0,
    speed: number = 0
  ): boolean {
    if (this.socket && this.socket.connected) {
      this.socket.emit('dealer:location:ping', {
        orderId,
        dealerId,
        coordinates,
        heading,
        speed,
      });
      return true;
    }
    return false;
  }

  onOrderRated(
    callback: (data: {
      orderId: string;
      dealerId?: string;
      score: number;
      feedback?: string;
      tags?: string[];
      rating?: number;
      totalRatings?: number;
      createdAt?: string;
    }) => void
  ) {
    if (!this.socket) this.connect();
    this.socket?.on('pickup:rated', callback);
    return () => {
      this.socket?.off('pickup:rated', callback);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const dealerSocketService = new DealerSocketService();
