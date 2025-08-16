import { Response } from "express";
import { AuthenticatedRequest } from "../middleware";
import { handleError } from "../utils/errorHandler";
import { Service } from "../models/service";
import { PaginatedResponse } from "../types/service.types";

export const getAllServices = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const user = req.user;
    const {
      page = 1,
      limit = 50,
      search,
      category,
      type,
      refill,
      minRate,
      maxRate,
      cancel,
    } = req.query;

    if (!user) {
      handleError(res, 401, "Unauthorized");
      return;
    }

    const query: any = {};

    // search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } },
      ];
    }
    // filter
    if (category) {
      query.category = { $regex: category, $options: "i" };
    }
    // type
    if (type) {
      query.type = { $regex: type, $options: "i" };
    }
    // Rate range filter
    if (minRate || maxRate) {
      query.$expr = {};
      if (minRate) {
        query.$expr.$gte = [
          { $toDouble: "$rate" },
          parseFloat(minRate.toString()),
        ];
      }
      if (maxRate) {
        if (minRate) {
          query.$expr = {
            $and: [
              {
                $gte: [{ $toDouble: "$rate" }, parseFloat(minRate.toString())],
              },
              {
                $lte: [{ $toDouble: "$rate" }, parseFloat(maxRate.toString())],
              },
            ],
          };
        } else {
          query.$expr.$lte = [
            { $toDouble: "$rate" },
            parseFloat(maxRate.toString()),
          ];
        }
      }
    }
    // Boolean filters
    if (refill !== undefined) {
      query.refill = refill === "true";
    }
    if (cancel !== undefined) {
      query.cancel = cancel === "true";
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page.toString()));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit.toString())));
    const skipNum = (pageNum - 1) * limitNum;
    // Sort
    // const sortObj: any = {};
    // sortObj[sortBy.toString()] = sortOrder === 'desc' ? -1 : 1;
    const [services, total] = await Promise.all([
      Service.find(query)
        // .sort(sortObj)
        .skip(skipNum)
        .limit(limitNum)
        .select("-__v"),
      Service.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    const response: PaginatedResponse<(typeof services)[0]> = {
      success: true,
      data: services,
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
        category,
        type,
        minRate,
        maxRate,
        refill,
        cancel,
      },
    };

    res.status(200).json(response);
  } catch (e) {
    handleError(
      res,
      500,
      `${e instanceof Error ? e.message : "Error fetching services"}`,
    );
  }
};

export const getServicesCategories = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const user = req.user;
    if (!user) {
      handleError(res, 401, "Unauthorized");
      return;
    }

    const categories = await Service.distinct("category");
    categories.sort();

    res.status(200).json({
      messsage: "Categories fetched successfully",
      data: {
        categories,
      },
    });
  } catch (error) {
    handleError(
      res,
      500,
      `${error instanceof Error ? error.message : "Error fetching services"}`,
    );
  }
};

export const getServiceById = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const user = req.user;
    const { serviceId } = req.params;
    if (!user) {
      handleError(res, 401, "Unauthorized");
      return;
    }

    if (!serviceId) {
      handleError(res, 400, "Service ID is required");
      return;
    }

    const service = await Service.findOne({ serviceId, isActive: true });

    if (!service) {
      handleError(res, 404, "Service not found");
      return;
    }

    res.status(200).json({
      message: "success",
      success: true,
      data: service,
    });
  } catch (error) {
    handleError(
      res,
      500,
      `${error instanceof Error ? error.message : "Error fetching services"}`,
    );
  }
};
