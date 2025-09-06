import mongoose from "mongoose";
import { Response } from "express";
import User from "../models/user";
import { handleError } from "../utils/errorHandler";

export const findUserByEmail = (email: string) =>
  User.findOne({ email: email.toLowerCase() })
    .select("+password +twoFactorSecret")
    .lean();

export const findUserWithToken = (email: string, token: string) =>
  User.findOne({
    email: email.toLowerCase(),
    emailVerificationToken: token,
  }).select("+password");

export const findUserWithUsername = (username: string) =>
  User.findOne({ username }).lean();

export const validateIds = (id: string, res: Response) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    handleError(res, 400, "Invalid ID");
    return;
  }
};

export const findUserById = async (id: string) => {
  return User.findById(id).select("-__v").lean();
};
