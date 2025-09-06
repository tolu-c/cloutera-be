import express from "express";
import { authenticateAdmin } from "../middleware";
import {
  getCustomerAccountStatus,
  getUserById,
  getUserOrders,
  getUsers,
  getUserStats,
  toggleBlockUser,
} from "../controllers/admin/users";
import { getOrdersList, getOrdersStats } from "../controllers/admin/orders";
import {
  getDashboardStats,
  getDashboardTrends,
} from "../controllers/admin/dashboard";

const router = express.Router();

// users
router.get("/users", authenticateAdmin, getUsers);
router.get("/users/stats", authenticateAdmin, getUserStats);
router.get("/users/:id", authenticateAdmin, getUserById);
router.patch("/users/:id/block", authenticateAdmin, toggleBlockUser);
router.get("/users/:id/orders", authenticateAdmin, getUserOrders);
router.get("/users/:id/account", authenticateAdmin, getCustomerAccountStatus);
router.get("/orders/list", authenticateAdmin, getOrdersList);
router.get("/orders/stats", authenticateAdmin, getOrdersStats);
router.get("/dashboard/stats", authenticateAdmin, getDashboardStats);
router.get("/dashboard/trends", authenticateAdmin, getDashboardTrends);

export default router;
