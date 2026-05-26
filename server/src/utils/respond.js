/**
 * Success envelope. Mirror of the error envelope so every JSON response is
 * either { data: ... } or { error: ... } and the client never has to guess.
 *
 * @param {import('express').Response} res
 * @param {unknown} data
 * @param {number} [status=200]
 */
export function sendSuccess(res, data, status = 200) {
  return res.status(status).json({ data });
}

/**
 * Wraps an async route handler so any thrown error (or rejected promise) is
 * forwarded to Express's error pipeline instead of crashing the process or
 * hanging the request. Lets handlers use plain `throw` and `await` without
 * try/catch boilerplate.
 *
 * @param {(req, res, next) => Promise<unknown>} handler
 */
export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
