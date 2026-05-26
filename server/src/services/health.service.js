import { healthRepository } from '../repositories/health.repository.js';

/**
 * Service layer: business logic, no HTTP knowledge. Transport-agnostic so the
 * same function is callable from the REST route today and, in Sprint 2, from
 * an Agno agent tool without duplication.
 */
export const healthService = {
  /**
   * Builds the health payload. The DB check is the meaningful signal; the
   * top-level status reflects whether the dependency is reachable.
   *
   * @returns {Promise<{ status: 'ok' | 'degraded', db: 'connected' | 'disconnected' }>}
   */
  async getHealth() {
    const dbConnected = await healthRepository.checkDatabase();
    return {
      status: dbConnected ? 'ok' : 'degraded',
      db: dbConnected ? 'connected' : 'disconnected',
    };
  },
};
