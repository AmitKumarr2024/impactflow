import type { Response, NextFunction } from "express";
import { z } from "zod";
import { Feedback } from "../models/Feedback";
import { AppError } from "../utils/AppError";
import { ProjectMember } from "../models/ProjectMember";
import { notifyMany, recordActivity } from "../services/notification/notificationService";
import { getIO } from "../socket";
import { SOCKET_EVENTS, SEVERITY_LEVELS } from "@impactflow/shared";
import type { AuthedRequest } from "../middleware/auth";

export async function listFeedback(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const feedback = await Feedback.find({ projectId: req.params.projectId }).sort({ createdAt: -1 });
    res.json({ feedback });
  } catch (err) {
    next(err);
  }
}

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  relatedTask: z.string().optional(),
  relatedDrawing: z.string().optional(),
  relatedChange: z.string().optional(),
  relatedSiteObservation: z.string().optional(),
  photos: z.array(z.string()).optional(),
  measurements: z.string().optional(),
  severity: z.enum(SEVERITY_LEVELS).optional(),
});

export async function createFeedback(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = createSchema.parse(req.body);
    const feedback = await Feedback.create({
      ...body,
      projectId: req.params.projectId,
      submittedBy: req.user!.userId,
    });

    const members = await ProjectMember.find({
      projectId: req.params.projectId,
      role: { $in: ["ARCHITECT", "CONSULTANT"] },
    }).lean();

    await notifyMany(
      members.map((m) => m.userId),
      {
        projectId: req.params.projectId,
        title: `Installer feedback: ${feedback.title}`,
        message: feedback.description,
        entityType: "Feedback",
        entityId: feedback._id,
      }
    );

    await recordActivity({
      projectId: req.params.projectId,
      actor: req.user!.userId,
      actorRole: req.user!.role,
      action: "FEEDBACK_CREATED",
      entityType: "Feedback",
      entityId: feedback._id,
      summary: `${feedback.title} submitted from the field`,
    });

    getIO()?.to(`project:${req.params.projectId}`).emit(SOCKET_EVENTS.FEEDBACK_CREATED, feedback);
    res.status(201).json({ feedback });
  } catch (err) {
    next(err);
  }
}

const updateSchema = z.object({
  status: z.enum(["OPEN", "UNDER_REVIEW", "ACTION_REQUIRED", "RESOLVED", "CLOSED"]).optional(),
});

export async function updateFeedback(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = updateSchema.parse(req.body);
    const feedback = await Feedback.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!feedback) throw AppError.notFound("Feedback not found");

    if (body.status === "RESOLVED") {
      getIO()?.to(`project:${feedback.projectId}`).emit(SOCKET_EVENTS.FEEDBACK_RESOLVED, feedback);
    }
    res.json({ feedback });
  } catch (err) {
    next(err);
  }
}
