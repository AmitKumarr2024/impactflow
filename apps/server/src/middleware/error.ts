import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Single place responses get shaped. Never leak stack traces to the client.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
  }

  // A failed request-body/query validation is a client mistake (400), not a
  // server fault (500) -- without this, every bad request anywhere in the
  // API was incorrectly reported as an internal error.
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    const message = firstIssue ? `${firstIssue.path.join(".") || "value"}: ${firstIssue.message}` : "Invalid request";
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message } });
  }

  console.error("[unhandled error]", err);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
  });
}
