export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = "BAD_REQUEST") {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;

    Object.setPrototypeOf(this, new.target.prototype);

    Error.captureStackTrace?.(this, new.target);
  }

  static badRequest(message = "Bad request") {
    return new AppError(message, 400, "BAD_REQUEST");
  }

  static unauthorized(message = "Unauthorized") {
    return new AppError(message, 401, "UNAUTHORIZED");
  }

  static forbidden(message = "Forbidden") {
    return new AppError(message, 403, "FORBIDDEN");
  }

  static notFound(message = "Not found") {
    return new AppError(message, 404, "NOT_FOUND");
  }

  static conflict(message = "Conflict") {
    return new AppError(message, 409, "CONFLICT");
  }

  static validation(message = "Validation error") {
    return new AppError(message, 422, "VALIDATION_ERROR");
  }

  static internal(message = "Internal server error") {
    return new AppError(message, 500, "INTERNAL_SERVER_ERROR");
  }
}
