/**
 * Application error type. Throwing an ApiError anywhere in the service or
 * repository layers lets the central error middleware produce a consistent
 * response envelope without each layer needing to know about HTTP.
 *
 * @example
 *   throw new ApiError(404, 'NOT_FOUND', 'Region not found');
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode  HTTP status code (e.g. 400, 404, 500)
   * @param {string} code        Stable machine-readable code (e.g. 'VALIDATION_ERROR')
   * @param {string} message     Human-readable message safe to show clients
   * @param {unknown} [details]  Optional structured detail (e.g. Zod field errors)
   */
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message, details) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Access denied') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}
