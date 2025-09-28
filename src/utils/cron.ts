import { CronJob } from "cron";
import { fetchAndSaveServices } from "../services/peaker";
import { processRescheduledNotifications } from "../services/notification";

export const servicesCronJob = () => {
  const job = new CronJob("0 0 * * *", fetchAndSaveServices); // Runs every day at midnight

  console.log("started cron job");

  job.start();
};

export async function notificationCronJob() {
  const job = new CronJob("0 * * * *", processRescheduledNotifications);

  console.log('started notification cron jon');

  job.start();
}
