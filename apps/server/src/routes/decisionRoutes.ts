import { Router } from "express";
import * as decisionController from "../controllers/decisionController";
import { authenticateUser } from "../middleware/auth";
import { checkProjectMembership } from "../middleware/projectAccess";
import { resolveProjectFromEntity } from "../middleware/resolveProject";
import { Decision } from "../models/Decision";

const router = Router();
router.use(authenticateUser);

const resolveProjectFromDecision = resolveProjectFromEntity((id) => Decision.findById(id).lean());

router.post("/:id/approve", resolveProjectFromDecision, checkProjectMembership, decisionController.approveDecision);
router.post("/:id/reject", resolveProjectFromDecision, checkProjectMembership, decisionController.rejectDecision);

export default router;
