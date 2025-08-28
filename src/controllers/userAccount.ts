import { Response } from "express";
import { AuthenticatedRequest } from "../middleware";
import { handleError } from "../utils/errorHandler";
import { UserAccount } from "../models/userAccount";
import { Order } from "../models/orders";
import { OrderStatus } from "../types/enums";
import mongoose from "mongoose";
import {
  FundsHistory,
  PaymentMethod,
  TransactionStatus,
  TransactionType,
} from "../models/fundHistory";

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
    const {
      amount,
      paymentMethod = PaymentMethod.SYSTEM,
      status,
      tx_reference,
    } = req.body;

    if (!user) {
      handleError(res, 401, "Unauthorized");
      return;
    }

    if (!amount || amount <= 0) {
      handleError(res, 400, "Amount must be greater than 0");
      return;
    }
    if (!status || !tx_reference) {
      handleError(res, 400, "Status and transaction reference are required");
      return;
    }

    if (status !== "successful") {
      handleError(res, 400, "Payment was not successful");
      return;
    }

    // Check if transaction already exists
    const existingTransaction = await FundsHistory.findOne({
      transactionId: tx_reference,
      userId: user.userId,
    });

    if (existingTransaction) {
      if (existingTransaction.status === TransactionStatus.SUCCESSFUL) {
        res.status(200).json({
          success: true,
          message: "Transaction already processed",
          data: {
            newBalance:
              (await UserAccount.findOne({ userId: user.userId }))?.balance ||
              0,
            amountAdded: amount,
            accountLevel: (await UserAccount.findOne({ userId: user.userId }))
              ?.accountLevel,
          },
        });
      }
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

    const balanceBefore = userAccount.balance;
    // Add funds to balance
    userAccount.balance += amount;
    const balanceAfter = userAccount.balance;

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await userAccount.save({ session });

        if (existingTransaction) {
          // Update existing transaction
          existingTransaction.status = TransactionStatus.SUCCESSFUL;
          existingTransaction.balanceAfter = balanceAfter;
          await existingTransaction.save({ session });
        } else {
          // Create new fund history record
          const fundsHistory = new FundsHistory({
            userId: user.userId,
            paymentMethod,
            amount,
            status: TransactionStatus.SUCCESSFUL,
            type: TransactionType.CREDIT,
            balanceBefore,
            balanceAfter,
            transactionId: tx_reference,
          });

          await fundsHistory.save({ session });
        }
      });

      res.status(200).json({
        success: true,
        message: "Funds added successfully",
        data: {
          newBalance: userAccount.balance,
          amountAdded: amount,
          accountLevel: userAccount.accountLevel,
        },
      });
    } catch (transactionError) {
      throw transactionError;
    } finally {
      await session.endSession();
    }
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

export const getFundsHistory = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const user = req.user;

    if (!user) {
      handleError(res, 401, "Unauthorized");
      return;
    }

    // Extract query parameters
    const {
      page = 1,
      limit = 20,
      search,
      status,
      type,
      paymentMethod,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build match conditions
    const matchConditions: any = { userId: user.userId };

    // Add filters
    if (status) {
      matchConditions.status = status;
    }

    if (type) {
      matchConditions.type = type;
    }

    if (paymentMethod) {
      matchConditions.paymentMethod = paymentMethod;
    }

    // Date range filter
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) {
        matchConditions.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        matchConditions.createdAt.$lte = new Date(endDate as string);
      }
    }

    // Search functionality (across transactionId and reference)
    if (search) {
      matchConditions.$or = [
        { transactionId: { $regex: search, $options: "i" } },
        { reference: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination setup
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Sort setup
    const sortField = ["createdAt", "amount", "transactionId"].includes(
      sortBy as string,
    )
      ? (sortBy as string)
      : "createdAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    // Execute queries
    const [transactions, totalCount] = await Promise.all([
      FundsHistory.find(matchConditions)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .select("-__v")
        .lean(),
      FundsHistory.countDocuments(matchConditions),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Get summary statistics
    const [summaryStats] = await FundsHistory.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalCredits: {
            $sum: {
              $cond: [{ $eq: ["$type", TransactionType.CREDIT] }, "$amount", 0],
            },
          },
          totalDebits: {
            $sum: {
              $cond: [{ $eq: ["$type", TransactionType.DEBIT] }, "$amount", 0],
            },
          },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    const summary = summaryStats || {
      totalCredits: 0,
      totalDebits: 0,
      totalTransactions: 0,
    };

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNextPage,
        hasPrevPage,
      },
      summary: {
        totalCredits: summary.totalCredits,
        totalDebits: summary.totalDebits,
        netAmount: summary.totalCredits - summary.totalDebits,
        totalTransactions: summary.totalTransactions,
      },
      filters: {
        search,
        status,
        type,
        paymentMethod,
        startDate,
        endDate,
        sortBy: sortField,
        sortOrder,
      },
    });
  } catch (error) {
    handleError(
      res,
      500,
      `${error instanceof Error ? error.message : "Error fetching funds history"}`,
    );
  }
};
