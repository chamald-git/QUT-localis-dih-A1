import { toParagraphs } from './toParagraphs.js';

describe('toParagraphs', () => {
  test('splits on newlines and drops blank lines', () => {
    expect(toParagraphs('First para.\n\nSecond para.\n')).toEqual([
      'First para.',
      'Second para.',
    ]);
  });

  test('non-string input returns an empty array', () => {
    expect(toParagraphs(null)).toEqual([]);
    expect(toParagraphs(undefined)).toEqual([]);
  });
});
