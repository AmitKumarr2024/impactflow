import type { Response, NextFunction } from "express";
import { z } from "zod";
import { Decision } from "../models/Decision";
import { AppError } from "../utils/AppError";
import { recordActivity } from "../services/notification/notificationService";
import { getIO } from "../socket";
import { SOCKET_EVENTS } from "@impactflow/shared";
import type { AuthedRequest } from "../middleware/auth";

export async function listDecisions(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const decisions = await Decision.find({ projectId: req.params.projectId }).sort({ createdAt: -1 });
    res.json({ decisions });
  } catch (err) {
    next(err);
  }
}

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  decisionType: z.enum(["MATERIAL", "DESIGN", "SCOPE", "SCHEDULE", "OTHER"]).optional(),
  relatedChangeRequest: z.string().optional(),
  supersedesDecision: z.string().optional(),
  rationale: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

// Spec section 21: when a new decision supersedes an old one, the relationship
// is made explicit immediately -- nobody should have to guess which is current.
export async function createDecision(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = createSchema.parse(req.body);

    if (body.supersedesDecision) {
      await Decision.findByIdAndUpdate(body.supersedesDecision, { status: "SUPERSEDED" });
    }

    const decision = await Decision.create({
      ...body,
      projectId: req.params.projectId,
      decisionBy: req.user!.userId,
      status: "PROPOSED",
    });

    await recordActivity({
      projectId: req.params.projectId,
      actor: req.user!.userId,
      actorRole: req.user!.role,
      action: "DECISION_CREATED",
      entityType: "Decision",
      entityId: decision._id,
      summary: `${decision.title} was proposed${body.supersedesDecision ? " and supersedes a previous decision" : ""}`,
    });

    getIO()?.to(`project:${req.params.projectId}`).emit(SOCKET_EVENTS.DECISION_CREATED, decision);
    if (body.supersedesDecision) {
      getIO()?.to(`project:${req.params.projectId}`).emit(SOCKET_EVENTS.DECISION_SUPERSEDED, {
        supersededId: body.supersedesDecision,
        supersededBy: decision._id,
      });
    }

    res.status(201).json({ decision });
  } catch (err) {
    next(err);
  }
}

export async function approveDecision(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const decision = await Decision.findByIdAndUpdate(
      req.params.id,
      { status: "APPROVED", approvedAt: new Date() },
      { new: true }
    );
    if (!decision) throw AppError.notFound("Decision not found");

    await recordActivity({
      projectId: decision.projectId,
      actor: req.user!.userId,
      actorRole: req.user!.role,
      action: "DECISION_APPROVED",
      entityType: "Decision",
      entityId: decision._id,
      summary: `${decision.title} was approved and is now current`,
    });

    getIO()?.to(`project:${decision.projectId}`).emit(SOCKET_EVENTS.DECISION_APPROVED, decision);
    res.json({ decision });
  } catch (err) {
    next(err);
  }
}

const rejectSchema = z.object({
  reason: z.string().optional(),
});

export async function rejectDecision(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { reason } = rejectSchema.parse(req.body);
    const decision = await Decision.findByIdAndUpdate(
      req.params.id,
      { status: "REJECTED" },
      { new: true }
    );
    if (!decision) throw AppError.notFound("Decision not found");

    await recordActivity({
      projectId: decision.projectId,
      actor: req.user!.userId,
      actorRole: req.user!.role,
      action: "DECISION_REJECTED",
      entityType: "Decision",
      entityId: decision._id,
      summary: `${decision.title} was rejected${reason ? `: ${reason}` : ""}`,
    });

    getIO()?.to(`project:${decision.projectId}`).emit("decision.rejected", decision);
    res.json({ decision });
  } catch (err) {
    next(err);
  }
}
