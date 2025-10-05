import mongoose, { Document, Schema } from "mongoose";
import { UserRole, UserStatus } from "../types/enums";

export interface IUser extends Document {
  username?: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  isVerified: boolean;
  role: UserRole;
  status: UserStatus;
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string | null;
  isBlocked: boolean;
  googleId?: string;
  provider: string;
  photo?: string;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    password: {
      type: String,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    role: { type: String, default: UserRole.Customer },
    status: { type: String, default: UserStatus.Active },
    emailVerificationToken: {
      type: String,
      sparse: true,
      index: true,
      select: false,
    },
    emailVerificationExpires: { type: Date, select: false },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    isBlocked: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

// Compound index for auth queries
userSchema.index({ email: 1, isVerified: 1 });

export default mongoose.model<IUser>("User", userSchema);
