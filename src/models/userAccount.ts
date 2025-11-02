import mongoose, { Document, Schema } from "mongoose";
import { AccountLevel } from "../types/enums";

export interface IUserAccount extends Document {
  userId: mongoose.Types.ObjectId;
  balance: number;
  totalSpent: number;
  totalOrders: number;
  accountLevel: AccountLevel;
  createdAt: Date;
  updatedAt: Date;
  calculateAccountLevel(): AccountLevel;
}

const userAccountSchema = new Schema<IUserAccount>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    accountLevel: {
      type: Number,
      enum: Object.values(AccountLevel),
      default: AccountLevel.LEVEL_1,
    },
  },
  {
    timestamps: true,
  },
);

// Method to calculate account level based on total spent
userAccountSchema.methods.calculateAccountLevel = function (): AccountLevel {
  if (this.totalOrders >= 100) return AccountLevel.LEVEL_5;
  if (this.totalOrders >= 50) return AccountLevel.LEVEL_4;
  if (this.totalOrders >= 20) return AccountLevel.LEVEL_3;
  if (this.totalOrders >= 5) return AccountLevel.LEVEL_2;
  return AccountLevel.LEVEL_1;
};

// Pre-save hook to update account level
userAccountSchema.pre("save", function (next) {
  this.accountLevel = this.calculateAccountLevel();
  next();
});

export const UserAccount = mongoose.model<IUserAccount>(
  "UserAccount",
  userAccountSchema,
);
