import mongoose, { Document, Schema } from "mongoose";
import { OrderStatus } from "../types/enums";

export interface IOrder extends Document {
  orderId: number;
  userId: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  link: string;
  quantity: number;
  charge: number;
  startCount?: number;
  remains?: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    orderId: { type: Number, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },
    link: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    charge: { type: Number, required: true, min: 0 },
    startCount: { type: Number, default: 0 },
    remains: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for better query performance
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });
// orderSchema.index({ orderId: 1 });

// // Auto-increment orderId
// orderSchema.pre("save", async function(next) {
//   if (this.isNew) {
//     const lastOrder = await Order.findOne().sort({ orderId: -1 });
//     this.orderId = lastOrder ? lastOrder.orderId + 1 : 1;
//   }
//   next();
// });

export const Order = mongoose.model<IOrder>("Order", orderSchema);
