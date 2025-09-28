import { AuthenticatedRequest } from "../../middleware";
import { Response } from "express";
import { handleError } from "../../utils/errorHandler";
import { createPaginationQuery } from "../../utils/createPaginationQuery";
import { Activity } from "../../models/activity";
import { PaginatedResponse } from "../../types/service.types";

export async function getUserActivities(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, search } = req.query;

    if (!id) {
      handleError(res, 400, "invalid id");
    }
    const query: any = {
      userId: id,
    };

    if (search) {
      const searchQuery = search.toString().trim();
      const searchRegex = { $regex: searchQuery, $options: "i" };
      query.$or = [{ action: searchRegex }];
    }

    const { pageNum, skipNum, limitNum } = createPaginationQuery(
      Number(page),
      Number(limit),
    );

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .sort({ createdAt: -1 })
        .skip(skipNum)
        .limit(limitNum),
      Activity.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    const response: PaginatedResponse<(typeof activities)[0]> = {
      message: "user activities fetched",
      success: true,
      data: activities,
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
        page,
        limit,
      },
    };

    res.status(200).json(response);
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
}

export async function adminGetUserActivities(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const query: any = {};

    if (search) {
      const searchQuery = search.toString().trim();
      const searchRegex = { $regex: searchQuery, $options: "i" };
      query.$or = [{ action: searchRegex }];
    }

    const { pageNum, skipNum, limitNum } = createPaginationQuery(
      Number(page),
      Number(limit),
    );

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .sort({ createdAt: -1 })
        .skip(skipNum)
        .limit(limitNum),
      Activity.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    const response: PaginatedResponse<(typeof activities)[0]> = {
      message: "user activities fetched",
      success: true,
      data: activities,
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
        page,
        limit,
      },
    };

    res.status(200).json(response);
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
}
