import { CronJob } from "cron";
import { processRescheduledNotifications } from "../services/notification";
import { fetchAndSaveServices, getPeakerBalance } from "../services/peaker";
import { sendEmailWithResend } from "./index";

export const servicesCronJob = () => {
  const job = new CronJob("0 0 * * *", fetchAndSaveServices); // Runs every day at midnight

  console.log("started cron job");
  job.start();
};

export async function notificationCronJob() {
  const job = new CronJob("0 * * * *", processRescheduledNotifications);

  console.log("started notification cron jon");

  job.start();
}

export async function checkPeakerBalanceCronJob() {
 // 0 0 * * *
  const job = new CronJob("0 0 * * *", async () => {
    try {
      console.log("Checking Peaker balance...");

      const balanceData = await getPeakerBalance();

      const balance = Number(balanceData.balance);

      if (balance < 20) {
        console.log(
          `Low balance detected: ${balanceData.balance} ${balanceData.currency}`,
        );

        await sendEmailWithResend(
          "oladosuolawale362@gmail.com",
          "low-balance-email",
          {
            balance: Number(balance.toFixed(2)),
            currency: balanceData.currency,
          },
        ).then(() => {
          console.log("Low balance email sent successfully");
        });
      } else {
        console.log(
          `Balance is sufficient: ${balanceData.balance} ${balanceData.currency}`,
        );
      }
    } catch (error) {
      console.error("Error checking Peaker balance:", error);
    }
  }); // Runs every day at midnight

  console.log("Started Peaker balance check cron job (runs every 24 hours)");

  job.start();
}
