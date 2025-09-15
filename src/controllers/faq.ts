import Faq from "../models/faq";
import { Response, Request } from "express";
import { handleError } from "../utils/errorHandler";
import { AuthenticatedRequest } from "../middleware";
import { validateIds } from "../helpers";

// :=> /faqs/
export const getAllFaqs = async (req: Request, res: Response) => {
  try {
    const faqs = await Faq.find();

    res.status(200).json({
      message: "Faqs fetched successfully",
      data: faqs,
    });
  } catch (error) {
    handleError(res, 500, "Server error");
  }
};

export const getSingleFaq = async (req: Request, res: Response) => {
  try {
    const { faqId } = req.params;

    if (!faqId) {
      handleError(res, 400, "Missing id");
      return;
    }

    const faq = await Faq.findById({ _id: faqId });

    if (!faq) {
      handleError(res, 404, "No Faq found for this id");
      return;
    }

    res.status(200).json({
      message: "success",
      data: {
        faq,
      },
    });
  } catch (error) {
    console.log(error);
    handleError(res, 500, "Server error");
  }
};

export const addFaq = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const admin = req.user;
    if (!admin) {
      handleError(res, 401, "Unauthorized");
      return;
    }

    const { question, answer } = req.body;

    if (!question || !answer) {
      handleError(res, 400, "Question and Answer are required");
      return;
    }
    if (question.trim().length === 0 || answer.trim().length === 0) {
      handleError(res, 400, "Question and answer cannot be empty");
      return;
    }

    const faq = new Faq({
      question,
      answer,
    });
    await faq.save();

    res.status(201).json({
      message: "Faq added!",
      success: true,
    });
  } catch {
    handleError(res, 500, "Failed to Add Faq");
  }
};

export const editFaq = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const admin = req.user;
    if (!admin) {
      handleError(res, 401, "Unauthorized");
      return;
    }

    const { question, answer } = req.body;
    const { faqId } = req.params;

    if (!faqId) {
      handleError(res, 400, "Missing id");
      return;
    }

    const faq = await Faq.findById({ _id: faqId });

    if (!faq) {
      handleError(res, 404, "No Faq found for this id");
      return;
    }
    if (!question || !answer) {
      handleError(res, 400, "Question and Answer are required");
      return;
    }
    if (question.trim().length === 0 || answer.trim().length === 0) {
      handleError(res, 400, "Question and answer cannot be empty");
      return;
    }

    faq.question = question;
    faq.answer = answer;
    await faq.save();

    res.status(200).json({
      message: "Updated Faq!",
      success: true,
      data: faq,
    });
  } catch {
    handleError(res, 500, "Failed to edit faq");
  }
};

export const deleteFaq = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const admin = req.user;
    if (!admin) {
      handleError(res, 401, "Unauthorized");
      return;
    }

    const { faqId } = req.params;

    if (!faqId) {
      handleError(res, 400, "Missing id");
      return;
    }
    validateIds(faqId, res);

    const deletedFaq = await Faq.findByIdAndDelete(faqId);

    if (!deletedFaq) {
      handleError(res, 404, "Faq not found");
      return;
    }

    res.status(200).json({
      message: "Deleted Faq!",
    });
  } catch {
    handleError(res, 500, "Failed to delete Faq");
  }
};
