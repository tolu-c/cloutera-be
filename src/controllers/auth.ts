import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import { handleError } from "../utils/errorHandler";
import User, { IUser } from "../models/user";
import { UserRole } from "../types/enums";
import {
  generateEmailToken,
  generateOtp,
  sendEmail,
  sendEmailQueue,
} from "../utils";
import {
  findUserByEmail,
  findUserWithToken,
  findUserWithUsername,
} from "../helpers";
import { AuthenticatedRequest } from "../middleware";
import { SALT_ROUNDS } from "../constants";

const generateToken = (user: IUser): string => {
  return jwt.sign(
    { email: user.email, userId: user._id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: "7days" },
  );
};

const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

export const signUpUser = async (req: Request, res: Response) => {
  try {
    const { username, email, firstName, lastName, password, role } = req.body;

    const [existingUser, existingUsername] = await Promise.all([
      findUserByEmail(email),
      User.findOne({ username }),
    ]);

    if (existingUsername) {
      handleError(res, 400, "Username already exists");
    }
    if (existingUser) {
      handleError(res, 400, "User already exists");
    }

    const hashPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = new User({
      username,
      email,
      firstName,
      lastName,
      password: hashPassword,
      role: role ?? UserRole.Customer,
      emailVerificationToken: generateEmailToken(),
    });
    await user.save();

    const verifyAccountUrl = `${clientUrl}/verify-account/${email}/${user.emailVerificationToken}`;

    await sendEmail(
      user.email,
      "Welcome to Cloutera",
      `
<h2>Welcome to Cloutera, Verify your Account</h2>
        <p>Click on the link below to verify your email</p>
        <a href="${verifyAccountUrl}">Verify your account</a>
    `,
    );

    res.status(201).json({
      message: "User successfully created",
    });
  } catch (error) {
    handleError(res, 500, `Server error: ${error}`);
  }
};

export const verifyUserEmail = async (req: Request, res: Response) => {
  try {
    const { token, email } = req.body;

    const user = await findUserWithToken(email, token).select(
      "emailVerificationToken emailVerificationExpires isVerified",
    );

    if (!user) {
      handleError(res, 400, "Invalid Token");
      return;
    }
    // check token expiry

    user.isVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.status(200).json({
      message: "User successfully verified",
    });
  } catch (e) {
    handleError(res, 500, "Server error");
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const t0 = Date.now();

    const user = await findUserByEmail(email).select(
      "+password +twoFactorEnabled +twoFactorSecret +isVerified +role",
    );
    console.log(`findUserByEmail: ${Date.now() - t0}ms`);

    if (!user) {
      handleError(res, 400, "Invalid credentials");
      return;
    }
    if (!user.isVerified) {
      handleError(res, 400, "Please verify your email");
      return;
    }
    const t1 = Date.now();
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log(`bcrypt.compare: ${Date.now() - t1}ms`);

    if (!isPasswordValid) {
      handleError(res, 400, "Invalid credentials");
      return;
    }

    const t2 = Date.now();
    const token = generateToken(user);
    console.log(`generateToken: ${Date.now() - t2}ms`);

    res.status(200).json({
      message: "User successfully logged in",
      data: {
        token,
        isVerified: user.isVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        role: user.role,
      },
    });

    if (user.twoFactorEnabled) {
      const t3 = Date.now();
      const twoFactorSecret = generateOtp();
      await User.updateOne({ _id: user._id }, { twoFactorSecret });
      console.log(`update 2FA: ${Date.now() - t3}ms`);

      const t4 = Date.now();
      await sendEmailQueue.add({
        to: email,
        subject: "2FA code",
        html: `Your 2FA code: ${twoFactorSecret}`,
      });
      console.log(`email queue: ${Date.now() - t4}ms`);
    }
  } catch (e) {
    handleError(res, 500, "Server error");
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await findUserByEmail(email);

    if (!user) {
      handleError(res, 404, "User not found");
      return;
    }
    const token = generateEmailToken();
    const expires = new Date(Date.now() + 3600000); // 1 hour expiry

    await User.updateOne(
      { email },
      { emailVerificationToken: token, emailVerificationExpires: expires },
    );

    // send email
    const resetPasswordUrl = `${clientUrl}/reset-password/${email}/${user.emailVerificationToken}`;

    res.status(200).json({
      message: "Verification Email sent",
    });

    await sendEmailQueue.add({
      to: email,
      subject: "Reset Password",
      html: `
        <h2>Reset Password</h2>
        <p>Click on the link below to reset your password</p>
        <a href="${resetPasswordUrl}">Reset Password</a>
      `,
    });

    // await sendEmail(
    //   email,
    //   "Reset Password",
    //   `
    // <h2>Reset Password</h2>
    // <p>Click on the link below to reset your password</p>
    // <a href="${resetPasswordUrl}">Reset Password</a>
    // `,
    // );
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, token, password } = req.body;
    const user = await findUserWithToken(email, token);
    //check of expiry too

    if (!user) {
      handleError(res, 400, "Invalid Token");
      return;
    }

    user.password = await bcrypt.hash(password, SALT_ROUNDS);
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (e) {
    handleError(res, 500, "Server error");
  }
};

export const signOutUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await User.findOneAndUpdate(
      { email: req.user?.email },
      { $set: { token: "" } },
    );
    res.status(200).json({
      message: "User successfully logged out",
    });
  } catch (e) {
    handleError(res, 500, "Server error");
  }
};

export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await findUserByEmail(email);

    if (!user) {
      handleError(res, 404, "User not found");
      return;
    }

    user.emailVerificationToken = generateEmailToken();
    // set expiry
    await user.save();

    res.status(200).json({
      message: "Verification email sent",
    });
  } catch (e) {
    handleError(res, 500, "Server error");
  }
};

export const checkUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    const user = await findUserWithUsername(username);

    if (user) {
      handleError(res, 400, "This username has been Taken");
      return;
    }

    res.status(200).json({
      message: "Username is available",
    });
  } catch (e) {
    handleError(res, 500, "Server error");
  }
};

export const loginWith2FA = async (req: Request, res: Response) => {
  try {
    const { email, password, secretCode } = req.body;

    if (!email || !password || !secretCode) {
      handleError(res, 400, "Missing required fields");
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      handleError(res, 400, "Invalid credentials");
      return;
    }
    if (!user.isVerified) {
      handleError(res, 400, "Please verify your email");
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      handleError(res, 400, "Invalid credentials");
      return;
    }

    if (!user.twoFactorEnabled) {
      handleError(res, 400, "2FA is not enabled");
      return;
    }

    const is2FAValid = user.twoFactorSecret === secretCode;
    if (!is2FAValid) {
      handleError(res, 400, "Invalid 2FA code");
      return;
    }

    const token = generateToken(user);

    user.twoFactorSecret = null;
    await user.save();

    res.status(200).json({
      message: "User successfully logged in",
      data: {
        token,
        isVerified: user.isVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        role: user.role,
      },
    });
  } catch (e) {
    handleError(res, 500, "Server error");
  }
};

export const toggle2FA = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUser = req.user;

    const user = await findUserByEmail(authUser?.email);

    if (!user) {
      handleError(res, 404, "User not found");
      return;
    }

    user.twoFactorEnabled = !user.twoFactorEnabled;
    await user.save();

    res.status(200).json({
      message: "2FA toggled successfully",
    });
  } catch (e) {
    handleError(res, 500, "Server error");
  }
};
