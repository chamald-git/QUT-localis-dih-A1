import express from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

/**
 * Builds the Express application. Kept separate from the server bootstrap in
 * index.js so the app can be imported into tests without binding a port.
 */
export function createApp() {
  const app = express();

  // Attaches a child logger to every request as req.log, with automatic
  // request/response logging. This is why route and middleware code can call
  // req.log.* safely.
  app.use(pinoHttp({ logger }));

  // CORS — allow the Vite dev origin to call the API during local development.
  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true,
    }),
  );

  // JSON body parsing with a sane limit (CSV uploads in DIH-2 will use their
  // own multipart handling, not this).
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // All API routes live under /api.
  app.use('/api', routes);

  // 404 for anything unmatched, then the central error envelope. Order matters:
  // both must be registered after the real routes.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
