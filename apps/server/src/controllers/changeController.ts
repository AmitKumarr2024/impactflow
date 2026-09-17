import type { Response, NextFunction } from "express";

import { Types } from "mongoose";

import { z } from "zod";

import { ChangeRequest } from "../models/ChangeRequest";

import { Approval } from "../models/Approval";

import { Material } from "../models/Material";

import { Drawing } from "../models/Drawing";

import { Task } from "../models/Task";

import { ProjectMember } from "../models/ProjectMember";

import { User } from "../models/User";

import { AppError } from "../utils/AppError";

import {
  CHANGE_CATEGORIES,
  SOCKET_EVENTS,
  type Role,
} from "@impactflow/shared";

import * as impactEngine from "../services/impact/impactEngineService";

import {
  notifyMany,
  recordActivity,
} from "../services/notification/notificationService";

import { getIO } from "../socket";

import type { AuthedRequest } from "../middleware/auth";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type ChangeApprovalSource = {
  _id: Types.ObjectId;

  projectId: Types.ObjectId;

  title: string;

  requestedBy: Types.ObjectId;

  approvalRequiredFrom: Types.ObjectId;
};

/* -------------------------------------------------------------------------- */
/* List Changes                                                               */
/* -------------------------------------------------------------------------- */

/**
 * List all changes belonging to a project.
 */
