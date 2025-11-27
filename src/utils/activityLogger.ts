import { findUserById } from "../helpers";
import { Activity } from "../models/activity";

export async function logUserActivity(userId: string, action: string) {
  const user = await findUserById(userId);

  if (!user) {
    throw new Error("User does not exist");
  }

  const userAction = `${user.firstName} ${user.lastName} ${action}`;

  const activity = new Activity({
    userId: user._id,
    action: userAction,
  });

  await activity.save();
}
