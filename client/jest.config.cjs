/**
 * Client unit tests for pure helpers only (query/string logic).
 * React components that touch vega-embed / the DOM are verified visually,
 * not here. Run with: NODE_OPTIONS=--experimental-vm-modules jest
 */
module.exports = {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/src/**/*.test.js'],
};
