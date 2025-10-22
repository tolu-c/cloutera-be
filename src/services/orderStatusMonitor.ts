import { Order } from "../models/orders";
import { OrderStatus } from "../types/enums";
import { getPeakerOrderStatus } from "./peaker";

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
        $in: [OrderStatus.PENDING, OrderStatus.Processing, OrderStatus.Partial],
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
 * Monitor and update order statuses
 * This function checks all pending orders and updates their status
 */
export async function monitorOrderStatuses() {
  try {
    // Get fresh list of pending orders from database
    const orders = await Order.find({
      status: {
        $in: [OrderStatus.PENDING, OrderStatus.Processing, OrderStatus.Partial],
      },
    }).select("orderId status");

    // Update in-memory state with fresh data
    pendingOrders = new Set(orders.map((order) => order.orderId));

    console.log(
      `[${new Date().toISOString()}] Monitoring ${orders.length} pending orders`,
    );

    let updatedCount = 0;
    let completedCount = 0;
    let errorCount = 0;

    // Process each order
    for (const order of orders) {
      try {
        // Fetch status from Peaker API
        const peakerStatus = await getPeakerOrderStatus(order.orderId);

        // Check if status has changed
        if (peakerStatus.status !== order.status) {
          // Update order in database
          await Order.findOneAndUpdate(
            { orderId: order.orderId },
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
            removeOrderFromMonitor(order.orderId);
            completedCount++;
            console.log(
              `Order ${order.orderId} ${peakerStatus.status.toLowerCase()}`,
            );
          } else {
            console.log(
              `Order ${order.orderId} status updated to ${peakerStatus.status}`,
            );
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`Error checking status for order ${order.orderId}:`, error);
        // Continue processing other orders even if one fails
      }
    }

    console.log(
      `[${new Date().toISOString()}] Status check complete: ${updatedCount} updated, ${completedCount} completed/cancelled, ${errorCount} errors`,
    );
  } catch (error) {
    console.error("Error in monitorOrderStatuses:", error);
  }
}
