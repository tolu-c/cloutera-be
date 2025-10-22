import { Response } from "express";
import { AuthenticatedRequest } from "../middleware";
import { handleError } from "../utils/errorHandler";
import { Service } from "../models/service";
import { Order } from "../models/orders";
import { OrderStatus } from "../types/enums";
import { PaginatedResponse } from "../types/service.types";
import { deductBalance, refundBalance } from "./userAccount";
import { logUserActivity } from "../utils/activityLogger";
import { placePeakerOrder } from "../services/peaker";
import { addOrderToMonitor } from "../services/orderStatusMonitor";

export const addOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const { serviceId, link, quantity } = req.body;

    if (!user) {
      handleError(res, 401, "Unauthorized");
      return;
    }

    // Validate required fields
    if (!serviceId || !link || !quantity) {
      handleError(res, 400, "Service ID, link, and quantity are required");
      return;
    }

    // Validate quantity
    if (quantity <= 0) {
      handleError(res, 400, "Quantity must be greater than 0");
      return;
    }

    // Check if service exists and is active
    const service = await Service.findOne({ serviceId });
    if (!service || !service.isActive) {
      handleError(res, 404, "Service not found or inactive");
      return;
    }

    // Validate quantity against service min/max
    const minQuantity = parseInt(service.min);
    const maxQuantity = parseInt(service.max);

    if (quantity < minQuantity) {
      handleError(res, 400, `Minimum quantity is ${minQuantity}`);
      return;
    }

    if (quantity > maxQuantity) {
      handleError(res, 400, `Maximum quantity is ${maxQuantity}`);
      return;
    }

    // Calculate charge
    const rate = parseFloat(service.rate);
    const charge = rate * quantity;

    const balanceDeducted = await deductBalance(user.userId, charge);
    if (!balanceDeducted) {
      handleError(res, 400, "Insufficient balance");
      return;
    }

    const peakerOrderRes = await placePeakerOrder({
      serviceId: serviceId,
      link,
      quantity,
    });

    if (peakerOrderRes.error) {
      await refundBalance(user.userId, charge);

      handleError(res, 400, "Failed to place order");
      return;
    }

    console.log('peaker order id', peakerOrderRes.order);
    // Create order
    const order = new Order({
      orderId: peakerOrderRes.order,
      userId: user.userId,
      serviceId: service._id,
      link,
      quantity,
      charge,
      remains: quantity,
      status: OrderStatus.PENDING,
    });
    await order.populate("serviceId", "name type category rate");
    await order.save();
    // Populate service details for response

    // Add order to monitoring system
    addOrderToMonitor(peakerOrderRes.order);

    await logUserActivity(user.userId, "placed an order.");

    res.status(201).json({
      success: true,
      message: "Order created successfully",
    });
  } catch (error) {
    handleError(
      res,
      500,
      `${error instanceof Error ? error.message : "Error creating order"}`,
    );
  }
};

export const getUserOrders = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const user = req.user;
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

    if (!user) {
      handleError(res, 401, "Unauthorized");
      return;
    }

    const query: any = { userId: user.userId };

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

    // Pagination
    const pageNum = Math.max(1, parseInt(page.toString()));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit.toString())));
    const skipNum = (pageNum - 1) * limitNum;

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
    handleError(
      res,
      500,
      `${e instanceof Error ? e.message : "Error fetching orders"}`,
    );
  }
};
