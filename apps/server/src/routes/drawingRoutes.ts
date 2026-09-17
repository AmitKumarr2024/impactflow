import { Router } from "express";
import * as drawingController from "../controllers/drawingController";
import { authenticateUser } from "../middleware/auth";
import { checkProjectMembership } from "../middleware/projectAccess";
import { resolveProjectFromEntity } from "../middleware/resolveProject";
import { Drawing } from "../models/Drawing";

const router = Router();
router.use(authenticateUser);

const resolveProjectFromDrawing = resolveProjectFromEntity((id) => Drawing.findById(id).lean());

router.patch("/:id", resolveProjectFromDrawing, checkProjectMembership, drawingController.updateDrawing);

export default router;
