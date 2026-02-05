import { Router } from "express";
import { authenticateToken } from "../middleware";
import {
  getAccountStatus,
  getFundsHistory,
  initializeErcaspayPayment,
  verifyErcaspayPayment,
} from "../controllers/userAccount";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

router.get("/status", getAccountStatus);

router.get("/funds/history", getFundsHistory);

// Ercaspay payment routes
router.post("/ercaspay/initialize-payment", initializeErcaspayPayment);
router.get("/ercaspay/verify-payment/:transactionRef", verifyErcaspayPayment);

export default router;
