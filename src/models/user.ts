import mongoose, { Document, Schema } from "mongoose";
import { UserRole } from "../types/enums";

export interface IUser extends Document {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  isVerified: boolean;
  role: UserRole;
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string | null;
  isBlocked: boolean;
}

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  role: { type: String, default: UserRole.Customer },
  emailVerificationToken: { type: String },
  emailVerificationExpires: { type: Date },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String },
  isBlocked: { type: Boolean, default: false },
});

export default mongoose.model<IUser>("User", userSchema);
