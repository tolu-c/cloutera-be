import Notification from "../models/notification";
import { NotificationStatusEnum } from "../types/notification.types";

export async function processRescheduledNotifications() {
  const now = new Date();
  const dueNotifications = await Notification.find({
    scheduledDate: { $lte: now },
    isRead: false,
  })
    .sort({ scheduledDate: 1 })
    .limit(100);

  for (const notification of dueNotifications) {
    notification.status = NotificationStatusEnum.Sent;
    await notification.save();
  }
}
