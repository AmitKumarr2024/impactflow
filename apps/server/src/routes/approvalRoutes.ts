import { Router } from "express";
import * as approvalController from "../controllers/approvalController";
import { authenticateUser } from "../middleware/auth";
import { checkProjectMembership } from "../middleware/projectAccess";
import { resolveProjectFromEntity } from "../middleware/resolveProject";
import { Approval } from "../models/Approval";

const router = Router();

router.use(authenticateUser);

const resolveProjectFromApproval = resolveProjectFromEntity((id) =>
  Approval.findById(id).lean(),
);

router.get(
  "/:id",
  resolveProjectFromApproval,
  checkProjectMembership,
  approvalController.getApproval,
);

router.post(
  "/:id/approve",
  resolveProjectFromApproval,
  checkProjectMembership,
  approvalController.approveApproval,
);

router.post(
  "/:id/reject",
  resolveProjectFromApproval,
  checkProjectMembership,
  approvalController.rejectApproval,
);

export default router;
