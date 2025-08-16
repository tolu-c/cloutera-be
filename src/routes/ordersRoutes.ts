import express from "express";
import { authenticateToken } from "../middleware";
import { addOrder, getUserOrders } from "../controllers/orders";

const router = express.Router();

router.get("/list", authenticateToken, getUserOrders);
router.post("/add", authenticateToken, addOrder);

export default router;
