import mongoose from "mongoose";
import { Response } from "express";
import User from "../models/user";
import { handleError } from "../utils/errorHandler";

export const findUserByEmail = async (email: string) => {
  return User.findOne({ email });
};

export const findUserWithToken = async (email: string, token: string) => {
  return User.findOne({ email, emailVerificationToken: token });
};

export const findUserWithUsername = async (username: string) => {
  return User.findOne({ username });
};

export const validateIds = (id: string, res: Response) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    handleError(res, 400, "Invalid ID");
    return;
  }
};
