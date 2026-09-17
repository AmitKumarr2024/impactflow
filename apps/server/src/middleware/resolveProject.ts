import type { Response, NextFunction } from "express";
import type { AuthedRequest } from "./auth";
import { AppError } from "../utils/AppError";

/**
 * Several routes are keyed by an entity's own id (e.g. /api/changes/:id),
 * not by projectId directly. checkProjectMembership needs a real projectId
 * to verify against, so this loads the entity once and stamps its projectId
 * onto req.body before membership is checked. Safe against a missing body.
 */
export function resolveProjectFromEntity(
  loadEntity: (id: string) => Promise<{ projectId: unknown } | null>
) {
  return async (req: AuthedRequest, _res: Response, next: NextFunction) => {
    try {
      const entity = await loadEntity(req.params.id);
      if (!entity) return next(AppError.notFound("Resource not found"));
      if (!req.body || typeof req.body !== "object") req.body = {};
      req.body.projectId = req.body.projectId || (entity.projectId as any).toString();
      next();
    } catch (err) {
      next(err);
    }
  };
}
