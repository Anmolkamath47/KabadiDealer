import React, { createContext, useContext, useState, useEffect } from 'react';
import { DealerOrder, FinalWeightItem, OrderStatus } from '../types';
import { dealerOrderService } from '../services/dealerOrderService';
import { dealerSocketService } from '../services/dealerSocketService';
import { soundService } from '../services/soundService';
import { useDealerAuth } from './DealerAuthContext';

interface DealerOrderContextType {
  activeOrder: DealerOrder | null;
  incomingRequest: DealerOrder | null;
  orderHistory: DealerOrder[];
  isLoading: boolean;
  isAlarmPlaying: boolean;
  toastMessage: string | null;
  clearToast: () => void;
  acceptRequest: (orderId: string, coords?: [number, number]) => Promise<void>;
  rejectRequest: (orderId: string, reason?: string) => Promise<void>;
  startTrip: (orderId: string) => Promise<void>;
  sendLiveLocation: (coords: [number, number], heading?: number, speed?: number) => Promise<void>;
  markArrived: (orderId: string) => Promise<void>;
  verifyOtp: (orderId: string, otp: string) => Promise<boolean>;
  completeOrder: (orderId: string, finalWeights: FinalWeightItem[], finalTotal?: number, scrapPhoto?: string) => Promise<void>;
  fetchActiveOrder: () => Promise<DealerOrder | null>;
  fetchHistory: () => Promise<void>;
  dismissIncomingAlert: () => void;
  stopAlarm: () => void;
  setActiveOrder: (order: DealerOrder | null) => void;
}

const DealerOrderContext = createContext<DealerOrderContextType | undefined>(undefined);

