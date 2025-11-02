import { Response } from "express";
import { handleError } from "../utils/errorHandler";
import { AuthenticatedRequest } from "../middleware";
import User from "../models/user";
import { findUserByEmail, findUserWithUsername } from "../helpers";
import bcrypt from "bcrypt";
import { generateOtp, sendEmail, sendEmailWithResend } from "../utils";
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
    const userPassword = myUser?.password;

    if (!myUser) {
      handleError(res, 404, "User not found");
      return;
    }
    if (!userPassword) {
      handleError(res, 400, "Account does not match. Login with Google");
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

    const isPasswordValid = await bcrypt.compare(oldPassword, userPassword);
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

    await sendEmailWithResend(
      loggedInUser.email,
      "Setup Two Factor Authentication",
      "2fa-code-email",
      {
        userName: user.firstName || user.username || "User",
        code: user.twoFactorSecret,
      },
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

    await sendEmailWithResend(
      loggedInUser.email,
      "Two Factor Authentication Setup Successfully",
      "2fa-success-email",
      {
        userName: user.firstName || user.username || "User",
      },
    );

    await logUserActivity(loggedInUser.userId, "setup 2FA successfully.");

    res.status(200).json({
      message: "2FA setup successfully",
    });
  } catch (e) {
    handleError(res, 500, "Server error");
  }
};

export async function disable2Fa(req: AuthenticatedRequest, res: Response) {
  try {
    const loggedInUser = req.user;

    const user = await findUserByEmail(loggedInUser.email);
    if (!user) {
      handleError(res, 404, "User not found");
      return;
    }

    if (!user.twoFactorEnabled) {
      handleError(res, 400, "2FA is not enabled");
      return;
    }

    user.twoFactorSecret = generateOtp();
    await user.save();

    await sendEmailWithResend(
      loggedInUser.email,
      "Disable Two Factor Authentication",
      "disable-2fa-code",
      {
        userName: user.firstName || user.username || "User",
        code: user.twoFactorSecret,
      },
    );

    await logUserActivity(loggedInUser.userId, "triggered 2FA Disable.");

    res.status(200).json({
      message: "Disable 2FA Triggered successfully",
      success: true,
    });
  } catch (e) {
    console.log("error");
    handleError(res, 500, `Server error: ${e}`);
  }
}

export async function verifyDisable2Fa(
  req: AuthenticatedRequest,
  res: Response,
) {
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
    user.twoFactorEnabled = false;
    await user.save();

    await sendEmailWithResend(
      loggedInUser.email,
      "Two Factor Authentication Disabled Successfully",
      "disable-2fa-success",
      {
        userName: user.firstName || user.username || "User",
      },
    );

    await logUserActivity(loggedInUser.userId, "2FA disabled successfully.");

    res.status(200).json({
      message: "2FA disabled successfully",
      success: true,
    });
  } catch (e) {
    handleError(res, 500, "Server error");
  }
}
