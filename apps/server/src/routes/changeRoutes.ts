import { Router } from "express";
import * as changeController from "../controllers/changeController";
import { authenticateUser } from "../middleware/auth";
import { checkProjectMembership } from "../middleware/projectAccess";
import { resolveProjectFromEntity } from "../middleware/resolveProject";
import { ChangeRequest } from "../models/ChangeRequest";

const router = Router();
router.use(authenticateUser);

const resolveProjectFromChange = resolveProjectFromEntity((id) => ChangeRequest.findById(id).lean());

router.get("/:id", resolveProjectFromChange, checkProjectMembership, changeController.getChange);
router.patch("/:id", resolveProjectFromChange, checkProjectMembership, changeController.updateChange);
router.post("/:id/analyze", resolveProjectFromChange, checkProjectMembership, changeController.analyze);
router.get("/:id/impact", resolveProjectFromChange, checkProjectMembership, changeController.getImpact);
router.post("/:id/approve", resolveProjectFromChange, checkProjectMembership, changeController.approve);
router.post("/:id/reject", resolveProjectFromChange, checkProjectMembership, changeController.reject);

export default router;
