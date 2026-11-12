import React, { createContext, useContext, useState, useEffect } from 'react';
import { DealerProfile, ScrapRateItem } from '../types';
import { dealerAuthService } from '../services/dealerAuthService';
import { dealerOrderService } from '../services/dealerOrderService';
import { dealerSocketService } from '../services/dealerSocketService';
import { crossOriginSync } from '../services/crossOriginSyncService';
import { reconcileCityCoordinates } from '../utils/geoUtils';

export const DEFAULT_EWASTE_ITEMS: ScrapRateItem[] = [
  { category: 'E-Waste', name: 'Old Electronics & CPU Boards', unit: 'kg', pricePerKg: 55, minQuantityKg: 1, icon: 'cpu' },
  { category: 'E-Waste', name: 'Broken Laptops & Computers', unit: 'piece', pricePerKg: 250, minQuantityKg: 1, icon: 'laptop' },
  { category: 'E-Waste', name: 'Old Mobile Phones & Tablets', unit: 'piece', pricePerKg: 120, minQuantityKg: 1, icon: 'smartphone' },
];

export const prioritizeEWasteRates = (rates: ScrapRateItem[]): ScrapRateItem[] => {
  if (!rates || !Array.isArray(rates)) return [];
  let list = [...rates];
  for (const item of DEFAULT_EWASTE_ITEMS) {
    if (!list.some((r) => r.name.toLowerCase() === item.name.toLowerCase())) {
      list.push(item);
    }
  }
  const ewaste = list.filter((r) => r.category === 'E-Waste');
  const others = list.filter((r) => r.category !== 'E-Waste');
  return [...ewaste, ...others];
};

interface DealerAuthContextType {
  dealer: DealerProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requestOtp: (phone: string) => Promise<{ message: string; demoOtp?: string }>;
  verifyOtpAndLogin: (
    phone: string,
    otp: string,
    businessName?: string,
    contactPerson?: string
  ) => Promise<{ isNewDealer: boolean; isProfileCompleted: boolean; dealer: DealerProfile }>;
  loginWithPhone: (
    phone: string,
    businessName?: string,
    contactPerson?: string
  ) => Promise<{ isNewDealer: boolean; isProfileCompleted: boolean; dealer: DealerProfile }>;
  toggleOnlineStatus: (status: boolean) => Promise<void>;
  updateProfile: (updates: any) => Promise<DealerProfile>;
  updateLocation: (coords: [number, number], address?: string, landmark?: string) => Promise<void>;
  logout: () => void;
}

const DealerAuthContext = createContext<DealerAuthContextType | undefined>(undefined);

