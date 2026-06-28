let currentToken = null;

/**
 * @what Read the current JWT from module-scoped state. Returns null when
 *       no user is authenticated.
 * @why  The api client (client.js) is a plain module, not a React hook,
 *       so it cannot read AuthContext directly. This getter bridges the
 *       React state tree and non-React modules without threading the
 *       token through every method signature on the api client.
 * @alternative-considered Refactoring every api method into a useApi()
 *       hook was rejected because it would force changes to every call
 *       site across the operator and government dashboards. localStorage
 *       was rejected per ADR-0006 (XSS exposure surface).
 * @module-source IFQ716 Week 9, module-singleton bridge between React
 *       context and plain JS modules.
 * @returns {string|null}
 */
export function getAuthToken() {
  return currentToken;
}

/**
 * @what Update the module-scoped token. Called by AuthContext after a
 *       successful login.
 * @why  Keeps token state synchronised between AuthContext (UI state)
 *       and the api client (request layer) without coupling them
 *       directly. AuthContext remains the single source of truth for
 *       UI; the store mirrors it for the request layer.
 * @alternative-considered Directly mutating an exported variable was
 *       rejected because ES module exports are read-only at the import
 *       site. A setter function makes mutation explicit and searchable.
 * @module-source IFQ716 Week 9, encapsulated module-state pattern.
 * @param {string} nextToken
 * @returns {void}
 */
export function setAuthToken(nextToken) {
  currentToken = nextToken;
}

/**
 * @what Clear the current token. Used by logout and by the api client's
 *       401 response handler.
 * @why  An explicit clear function reads more clearly at call sites than
 *       passing null to setAuthToken, especially inside 401 handlers
 *       where the intent matters at viva.
 * @alternative-considered Omitting this and calling setAuthToken(null)
 *       was considered, but an intention-revealing name is safer to
 *       defend in a viva and easier to grep for during incident review.
 * @module-source IFQ716 Week 9, intention-revealing-name pattern.
 * @returns {void}
 */
export function clearAuthToken() {
  currentToken = null;
}