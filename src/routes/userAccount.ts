import { Router } from "express";
import { authenticateToken } from "../middleware";
import {
  addFund,
  getAccountStatus,
  getFundsHistory,
} from "../controllers/userAccount";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

router.get("/status", getAccountStatus);

router.post("/add-fund", addFund);
router.get("/funds/history", getFundsHistory);

export default router;
