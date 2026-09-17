import type { Response, NextFunction } from "express";
import type { AuthedRequest } from "./auth";
import { AppError } from "../utils/AppError";
import type { Role } from "@impactflow/shared";

export function authorizeRole(...allowed: Role[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!allowed.includes(req.user.role)) {
      return next(AppError.forbidden(`Role ${req.user.role} is not permitted for this action`));
    }
    next();
  };
}
