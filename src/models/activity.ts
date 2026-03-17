import mongoose, { type Document, Schema } from "mongoose";

export interface IActivity extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
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
    userName: { type: String, required: true },
    action: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

export const Activity = mongoose.model<IActivity>("Activity", activitySchema);
