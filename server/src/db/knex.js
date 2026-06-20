import knexLib from 'knex';
import { config } from '../config/index.js';

/**
 * Knex instance scoped to the insights service ONLY.
 *
 * The rest of the codebase uses raw parameterised mysql2 queries via pool.js
 * (the convention recorded against ADR-0003). Knex is introduced here purely
 * for the insights aggregation query builder and should not spread to other
 * repositories without revisiting that decision.
 */
export const knex = knexLib({
  client: 'mysql2',
  connection: {
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
  },
  pool: { min: 0, max: 5 },
});
