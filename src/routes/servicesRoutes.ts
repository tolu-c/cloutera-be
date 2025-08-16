import express from "express";
import { authenticateToken } from "../middleware";
import {
  getAllServices,
  getServiceById,
  getServicesCategories,
} from "../controllers/services";

const router = express.Router();

// GET /api/services                    # Paginated with filters
// GET /api/services/categories         # Unique categories
// GET /api/services/types              # Unique types
// GET /api/services/stats              # Statistics
// GET /api/services/:id                # Single service
// POST /api/admin/services/sync        # Manual sync

router.get("/", authenticateToken, getAllServices);
router.get("/categories", authenticateToken, getServicesCategories);
router.get("/:serviceId", authenticateToken, getServiceById);

export default router;
