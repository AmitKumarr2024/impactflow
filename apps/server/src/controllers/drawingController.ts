import type { Response, NextFunction } from "express";
import { z } from "zod";
import { Drawing } from "../models/Drawing";
import { AppError } from "../utils/AppError";
import { recordActivity } from "../services/notification/notificationService";
import { getIO } from "../socket";
import { SOCKET_EVENTS } from "@impactflow/shared";
import type { AuthedRequest } from "../middleware/auth";

export async function listDrawings(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const drawings = await Drawing.find({ projectId: req.params.projectId }).sort({ name: 1, revision: -1 });
    res.json({ drawings });
  } catch (err) {
    next(err);
  }
}

const createDrawingSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  revision: z.number().optional(),
  fileUrl: z.string().optional(),
  cloudinaryPublicId: z.string().optional(),
  supersedesDrawingId: z.string().optional(),
});

// RULE 11: uploading a new revision automatically supersedes the prior
// CURRENT drawing in the same category -- only one CURRENT at a time.
export async function createDrawing(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = createDrawingSchema.parse(req.body);

    if (body.supersedesDrawingId) {
      await Drawing.findByIdAndUpdate(body.supersedesDrawingId, { status: "SUPERSEDED" });
    }

    const drawing = await Drawing.create({
      ...body,
      projectId: req.params.projectId,
      uploadedBy: req.user!.userId,
      status: "CURRENT",
    });

    await recordActivity({
      projectId: req.params.projectId,
      actor: req.user!.userId,
      actorRole: req.user!.role,
      action: "DRAWING_REVISION_CREATED",
      entityType: "Drawing",
      entityId: drawing._id,
      summary: `${drawing.name} Rev ${drawing.revision} uploaded and is now current`,
    });

    getIO()?.to(`project:${req.params.projectId}`).emit(SOCKET_EVENTS.DRAWING_REVISION_CREATED, drawing);
    res.status(201).json({ drawing });
  } catch (err) {
    next(err);
  }
}

const updateDrawingSchema = z.object({
  status: z.enum(["CURRENT", "SUPERSEDED", "DRAFT"]).optional(),
  fileUrl: z.string().optional(),
});

export async function updateDrawing(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = updateDrawingSchema.parse(req.body);
    const drawing = await Drawing.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!drawing) throw AppError.notFound("Drawing not found");
    res.json({ drawing });
  } catch (err) {
    next(err);
  }
}
