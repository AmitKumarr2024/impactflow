import type { Request, Response, NextFunction } from "express";

import { verifyToken } from "../utils/jwt";

import { AppError } from "../utils/AppError";

import type { Role } from "@impactflow/shared";

/* -------------------------------------------------------------------------- */
/* Authenticated Request                                                       */
/* -------------------------------------------------------------------------- */

export interface AuthedRequest extends Request {
  user?: {
    userId: string;
    role: Role;
  };
}

/* -------------------------------------------------------------------------- */
/* Authentication Flow                                                        */
/* -------------------------------------------------------------------------- */

/**
 * JWT
 *   ↓
 * authenticateUser
 *   ↓
 * authorizeRole
 *   ↓
 * checkProjectMembership
 *   ↓
 * controller / service
 *
 * This middleware only confirms WHO is calling.
 * Role and project-membership checks happen downstream.
 */

/* -------------------------------------------------------------------------- */
/* Authenticate User                                                          */
/* -------------------------------------------------------------------------- */

export function authenticateUser(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;

  /* ------------------------------------------------------------------------ */
  /* Authorization Header                                                     */
  /* ------------------------------------------------------------------------ */

  if (!header || !header.startsWith("Bearer ")) {
    return next(
      AppError.unauthorized("Missing or malformed Authorization header"),
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Extract Token                                                            */
  /* ------------------------------------------------------------------------ */

  const token = header.slice("Bearer ".length);

  /* ------------------------------------------------------------------------ */
  /* Verify JWT                                                               */
  /* ------------------------------------------------------------------------ */

  try {
    const payload = verifyToken(token);

    req.user = {
      userId: payload.userId,
      role: payload.role,
    };

    return next();
  } catch {
    return next(AppError.unauthorized("Invalid or expired token"));
  }
}
