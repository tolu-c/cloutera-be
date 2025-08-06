import { CronJob } from "cron";
import { fetchAndSaveServices } from "../services/peaker";

export const servicesCronJob = () => {
  const job = new CronJob("0 0 * * *", fetchAndSaveServices); // Runs every day at midnight

  console.log("started cron job");

  job.start();
};
