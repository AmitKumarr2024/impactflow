import { Router } from "express";
import * as siteController from "../controllers/siteController";
import { authenticateUser } from "../middleware/auth";
import { checkProjectMembership } from "../middleware/projectAccess";
import { resolveProjectFromEntity } from "../middleware/resolveProject";
import { SiteObservation } from "../models/SiteObservation";

const router = Router();
router.use(authenticateUser);

const resolveProjectFromObservation = resolveProjectFromEntity((id) => SiteObservation.findById(id).lean());

router.patch("/:id", resolveProjectFromObservation, checkProjectMembership, siteController.updateSiteObservation);

export default router;
