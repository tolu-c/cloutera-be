import { AuthenticatedRequest } from "../../middleware";
import { Response } from "express";
import { handleError } from "../../utils/errorHandler";
import { Order } from "../../models/orders";
import User from "../../models/user";
import { OrderStatus } from "../../types/enums";

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

export interface DashboardTrends {
  thisWeek: DailyData[];
  lastWeek: DailyData[];
}

interface DailyData {
  day: string;
  orders: number;
  revenue: number;
  customers: number;
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

    // This week data
    const [
      totalCustomers,
      activeCustomersThisWeek,
      totalOrdersThisWeek,
      completedOrdersThisWeek,
      totalRevenueThisWeek
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({
        $expr: {
          $gt: [
            {
              $size: {
                $ifNull: [
                  {
                    $filter: {
                      input: "$orders",
                      cond: { $gte: ["$$this.createdAt", startOfThisWeek] }
                    }
                  },
                  []
                ]
              }
            },
            0
          ]
        }
      }),
      Order.countDocuments({ createdAt: { $gte: startOfThisWeek } }),
      Order.countDocuments({
        createdAt: { $gte: startOfThisWeek },
        status: OrderStatus.COMPLETED
      }),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfThisWeek },
            status: OrderStatus.COMPLETED
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$charge" }
          }
        }
      ])
    ]);

    // Last week data
    const [
      activeCustomersLastWeek,
      totalOrdersLastWeek,
      completedOrdersLastWeek,
      totalRevenueLastWeek
    ] = await Promise.all([
      User.countDocuments({
        $expr: {
          $gt: [
            {
              $size: {
                $ifNull: [
                  {
                    $filter: {
                      input: "$orders",
                      cond: {
                        $and: [
                          { $gte: ["$$this.createdAt", startOfLastWeek] },
                          { $lte: ["$$this.createdAt", endOfLastWeek] }
                        ]
                      }
                    }
                  },
                  []
                ]
              }
            },
            0
          ]
        }
      }),
      Order.countDocuments({
        createdAt: { $gte: startOfLastWeek, $lte: endOfLastWeek }
      }),
      Order.countDocuments({
        createdAt: { $gte: startOfLastWeek, $lte: endOfLastWeek },
        status: OrderStatus.COMPLETED
      }),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfLastWeek, $lte: endOfLastWeek },
            status: OrderStatus.COMPLETED
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$charge" }
          }
        }
      ])
    ]);

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
        percentageChange: Math.round(customerChange)
      },
      totalOrders: {
        current: await Order.countDocuments({}),
        active: totalOrdersThisWeek,
        percentageChange: Math.round(orderChange)
      },
      totalRevenue: {
        current: (await Order.aggregate([
          { $match: { status: OrderStatus.COMPLETED } },
          { $group: { _id: null, total: { $sum: "$charge" } } }
        ]))[0]?.total || 0,
        active: revenueThisWeek,
        percentageChange: Math.round(revenueChange)
      }
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
    const trends: DashboardTrends = {
      thisWeek: [],
      lastWeek: []
    };

    // Generate data for both weeks
    for (let week = 0; week < 2; week++) {
      const weekData: DailyData[] = [];

      for (let day = 0; day < 7; day++) {
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() - (week * 7) - (6 - day));

        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const [dayOrders, dayRevenue, dayCustomers] = await Promise.all([
          Order.countDocuments({
            createdAt: { $gte: startOfDay, $lte: endOfDay }
          }),
          Order.aggregate([
            {
              $match: {
                createdAt: { $gte: startOfDay, $lte: endOfDay },
                status: OrderStatus.COMPLETED
              }
            },
            { $group: { _id: null, total: { $sum: "$charge" } } }
          ]),
          User.countDocuments({
            createdAt: { $gte: startOfDay, $lte: endOfDay }
          })
        ]);

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        weekData.push({
          day: dayNames[targetDate.getDay()],
          orders: dayOrders,
          revenue: dayRevenue[0]?.total || 0,
          customers: dayCustomers
        });
      }

      if (week === 0) {
        trends.thisWeek = weekData;
      } else {
        trends.lastWeek = weekData;
      }
    }

    res.status(200).json({
      message: "Dashboard trends fetched successfully",
      success: true,
      data: trends
    });
  } catch (e) {
    handleError(res, 500, `Server error: ${e}`);
  }
};