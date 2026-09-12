import React, { createContext, useContext, useState, useEffect } from 'react';
import { DealerProfile } from '../types';
import { dealerAuthService } from '../services/dealerAuthService';
import { dealerOrderService } from '../services/dealerOrderService';
import { dealerSocketService } from '../services/dealerSocketService';

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
  toggleOnlineStatus: (status: boolean) => Promise<void>;
  updateProfile: (updates: any) => Promise<DealerProfile>;
  updateLocation: (coords: [number, number], address?: string, landmark?: string) => Promise<void>;
  logout: () => void;
}

const DealerAuthContext = createContext<DealerAuthContextType | undefined>(undefined);

export const DealerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dealer, setDealer] = useState<DealerProfile | null>(() => {
    const saved = localStorage.getItem('kabadidealer_dealer');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('kabadidealer_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('kabadidealer_token');
      if (storedToken) {
        try {
          const profile = await dealerAuthService.getMe();
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

  const requestOtp = async (phone: string) => {
    return dealerAuthService.requestOtp(phone);
  };

  const verifyOtpAndLogin = async (
    phone: string,
    otp: string,
    businessName?: string,
    contactPerson?: string
  ): Promise<{ isNewDealer: boolean; isProfileCompleted: boolean; dealer: DealerProfile }> => {
    setIsLoading(true);
    try {
      const data = await dealerAuthService.verifyOtp(phone, otp, businessName, contactPerson);
      setToken(data.accessToken);
      setDealer(data.dealer);
      localStorage.setItem('kabadidealer_token', data.accessToken);
      localStorage.setItem('kabadidealer_refresh_token', data.refreshToken);
      localStorage.setItem('kabadidealer_dealer', JSON.stringify(data.dealer));

      dealerSocketService.connect(data.dealer.dealerId, data.accessToken);
      setIsLoading(false);
      return {
        isNewDealer: data.isNewDealer,
        isProfileCompleted: !!data.dealer.isProfileCompleted,
        dealer: data.dealer,
      };
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const toggleOnlineStatus = async (status: boolean) => {
    await dealerOrderService.setOnlineStatus(status);
    if (dealer) {
      const updated = { ...dealer, isOnline: status };
      setDealer(updated);
      localStorage.setItem('kabadidealer_dealer', JSON.stringify(updated));
    }
  };

  const updateProfile = async (updates: any): Promise<DealerProfile> => {
    const updated = await dealerOrderService.updateProfile(updates);
    setDealer(updated);
    localStorage.setItem('kabadidealer_dealer', JSON.stringify(updated));
    return updated;
  };

  const updateLocation = async (coords: [number, number], address?: string, landmark?: string) => {
    await dealerOrderService.updateLocation(coords, address, landmark);
    if (dealer) {
      const updated = {
        ...dealer,
        location: {
          ...dealer.location,
          coordinates: coords,
          address: address || dealer.location.address,
          landmark: landmark || dealer.location.landmark,
        },
      };
      setDealer(updated);
      localStorage.setItem('kabadidealer_dealer', JSON.stringify(updated));
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
