import { Order } from "../models/orders";
import { OrderStatus } from "../types/enums";
import { getPeakerBulkOrders } from "./peaker";

// In-memory state to track pending orders
let pendingOrders: Set<number> = new Set();

/**
 * Initialize the pending orders state
 * Fetches all pending orders from database and stores them in memory
 */
export async function initializePendingOrders() {
  try {
    const orders = await Order.find({
      status: {
        $in: [
          OrderStatus.PENDING,
          OrderStatus.Processing,
          OrderStatus.Partial,
          OrderStatus.InProgress,
        ],
      },
    }).select("orderId");

    pendingOrders = new Set(orders.map((order) => order.orderId));
    console.log(
      `Initialized pending orders monitor with ${pendingOrders.size} orders`,
    );
  } catch (error) {
    console.error("Error initializing pending orders:", error);
    throw error;
  }
}

/**
 * Add a new order to the monitoring state
 */
export function addOrderToMonitor(orderId: number) {
  pendingOrders.add(orderId);
}

/**
 * Remove an order from the monitoring state
 */
export function removeOrderFromMonitor(orderId: number) {
  pendingOrders.delete(orderId);
}

/**
 * Get the current list of pending orders
 */
export function getPendingOrders(): number[] {
  return Array.from(pendingOrders);
}

/**
 * Helper function to check if a response is an error
 */
function isPeakerError(response: any): response is { error: string } {
  return "error" in response;
}

/**
 * Helper function to batch array into chunks
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Monitor and update order statuses
 * This function checks all pending orders and updates their status using bulk API
 */
export async function monitorOrderStatuses() {
  try {
    // Get fresh list of pending orders from database
    const orders = await Order.find({
      status: {
        $in: [
          OrderStatus.PENDING,
          OrderStatus.Processing,
          OrderStatus.Partial,
          OrderStatus.InProgress,
        ],
      },
    }).select("orderId status");

    // Update in-memory state with fresh data
    pendingOrders = new Set(orders.map((order) => order.orderId));

    console.log(
      `[${new Date().toISOString()}] Monitoring ${orders.length} pending orders`,
    );

    if (orders.length === 0) {
      console.log("No pending orders to monitor");
      return;
    }

    let updatedCount = 0;
    let completedCount = 0;
    let errorCount = 0;

    // Extract order IDs
    const orderIds = orders.map((order) => order.orderId);

    // Batch orders into groups of 100 (max supported by API)
    const batches = chunkArray(orderIds, 100);

    console.log(`Processing ${batches.length} batch(es) of orders`);

    // Process each batch
    for (const batch of batches) {
      try {
        // Fetch bulk status from Peaker API
        const bulkStatuses = await getPeakerBulkOrders(batch);

        // Process each order in the response
        for (const [orderIdStr, peakerStatus] of Object.entries(bulkStatuses)) {
          const orderId = parseInt(orderIdStr);

          // Check if response is an error
          if (isPeakerError(peakerStatus)) {
            errorCount++;
            console.error(`Error for order ${orderId}: ${peakerStatus.error}`);
            continue;
          }

          // Find the order in our database list
          const order = orders.find((o) => o.orderId === orderId);
          if (!order) {
            console.warn(`Order ${orderId} not found in database list`);
            continue;
          }

          // Check if status has changed
          if (peakerStatus.status !== order.status) {
            // Update order in database
            await Order.findOneAndUpdate(
              { orderId },
              {
                status: peakerStatus.status,
                startCount: parseInt(peakerStatus.start_count) || 0,
                remains: parseInt(peakerStatus.remains) || 0,
              },
            );

            updatedCount++;

            // If order is completed or cancelled, remove from monitoring
            if (
              peakerStatus.status === OrderStatus.COMPLETED ||
              peakerStatus.status === OrderStatus.CANCELLED ||
              peakerStatus.status === OrderStatus.REFUNDED
            ) {
              removeOrderFromMonitor(orderId);
              completedCount++;
              console.log(
                `Order ${orderId} ${peakerStatus.status.toLowerCase()}`,
              );
            } else {
              console.log(
                `Order ${orderId} status updated to ${peakerStatus.status}`,
              );
            }
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`Error processing batch:`, error);
        // Continue processing other batches even if one fails
      }
    }

    console.log(
      `[${new Date().toISOString()}] Status check complete: ${updatedCount} updated, ${completedCount} completed/cancelled, ${errorCount} errors`,
    );
  } catch (error) {
    console.error("Error in monitorOrderStatuses:", error);
  }
}
