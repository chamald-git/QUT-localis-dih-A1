import { createApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { verifyConnection, closePool } from './db/pool.js';

async function start() {
  const app = createApp();

  // Probe the database once at boot. We log the result but do NOT exit on
  // failure: the server should still come up so GET /api/health can report
  // the degraded state, which is more useful for debugging than a dead port.
  const dbConnected = await verifyConnection();
  if (dbConnected) {
    logger.info('Database connection verified');
  } else {
    logger.warn(
      'Database not reachable at startup — /api/health will report disconnected. ' +
        'Is the MySQL container running? Try: npm run db:up',
    );
  }

  const server = app.listen(config.port, () => {
    logger.info(`Server listening on http://localhost:${config.port}`);
    logger.info(`Health check: http://localhost:${config.port}/api/health`);
  });

  // Graceful shutdown: stop accepting connections, then drain the MySQL pool.
  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
    // Hard-exit safety net if close hangs.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  logger.error({ err }, 'Fatal error during startup');
  process.exit(1);
});
