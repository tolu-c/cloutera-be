import express from "express";
import { authenticateToken } from "../middleware";
import {
  changePassword,
  disable2Fa,
  getUser,
  setUp2FA,
  updateProfile,
  verify2FA,
  verifyDisable2Fa,
} from "../controllers/profile";

const router = express.Router();

router.get("/", authenticateToken, getUser);
router.post("/update", authenticateToken, updateProfile);
router.post("/change-password", authenticateToken, changePassword);
router.post("/setup-2fa", authenticateToken, setUp2FA);
router.post("/verify-2fa", authenticateToken, verify2FA);
router.post("/disable-2fa", authenticateToken, disable2Fa);
router.post("/verify-disable-2fa", authenticateToken, verifyDisable2Fa);

export default router;
