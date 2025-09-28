import { AuthenticatedRequest } from "../../middleware";
import { Response } from "express";
import { handleError } from "../../utils/errorHandler";
import Notification from "../../models/notification";
import { NotificationStatusEnum } from "../../types/notification.types";
import { createPaginationQuery } from "../../utils/createPaginationQuery";
import { PaginatedResponse } from "../../types/service.types";

export async function createNotification(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { title, message, type } = req.body;

    if (!title || !message || !type) {
      handleError(res, 400, "Missing required fields");
      return

    }

    const notification = new Notification({
      title,
      message,
      type,
      status: NotificationStatusEnum.Sent,
    });
    await notification.save();

    res.status(201).json({
      success: true,
      message: "notification created successfully.",
    });
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
}

export async function scheduleNotification(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { title, message, type, date, time } = req.body;
    if (!title || !message || !type || !date || !time) {
      handleError(res, 400, "Missing required fields");
      return
    }

    const scheduledDate =
      date && time ? new Date(`${date}T${time}:00`) : undefined;

    const notification = new Notification({
      title,
      message,
      type,
      status: NotificationStatusEnum.Scheduled,
      scheduledDate,
    });
    await notification.save();

    res.status(201).json({
      success: true,
      message: "notification scheduled successfully.",
    });
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
}

export async function createRecurringNotification(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { title, message, type, date, time, freq, endDate } = req.body;
    if (!title || !message || !type || !date || !time || !freq || !endDate) {
      handleError(res, 400, "Missing required fields");
      return
    }

    const scheduledDate =
      date && time ? new Date(`${date}T${time}:00`) : undefined;

    const notification = new Notification({
      title,
      message,
      type,
      status: NotificationStatusEnum.Scheduled,
      scheduledDate,
      frequency: freq,
      endDate,
      isRecurring: true,
    });
    await notification.save();

    res.status(201).json({
      success: true,
      message: "notification scheduled successfully.",
    });
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
}

export async function notificationStats(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const [sent, scheduled] = await Promise.all([
      Notification.countDocuments({ status: NotificationStatusEnum.Sent }),
      Notification.countDocuments({ status: NotificationStatusEnum.Scheduled }),
    ]);

    const stats = {
      sent,
      scheduled,
    };

    res.status(200).json({
      success: true,
      message: "notification stats",
      data: stats,
    });
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
}

export async function listNotification(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const notifications = await Notification.find({
      isRead: false,
      status: NotificationStatusEnum.Sent,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
}

export async function adminListSentNotifications(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { page = 1, limit = 50, search } = req.query;

    const query: any = {
      status: NotificationStatusEnum.Sent,
    };

    if (search) {
      const searchQuery = search.toString().trim();
      const searchRegex = { $regex: searchQuery, $options: "i" };
      query.$or = [{ title: searchRegex }, { message: searchRegex }];
    }

    const { pageNum, skipNum, limitNum } = createPaginationQuery(
      Number(page),
      Number(limit),
    );

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skipNum)
        .limit(limitNum),
      Notification.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    const response: PaginatedResponse<(typeof notifications)[0]> = {
      message: "sent notifications fetched",
      success: true,
      data: notifications,
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

export async function adminListScheduledNotifications(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { page = 1, limit = 50, search } = req.query;

    const query: any = {
      status: NotificationStatusEnum.Scheduled,
    };

    if (search) {
      const searchQuery = search.toString().trim();
      const searchRegex = { $regex: searchQuery, $options: "i" };
      query.$or = [{ title: searchRegex }, { message: searchRegex }];
    }

    const { pageNum, skipNum, limitNum } = createPaginationQuery(
      Number(page),
      Number(limit),
    );

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skipNum)
        .limit(limitNum),
      Notification.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    const response: PaginatedResponse<(typeof notifications)[0]> = {
      message: "scheduled notifications fetched",
      success: true,
      data: notifications,
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

export async function viewNotification(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = req.params;

    if (!id) {
      handleError(res, 400, "Required ID");
    }

    const notification = await Notification.findById(id);

    res.status(200).json({
      success: true,
      message: "Notification",
      data: notification,
    });
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
}

export async function markNotificationAsRead(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = req.params;

    if (!id) {
      handleError(res, 400, "Required ID");
    }
    await Notification.findByIdAndUpdate(id, {
      isRead: true,
    });

    res.status(200).json({
      message: "Notification marked as read",
      success: true,
    });
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
}

export async function deleteNotification(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = req.params;
    if (!id) {
      handleError(res, 400, "Required ID");
    }

    await Notification.findByIdAndDelete(id);
    res.status(200).json({
      message: "Notification deleted successfully.",
      success: true,
    });
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
}