export const DealerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dealer, setDealer] = useState<DealerProfile | null>(() => {
    const saved = localStorage.getItem('kabadidealer_dealer');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (parsed?.scrapRates) {
        parsed.scrapRates = prioritizeEWasteRates(parsed.scrapRates);
      }
      if (parsed?.location?.address) {
        const healed = reconcileCityCoordinates(parsed.location.address, parsed.location.coordinates);
        if (parsed.location.coordinates && (parsed.location.coordinates[0] !== healed[0] || parsed.location.coordinates[1] !== healed[1])) {
          parsed.location.coordinates = healed;
        }
      }
      localStorage.setItem('kabadidealer_dealer', JSON.stringify(parsed));
      return parsed;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('kabadidealer_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('kabadidealer_token');
      if (storedToken) {
        try {
          const profile = await dealerAuthService.getMe();
          if (profile?.scrapRates) {
            profile.scrapRates = prioritizeEWasteRates(profile.scrapRates);
          }
          setDealer(profile);
          localStorage.setItem('kabadidealer_dealer', JSON.stringify(profile));
          dealerSocketService.connect(profile.dealerId, storedToken);
        } catch (error: any) {
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            console.warn('Dealer session invalid or expired, logging out');
            logout();
          } else {
            console.warn('Network issue during dealer auth check, preserving session');
            const saved = localStorage.getItem('kabadidealer_dealer');
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                if (parsed?.scrapRates) {
                  parsed.scrapRates = prioritizeEWasteRates(parsed.scrapRates);
                }
                setDealer(parsed);
                dealerSocketService.connect(parsed.dealerId, storedToken);
              } catch {}
            }
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Continuously sync dealer presence with cross-origin consumer app
  useEffect(() => {
    if (dealer) {
      crossOriginSync.syncDealer(dealer);
    }
  }, [dealer]);

  const requestOtp = async (phone: string) => {
    return dealerAuthService.requestOtp(phone);
  };

  const verifyOtpAndLogin = async (
    phone: string,
    otp: string,
    businessName?: string,
    contactPerson?: string
  ): Promise<{ isNewDealer: boolean; isProfileCompleted: boolean; dealer: DealerProfile }> => {
    const data = await dealerAuthService.verifyOtp(phone, otp, businessName, contactPerson);
    if (data?.dealer?.scrapRates) {
      data.dealer.scrapRates = prioritizeEWasteRates(data.dealer.scrapRates);
    }
    setToken(data.accessToken);
    setDealer(data.dealer);
    localStorage.setItem('kabadidealer_token', data.accessToken);
    localStorage.setItem('kabadidealer_refresh_token', data.refreshToken);
    localStorage.setItem('kabadidealer_dealer', JSON.stringify(data.dealer));

    try {
      dealerSocketService.connect(data.dealer.dealerId, data.accessToken);
    } catch (socketErr) {
      console.warn('Socket connection deferred:', socketErr);
    }

    broadcastDealerEvent({
      type: 'DEALER_ONLINE',
      dealer: data.dealer,
    }, data.dealer);

    return {
      isNewDealer: data.isNewDealer,
      isProfileCompleted: !!data.dealer.isProfileCompleted,
      dealer: data.dealer,
    };
  };

  const loginWithPhone = async (
    phone: string,
    businessName?: string,
    contactPerson?: string
  ): Promise<{ isNewDealer: boolean; isProfileCompleted: boolean; dealer: DealerProfile }> => {
    let demoOtp = '1234';
    try {
      const res = await dealerAuthService.requestOtp(phone);
      if (res?.demoOtp) {
        demoOtp = res.demoOtp;
      }
    } catch (e) {
      console.warn('Silent OTP fallback on dealer login:', e);
    }
    return verifyOtpAndLogin(phone, demoOtp, businessName, contactPerson);
  };

  const broadcastDealerEvent = (event: any, currentDealer?: DealerProfile | null) => {
    if (typeof window === 'undefined') return;
    try {
      const channel = new BroadcastChannel('kabadiwala_cross_app_sync');
      channel.postMessage({ ...event, timestamp: Date.now() });
      channel.close();
    } catch {
      // BroadcastChannel unsupported or restricted
    }

    const target = event.dealer || currentDealer;
    if (target) {
      crossOriginSync.syncDealer(target);
    }
  };

  const toggleOnlineStatus = async (status: boolean) => {
    await dealerOrderService.setOnlineStatus(status);
    if (dealer) {
      const updated = { ...dealer, isOnline: status };
      setDealer(updated);
      localStorage.setItem('kabadidealer_dealer', JSON.stringify(updated));
      broadcastDealerEvent({
        type: 'DEALER_STATUS_CHANGED',
        dealerId: dealer.dealerId,
        isOnline: status,
        location: dealer.location,
      }, updated);
    }
  };

  const updateProfile = async (updates: any): Promise<DealerProfile> => {
    const updated = await dealerOrderService.updateProfile(updates);
    setDealer(updated);
    localStorage.setItem('kabadidealer_dealer', JSON.stringify(updated));
    broadcastDealerEvent({
      type: 'DEALER_PROFILE_UPDATED',
      dealer: updated,
    }, updated);
    return updated;
  };

  const updateLocation = async (coords: [number, number], address?: string, landmark?: string) => {
    const targetAddress = address || dealer?.location?.address || '';
    const healedCoords = reconcileCityCoordinates(targetAddress, coords);

    await dealerOrderService.updateLocation(healedCoords, targetAddress, landmark);
    if (dealer) {
      const updated = {
        ...dealer,
        location: {
          ...dealer.location,
          coordinates: healedCoords,
          address: targetAddress || dealer.location?.address,
          landmark: landmark || dealer.location?.landmark,
        },
      };
      setDealer(updated);
      localStorage.setItem('kabadidealer_dealer', JSON.stringify(updated));
      broadcastDealerEvent({
        type: 'DEALER_LOCATION_UPDATED',
        dealerId: dealer.dealerId,
        isOnline: dealer.isOnline,
        location: updated.location,
      }, updated);
    }
  };

  const logout = () => {
    setToken(null);
    setDealer(null);
    localStorage.removeItem('kabadidealer_token');
    localStorage.removeItem('kabadidealer_refresh_token');
    localStorage.removeItem('kabadidealer_dealer');
    dealerSocketService.disconnect();
  };

  return (
    <DealerAuthContext.Provider
      value={{
        dealer,
        token,
        isAuthenticated: !!token,
        isLoading,
        requestOtp,
        verifyOtpAndLogin,
        loginWithPhone,
        toggleOnlineStatus,
        updateProfile,
        updateLocation,
        logout,
      }}
    >
      {children}
    </DealerAuthContext.Provider>
  );
};

export const useDealerAuth = () => {
  const context = useContext(DealerAuthContext);
  if (!context) {
    throw new Error('useDealerAuth must be used within a DealerAuthProvider');
  }
  return context;
};
