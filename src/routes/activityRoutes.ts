import express from "express";
import {
  adminGetUserActivities,
  getUserActivities,
} from "../controllers/admin/activity";
import { authenticateAdmin } from "../middleware";

const router = express.Router();

router.get("/", authenticateAdmin, adminGetUserActivities);
router.get("/:id", authenticateAdmin, getUserActivities);

export default router;
