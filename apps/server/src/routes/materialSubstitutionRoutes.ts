import { Router } from "express";
import * as materialController from "../controllers/materialController";
import { authenticateUser } from "../middleware/auth";
import { authorizeRole } from "../middleware/role";
import { checkProjectMembership } from "../middleware/projectAccess";
import { resolveProjectFromEntity } from "../middleware/resolveProject";
import { MaterialAlternative, Material } from "../models/Material";

const router = Router();
router.use(authenticateUser);

// Resolve project via the alternative -> its parent material -> the
// material's project, so checkProjectMembership has a real projectId to
// verify against. Previously this route only checked the caller's global
// role, never that they belonged to THIS project -- a client on an
// unrelated project could decide a substitution here. Fixed.
const resolveProjectFromSubstitution = resolveProjectFromEntity(async (id) => {
  const alt = await MaterialAlternative.findById(id).lean();
  if (!alt) return null;
  const material = await Material.findById(alt.materialId).lean();
  return material ? { projectId: material.projectId } : null;
});

// Deciding on a proposed alternative is an approval-type action, gated to the
// roles who legitimately sit on the approval chain, now including ADMIN
// (the person who ultimately finalizes company-provisioned projects).
router.patch(
  "/:id",
  resolveProjectFromSubstitution,
  checkProjectMembership,
  authorizeRole("ADMIN", "CLIENT", "ARCHITECT", "CONSULTANT"),
  materialController.decideSubstitution
);

// Voting and commenting are open to any project member -- this is
// team input to help whoever finalizes the decision, not itself gated by role.
router.post("/:id/vote", resolveProjectFromSubstitution, checkProjectMembership, materialController.voteOnSubstitution);
router.post(
  "/:id/comments",
  resolveProjectFromSubstitution,
  checkProjectMembership,
  materialController.commentOnSubstitution
);

export default router;
