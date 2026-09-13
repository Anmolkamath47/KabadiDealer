import mongoose, { Document, Schema } from 'mongoose';
import {
  OrderStatus,
  SelectedMaterialItem,
  FinalWeightItem,
  StatusHistoryEntry,
  DealerLiveLocationUpdate,
} from '../types/index.js';

export interface IDealerOrder extends Document {
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
  otpVerifiedAt?: Date;
  finalWeights?: FinalWeightItem[];
  finalTotalAmount?: number;
  scrapPhoto?: string;
  dealerLiveLocation?: DealerLiveLocationUpdate;
  rating?: {
    score: number;
    feedback?: string;
    tags?: string[];
    createdAt?: Date;
  };
  expiresAt: Date;
  rejectionReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SelectedMaterialSchema = new Schema<SelectedMaterialItem>(
  {
    category: { type: String, required: true },
    name: { type: String, required: true },
    unit: { type: String, default: 'kg' },
    pricePerKg: { type: Number, required: true },
    estimatedWeightKg: { type: Number, required: true },
    calculatedAmount: { type: Number, required: true },
  },
  { _id: false }
);

const FinalWeightSchema = new Schema<FinalWeightItem>(
  {
    category: { type: String, required: true },
    name: { type: String, required: true },
    unit: { type: String, default: 'kg' },
    pricePerKg: { type: Number, required: true },
    actualWeightKg: { type: Number, required: true },
    finalAmount: { type: Number, required: true },
  },
  { _id: false }
);

const StatusHistorySchema = new Schema<StatusHistoryEntry>(
  {
    status: {
      type: String,
      required: true,
      enum: [
        'PENDING',
        'ACCEPTED',
        'DEALER_EN_ROUTE',
        'ARRIVED',
        'OTP_PENDING',
        'OTP_VERIFIED',
        'COMPLETED',
        'CANCELLED',
        'REJECTED',
        'EXPIRED',
      ],
    },
    timestamp: { type: Date, default: Date.now },
    note: { type: String },
    updatedBy: { type: String, enum: ['CONSUMER', 'DEALER', 'SYSTEM'], default: 'SYSTEM' },
  },
  { _id: false }
);

const DealerOrderSchema = new Schema<IDealerOrder>(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    dealerId: {
      type: String,
      required: true,
      index: true,
    },
    consumerId: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      default: 'Consumer Customer',
    },
    customerPhone: {
      type: String,
      default: '+91 98765 43210',
    },
    pickupAddress: {
      type: String,
      required: true,
    },
    pickupLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    distanceKm: {
      type: Number,
      default: 1.5,
    },
    selectedMaterials: [SelectedMaterialSchema],
    estimatedTotalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'ACCEPTED',
        'DEALER_EN_ROUTE',
        'ARRIVED',
        'OTP_PENDING',
        'OTP_VERIFIED',
        'COMPLETED',
        'CANCELLED',
        'REJECTED',
        'EXPIRED',
      ],
      default: 'PENDING',
      index: true,
    },
    statusHistory: [StatusHistorySchema],
    otpCode: {
      type: String,
    },
    isOtpVerified: {
      type: Boolean,
      default: false,
    },
    otpVerifiedAt: {
      type: Date,
    },
    finalWeights: [FinalWeightSchema],
    finalTotalAmount: {
      type: Number,
    },
    scrapPhoto: {
      type: String,
    },
    dealerLiveLocation: {
      coordinates: { type: [Number] },
      heading: { type: Number, default: 0 },
      speed: { type: Number, default: 0 },
      updatedAt: { type: Date },
      etaMinutes: { type: Number },
      distanceKm: { type: Number },
    },
    rating: {
      score: { type: Number, min: 1, max: 5 },
      feedback: { type: String },
      tags: [{ type: String }],
      createdAt: { type: Date },
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    rejectionReason: {
      type: String,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

DealerOrderSchema.index({ dealerId: 1, createdAt: -1 });

export const DealerOrder = mongoose.model<IDealerOrder>('DealerOrder', DealerOrderSchema);
