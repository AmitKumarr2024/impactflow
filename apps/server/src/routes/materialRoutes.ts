import { Router } from "express";
import * as materialController from "../controllers/materialController";
import { authenticateUser } from "../middleware/auth";
import { checkProjectMembership } from "../middleware/projectAccess";
import { resolveProjectFromEntity } from "../middleware/resolveProject";
import { Material } from "../models/Material";

const router = Router();
router.use(authenticateUser);

const resolveProjectFromMaterial = resolveProjectFromEntity((id) => Material.findById(id).lean());

router.patch("/:id/unavailable", resolveProjectFromMaterial, checkProjectMembership, materialController.markUnavailable);
router.get("/:id/substitutions", resolveProjectFromMaterial, checkProjectMembership, materialController.listSubstitutions);
router.post("/:id/substitutions", resolveProjectFromMaterial, checkProjectMembership, materialController.proposeSubstitution);

export default router;
