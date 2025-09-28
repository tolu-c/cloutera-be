import mongoose, { Schema, Document } from "mongoose";

export interface IActivity extends Document {
  userId: mongoose.Types.ObjectId;
  action: string;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

export const Activity = mongoose.model<IActivity>("Activity", activitySchema);
