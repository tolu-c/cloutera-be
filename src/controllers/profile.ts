import { Response } from "express";
import { handleError } from "../utils/errorHandler";
import { AuthenticatedRequest } from "../middleware";
import User from "../models/user";
import { findUserByEmail, findUserWithUsername } from "../helpers";
import bcrypt from "bcrypt";
import { generateOtp, sendEmail } from "../utils";
import { logUserActivity } from "../utils/activityLogger";

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

export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const user = req.user;
    const { oldPassword, newPassword } = req.body;

    const myUser = await findUserByEmail(user.email);
    if (!myUser) {
      handleError(res, 404, "User not found");
      return;
    }

    if (!oldPassword || !newPassword) {
      handleError(
        res,
        400,
        `Missing required fields: oldPassword or newPassword`,
      );
      return;
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, myUser.password);
    if (!isPasswordValid) {
      handleError(res, 400, "Current password is incorrect");
      return;
    }

    myUser.password = await bcrypt.hash(newPassword, 18);
    await myUser.save();

    await logUserActivity(user.userId, "changed password.");

    res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (e) {
    handleError(res, 500, "Server error");
  }
};

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const loggedInUser = req.user;
    const { username, firstName, lastName } = req.body;

    const user = await findUserByEmail(loggedInUser.email);
    if (!user) {
      handleError(res, 404, "User not found");
      return;
    }

    if (username && username !== user.username) {
      const existingUser = await findUserWithUsername(username);

      if (existingUser) {
        handleError(res, 400, "Username already exists");
        return;
      }
    }

    user.username = username.trim();
    user.firstName = firstName.trim();
    user.lastName = lastName.trim();

    await user.save();

    await logUserActivity(loggedInUser.userId, "updated profile.");

    res.status(200).json({
      message: "Profile updated successfully",
    });
  } catch (e) {
    handleError(res, 500, "Server error");
  }
};

export const setUp2FA = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const loggedInUser = req.user;

    const user = await findUserByEmail(loggedInUser.email);
    if (!user) {
      handleError(res, 404, "User not found");
      return;
    }

    if (user.twoFactorEnabled) {
      handleError(res, 400, "2FA is already enabled");
      return;
    }

    user.twoFactorSecret = generateOtp();
    await user.save();

    await sendEmail(
      loggedInUser.email,
      "Setup Two Factor Authentication",
      `
        <h2>Setup Two-Factor Authentication</h2>
        <p>Enter the code below to set up Two-Factor Authentication on your account.</p>
        <p>Your code is ${user.twoFactorSecret}</p>
        `,
    );

    await logUserActivity(loggedInUser.userId, "triggered 2FA setup.");

    res.status(200).json({
      message: "2FA Triggered successfully",
      success: true,
    });
  } catch (e) {
    console.log("error");
    handleError(res, 500, `Server error: ${e}`);
  }
};

export const verify2FA = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const loggedInUser = req.user;
    const { secretCode } = req.body;

    const user = await findUserByEmail(loggedInUser.email);
    if (!user) {
      handleError(res, 404, "User not found");
      return;
    }

    if (!secretCode) {
      handleError(res, 400, `Missing required field: secretCode`);
      return;
    }

    if (secretCode !== user.twoFactorSecret) {
      handleError(res, 400, `Invalid secret code`);
      return;
    }

    user.twoFactorSecret = null;
    user.twoFactorEnabled = true;
    await user.save();

    await sendEmail(
      loggedInUser.email,
      "Two Factor Authentication Setup Successfully",
      `
        <h2>Congratulations!</h2>
        <p>Your account has been set up with Two-Factor Authentication.</p>
        `,
    );

    await logUserActivity(loggedInUser.userId, "setup 2FA successfully.");

    res.status(200).json({
      message: "2FA setup successfully",
    });
  } catch (e) {
    handleError(res, 500, "Server error");
  }
};

// export const disable2FA = async (
//   req: AuthenticatedRequest,
//   res: Response,
// ) => {};
