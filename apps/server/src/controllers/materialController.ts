import type { Response, NextFunction } from "express";
import { z } from "zod";
import { Material, MaterialAlternative } from "../models/Material";
import { AppError } from "../utils/AppError";
import { recalculateForSubstitution } from "../services/impact/impactEngineService";
import { ChangeRequest } from "../models/ChangeRequest";
import { notifyMany, recordActivity } from "../services/notification/notificationService";
import { ProjectMember } from "../models/ProjectMember";
import { getIO } from "../socket";
import { SOCKET_EVENTS } from "@impactflow/shared";
import type { AuthedRequest } from "../middleware/auth";

export async function listMaterials(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const materials = await Material.find({ projectId: req.params.projectId });
    res.json({ materials });
  } catch (err) {
    next(err);
  }
}

const createMaterialSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  price: z.number(),
  leadTimeDays: z.number(),
  supplierId: z.string().optional(),
  linkedDrawingIds: z.array(z.string()).optional(),
  linkedTaskIds: z.array(z.string()).optional(),
});

export async function createMaterial(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = createMaterialSchema.parse(req.body);
    const material = await Material.create({ ...body, projectId: req.params.projectId });
    res.status(201).json({ material });
  } catch (err) {
    next(err);
  }
}

const markUnavailableSchema = z.object({
  reason: z.string().min(1),
});

// Supplier marks a material unavailable -- notifies affected project stakeholders
// and flips the flag suppliers/architects can see immediately (spec section 16).
export async function markUnavailable(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { reason } = markUnavailableSchema.parse(req.body);
    const material = await Material.findByIdAndUpdate(
      req.params.id,
      { available: false, unavailableReason: reason },
      { new: true }
    );
    if (!material) throw AppError.notFound("Material not found");

    const members = await ProjectMember.find({
      projectId: material.projectId,
      role: { $in: ["ARCHITECT", "INTERIOR_DESIGNER", "CONSULTANT"] },
    }).lean();

    await notifyMany(
      members.map((m) => m.userId),
      {
        projectId: material.projectId,
        title: `Material unavailable: ${material.name}`,
        message: reason,
        entityType: "Material",
        entityId: material._id,
      }
    );

    getIO()?.to(`project:${material.projectId}`).emit(SOCKET_EVENTS.MATERIAL_UNAVAILABLE, material);
    res.json({ material });
  } catch (err) {
    next(err);
  }
}

const substitutionSchema = z.object({
  name: z.string().min(1),
  price: z.number(),
  leadTimeDays: z.number(),
  imageUrl: z.string().optional(),
  notes: z.string().optional(),
  requiresApproval: z.boolean().optional(),
  changeRequestId: z.string().optional(),
});

// RULE 8 & 9: a concrete price/lead-time delta feeds straight back into the
// Impact Engine so the estimate is never invented, only computed.
export async function proposeSubstitution(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = substitutionSchema.parse(req.body);
    const material = await Material.findById(req.params.id);
    if (!material) throw AppError.notFound("Material not found");

    const priceDelta = body.price - material.price;
    const leadTimeDeltaDays = body.leadTimeDays - material.leadTimeDays;

    const alternative = await MaterialAlternative.create({
      materialId: material._id,
      proposedBy: req.user!.userId,
      name: body.name,
      price: body.price,
      leadTimeDays: body.leadTimeDays,
      priceDelta,
      leadTimeDeltaDays,
      imageUrl: body.imageUrl,
      notes: body.notes,
      requiresApproval: body.requiresApproval ?? true,
    });

    await recordActivity({
      projectId: material.projectId,
      actor: req.user!.userId,
      actorRole: req.user!.role,
      action: "SUBSTITUTION_PROPOSED",
      entityType: "MaterialAlternative",
      entityId: alternative._id,
      summary: `${body.name} proposed as an alternative to ${material.name} (${priceDelta >= 0 ? "+" : ""}${priceDelta}, ${leadTimeDeltaDays <= 0 ? "" : "+"}${leadTimeDeltaDays} day lead time)`,
    });

    getIO()?.to(`project:${material.projectId}`).emit(SOCKET_EVENTS.MATERIAL_SUBSTITUTION_CREATED, alternative);

    let recalculated = null;
    if (body.changeRequestId) {
      recalculated = await recalculateForSubstitution(body.changeRequestId, priceDelta, leadTimeDeltaDays);
      getIO()?.to(`project:${material.projectId}`).emit(SOCKET_EVENTS.CHANGE_IMPACT_UPDATED, recalculated);
    }

    res.status(201).json({ alternative, recalculatedImpact: recalculated });
  } catch (err) {
    next(err);
  }
}

const decideSubstitutionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export async function decideSubstitution(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { status } = decideSubstitutionSchema.parse(req.body);
    const alternative = await MaterialAlternative.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!alternative) throw AppError.notFound("Substitution not found");

    if (status === "APPROVED") {
      const material = await Material.findByIdAndUpdate(alternative.materialId, {
        name: alternative.name,
        price: alternative.price,
        leadTimeDays: alternative.leadTimeDays,
        available: true,
        unavailableReason: undefined,
      });
      if (material) {
        getIO()?.to(`project:${material.projectId}`).emit(SOCKET_EVENTS.APPROVAL_APPROVED, alternative);
      }
    }

    res.json({ alternative });
  } catch (err) {
    next(err);
  }
}

// Every alternative proposed for a material, so the team can compare
// supplier estimates side by side before voting.
export async function listSubstitutions(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const alternatives = await MaterialAlternative.find({ materialId: req.params.id }).sort({ createdAt: -1 });
    res.json({ alternatives });
  } catch (err) {
    next(err);
  }
}

const voteSchema = z.object({
  vote: z.enum(["UP", "DOWN"]),
});

// One vote per person -- casting again just changes their existing vote
// rather than stacking duplicates. This is team input to help whoever
// finalizes the decision (admin/architect/consultant via decideSubstitution),
// not itself a binding decision.
export async function voteOnSubstitution(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { vote } = voteSchema.parse(req.body);
    const alternative = await MaterialAlternative.findById(req.params.id);
    if (!alternative) throw AppError.notFound("Substitution not found");

    const userId = req.user!.userId;
    const existing = alternative.votes.find((v) => v.userId.toString() === userId);
    if (existing) existing.vote = vote;
    else alternative.votes.push({ userId: userId as any, vote });
    await alternative.save();

    getIO()?.to(`project:${(await Material.findById(alternative.materialId))?.projectId}`).emit("material.substitution.voted", alternative);
    res.json({ alternative });
  } catch (err) {
    next(err);
  }
}

const commentSchema = z.object({
  text: z.string().min(1).max(1000),
});

export async function commentOnSubstitution(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { text } = commentSchema.parse(req.body);
    const alternative = await MaterialAlternative.findById(req.params.id);
    if (!alternative) throw AppError.notFound("Substitution not found");

    alternative.comments.push({ userId: req.user!.userId as any, text, createdAt: new Date() });
    await alternative.save();

    const material = await Material.findById(alternative.materialId);
    if (material) {
      getIO()?.to(`project:${material.projectId}`).emit("material.substitution.commented", alternative);
    }
    res.status(201).json({ alternative });
  } catch (err) {
    next(err);
  }
}
