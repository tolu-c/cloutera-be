import mongoose, { Document, Schema } from "mongoose";

export enum TransactionType {
  CREDIT = "credit",
  DEBIT = "debit",
}

export enum TransactionStatus {
  PENDING = "pending",
  SUCCESSFUL = "successful",
  FAILED = "failed",
}

export enum PaymentMethod {
  FLUTTERWAVE = "FlutterWave",
  BANK_TRANSFER = "Bank Transfer",
  SYSTEM = "System",
}

export interface IFundsHistory extends Document {
  transactionId: string;
  userId: mongoose.Types.ObjectId;
  paymentMethod: PaymentMethod;
  amount: number;
  status: TransactionStatus;
  type: TransactionType;
  balanceBefore: number;
  balanceAfter: number;
  // reference?: string;
  createdAt: Date;
  updatedAt: Date;
}

const fundsHistorySchema = new Schema<IFundsHistory>(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.SUCCESSFUL,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
      index: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    // reference: {
    //   type: String,
    //   sparse: true,
    //   index: true
    // }
  },
  {
    timestamps: true,
  },
);

// Auto-increment transactionId
fundsHistorySchema.pre("save", async function(next) {
  if (this.isNew) {
    const lastTransaction = await FundsHistory.findOne().sort({
      transactionId: -1,
    });
    this.transactionId = lastTransaction
      ? (parseInt(lastTransaction.transactionId) + 1).toString()
      : "2301780";
  }
  next();
});

fundsHistorySchema.index({ userId: 1, createdAt: -1 });

export const FundsHistory = mongoose.model<IFundsHistory>(
  "FundsHistory",
  fundsHistorySchema,
);