export const DealerOrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { dealer, isAuthenticated } = useDealerAuth();

  const [activeOrder, setActiveOrder] = useState<DealerOrder | null>(() => {
    const saved = localStorage.getItem('kabadidealer_active_order');
    return saved ? JSON.parse(saved) : null;
  });
  const [incomingRequest, setIncomingRequest] = useState<DealerOrder | null>(null);
  const [orderHistory, setOrderHistory] = useState<DealerOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const clearToast = () => setToastMessage(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  useEffect(() => {
    if (activeOrder) {
      localStorage.setItem('kabadidealer_active_order', JSON.stringify(activeOrder));
    } else {
      localStorage.removeItem('kabadidealer_active_order');
    }
  }, [activeOrder]);

  const stopAlarm = () => {
    soundService.stopSiren();
    setIsAlarmPlaying(false);
  };

  const fetchActiveOrder = async (): Promise<DealerOrder | null> => {
    try {
      const order = await dealerOrderService.getActiveOrder();
      if (order) {
        if (order.status === 'PENDING') {
          setIncomingRequest((prev) => {
            if (!prev || prev.orderId !== order.orderId) {
              setIsAlarmPlaying(true);
              soundService.startSiren();
              showToast(`🚨 New Scrap Pickup Request from ${order.customerName || 'Customer'}!`);
              return order;
            }
            return prev;
          });
          setActiveOrder(null);
        } else {
          setActiveOrder(order);
          setIncomingRequest(null);
          stopAlarm();
        }
      } else {
        setActiveOrder(null);
      }
      return order;
    } catch {
      return null;
    }
  };

  // Socket.IO listeners & Real-Time Incoming Request Polling Backup
  useEffect(() => {
    if (!isAuthenticated || !dealer) return;

    dealerSocketService.connect(dealer.dealerId);

    // Initial check for active or pending pickup
    fetchActiveOrder();

    // 1. Incoming Pickup Request Alert (Plays siren + opens modal)
    const cleanupIncoming = dealerSocketService.onIncomingPickup((order) => {
      console.log('🚨 INCOMING SCRAP PICKUP ALERT RECEIVED:', order);
      setIncomingRequest(order);
      setIsAlarmPlaying(true);
      soundService.startSiren();
      showToast(`🚨 New Scrap Pickup Request from ${order.customerName || 'Customer'}!`);
    });

    // 2. Order Status Update
    const cleanupStatus = dealerSocketService.onOrderStatus((data) => {
      console.log('📡 Dealer socket order status update:', data);

      setActiveOrder((prev) => {
        if (prev && prev.orderId === data.orderId) {
          return {
            ...prev,
            status: data.status,
            ...(data.order ? data.order : {}),
          };
        }
        return prev;
      });

      if (data.status === 'EXPIRED') {
        setIncomingRequest((prev) => (prev?.orderId === data.orderId ? null : prev));
        stopAlarm();
        showToast('⏰ Pickup request expired.');
      }
    });

    // 3. Live Location Updates from Server / Peers
    const cleanupLocation = dealerSocketService.onLiveLocation((data) => {
      setActiveOrder((prev) => {
        if (prev && prev.orderId === data.orderId) {
          return {
            ...prev,
            dealerLiveLocation: {
              coordinates: data.coordinates,
              heading: data.heading,
              speed: data.speed,
              updatedAt: (data.updatedAt as any) || new Date().toISOString(),
              etaMinutes: data.etaMinutes,
              distanceKm: data.distanceKm,
            },
          };
        }
        return prev;
      });
    });

    // 4. Live Customer Rating & Review Notification
    const cleanupRated = dealerSocketService.onOrderRated((data) => {
      console.log('⭐ Customer rating received via socket:', data);
      showToast(`⭐ Customer gave you a ${data.score}-Star Rating & Review!`);
      setActiveOrder((prev) => {
        if (prev && prev.orderId === data.orderId) {
          const updated = {
            ...prev,
            rating: {
              score: data.score,
              feedback: data.feedback,
              tags: data.tags,
              createdAt: data.createdAt || new Date().toISOString(),
            },
          };
          localStorage.setItem('kabadidealer_active_order', JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
      fetchHistory();
    });

    // 5. Cross-tab BroadcastChannel listener for instant demo sync
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('kabadiwala_cross_app_sync');
      channel.onmessage = (event) => {
        if (event.data?.type === 'KABADI_RATING_SUBMITTED' && event.data.rating) {
          const r = event.data.rating;
          console.log('⭐ Customer rating received via cross-tab channel:', r);
          showToast(`⭐ Customer gave you a ${r.score}-Star Rating & Review!`);
          setActiveOrder((prev) => {
            if (prev && prev.orderId === r.orderId) {
              const updated = {
                ...prev,
                rating: {
                  score: r.score,
                  feedback: r.feedback,
                  tags: r.tags,
                  createdAt: r.createdAt || new Date().toISOString(),
                },
              };
              localStorage.setItem('kabadidealer_active_order', JSON.stringify(updated));
              return updated;
            }
            return prev;
          });
          fetchHistory();
        }
      };
    } catch {}

    // 6. Fallback poll interval every 3 seconds for instant detection
    const pollInterval = setInterval(() => {
      fetchActiveOrder();
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      cleanupIncoming();
      cleanupStatus();
      cleanupLocation();
      cleanupRated();
      channel?.close();
      stopAlarm();
    };
  }, [isAuthenticated, dealer?.dealerId]);

  // Join order room for socket tracking
  useEffect(() => {
    if (activeOrder?.orderId) {
      dealerSocketService.joinOrderRoom(activeOrder.orderId);
    }
  }, [activeOrder?.orderId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await dealerOrderService.getOrderHistory();
      setOrderHistory(res.orders);
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  const acceptRequest = async (orderId: string, coords?: [number, number]) => {
    stopAlarm();
    setIsLoading(true);
    try {
      let acceptCoords = coords;
      if (!acceptCoords && dealer?.location?.coordinates) {
        acceptCoords = dealer.location.coordinates;
      }
      const order = await dealerOrderService.acceptOrder(orderId, acceptCoords);
      setActiveOrder(order);
      setIncomingRequest(null);
      setIsLoading(false);
      showToast('✅ Order Accepted! Ready to start navigation.');
    } catch (err: any) {
      setIsLoading(false);
      throw err;
    }
  };

  const rejectRequest = async (orderId: string, reason?: string) => {
    stopAlarm();
    setIsLoading(true);
    try {
      await dealerOrderService.rejectOrder(orderId, reason);
      if (incomingRequest?.orderId === orderId) {
        setIncomingRequest(null);
      }
      setIsLoading(false);
      showToast('Order rejected.');
    } catch (err: any) {
      setIsLoading(false);
      throw err;
    }
  };

  const startTrip = async (orderId: string) => {
    setIsLoading(true);
    try {
      const order = await dealerOrderService.startTrip(orderId);
      setActiveOrder(order);
      setIsLoading(false);
      showToast('🚚 Trip started! Live GPS sharing active.');
    } catch (err: any) {
      setIsLoading(false);
      throw err;
    }
  };

  const sendLiveLocation = async (coords: [number, number], heading: number = 0, speed: number = 0) => {
    if (!activeOrder) return;
    // Optimistically update activeOrder live location
    setActiveOrder((prev) => {
      if (!prev || prev.orderId !== activeOrder.orderId) return prev;
      return {
        ...prev,
        dealerLiveLocation: {
          coordinates: coords,
          heading,
          speed,
          updatedAt: new Date().toISOString(),
          etaMinutes: prev.dealerLiveLocation?.etaMinutes,
          distanceKm: prev.dealerLiveLocation?.distanceKm,
        },
      };
    });

    try {
      await dealerOrderService.sendLiveLocation(activeOrder.orderId, coords, heading, speed);
    } catch {
      // Ignore background ping errors
    }
  };

  const markArrived = async (orderId: string) => {
    setIsLoading(true);
    try {
      const order = await dealerOrderService.markArrived(orderId);
      setActiveOrder(order);
      setIsLoading(false);
      showToast('📍 Arrived at doorstep! Please collect 4-digit OTP from customer.');
    } catch (err: any) {
      setIsLoading(false);
      throw err;
    }
  };

  const verifyOtp = async (orderId: string, otp: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const order = await dealerOrderService.verifyOtp(orderId, otp);
      setActiveOrder(order);
      setIsLoading(false);
      showToast('✅ OTP Verified! Please weigh scrap items on digital scale.');
      return true;
    } catch (err: any) {
      setIsLoading(false);
      throw err;
    }
  };

  const completeOrder = async (
    orderId: string,
    finalWeights: FinalWeightItem[],
    finalTotal?: number,
    scrapPhoto?: string
  ) => {
    setIsLoading(true);
    try {
      const order = await dealerOrderService.completeOrder(orderId, finalWeights, finalTotal, scrapPhoto);
      setActiveOrder(order);
      setIsLoading(false);
      showToast('💰 Pickup Completed! Payment receipt & scrap photo saved.');
    } catch (err: any) {
      setIsLoading(false);
      throw err;
    }
  };

  const dismissIncomingAlert = () => {
    stopAlarm();
    setIncomingRequest(null);
  };

  return (
    <DealerOrderContext.Provider
      value={{
        activeOrder,
        incomingRequest,
        orderHistory,
        isLoading,
        isAlarmPlaying,
        toastMessage,
        clearToast,
        acceptRequest,
        rejectRequest,
        startTrip,
        sendLiveLocation,
        markArrived,
        verifyOtp,
        completeOrder,
        fetchActiveOrder,
        fetchHistory,
        dismissIncomingAlert,
        stopAlarm,
        setActiveOrder,
      }}
    >
      {children}
    </DealerOrderContext.Provider>
  );
};

export const useDealerOrder = () => {
  const context = useContext(DealerOrderContext);
  if (!context) {
    throw new Error('useDealerOrder must be used within a DealerOrderProvider');
  }
  return context;
};
