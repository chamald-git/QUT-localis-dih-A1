// Minimal Jest config for the ESM ("type":"module") server package.
// No Babel transform — tests run as native ESM via
// NODE_OPTIONS=--experimental-vm-modules (see the "test" script). Keep brief
// unit tests next to the source as *.test.js.
module.exports = {
  testEnvironment: 'node',
  transform: {},
};
