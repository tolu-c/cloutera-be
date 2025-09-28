import mongoose, { Document, Schema } from "mongoose";
import {
  NotificationEnum,
  NotificationFreqEnum,
  NotificationStatusEnum,
} from "../types/notification.types";

export interface INotification extends Document {
  title: string;
  message: string;
  type: NotificationEnum;
  scheduledDate?: Date;
  isRecurring?: boolean;
  frequency: NotificationFreqEnum;
  endDate?: Date;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
  status: NotificationStatusEnum;
}

const notificationSchema = new Schema<INotification>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: NotificationEnum,
      default: NotificationEnum.NotificationBar,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    frequency: {
      type: String,
      enum: NotificationFreqEnum,
    },
    scheduledDate: {
      type: Date,
      default: null,
      index: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

    // readBy: [
    //   {
    //     user: {
    //       type: mongoose.Schema.Types.ObjectId,
    //       ref: "User",
    //     },
    //     readAt: {
    //       type: Date,
    //       default: Date.now,
    //     },
    //   },
    // ],
    status: {
      type: String,
      enum: NotificationStatusEnum,
      default: NotificationStatusEnum.Sent,
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient queries
notificationSchema.index({ targetAudience: 1, status: 1, createdAt: -1 });
notificationSchema.index({ scheduledDate: 1, isRecurring: 1 });
notificationSchema.index({ nextScheduledDate: 1, status: 1 });

export default mongoose.model<INotification>(
  "Notification",
  notificationSchema,
);
