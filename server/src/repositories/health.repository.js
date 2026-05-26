import { verifyConnection } from '../db/pool.js';

/**
 * Repository layer: MySQL access only, no business logic, no HTTP knowledge.
 *
 * For Phase 0 this is a thin pass-through to the pool's connection check. Once
 * real tables exist (DIH-2 seed), repositories here will run parameterised
 * SELECT queries against occupancy, spend, etc.
 */
export const healthRepository = {
  /**
   * @returns {Promise<boolean>} true if a round-trip to MySQL succeeds
   */
  async checkDatabase() {
    return verifyConnection();
  },
};
