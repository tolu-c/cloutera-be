import express from "express";
import { authenticateAdmin } from "../middleware";
import {
  adminGetUserActivities,
  getUserActivities,
} from "../controllers/admin/activity";

const router = express.Router();

router.get("/", authenticateAdmin, adminGetUserActivities);
router.get("/:id", authenticateAdmin, getUserActivities);

export default router;