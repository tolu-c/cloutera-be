import { Router } from "express";
import { authenticateToken } from "../middleware";
import {
  addFund,
  getAccountStatus,
  getFundsHistory,
  initializeErcaspayPayment,
  initializeUserPayment,
  verifyErcaspayPayment,
  verifyUserPayment,
} from "../controllers/userAccount";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

router.get("/status", getAccountStatus);

router.post("/add-fund", addFund);
router.get("/funds/history", getFundsHistory);
router.post('/initialize-payment', initializeUserPayment)
router.get('/verify-payment/:reference', verifyUserPayment)

// Ercaspay payment routes
router.post('/ercaspay/initialize-payment', initializeErcaspayPayment)
router.get('/ercaspay/verify-payment/:transactionRef', verifyErcaspayPayment)

export default router;
