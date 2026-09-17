import { Router } from "express";
import * as feedbackController from "../controllers/feedbackController";
import { authenticateUser } from "../middleware/auth";
import { checkProjectMembership } from "../middleware/projectAccess";
import { resolveProjectFromEntity } from "../middleware/resolveProject";
import { Feedback } from "../models/Feedback";

const router = Router();
router.use(authenticateUser);

const resolveProjectFromFeedback = resolveProjectFromEntity((id) => Feedback.findById(id).lean());

router.patch("/:id", resolveProjectFromFeedback, checkProjectMembership, feedbackController.updateFeedback);

export default router;
