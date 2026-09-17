import { Router } from "express";
import * as taskController from "../controllers/taskController";
import { authenticateUser } from "../middleware/auth";
import { checkProjectMembership } from "../middleware/projectAccess";
import { resolveProjectFromEntity } from "../middleware/resolveProject";
import { Task } from "../models/Task";

const router = Router();
router.use(authenticateUser);

const resolveProjectFromTask = resolveProjectFromEntity((id) => Task.findById(id).lean());

router.patch("/:id/status", resolveProjectFromTask, checkProjectMembership, taskController.updateTaskStatus);

export default router;
