import { AuthenticatedRequest } from "../../middleware";
import { Response } from "express";
import { handleError } from "../../utils/errorHandler";
import { Order } from "../../models/orders";
import User from "../../models/user";
import { OrderStatus, UserRole } from "../../types/enums";
import { getPeakerBalance } from "../../services/peaker";

// Day name lookup used when building daily trend buckets
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface DashboardStats {
  totalCustomers: {
    current: number;
    active: number;
    percentageChange: number;
  };
  totalOrders: {
    current: number;
    active: number;
    percentageChange: number;
  };
  totalRevenue: {
    current: number;
    active: number;
    percentageChange: number;
  };
}

// Leaf type declared first because WeekTotals and WeekData reference it
interface DailyData {
  day: string;
  orders: number;
  revenue: number;
  // "customers" here means new user registrations on that day,
  // not the same as the "active customers" metric in DashboardStats
  customers: number;
}

interface WeekTotals {
  customers: number;
  orders: number;
  revenue: number;
}

interface WeekData {
  totals: WeekTotals;
  daily: DailyData[];
}

export interface DashboardTrends {
  thisWeek: WeekData;
  lastWeek: WeekData;
}

// Dashboard stats with week-over-week comparison
export const getDashboardStats = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - 6); // Last 7 days
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setTime(startOfThisWeek.getTime() - 1);

    const [
      totalCustomers,
      activeUserIdsThisWeek,
      totalOrdersThisWeek,
      totalRevenueThisWeek,
      totalOrders,
      totalRevenueAllTime,
      activeUserIdsLastWeek,
      totalOrdersLastWeek,
      totalRevenueLastWeek,
    ] = await Promise.all([
      User.countDocuments({ role: UserRole.Customer }),
      Order.distinct("userId", { createdAt: { $gte: startOfThisWeek } }),
      Order.countDocuments({ createdAt: { $gte: startOfThisWeek } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfThisWeek }, status: OrderStatus.COMPLETED } },
        { $group: { _id: null, total: { $sum: "$charge" } } },
      ]),
      Order.countDocuments({}),
      Order.aggregate([
        { $match: { status: OrderStatus.COMPLETED } },
        { $group: { _id: null, total: { $sum: "$charge" } } },
      ]),
      Order.distinct("userId", { createdAt: { $gte: startOfLastWeek, $lte: endOfLastWeek } }),
      Order.countDocuments({ createdAt: { $gte: startOfLastWeek, $lte: endOfLastWeek } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfLastWeek, $lte: endOfLastWeek }, status: OrderStatus.COMPLETED } },
        { $group: { _id: null, total: { $sum: "$charge" } } },
      ]),
    ]);

    const activeCustomersThisWeek = activeUserIdsThisWeek.length;
    const activeCustomersLastWeek = activeUserIdsLastWeek.length;

    const revenueThisWeek = totalRevenueThisWeek[0]?.total || 0;
    const revenueLastWeek = totalRevenueLastWeek[0]?.total || 0;

    // Calculate percentage changes
    const customerChange = activeCustomersLastWeek === 0 ? 0 :
      ((activeCustomersThisWeek - activeCustomersLastWeek) / activeCustomersLastWeek) * 100;

    const orderChange = totalOrdersLastWeek === 0 ? 0 :
      ((totalOrdersThisWeek - totalOrdersLastWeek) / totalOrdersLastWeek) * 100;

    const revenueChange = revenueLastWeek === 0 ? 0 :
      ((revenueThisWeek - revenueLastWeek) / revenueLastWeek) * 100;

    const stats: DashboardStats = {
      totalCustomers: {
        current: totalCustomers,
        active: activeCustomersThisWeek,
        percentageChange: Math.round(customerChange),
      },
      totalOrders: {
        current: totalOrders,
        active: totalOrdersThisWeek,
        percentageChange: Math.round(orderChange),
      },
      totalRevenue: {
        current: totalRevenueAllTime[0]?.total || 0,
        active: revenueThisWeek,
        percentageChange: Math.round(revenueChange),
      },
    };

    res.status(200).json({
      message: "Dashboard statistics fetched successfully",
      success: true,
      data: stats
    });
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
};

// Dashboard trends for weekly chart
export const getDashboardTrends = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const now = new Date();

    // thisWeek = last 7 days (days 0–6 ago), lastWeek = 7 days before that (days 7–13 ago)
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - 6);
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setTime(startOfThisWeek.getTime() - 1);

    // Group by ISO date string so results are easy to key in JavaScript.
    // Three pipelines replace 14 × 3 = 42 sequential round-trips.
    const dateGroup = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };

    const [ordersByDay, revenueByDay, newUsersByDay] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfLastWeek, $lte: now } } },
        { $group: { _id: dateGroup, orders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfLastWeek, $lte: now },
            status: OrderStatus.COMPLETED,
          },
        },
        { $group: { _id: dateGroup, revenue: { $sum: "$charge" } } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: startOfLastWeek, $lte: now } } },
        { $group: { _id: dateGroup, customers: { $sum: 1 } } },
      ]),
    ]);

    // Index aggregation results by date string for O(1) lookup
    const ordersMap = new Map(ordersByDay.map((r) => [r._id, r.orders as number]));
    const revenueMap = new Map(revenueByDay.map((r) => [r._id, r.revenue as number]));
    const usersMap = new Map(newUsersByDay.map((r) => [r._id, r.customers as number]));

    // Pivot flat aggregation results into the thisWeek / lastWeek structure
    const buildWeekData = (weekStart: Date): WeekData => {
      const daily: DailyData[] = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);

        const dateKey = date.toISOString().slice(0, 10); // "YYYY-MM-DD"
        daily.push({
          day: DAY_NAMES[date.getDay()],
          orders: ordersMap.get(dateKey) ?? 0,
          revenue: revenueMap.get(dateKey) ?? 0,
          customers: usersMap.get(dateKey) ?? 0,
        });
      }

      const totals: WeekTotals = {
        customers: daily.reduce((sum, d) => sum + d.customers, 0),
        orders: daily.reduce((sum, d) => sum + d.orders, 0),
        revenue: daily.reduce((sum, d) => sum + d.revenue, 0),
      };

      return { totals, daily };
    };

    const thisWeek = buildWeekData(startOfThisWeek);
    const lastWeek = buildWeekData(startOfLastWeek);

    res.status(200).json({
      message: "Dashboard trends fetched successfully",
      success: true,
      data: { thisWeek, lastWeek } satisfies DashboardTrends,
    });
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
};

export async function getAdminPeakerBalance(req: AuthenticatedRequest, res: Response) {
  try {
    const balance = await getPeakerBalance();
    
    res.status(200).json({
      message: "Peaker balance fetched successfully",
      success: true,
      data: balance,
    });
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
}