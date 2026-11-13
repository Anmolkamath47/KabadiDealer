import mongoose, { Document, Schema } from 'mongoose';
import { ScrapRateItem } from '../types/index.js';

export interface IDealer extends Document {
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
  refreshTokenHash?: string;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScrapRateItemSchema = new Schema<ScrapRateItem>(
  {
    category: {
      type: String,
      required: true,
      enum: ['Paper', 'Plastic', 'Metal', 'Aluminium', 'Copper', 'Brass', 'E-Waste', 'Cardboard', 'Glass', 'Other'],
    },
    name: { type: String, required: true },
    unit: { type: String, enum: ['kg', 'piece'], default: 'kg' },
    pricePerKg: { type: Number, required: true },
    minQuantityKg: { type: Number, default: 1 },
    icon: { type: String },
  },
  { _id: false }
);

const DealerSchema = new Schema<IDealer>(
  {
    dealerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    businessName: {
      type: String,
      trim: true,
      default: 'Scrap Collection Center',
    },
    contactPerson: {
      type: String,
      trim: true,
      default: 'Partner Dealer',
    },
    profileImage: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    isProfileCompleted: {
      type: Boolean,
      default: false,
    },
    isOnline: {
      type: Boolean,
      default: true,
      index: true,
    },
    isBusy: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 4.9,
      min: 1,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 142,
    },
    activeRadiusKm: {
      type: Number,
      default: 15,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
        default: [77.2150, 28.6250], // Connaught Place Delhi coordinates
      },
      address: {
        type: String,
        default: 'Plot 44, Recycling Estate, Barakhamba, Central Delhi - 110001',
      },
      landmark: {
        type: String,
        default: 'Near Metro Pillar 12',
      },
    },
    vehicleType: {
      type: String,
      default: 'Electric Mini Loader 800kg',
    },
    vehicleNumber: {
      type: String,
      default: 'DL-01-EV-9821',
    },
    scrapRates: [ScrapRateItemSchema],
    refreshTokenHash: {
      type: String,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

DealerSchema.index({ 'location.coordinates': '2dsphere' });

export const Dealer = mongoose.model<IDealer>('Dealer', DealerSchema);
