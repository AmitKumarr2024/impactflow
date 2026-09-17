import type { Response, NextFunction } from "express";

import { Approval } from "../models/Approval";
import { ChangeRequest } from "../models/ChangeRequest";
import { Task } from "../models/Task";

import { AppError } from "../utils/AppError";

import { recordActivity } from "../services/notification/notificationService";

import { unblockTasksIfClear } from "../services/decision/approvalService";

import { getIO } from "../socket";

import { SOCKET_EVENTS } from "@impactflow/shared";

import type { AuthedRequest } from "../middleware/auth";

/* -------------------------------------------------------------------------- */
/* List approvals                                                             */
/* -------------------------------------------------------------------------- */

/**
 * List approvals for a project.
 *
 * ADMIN:
 * - Can see all approvals for monitoring.
 *
 * Other users:
 * - Can see approvals assigned to them.
 * - They cannot approve/reject someone else's approval.
 *
 * The final security check is ALSO performed inside approveApproval()
 * and rejectApproval().
 */
export async function listApprovals(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const isAdmin = req.user!.role === "ADMIN";

    const query: Record<string, unknown> = {
      projectId: req.params.projectId,
    };

    /*
     * Non-admin users only receive approvals
     * assigned to the currently logged-in user.
     *
     * This prevents another person's pending
     * approval from appearing on their dashboard.
     */
    if (!isAdmin) {
      query.requiredFrom = req.user!.userId;
    }

    const approvals = await Approval.find(query)
      .populate("requiredFrom", "name email role avatar")
      .populate("decidedBy", "name email role")
      .populate({
        path: "changeRequestId",
        select: "title description requestedBy status category priority",
        populate: {
          path: "requestedBy",
          select: "name email role avatar",
        },
      })
      .sort({
        createdAt: -1,
      });

    const withBlocked = await Promise.all(
      approvals.map(async (approval) => {
        const blockedTasks = await Task.find({
          _id: {
            $in: approval.blockedTaskIds,
          },
        }).select("title status");

        return {
          ...approval.toObject(),

          blockedTasks,
        };
      }),
    );

    return res.json({
      approvals: withBlocked,
    });
  } catch (err) {
    next(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Get one approval                                                           */
/* -------------------------------------------------------------------------- */

export async function getApproval(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const approval = await Approval.findById(req.params.id)
      .populate("requiredFrom", "name email role avatar")
      .populate("decidedBy", "name email role")
      .populate({
        path: "changeRequestId",
        select: "title description requestedBy status category priority",
        populate: {
          path: "requestedBy",
          select: "name email role avatar",
        },
      });

    if (!approval) {
      throw AppError.notFound("Approval not found");
    }

    /*
     * Only ADMIN or the designated approver
     * can view this approval directly.
     */
    const isAdmin = req.user!.role === "ADMIN";

    const isAssignedApprover =
      approval.requiredFrom.toString() === req.user!.userId.toString();

    if (!isAdmin && !isAssignedApprover) {
      throw AppError.forbidden("You are not authorized to view this approval");
    }

    const blockedTasks = await Task.find({
      _id: {
        $in: approval.blockedTaskIds,
      },
    }).select("title status");

    return res.json({
      approval,

      blockedTasks,
    });
  } catch (err) {
    next(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Approve one approval                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Approve one approval.
 *
 * requiredFrom is an actual USER ID.
 *
 * Therefore ONLY the exact designated user
 * can approve this approval.
 */
export async function approveApproval(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const approval = await Approval.findById(req.params.id);

    if (!approval) {
      throw AppError.notFound("Approval not found");
    }

    if (approval.status !== "PENDING") {
      throw AppError.conflict(
        `This approval is already ${approval.status.toLowerCase()}`,
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Critical authorization check                                           */
    /* ---------------------------------------------------------------------- */

    const isAuthorizedApprover =
      approval.requiredFrom.toString() === req.user!.userId.toString();

    if (!isAuthorizedApprover) {
      throw AppError.forbidden(
        "You are not the authorized approver for this approval",
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Approve                                                                */
    /* ---------------------------------------------------------------------- */

    approval.status = "APPROVED";

    approval.decidedBy = req.user!.userId as any;

    approval.decidedAt = new Date();

    await approval.save();

    /* ---------------------------------------------------------------------- */
    /* Re-check task dependencies                                             */
    /* ---------------------------------------------------------------------- */

    await unblockTasksIfClear(approval._id, approval.blockedTaskIds);

    let change = null;

    /* ---------------------------------------------------------------------- */
    /* Check change approval status                                           */
    /* ---------------------------------------------------------------------- */

    if (approval.changeRequestId) {
      change = await ChangeRequest.findById(approval.changeRequestId);

      if (change) {
        const remainingApprovals = await Approval.countDocuments({
          changeRequestId: change._id,

          status: {
            $in: ["PENDING", "BLOCKED"],
          },
        });

        if (remainingApprovals === 0) {
          change.status = "APPROVED";

          change.approvedAt = new Date();

          await change.save();

          await recordActivity({
            projectId: approval.projectId,

            actor: req.user!.userId,

            actorRole: req.user!.role,

            action: "CHANGE_APPROVED",

            entityType: "ChangeRequest",

            entityId: change._id,

            summary: `${change.title} was fully approved`,
          });
        } else {
          await recordActivity({
            projectId: approval.projectId,

            actor: req.user!.userId,

            actorRole: req.user!.role,

            action: "APPROVAL_APPROVED",

            entityType: "Approval",

            entityId: approval._id,

            summary: `${approval.title} was approved; ${remainingApprovals} approval(s) remain`,
          });
        }
      }
    } else {
      await recordActivity({
        projectId: approval.projectId,

        actor: req.user!.userId,

        actorRole: req.user!.role,

        action: "APPROVAL_APPROVED",

        entityType: "Approval",

        entityId: approval._id,

        summary: `${approval.title} was approved, unblocking ${approval.blockedTaskIds.length} task(s)`,
      });
    }

    /* ---------------------------------------------------------------------- */
    /* Broadcast                                                             */
    /* ---------------------------------------------------------------------- */

    getIO()
      ?.to(`project:${approval.projectId}`)
      .emit(SOCKET_EVENTS.APPROVAL_APPROVED, {
        approval,

        change,
      });

    return res.json({
      approval,

      change,
    });
  } catch (err) {
    next(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Reject one approval                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Reject one approval.
 *
 * Only requiredFrom can reject.
 */
export async function rejectApproval(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const approval = await Approval.findById(req.params.id);

    if (!approval) {
      throw AppError.notFound("Approval not found");
    }

    if (approval.status !== "PENDING") {
      throw AppError.conflict(
        `This approval is already ${approval.status.toLowerCase()}`,
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Critical authorization check                                           */
    /* ---------------------------------------------------------------------- */

    const isAuthorizedApprover =
      approval.requiredFrom.toString() === req.user!.userId.toString();

    if (!isAuthorizedApprover) {
      throw AppError.forbidden(
        "You are not the authorized approver for this approval",
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Reject                                                                 */
    /* ---------------------------------------------------------------------- */

    approval.status = "REJECTED";

    approval.decidedBy = req.user!.userId as any;

    approval.decidedAt = new Date();

    await approval.save();

    let change = null;

    /* ---------------------------------------------------------------------- */
    /* Reject associated change                                               */
    /* ---------------------------------------------------------------------- */

    if (approval.changeRequestId) {
      change = await ChangeRequest.findById(approval.changeRequestId);

      if (change) {
        change.status = "REJECTED";

        change.rejectedAt = new Date();

        await change.save();

        await recordActivity({
          projectId: approval.projectId,

          actor: req.user!.userId,

          actorRole: req.user!.role,

          action: "CHANGE_REJECTED",

          entityType: "ChangeRequest",

          entityId: change._id,

          summary: `${change.title} was rejected`,
        });
      }
    }

    /* ---------------------------------------------------------------------- */
    /* Broadcast rejection                                                    */
    /* ---------------------------------------------------------------------- */

    getIO()
      ?.to(`project:${approval.projectId}`)
      .emit(SOCKET_EVENTS.APPROVAL_REJECTED, {
        approval,

        change,
      });

    return res.json({
      approval,

      change,
    });
  } catch (err) {
    next(err);
  }
}
