import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/index.js';

/**
 * Consistent error envelope. Every error response across the API has the shape:
 *
 *   {
 *     "error": {
 *       "code": "VALIDATION_ERROR",
 *       "message": "Request validation failed",
 *       "details": [ ... ]        // optional
 *     }
 *   }
 *
 * This is the mirror of the success envelope in respond.js, so the client can
 * branch on the presence of `error` vs `data` and nothing else.
 */
// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by its 4-arg signature
export function errorHandler(err, req, res, _next) {
  // Zod validation failures → 400 with field-level details.
  if (err instanceof ZodError) {
    req.log?.warn({ err }, 'Validation error');
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.flatten(),
      },
    });
  }

  // Our own typed errors → use their status, code, message, details.
  if (err instanceof ApiError) {
    req.log?.warn({ err }, err.message);
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
  }

  // Anything else is unexpected → 500. Log the full error server-side, but
  // never leak the stack to the client outside development.
  req.log?.error({ err }, 'Unhandled error');
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      ...(config.isProduction ? {} : { details: err.message }),
    },
  });
}

/**
 * Catch-all for unmatched routes. Registered after all real routes so any
 * unknown path produces the same error envelope rather than Express's default
 * HTML 404 page.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
}
