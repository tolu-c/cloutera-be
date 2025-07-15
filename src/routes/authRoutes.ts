import express from "express";

import {
  checkUsername,
  forgotPassword,
  loginUser,
  loginWith2FA,
  resendVerificationEmail,
  resetPassword,
  signOutUser,
  signUpUser,
  toggle2FA,
  verifyUserEmail,
} from "../controllers/auth";
import { authenticateToken } from "../middleware";

const router = express.Router();

router.post("/signup", signUpUser);
router.post("/verify-email", verifyUserEmail);
router.post("/login", loginUser);
router.post("/login-2fa", loginWith2FA);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
// router.get("/get-user", authenticateToken, getUser);
router.post("/sign-out", authenticateToken, signOutUser);
router.post("/check-username", checkUsername);
router.post("/resend", resendVerificationEmail);
router.post("/toggle-2fa", authenticateToken, toggle2FA);

export default router;
