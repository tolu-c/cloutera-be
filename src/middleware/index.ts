import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { handleError } from "../utils/errorHandler";
import { UserRole } from "../types/enums";

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    handleError(res, 401, "Unauthorized: Token not provided");
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    handleError(res, 401, "Unauthorized: Token not provided");
    return;
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET as string);
    next();
  } catch (err) {
    handleError(res, 403, "Forbidden: Invalid token");
  }
};

export const authenticateAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    handleError(res, 401, "Unauthorized: Admin token not provided");
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    handleError(res, 401, "Unauthorized: Admin token not provided");
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

    // Check if user has admin role
    if (!decoded.role || decoded.role !== UserRole.Admin) {
      handleError(res, 403, "Forbidden: Admin access required");
      return;
    }

    req.user = decoded;
    next();
  } catch (err) {
    handleError(res, 403, "Forbidden: Invalid admin token");
  }
};
