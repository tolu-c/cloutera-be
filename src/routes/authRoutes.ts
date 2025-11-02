import express from "express";

import {
  checkUsername,
  forgotPassword,
  loginUser,
  loginWith2FA,
  resend2fa,
  resendVerificationEmail,
  resetPassword,
  signOutUser,
  signUpUser,
  toggle2FA,
  trigger2FA,
  verify2fa,
  verifyUserEmail,
} from "../controllers/auth";
import { authenticateToken } from "../middleware";

const router = express.Router();

router.post("/signup", signUpUser);
router.post("/verify-email", verifyUserEmail);
router.post("/login", loginUser);
router.post("/resend-2fa", resend2fa);
router.post("/login-2fa", loginWith2FA);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
// router.get("/get-user", authenticateToken, getUser);
router.post("/sign-out", authenticateToken, signOutUser);
router.post("/check-username", checkUsername);
router.post("/resend", resendVerificationEmail);
router.post("/toggle-2fa", authenticateToken, toggle2FA);
router.post("/trigger-2fa", authenticateToken, trigger2FA);
router.post("/verify-2fa", authenticateToken, verify2fa);

export default router;
