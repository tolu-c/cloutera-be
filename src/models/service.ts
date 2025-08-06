import mongoose, { Document, Schema } from "mongoose";

export interface IService extends Document {
  serviceId: number;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  refill: boolean;
  cancel: boolean;
  description?: string;
  isActive: boolean;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    serviceId: { type: Number, required: true, unique: true },
    name: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    rate: { type: String, required: true },
    min: { type: String, required: true },
    max: { type: String, required: true },
    refill: { type: Boolean, default: false },
    cancel: { type: Boolean, default: false },
    description: { type: String },
    isActive: { type: Boolean, default: true, index: true },
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  },
);

// Indexes for better query performance
serviceSchema.index({ name: "text", category: "text", type: "text" });
serviceSchema.index({ category: 1, type: 1 });
serviceSchema.index({ isActive: 1, category: 1 });

export const Service = mongoose.model<IService>("Service", serviceSchema);
