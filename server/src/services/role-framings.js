/**
 * @what Per-role prompt framing for the AI insights endpoint (DIH-68).
 * @why  Each user role gets ONE framing sentence; the rest of the Gemini
 *       prompt (data description + output contract) is shared. Kept in its own
 *       module with no DB/config imports so it stays trivially unit-testable.
 * @note Role validation is backlog work (DIH-1) — for now an unknown/missing
 *       role falls back to the government framing (a safe default, not validation).
 */
export const ROLE_FRAMINGS = {
  government:
    'The user is a local government tourism officer. Focus on the visitor economy across the selected regions, regional comparisons, and trends that inform policy and funding.',
  dmo:
    'The user is a Destination Marketing Organisation analyst. Focus on demand drivers, visitor mix and seasonality, and how the selected regions compare — to guide marketing and campaign spend.',
  operator:
    'The user is a tourism operator. Focus on competitive context — how the selected metrics are tracking and what that means for pricing and operations.',
  admin:
    'The user is a platform administrator. Give an at-a-glance overview of the selected regions, data coverage, and any anomalies worth monitoring.',
};

/** Known role keys (e.g. for the test page / docs). Role validation is backlog work (DIH-1). */
export const VALID_ROLES = Object.keys(ROLE_FRAMINGS);

/**
 * The framing sentence for a role, falling back to the government framing for an
 * unknown/missing role (safe default — not validation; that is backlog work, DIH-1).
 * @param {string} role
 * @returns {string}
 */
export function roleFraming(role) {
  return ROLE_FRAMINGS[role] ?? ROLE_FRAMINGS.government;
}
