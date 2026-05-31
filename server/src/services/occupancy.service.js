import { getOccupancyByRegion, getOccupancySummary } from '../repositories/occupancy.repository.js';

/**
 * @what Fetches paginated occupancy rows for a region.
 * @why Service layer is transport-agnostic — same function called by REST route and Agno agent tool.
 * @alternative-considered inline query in route handler — rejected, breaks Agno reuse pattern.
 * @module-source DIH-3 REST API foundation
 */
export async function listOccupancy(regionName, limit) {
  return getOccupancyByRegion(regionName, limit);
}

/**
 * @what Fetches summary card data (latest occupancy, ADR) for a region.
 * @why Pre-computes on server so React just renders.
 * @module-source DIH-7 Summary cards
 */
export async function getOccupancyCard(regionName) {
  return getOccupancySummary(regionName);
}