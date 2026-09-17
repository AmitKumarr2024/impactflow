import type { Response, NextFunction } from "express";
import { z } from "zod";
import { SiteObservation } from "../models/SiteObservation";
import { AppError } from "../utils/AppError";
import { ProjectMember } from "../models/ProjectMember";
import { notifyMany, recordActivity } from "../services/notification/notificationService";
import { getIO } from "../socket";
import { SOCKET_EVENTS, SEVERITY_LEVELS } from "@impactflow/shared";
import type { AuthedRequest } from "../middleware/auth";

export async function listSiteObservations(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const observations = await SiteObservation.find({ projectId: req.params.projectId }).sort({ createdAt: -1 });
    res.json({ observations });
  } catch (err) {
    next(err);
  }
}

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  expectedValue: z.string().optional(),
  actualValue: z.string().optional(),
  unit: z.string().optional(),
  drawingId: z.string().optional(),
  drawingRevision: z.number().optional(),
  photos: z.array(z.string()).optional(),
  severity: z.enum(SEVERITY_LEVELS).optional(),
});

// RULE 12: a site observation against the current drawing immediately notifies
// architect/consultant/contractor -- this is the "last mile" feedback loop (spec section 22).
export async function createSiteObservation(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = createSchema.parse(req.body);
    const observation = await SiteObservation.create({
      ...body,
      projectId: req.params.projectId,
      submittedBy: req.user!.userId,
    });

    const members = await ProjectMember.find({
      projectId: req.params.projectId,
      role: { $in: ["ARCHITECT", "CONSULTANT", "CONTRACTOR"] },
    }).lean();

    await notifyMany(
      members.map((m) => m.userId),
      {
        projectId: req.params.projectId,
        title: `Site observation: ${observation.title}`,
        message:
          observation.expectedValue && observation.actualValue
            ? `Expected ${observation.expectedValue}${observation.unit || ""}, found ${observation.actualValue}${observation.unit || ""}.`
            : observation.description || "A new site observation was submitted.",
        entityType: "SiteObservation",
        entityId: observation._id,
      }
    );

    await recordActivity({
      projectId: req.params.projectId,
      actor: req.user!.userId,
      actorRole: req.user!.role,
      action: "SITE_OBSERVATION_CREATED",
      entityType: "SiteObservation",
      entityId: observation._id,
      summary: `${observation.title} reported by installer/contractor`,
    });

    getIO()?.to(`project:${req.params.projectId}`).emit(SOCKET_EVENTS.SITE_OBSERVATION_CREATED, observation);
    res.status(201).json({ observation });
  } catch (err) {
    next(err);
  }
}

const updateSchema = z.object({
  status: z.enum(["OPEN", "UNDER_REVIEW", "ACKNOWLEDGED", "RESOLVED"]).optional(),
});

export async function updateSiteObservation(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = updateSchema.parse(req.body);
    const observation = await SiteObservation.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!observation) throw AppError.notFound("Site observation not found");

    getIO()?.to(`project:${observation.projectId}`).emit(SOCKET_EVENTS.SITE_OBSERVATION_UPDATED, observation);
    res.json({ observation });
  } catch (err) {
    next(err);
  }
}
