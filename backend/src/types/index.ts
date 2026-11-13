export type ScrapCategory =
  | 'Paper'
  | 'Plastic'
  | 'Metal'
  | 'Aluminium'
  | 'Copper'
  | 'Brass'
  | 'E-Waste'
  | 'Cardboard'
  | 'Glass'
  | 'Other';

export interface ScrapRateItem {
  category: ScrapCategory;
  name: string;
  unit: 'kg' | 'piece';
  pricePerKg: number;
  minQuantityKg?: number;
  icon?: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DEALER_EN_ROUTE'
  | 'ARRIVED'
  | 'OTP_PENDING'
  | 'OTP_VERIFIED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'EXPIRED';

export interface SelectedMaterialItem {
  category: ScrapCategory;
  name: string;
  unit: 'kg' | 'piece';
  pricePerKg: number;
  estimatedWeightKg: number;
  calculatedAmount: number;
}

export interface FinalWeightItem {
  category: ScrapCategory;
  name: string;
  unit: 'kg' | 'piece';
  pricePerKg: number;
  actualWeightKg: number;
  finalAmount: number;
}

export interface DealerLiveLocationUpdate {
  coordinates: [number, number]; // [lng, lat]
  heading?: number;
  speed?: number;
  updatedAt: Date;
  etaMinutes?: number;
  distanceKm?: number;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
  updatedBy?: 'CONSUMER' | 'DEALER' | 'SYSTEM';
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  statusCode?: number;
}
