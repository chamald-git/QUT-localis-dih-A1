import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment schema. Validation runs once at startup so the process fails
 * fast and loudly with a readable message rather than throwing deep inside a
 * query handler later.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL must be a valid mysql:// connection URL'),
  JWT_SECRET: z.string().min(1).default('change-me-in-local-only-never-commit'),
  JWT_EXPIRY: z.string().default('24h'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Use console here deliberately — the logger depends on this config, so it
  // does not exist yet at this point in the boot sequence.
  console.error('Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

/**
 * Parse a mysql:// connection URL into the discrete fields mysql2 expects.
 * Keeping a single DATABASE_URL is Railway-friendly (Railway injects one URL),
 * while mysql2's createPool wants host/port/user/password/database separately.
 */
function parseDatabaseUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
  };
}

export const config = {
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
  clientOrigin: env.CLIENT_ORIGIN,
  jwt: {
    secret: env.JWT_SECRET,
    expiry: env.JWT_EXPIRY,
  },
  db: parseDatabaseUrl(env.DATABASE_URL),
};
