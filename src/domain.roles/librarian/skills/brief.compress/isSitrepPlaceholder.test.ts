import { isSitrepPlaceholder } from './isSitrepPlaceholder';

const TEST_CASES = [
  {
    description:
      'an ellipsis is a placeholder (the brain output that broke checkRetention)',
    given: { sitrep: '...' },
    expect: { output: true },
  },
  {
    description: 'a unicode ellipsis is a placeholder',
    given: { sitrep: '…' },
    expect: { output: true },
  },
  {
    description: 'an empty string is a placeholder',
    given: { sitrep: '' },
    expect: { output: true },
  },
  {
    description: 'whitespace and markdown punctuation alone is a placeholder',
    given: { sitrep: '  # - **\n```\n```  ' },
    expect: { output: true },
  },
  {
    description: 'a real brief is not a placeholder',
    given: {
      sitrep: '# rule.require.return-types\n- exports declare return types',
    },
    expect: { output: false },
  },
  {
    description: 'a brief in a non-latin alphabet is not a placeholder',
    given: { sitrep: '規則: 戻り値の型' },
    expect: { output: false },
  },
];

describe('isSitrepPlaceholder', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isSitrepPlaceholder(thisCase.given)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
