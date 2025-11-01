import { CronJob } from "cron";
import {
  initializePendingOrders,
  monitorOrderStatuses,
} from "../services/orderStatusMonitor";

let cronJob: CronJob | null = null;

/**
 * Start the order status monitoring cron job
 * Runs every 3 minutes to check and update order statuses
 */
export async function startOrderStatusCron() {
  try {
    // Initialize pending orders on startup
    await initializePendingOrders();

    // Schedule cron job to run every 3 minutes
    // Cron expression: */3 * * * * means "every 3 minutes"
    cronJob = new CronJob("*/3 * * * *", async () => {
      console.log("\n=== Starting Order Status Check ===");
      await monitorOrderStatuses();
      console.log("=== Order Status Check Complete ===\n");
    });

    cronJob.start();

    console.log("Order status monitoring cron job started (runs every 3 minutes)");

    // Optionally run immediately on startup
    console.log("\n=== Running Initial Order Status Check ===");
    await monitorOrderStatuses();
    console.log("=== Initial Order Status Check Complete ===\n");
  } catch (error) {
    console.error("Error starting order status cron job:", error);
    throw error;
  }
}

/**
 * Stop the order status monitoring cron job
 */
export function stopOrderStatusCron() {
  if (cronJob) {
    cronJob.stop();
    console.log("Order status monitoring cron job stopped");
  }
}
