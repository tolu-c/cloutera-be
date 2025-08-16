import { Response } from "express";
import { AuthenticatedRequest } from "../middleware";
import { handleError } from "../utils/errorHandler";
import { UserAccount } from "../models/userAccount";
import { Order } from "../models/orders";
import { OrderStatus } from "../types/enums";

export const getAccountStatus = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const user = req.user;

    if (!user) {
      handleError(res, 401, "Unauthorized");
      return;
    }

    // Get or create user account
    let userAccount = await UserAccount.findOne({ userId: user.userId });

    if (!userAccount) {
      userAccount = new UserAccount({
        userId: user.userId,
        balance: 0,
        totalSpent: 0,
      });
      await userAccount.save();
    }

    // Get order statistics
    const [totalOrders, orderStats] = await Promise.all([
      Order.countDocuments({ userId: user.userId }),
      Order.aggregate([
        {
          $match: {
            userId: user._id,
            status: { $in: [OrderStatus.COMPLETED] },
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$charge" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const successfulOrders = orderStats[0] || { totalAmount: 0, count: 0 };

    // Update totalSpent if needed
    if (userAccount.totalSpent !== successfulOrders.totalAmount) {
      userAccount.totalSpent = successfulOrders.totalAmount;
      await userAccount.save();
    }

    res.status(200).json({
      success: true,
      data: {
        accountStatus: userAccount.accountLevel,
        accountBalance: userAccount.balance,
        orders: {
          totalOrders,
          totalSuccessfulOrders: successfulOrders.count,
          totalAmount: successfulOrders.totalAmount,
        },
      },
    });
  } catch (error) {
    handleError(
      res,
      500,
      `${error instanceof Error ? error.message : "Error fetching account status"}`,
    );
  }
};

export const addFund = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const { amount } = req.body;

    if (!user) {
      handleError(res, 401, "Unauthorized");
      return;
    }

    if (!amount || amount <= 0) {
      handleError(res, 400, "Amount must be greater than 0");
      return;
    }

    // Get or create user account
    let userAccount = await UserAccount.findOne({ userId: user.userId });

    if (!userAccount) {
      userAccount = new UserAccount({
        userId: user.userId,
        balance: 0,
        totalSpent: 0,
      });
    }

    // Add funds to balance
    userAccount.balance += amount;
    await userAccount.save();

    res.status(200).json({
      success: true,
      message: "Funds added successfully",
      data: {
        newBalance: userAccount.balance,
        amountAdded: amount,
        accountLevel: userAccount.accountLevel,
      },
    });
  } catch (error) {
    handleError(
      res,
      500,
      `${error instanceof Error ? error.message : "Error adding funds"}`,
    );
  }
};

export const deductBalance = async (
  userId: string,
  amount: number,
): Promise<boolean> => {
  try {
    const userAccount = await UserAccount.findOne({ userId });

    if (!userAccount || userAccount.balance < amount) {
      return false;
    }

    userAccount.balance -= amount;
    await userAccount.save();

    return true;
  } catch (error) {
    return false;
  }
};
