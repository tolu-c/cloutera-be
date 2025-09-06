// user stats
// user list
// single user
// block and unblock user

import { AuthenticatedRequest } from "../../middleware";
import { Response } from "express";
import { handleError } from "../../utils/errorHandler";
import User from "../../models/user";
import { PaginatedResponse, UserStats } from "../../types/service.types";
import { createPaginationQuery } from "../../utils/createPaginationQuery";
import { OrderStatus, UserStatus } from "../../types/enums";
import { findUserById } from "../../helpers";
import { Order } from "../../models/orders";
import { UserAccount } from "../../models/userAccount";

export const getUserStats = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const [total, blocked, usersWithRecentOrders] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isBlocked: true }),
      User.aggregate([
        {
          $lookup: {
            from: "orders",
            localField: "_id",
            foreignField: "userId",
            as: "orders",
          },
        },
        {
          $match: {
            "orders.createdAt": { $gte: oneMonthAgo },
          },
        },
        {
          $count: "activeUsers",
        },
      ]),
    ]);

    const active = usersWithRecentOrders[0]?.activeUsers || 0;
    const inactive = total - blocked - active;

    const stats: UserStats = {
      total,
      active,
      inactive,
      blocked,
    };

    res.status(200).json({
      message: "User statistics fetched successfully",
      success: true,
      data: stats,
    });
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
};

export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, search, status } = req.query;

    const query: any = {};

    // Search by username, firstName, lastName, email
    if (search) {
      const searchQuery = search.toString().trim();
      const searchRegex = { $regex: searchQuery, $options: "i" };
      query.$or = [
        { username: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
      ];
    }

    if (
      status &&
      [UserStatus.Active, UserStatus.Inactive].includes(
        status.toString() as UserStatus,
      )
    ) {
      query.status = status;
    }

    const { pageNum, skipNum, limitNum } = createPaginationQuery(
      Number(page),
      Number(limit),
    );

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skipNum)
        .limit(limitNum)
        .select(
          "-emailVerificationToken -emailVerificationExpires -password -__v",
        ),
      User.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    const response: PaginatedResponse<(typeof users)[0]> = {
      message: "users fetched",
      success: true,
      data: users,
      pagination: {
        current: pageNum,
        pages: totalPages,
        total,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
      filters: {
        search,
        status,
      },
    };

    res.status(200).json(response);
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
};

export const getUserById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await findUserById(id);

    if (!user) {
      return handleError(res, 404, "User not found");
    }

    res.status(200).json({
      message: "User fetched successfully",
      success: true,
      data: user,
    });
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
};

export const toggleBlockUser = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;

    const user = await findUserById(id);

    if (!user) {
      return handleError(res, 404, "User not found");
    }

    if (user._id.toString() === req.user.userId) {
      handleError(res, 400, "cannot block yourself");
    }

    await User.findByIdAndUpdate(id, {
      isBlocked: !user.isBlocked,
    });

    res.status(200).json({
      message: "User blocked successfully",
      success: true,
    });
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
};

export const getUserOrders = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 50,
      search,
      status,
      serviceId,
      minCharge,
      maxCharge,
      startDate,
      endDate,
    } = req.query;

    const user = await findUserById(id);

    if (!user) {
      return handleError(res, 404, "User not found");
    }

    const query: any = { userId: user._id };

    // Search by order ID or link
    if (search) {
      const searchQuery = search.toString();
      if (/^\d+$/.test(searchQuery)) {
        // If search is numeric, search by orderId
        query.orderId = parseInt(searchQuery);
      } else {
        // Otherwise search by link
        query.link = { $regex: search, $options: "i" };
      }
    }

    // Status filter
    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      query.status = status;
    }

    // Service filter
    if (serviceId) {
      query.serviceId = serviceId;
    }

    // Charge range filter
    if (minCharge || maxCharge) {
      query.charge = {};
      if (minCharge) {
        query.charge.$gte = parseFloat(minCharge.toString());
      }
      if (maxCharge) {
        query.charge.$lte = parseFloat(maxCharge.toString());
      }
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate.toString());
      }
      if (endDate) {
        const endDateTime = new Date(endDate.toString());
        endDateTime.setHours(23, 59, 59, 999); // End of day
        query.createdAt.$lte = endDateTime;
      }
    }

    const { pageNum, skipNum, limitNum } = createPaginationQuery(
      Number(page),
      Number(limit),
    );

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("serviceId", "name type category rate serviceId")
        .sort({ createdAt: -1 })
        .skip(skipNum)
        .limit(limitNum)
        .select("-__v"),
      Order.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    const response: PaginatedResponse<(typeof orders)[0]> = {
      success: true,
      data: orders,
      pagination: {
        current: pageNum,
        pages: totalPages,
        total,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
      filters: {
        search,
        status,
        serviceId,
        minCharge,
        maxCharge,
        startDate,
        endDate,
      },
    };

    res.status(200).json(response);
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
};

export const getCustomerAccountStatus = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;

    const user = await findUserById(id);

    if (!user) {
      return handleError(res, 404, "User not found");
    }

    let userAccount = await UserAccount.findOne({ userId: user._id });

    if (!userAccount) {
      userAccount = new UserAccount({
        userId: user._id,
        balance: 0,
        totalSpent: 0,
      });
      await userAccount.save();
    }

    // Get order statistics
    const [totalOrders, orderStats] = await Promise.all([
      Order.countDocuments({ userId: user._id }),
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
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
};
