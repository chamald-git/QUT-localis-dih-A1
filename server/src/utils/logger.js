import { pino } from 'pino';
import { config } from '../config/index.js';

/**
 * Structured logger. In development we route through pino-pretty for readable
 * coloured output; in production we emit raw JSON lines, which Railway's log
 * pipeline ingests directly.
 */
export const logger = pino({
  level: config.logLevel,
  ...(config.isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }),
});
