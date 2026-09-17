import type { Response, NextFunction } from "express";
import type { AuthedRequest } from "./auth";
import { AppError } from "../utils/AppError";
import { ProjectMember } from "../models/ProjectMember";

// Resolves the project id from common route/body locations and confirms the
// authenticated user actually belongs to that project before letting the
// request reach a controller. Never trust the frontend to have already checked this.
//
// ADMIN is the one exception: since admins provision every project for the
// company, they can see and act on all of them without needing an explicit
// ProjectMember record for each one -- that's the whole point of the role.
export async function checkProjectMembership(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(AppError.unauthorized());

    const projectId =
      req.params.projectId || req.body?.projectId || req.query.projectId || req.params.id;

    if (!projectId) {
      return next(AppError.validation("projectId is required to check membership"));
    }

    if (req.user.role === "ADMIN") {
      (req as any).projectMembership = { projectId, userId: req.user.userId, role: "ADMIN", isAdminOverride: true };
      return next();
    }

    const membership = await ProjectMember.findOne({
      projectId,
      userId: req.user.userId,
    }).lean();

    if (!membership) {
      return next(AppError.forbidden("You are not a member of this project"));
    }

    (req as any).projectMembership = membership;
    next();
  } catch (err) {
    next(err);
  }
}
