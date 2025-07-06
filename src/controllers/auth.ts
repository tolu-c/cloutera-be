import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import { handleError } from "~/utils/errorHandler";
import User, { IUser } from "~/models/user";
import { UserRole } from "~/types/enums";
import { generateEmailToken, generateOtp, sendEmail } from "~/utils";
import {
  findUserByEmail,
  findUserWithToken,
  findUserWithUsername,
} from "~/helpers";
import { AuthenticatedRequest } from "~/middleware";

const generateToken = (user: IUser): string => {
  return jwt.sign(
    { email: user.email, userId: user._id },
    process.env.JWT_SECRET as string,
    { expiresIn: "7days" },
  );
};

const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

export const signUpUser = async (req: Request, res: Response) => {
  try {
    const { username, email, firstName, lastName, password, role } = req.body;

    const existingUser = await findUserByEmail(email);
    const existingUsername = await User.findOne({ username });

    if (existingUsername) {
      handleError(res, 400, "Username already exists");
    }
    if (existingUser) {
      handleError(res, 400, "User already exists");
    }

    const hashPassword = await bcrypt.hash(password, 18);

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
    // send email
    await sendEmail(
      user.email,
      "Welcome to Cloutera",
      `
       <h2>Welcome to Cloutera, Verify your Account</h2>
       <p>Click on the link below to verify your email</p>
       <a href="${verifyAccountUrl}">Reset Password</a>
      `,
    );
    res.status(201).json({
      message: "User successfully created",
    });
  } catch (error) {
    handleError(res, 500, "Server error");
  }
};

export const verifyUserEmail = async (req: Request, res: Response) => {
  try {
    const { token, email } = req.body;

    const user = await findUserWithToken(email, token);

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

    const token = generateToken(user);

    if (user.twoFactorEnabled) {
      user.twoFactorSecret = generateOtp();
      await user.save();

      await sendEmail(
        email,
        "2FA code",
        `Your 2FA code: ${user.twoFactorSecret}`,
      );
    }

    res.status(200).json({
      message: "User successfully logged in",
      data: {
        token,
        isVerified: user.isVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
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
    user.emailVerificationToken = generateEmailToken();
    // save token expiry too
    await user.save();

    // send email
    const resetPasswordUrl = `${clientUrl}/reset-password/${email}/${user.emailVerificationToken}`;
    await sendEmail(
      email,
      "Reset Password",
      `
    <h2>Reset Password</h2>
    <p>Click on the link below to reset your password</p>
    <a href="${resetPasswordUrl}">Reset Password</a>
    `,
    );

    res.status(200).json({
      message: "Verification Email sent",
    });
  } catch (e) {
    handleError(res, 500, "Server error");
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

    user.password = await bcrypt.hash(password, 18);
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

export const getUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      handleError(res, 401, "Unauthorized");
      return;
    }

    const userDetails = await User.findOne({ email: user?.email }).select(
      "-password -emailVerificationToken -emailVerificationExpires -twoFactorSecret -isBlocked",
    );
    if (!userDetails) {
      handleError(res, 404, "User not found");
      return;
    }

    res.status(200).json({
      message: "User details",
      data: {
        user: userDetails,
      },
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
      res.status(200).json({
        message: "Username is not available",
      });
    } else {
      res.status(200).json({
        message: "Username is available",
      });
    }
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
