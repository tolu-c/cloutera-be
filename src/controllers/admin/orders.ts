import { AuthenticatedRequest } from "../../middleware";
import { Response } from "express";
import { handleError } from "../../utils/errorHandler";
import { Order } from "../../models/orders";
import { OrderStatus } from "../../types/enums";
import { PaginatedResponse } from "../../types/service.types";
import { createPaginationQuery } from "../../utils/createPaginationQuery";

// orders stats => all, completed, pending, cancelled
export const getOrdersStats = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const [total, completed, pending, cancelled] = await Promise.all([
      Order.countDocuments({}),
      Order.countDocuments({ status: OrderStatus.COMPLETED }),
      Order.countDocuments({ status: OrderStatus.PENDING }),
      Order.countDocuments({ status: OrderStatus.CANCELLED }),
    ]);

    const stats = {
      total,
      completed,
      pending,
      cancelled,
    };

    res.status(200).json({
      message: "Order statistics fetched successfully",
      success: true,
      data: stats,
    });
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
};

// order lists, populate the user to display the user {firstName, lastName, email, _id}
export const getOrdersList = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      status,
      userId,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query: any = {};

    // Search by order ID or link
    if (search) {
      const searchQuery = search.toString().trim();
      if (/^\d+$/.test(searchQuery)) {
        query.orderId = parseInt(searchQuery);
      } else {
        query.link = { $regex: searchQuery, $options: "i" };
      }
    }

    // Filter by status
    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      query.status = status;
    }

    // Filter by user ID
    if (userId) {
      query.userId = userId;
    }

    const { pageNum, limitNum, skipNum } = createPaginationQuery(
      Number(page),
      Number(limit),
    );

    // Sort configuration
    const sortConfig: any = {};
    sortConfig[sortBy.toString()] = sortOrder === "asc" ? 1 : -1;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("userId", "firstName lastName email _id")
        .populate({
          path: "serviceId",
          select: "name serviceId type category",
          options: { strictPopulate: false },
        })
        // .populate('serviceId', 'name type category rate serviceId')
        .sort(sortConfig)
        .skip(skipNum)
        .limit(limitNum)

        .select("-__v"),
      Order.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    const response: PaginatedResponse<(typeof orders)[0]> = {
      message: "Orders fetched successfully",
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
        userId,
        sortBy,
        sortOrder,
      },
    };

    res.status(200).json(response);
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
};
