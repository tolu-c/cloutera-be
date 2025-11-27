import express from "express";
import {
  getDashboardStats,
  getDashboardTrends,
} from "../controllers/admin/dashboard";
import { getOrdersList, getOrdersStats } from "../controllers/admin/orders";
import {
  adminManageUserBalance,
  deleteUser,
  getCustomerAccountStatus,
  getUserById,
  getUserOrders,
  getUserStats,
  getUsers,
  toggleBlockUser,
} from "../controllers/admin/users";
import { authenticateAdmin } from "../middleware";

const router = express.Router();

// users
router.get("/users", authenticateAdmin, getUsers);
router.get("/users/stats", authenticateAdmin, getUserStats);
router.get("/users/:id", authenticateAdmin, getUserById);
router.patch("/users/:id/block", authenticateAdmin, toggleBlockUser);
router.get("/users/:id/orders", authenticateAdmin, getUserOrders);
router.get("/users/:id/account", authenticateAdmin, getCustomerAccountStatus);
router.delete("/users/:id/delete", authenticateAdmin, deleteUser);
router.post("/users/:id/manage-balance", authenticateAdmin, adminManageUserBalance);
router.get("/orders/list", authenticateAdmin, getOrdersList);
router.get("/orders/stats", authenticateAdmin, getOrdersStats);
router.get("/dashboard/stats", authenticateAdmin, getDashboardStats);
router.get("/dashboard/trends", authenticateAdmin, getDashboardTrends);

export default router;
