import type { Response, NextFunction } from "express";
import { z } from "zod";
import { Task } from "../models/Task";
import { AppError } from "../utils/AppError";
import { recordActivity } from "../services/notification/notificationService";
import { getIO } from "../socket";
import type { AuthedRequest } from "../middleware/auth";

export async function listTasks(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const filter: Record<string, unknown> = { projectId: req.params.projectId };
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
}

const createTaskSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["PROCUREMENT", "INSTALLATION", "FABRICATION", "EXECUTION", "OTHER"]).optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function createTask(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = createTaskSchema.parse(req.body);
    const task = await Task.create({ ...body, projectId: req.params.projectId });

    await recordActivity({
      projectId: req.params.projectId,
      actor: req.user!.userId,
      actorRole: req.user!.role,
      action: "TASK_CREATED",
      entityType: "Task",
      entityId: task._id,
      summary: `${task.title} was created`,
    });

    getIO()?.to(`project:${req.params.projectId}`).emit("task.created", task);
    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
}

const updateStatusSchema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "COMPLETED"]),
});

// A contractor/installer moving a task forward. Moving INTO "BLOCKED" manually
// isn't allowed here -- that's only ever set by the Impact Engine / approval
// dependency logic, so a person can't accidentally hide a real blocker by
// marking it done, and can't manually block a task that no approval requires.
export async function updateTaskStatus(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { status } = updateStatusSchema.parse(req.body);
    const task = await Task.findById(req.params.id);
    if (!task) throw AppError.notFound("Task not found");

    if (task.status === "BLOCKED" && status !== "BLOCKED") {
      throw AppError.validation(
        "This task is blocked by a pending approval. It can only be moved once that approval clears."
      );
    }
    if (status === "BLOCKED") {
      throw AppError.validation("Tasks can't be manually blocked -- blocking is derived from pending approvals.");
    }

    task.status = status;
    await task.save();

    await recordActivity({
      projectId: task.projectId,
      actor: req.user!.userId,
      actorRole: req.user!.role,
      action: "TASK_STATUS_UPDATED",
      entityType: "Task",
      entityId: task._id,
      summary: `${task.title} moved to ${status.replace("_", " ").toLowerCase()}`,
    });

    getIO()?.to(`project:${task.projectId}`).emit("task.status.updated", task);
    res.json({ task });
  } catch (err) {
    next(err);
  }
}