export async function listChanges(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const changes = await ChangeRequest.find({
      projectId: req.params.projectId,
    })
      .populate("requestedBy", "name email role avatar")
      .populate("approvalRequiredFrom", "name email role avatar")
      .populate("affectedMaterials", "name category price available")
      .populate("affectedDrawings", "name revision status")
      .populate("affectedTasks", "title type status")
      .sort({
        createdAt: -1,
      });

    return res.json({
      changes,
    });
  } catch (err) {
    next(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Project Entity Validation                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Make sure every linked material, drawing and task
 * belongs to the same project as the change.
 *
 * This prevents a change from accidentally linking
 * entities belonging to another project.
 */
async function assertEntitiesBelongToProject(
  projectId: string,
  ids: {
    materials?: string[];
    drawings?: string[];
    tasks?: string[];
  },
) {
  const [materialCount, drawingCount, taskCount] = await Promise.all([
    ids.materials?.length
      ? Material.countDocuments({
          _id: {
            $in: ids.materials,
          },
          projectId,
        })
      : 0,

    ids.drawings?.length
      ? Drawing.countDocuments({
          _id: {
            $in: ids.drawings,
          },
          projectId,
        })
      : 0,

    ids.tasks?.length
      ? Task.countDocuments({
          _id: {
            $in: ids.tasks,
          },
          projectId,
        })
      : 0,
  ]);

  if (ids.materials?.length && materialCount !== ids.materials.length) {
    throw AppError.validation(
      "One or more selected materials don't belong to this project",
    );
  }

  if (ids.drawings?.length && drawingCount !== ids.drawings.length) {
    throw AppError.validation(
      "One or more selected drawings don't belong to this project",
    );
  }

  if (ids.tasks?.length && taskCount !== ids.tasks.length) {
    throw AppError.validation(
      "One or more selected tasks don't belong to this project",
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Approver Validation                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Validate that the selected approver:
 *
 * 1. Exists
 * 2. Is a member of the project
 * 3. Is not the requester
 */
async function assertApproverBelongsToProject(
  projectId: string,
  approverId: string,
  requesterId: string,
) {
  if (!Types.ObjectId.isValid(approverId)) {
    throw AppError.validation("Invalid approval person selected");
  }

  if (approverId === requesterId) {
    throw AppError.validation(
      "The person who raises a change cannot be its designated approver",
    );
  }

  /**
   * ProjectMember stores the user
   * reference as userId.
   */
  const member = await ProjectMember.findOne({
    projectId,
    userId: approverId,
  }).lean();

  if (!member) {
    throw AppError.validation(
      "The selected approver is not a member of this project",
    );
  }

  /**
   * Confirm the actual user exists.
   */
  const user = await User.findById(approverId)
    .select("_id name email role avatar")
    .lean();

  if (!user) {
    throw AppError.validation("The selected approver could not be found");
  }

  return {
    member,
    user,
  };
}

/* -------------------------------------------------------------------------- */
/* Create Change Schema                                                       */
/* -------------------------------------------------------------------------- */

const createChangeSchema = z.object({
  title: z.string().min(1),

  description: z.string().min(1),

  category: z.enum(CHANGE_CATEGORIES),

  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),

  reason: z.string().optional(),

  affectedMaterials: z.array(z.string()).optional(),

  affectedDrawings: z.array(z.string()).optional(),

  affectedTasks: z.array(z.string()).optional(),

  attachments: z.array(z.string()).optional(),

  /**
   * Exact user who must approve
   * this change.
   */
  approvalRequiredFrom: z.string().min(1),
});

/* -------------------------------------------------------------------------- */
/* Create Change                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Create a change request.
 *
 * A new change starts as SUBMITTED.
 *
 * Approval is created after Impact Analysis.
 */
export async function createChange(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = createChangeSchema.parse(req.body);

    const requesterId = req.user!.userId;

    /* ---------------------------------------------------------------------- */
    /* Validate linked entities                                               */
    /* ---------------------------------------------------------------------- */

    await assertEntitiesBelongToProject(req.params.projectId, {
      materials: body.affectedMaterials,

      drawings: body.affectedDrawings,

      tasks: body.affectedTasks,
    });

    /* ---------------------------------------------------------------------- */
    /* Validate designated approver                                           */
    /* ---------------------------------------------------------------------- */

    await assertApproverBelongsToProject(
      req.params.projectId,
      body.approvalRequiredFrom,
      requesterId,
    );

    /* ---------------------------------------------------------------------- */
    /* Create Change                                                          */
    /* ---------------------------------------------------------------------- */

    const change = await ChangeRequest.create({
      title: body.title,

      description: body.description,

      category: body.category,

      priority: body.priority ?? "MEDIUM",

      reason: body.reason,

      attachments: body.attachments ?? [],

      affectedMaterials: body.affectedMaterials ?? [],

      affectedDrawings: body.affectedDrawings ?? [],

      affectedTasks: body.affectedTasks ?? [],

      projectId: req.params.projectId,

      requestedBy: requesterId,

      approvalRequiredFrom: body.approvalRequiredFrom,

      status: "SUBMITTED",
    });

    /* ---------------------------------------------------------------------- */
    /* Activity                                                               */
    /* ---------------------------------------------------------------------- */

    await recordActivity({
      projectId: req.params.projectId,

      actor: requesterId,

      actorRole: req.user!.role,

      action: "CHANGE_CREATED",

      entityType: "ChangeRequest",

      entityId: change._id,

      summary:
        `${change.title} was submitted as a ` +
        `${change.category.toLowerCase()} change`,
    });

    /* ---------------------------------------------------------------------- */
    /* Socket                                                                 */
    /* ---------------------------------------------------------------------- */

    getIO()
      ?.to(`project:${req.params.projectId}`)
      .emit(SOCKET_EVENTS.CHANGE_CREATED, change);

    /* ---------------------------------------------------------------------- */
    /* Return populated change                                                */
    /* ---------------------------------------------------------------------- */

    const populatedChange = await ChangeRequest.findById(change._id)
      .populate("requestedBy", "name email role avatar")
      .populate("approvalRequiredFrom", "name email role avatar")
      .populate("affectedMaterials", "name category price available")
      .populate("affectedDrawings", "name revision status")
      .populate("affectedTasks", "title type status");

    return res.status(201).json({
      change: populatedChange ?? change,
    });
  } catch (err) {
    next(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Get Change                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Get one change request.
 */
export async function getChange(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const change = await ChangeRequest.findById(req.params.id)
      .populate("requestedBy", "name email role avatar")
      .populate("approvalRequiredFrom", "name email role avatar")
      .populate("affectedMaterials", "name category price available")
      .populate("affectedDrawings", "name revision status")
      .populate("affectedTasks", "title type status");

    if (!change) {
      throw AppError.notFound("Change request not found");
    }

    return res.json({
      change,
    });
  } catch (err) {
    next(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Update Change Schema                                                       */
/* -------------------------------------------------------------------------- */

const updateChangeSchema = z.object({
  title: z.string().optional(),

  description: z.string().optional(),

  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),

  affectedMaterials: z.array(z.string()).optional(),

  affectedDrawings: z.array(z.string()).optional(),

  affectedTasks: z.array(z.string()).optional(),

  approvalRequiredFrom: z.string().optional(),
});

/* -------------------------------------------------------------------------- */
/* Update Change                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Update change details and affected
 * entity links.
 */
export async function updateChange(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = updateChangeSchema.parse(req.body);

    const existing = await ChangeRequest.findById(req.params.id)
      .select("projectId requestedBy approvalRequiredFrom")
      .lean();

    if (!existing) {
      throw AppError.notFound("Change request not found");
    }

    /* ---------------------------------------------------------------------- */
    /* Validate linked entities                                               */
    /* ---------------------------------------------------------------------- */

    await assertEntitiesBelongToProject(existing.projectId.toString(), {
      materials: body.affectedMaterials,

      drawings: body.affectedDrawings,

      tasks: body.affectedTasks,
    });

    /* ---------------------------------------------------------------------- */
    /* Validate new approver                                                  */
    /* ---------------------------------------------------------------------- */

    if (body.approvalRequiredFrom) {
      await assertApproverBelongsToProject(
        existing.projectId.toString(),
        body.approvalRequiredFrom,
        existing.requestedBy.toString(),
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Update                                                                  */
    /* ---------------------------------------------------------------------- */

    const change = await ChangeRequest.findByIdAndUpdate(req.params.id, body, {
      new: true,
    })
      .populate("requestedBy", "name email role avatar")
      .populate("approvalRequiredFrom", "name email role avatar")
      .populate("affectedMaterials", "name category price available")
      .populate("affectedDrawings", "name revision status")
      .populate("affectedTasks", "title type status");

    if (!change) {
      throw AppError.notFound("Change request not found");
    }

    /* ---------------------------------------------------------------------- */
    /* Sync pending approval if task links changed                            */
    /* ---------------------------------------------------------------------- */

    const hasTaskUpdate = body.affectedTasks !== undefined;

    const hasApproverUpdate = body.approvalRequiredFrom !== undefined;

    if (hasTaskUpdate || hasApproverUpdate) {
      const pendingApproval = await Approval.findOne({
        changeRequestId: change._id,

        status: "PENDING",
      });

      if (pendingApproval) {
        if (hasApproverUpdate && body.approvalRequiredFrom) {
          pendingApproval.requiredFrom =
            body.approvalRequiredFrom as unknown as Types.ObjectId;
        }

        if (hasTaskUpdate) {
          const taskIds = body.affectedTasks ?? [];

          const uniqueTaskIds = [
            ...new Set(taskIds.map((id) => id.toString())),
          ];

          pendingApproval.blockedTaskIds =
            uniqueTaskIds as unknown as Types.ObjectId[];

          /**
           * Unblock tasks that are no longer
           * part of this approval.
           *
           * They can still remain blocked if
           * another pending approval blocks them.
           */
          const previousTaskIds = pendingApproval.blockedTaskIds.map((id) =>
            id.toString(),
          );

          await Task.updateMany(
            {
              _id: {
                $in: previousTaskIds,
                $nin: uniqueTaskIds,
              },
              status: "BLOCKED",
            },
            {
              $set: {
                status: "TODO",
              },
            },
          );

          if (uniqueTaskIds.length > 0) {
            await Task.updateMany(
              {
                _id: {
                  $in: uniqueTaskIds,
                },
                status: {
                  $ne: "COMPLETED",
                },
              },
              {
                $set: {
                  status: "BLOCKED",
                },
              },
            );
          }
        }

        await pendingApproval.save();
      }
    }

    /* ---------------------------------------------------------------------- */
    /* Activity                                                               */
    /* ---------------------------------------------------------------------- */

    if (
      body.affectedMaterials ||
      body.affectedDrawings ||
      body.affectedTasks ||
      body.approvalRequiredFrom
    ) {
      const linkedCount =
        (body.affectedMaterials?.length ?? 0) +
        (body.affectedDrawings?.length ?? 0) +
        (body.affectedTasks?.length ?? 0);

      await recordActivity({
        projectId: existing.projectId,

        actor: req.user!.userId,

        actorRole: req.user!.role,

        action: "CHANGE_LINKS_UPDATED",

        entityType: "ChangeRequest",

        entityId: change._id,

        summary:
          `${change.title} now links ` + `${linkedCount} affected item(s)`,
      });

      getIO()
        ?.to(`project:${existing.projectId}`)
        .emit(SOCKET_EVENTS.CHANGE_IMPACT_UPDATED, {
          changeRequestId: change._id,
        });
    }

    return res.json({
      change,
    });
  } catch (err) {
    next(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Ensure Change Approval                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Create or reuse the approval associated
 * with a change.
 *
 * IMPORTANT:
 *
 * The approval blocks ONLY the tasks explicitly
 * associated with the change.
 *
 * We do NOT blindly use every task discovered
 * by the Impact Engine.
 */
async function ensureChangeApproval(
  change: ChangeApprovalSource | null,

  affectedTaskIds: Array<string | Types.ObjectId>,

  actorRole: Role,
) {
  if (!change) {
    return null;
  }

  /* ------------------------------------------------------------------------ */
  /* Validate designated approver                                             */
  /* ------------------------------------------------------------------------ */

  const member = await ProjectMember.findOne({
    projectId: change.projectId,

    userId: change.approvalRequiredFrom,
  }).lean();

  if (!member) {
    throw AppError.validation(
      "The designated approver is no longer a member of this project",
    );
  }

  const approver = await User.findById(change.approvalRequiredFrom)
    .select("_id name email role avatar")
    .lean();

  if (!approver) {
    throw AppError.validation("The designated approver could not be found");
  }

  /* ------------------------------------------------------------------------ */
  /* Normalize task IDs                                                       */
  /* ------------------------------------------------------------------------ */

  const uniqueTaskIds = [
    ...new Set(affectedTaskIds.map((id) => id.toString())),
  ];

  /* ------------------------------------------------------------------------ */
  /* Existing Approval                                                        */
  /* ------------------------------------------------------------------------ */

  let approval = await Approval.findOne({
    changeRequestId: change._id,
  });

  /* ------------------------------------------------------------------------ */
  /* Existing pending approval                                               */
  /* ------------------------------------------------------------------------ */

  if (approval) {
    if (approval.status === "PENDING") {
      /**
       * Keep the approval assigned to
       * the exact designated user.
       */
      approval.requiredFrom = change.approvalRequiredFrom;

      /**
       * IMPORTANT:
       * Replace the blocked task list with
       * the tasks explicitly associated with
       * this change.
       */
      approval.blockedTaskIds = uniqueTaskIds as unknown as Types.ObjectId[];

      await approval.save();

      /* -------------------------------------------------------------------- */
      /* Block only explicitly affected tasks                                */
      /* -------------------------------------------------------------------- */

      if (uniqueTaskIds.length > 0) {
        await Task.updateMany(
          {
            _id: {
              $in: uniqueTaskIds,
            },

            status: {
              $ne: "COMPLETED",
            },
          },
          {
            $set: {
              status: "BLOCKED",
            },
          },
        );
      }
    }

    return approval;
  }

  /* ------------------------------------------------------------------------ */
  /* Create Approval                                                          */
  /* ------------------------------------------------------------------------ */

  approval = await Approval.create({
    projectId: change.projectId,

    changeRequestId: change._id,

    title: `Approval Required — ${change.title}`,

    /**
     * Exact designated user.
     */
    requiredFrom: change.approvalRequiredFrom,

    /**
     * ONLY explicitly affected tasks.
     */
    blockedTaskIds: uniqueTaskIds,

    status: "PENDING",
  });

  /* ------------------------------------------------------------------------ */
  /* Block affected tasks                                                    */
  /* ------------------------------------------------------------------------ */

  if (uniqueTaskIds.length > 0) {
    await Task.updateMany(
      {
        _id: {
          $in: uniqueTaskIds,
        },

        status: {
          $ne: "COMPLETED",
        },
      },
      {
        $set: {
          status: "BLOCKED",
        },
      },
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Activity                                                                 */
  /* ------------------------------------------------------------------------ */

  await recordActivity({
    projectId: change.projectId,

    actor: change.requestedBy,

    actorRole,

    action: "APPROVAL_CREATED",

    entityType: "Approval",

    entityId: approval._id,

    summary:
      `${approval.title} was created and ` + `is waiting for ${approver.name}`,
  });

  /* ------------------------------------------------------------------------ */
  /* Notification                                                             */
  /* ------------------------------------------------------------------------ */

  await notifyMany([change.approvalRequiredFrom.toString()], {
    projectId: change.projectId,

    title: approval.title,

    message:
      `${change.title} requires your approval ` +
      `before dependent work can proceed.`,

    entityType: "Approval",

    entityId: approval._id,
  });

  /* ------------------------------------------------------------------------ */
  /* Socket                                                                   */
  /* ------------------------------------------------------------------------ */

  getIO()
    ?.to(`project:${change.projectId}`)
    .emit(SOCKET_EVENTS.CHANGE_IMPACT_UPDATED, {
      changeRequestId: change._id,

      approvalId: approval._id,
    });

  return approval;
}

/* -------------------------------------------------------------------------- */
/* Analyze Impact                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Central Impact Engine action.
 *
 * CHANGE
 *   ↓
 * IMPACT ENGINE
 *   ↓
 * impact analysis
 *   ↓
 * explicit change dependencies
 *   ↓
 * CREATE / UPDATE APPROVAL
 *   ↓
 * PENDING_APPROVAL
 */
export async function analyze(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    /* ---------------------------------------------------------------------- */
    /* Run Impact Engine                                                      */
    /* ---------------------------------------------------------------------- */

    const analysis = await impactEngine.analyzeChange(req.params.id);

    /* ---------------------------------------------------------------------- */
    /* Load Change                                                            */
    /* ---------------------------------------------------------------------- */

    const change = await ChangeRequest.findById(req.params.id);

    if (!change) {
      throw AppError.notFound("Change request not found");
    }

    /* ---------------------------------------------------------------------- */
    /* Build Approval Source                                                  */
    /* ---------------------------------------------------------------------- */

    const changeForApproval: ChangeApprovalSource = {
      _id: change._id,

      projectId: change.projectId,

      title: change.title,

      requestedBy: change.requestedBy,

      approvalRequiredFrom: change.approvalRequiredFrom,
    };

    /* ---------------------------------------------------------------------- */
    /* IMPORTANT FIX                                                          */
    /* ---------------------------------------------------------------------- */

    /**
     * The Impact Engine can discover downstream
     * affected tasks.
     *
     * However, approval blocking must be based
     * on the tasks explicitly linked to THIS
     * Change Request.
     *
     * This prevents an unrelated task such as:
     *
     * Bathroom Marble Procurement
     *
     * from being blocked by:
     *
     * Replace Living Room Flooring Material
     */
    const approvalTaskIds = Array.isArray(change.affectedTasks)
      ? change.affectedTasks
      : [];

    /* ---------------------------------------------------------------------- */
    /* Create / Reuse Approval                                                */
    /* ---------------------------------------------------------------------- */

    const approval = await ensureChangeApproval(
      changeForApproval,

      approvalTaskIds,

      req.user!.role,
    );

    /* ---------------------------------------------------------------------- */
    /* Change Status                                                          */
    /* ---------------------------------------------------------------------- */

    if (approval && approval.status === "PENDING") {
      if (change.status !== "APPROVED") {
        change.status = "PENDING_APPROVAL";

        await change.save();
      }
    }

    /* ---------------------------------------------------------------------- */
    /* Notify Stakeholders                                                    */
    /* ---------------------------------------------------------------------- */

    if (analysis.affectedStakeholders.length) {
      await notifyMany(analysis.affectedStakeholders, {
        projectId: change.projectId,

        title: `Impact analysis ready: ${change.title}`,

        message:
          `This change is rated ` +
          `${analysis.impactLevel} impact ` +
          `and affects ` +
          `${analysis.affectedMaterials.length} material(s), ` +
          `${analysis.affectedTasks.length} task(s), and ` +
          `${analysis.affectedApprovals.length} approval(s).`,

        entityType: "ChangeRequest",

        entityId: change._id,
      });
    }

    /* ---------------------------------------------------------------------- */
    /* Socket                                                                 */
    /* ---------------------------------------------------------------------- */

    getIO()
      ?.to(`project:${change.projectId}`)
      .emit(SOCKET_EVENTS.CHANGE_IMPACT_UPDATED, {
        ...analysis,

        approval,
      });

    /* ---------------------------------------------------------------------- */
    /* Response                                                               */
    /* ---------------------------------------------------------------------- */

    const populatedChange = await ChangeRequest.findById(change._id)
      .populate("requestedBy", "name email role avatar")
      .populate("approvalRequiredFrom", "name email role avatar")
      .populate("affectedMaterials", "name category price available")
      .populate("affectedDrawings", "name revision status")
      .populate("affectedTasks", "title type status");

    return res.json({
      analysis,

      approval,

      change: populatedChange ?? change,
    });
  } catch (err) {
    next(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Get Impact                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Get the stored impact analysis.
 */
export async function getImpact(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { ImpactAnalysis } = await import("../models/ImpactAnalysis");

    const analysis = await ImpactAnalysis.findOne({
      changeRequestId: req.params.id,
    }).sort({
      generatedAt: -1,
    });

    if (!analysis) {
      throw AppError.notFound(
        "No impact analysis has been generated for this change yet",
      );
    }

    return res.json({
      analysis,
    });
  } catch (err) {
    next(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Legacy Approve                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Legacy change approval endpoint.
 *
 * This endpoint does NOT bypass the
 * Approval Dependency Map.
 */
export async function approve(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const change = await ChangeRequest.findById(req.params.id);

    if (!change) {
      throw AppError.notFound("Change request not found");
    }

    const pendingApprovals = await Approval.find({
      changeRequestId: change._id,

      status: "PENDING",
    });

    /**
     * Do not allow this endpoint
     * to bypass the approval workflow.
     */
    if (pendingApprovals.length > 0) {
      throw AppError.conflict(
        "This change has pending approval(s). Approve it from the Approval Dependency Map.",
      );
    }

    if (change.status === "APPROVED") {
      throw AppError.conflict("This change is already approved");
    }

    change.status = "APPROVED";

    change.approvedAt = new Date();

    await change.save();

    await recordActivity({
      projectId: change.projectId,

      actor: req.user!.userId,

      actorRole: req.user!.role,

      action: "CHANGE_APPROVED",

      entityType: "ChangeRequest",

      entityId: change._id,

      summary: `${change.title} was approved`,
    });

    getIO()
      ?.to(`project:${change.projectId}`)
      .emit(SOCKET_EVENTS.APPROVAL_APPROVED, change);

    return res.json({
      change,
    });
  } catch (err) {
    next(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Legacy Reject                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Legacy change rejection endpoint.
 *
 * Normal rejection should happen through
 * the Approval Dependency Map.
 */
export async function reject(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const change = await ChangeRequest.findById(req.params.id);

    if (!change) {
      throw AppError.notFound("Change request not found");
    }

    const pendingApprovals = await Approval.find({
      changeRequestId: change._id,

      status: "PENDING",
    });

    /**
     * Do not allow a random user to bypass
     * a pending designated approval.
     */
    if (pendingApprovals.length > 0) {
      throw AppError.conflict(
        "This change has pending approval(s). Reject the approval from the Approval Dependency Map.",
      );
    }

    change.status = "REJECTED";

    change.rejectedAt = new Date();

    await change.save();

    await recordActivity({
      projectId: change.projectId,

      actor: req.user!.userId,

      actorRole: req.user!.role,

      action: "CHANGE_REJECTED",

      entityType: "ChangeRequest",

      entityId: change._id,

      summary: `${change.title} was rejected`,
    });

    getIO()
      ?.to(`project:${change.projectId}`)
      .emit(SOCKET_EVENTS.APPROVAL_REJECTED, change);

    return res.json({
      change,
    });
  } catch (err) {
    next(err);
  }
}
