import express from "express";
import { authenticateAdmin, authenticateToken } from "../middleware";
import {
  adminListScheduledNotifications,
  adminListSentNotifications,
  createNotification,
  createRecurringNotification,
  deleteNotification,
  listNotification,
  markNotificationAsRead,
  notificationStats,
  scheduleNotification,
  viewNotification,
} from "../controllers/admin/nofication";

const router = express.Router();

router.get("/", authenticateToken, listNotification);
router.get("/stats", authenticateAdmin, notificationStats);
router.get("/sent", authenticateAdmin, adminListSentNotifications);
router.get("/scheduled", authenticateAdmin, adminListScheduledNotifications);
router.post("/add", authenticateAdmin, createNotification);
router.post("/add/schedule", authenticateAdmin, scheduleNotification);
router.post("/add/recurring", authenticateAdmin, createRecurringNotification);
router.get("/:id", authenticateToken, viewNotification);
router.patch("/:id", authenticateToken, markNotificationAsRead);
router.delete("/:id", authenticateAdmin, deleteNotification);

export default router;
