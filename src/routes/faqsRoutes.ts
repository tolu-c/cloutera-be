import express from "express";
import {
  addFaq,
  deleteFaq,
  editFaq,
  getAllFaqs,
  getSingleFaq,
} from "../controllers/faq";
import { authenticateAdmin } from "../middleware";

const router = express.Router();

router.get("/", getAllFaqs);
router.get("/:faqId", getSingleFaq);
router.post("/add", authenticateAdmin, addFaq);
router.put("/:faqId/edit", authenticateAdmin, editFaq);
router.delete("/:faqId/delete", authenticateAdmin, deleteFaq);

export default router;
