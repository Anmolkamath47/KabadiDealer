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

export interface DealerProfile {
  dealerId: string;
  phone: string;
  businessName: string;
  contactPerson: string;
  profileImage?: string;
  email?: string;
  isProfileCompleted?: boolean;
  isOnline: boolean;
  isBusy: boolean;
  rating: number;
  totalRatings: number;
  activeRadiusKm: number;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    address: string;
    landmark?: string;
  };
  vehicleType: string;
  vehicleNumber: string;
  scrapRates: ScrapRateItem[];
}

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

export interface DealerLiveLocation {
  coordinates: [number, number]; // [lng, lat]
  heading?: number;
  speed?: number;
  updatedAt: string;
  etaMinutes?: number;
  distanceKm?: number;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  updatedBy?: 'CONSUMER' | 'DEALER' | 'SYSTEM';
}

export interface DealerOrder {
  _id?: string;
  orderId: string;
  dealerId: string;
  consumerId: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  pickupLocation: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  distanceKm: number;
  selectedMaterials: SelectedMaterialItem[];
  estimatedTotalAmount: number;
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  otpCode?: string;
  isOtpVerified: boolean;
  otpVerifiedAt?: string;
  finalWeights?: FinalWeightItem[];
  finalTotalAmount?: number;
  dealerLiveLocation?: DealerLiveLocation;
  expiresAt: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
