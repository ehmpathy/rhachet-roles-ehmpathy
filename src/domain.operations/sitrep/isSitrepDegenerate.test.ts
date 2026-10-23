import { given, then, when } from 'test-fns';

import { isSitrepDegenerate } from './isSitrepDegenerate';

describe('isSitrepDegenerate', () => {
  given('[case1] a sitrep that holds no characters', () => {
    when('[t0] it is empty', () => {
      then('it is degenerate', () => {
        expect(isSitrepDegenerate({ sitrep: '' })).toEqual(true);
      });
    });
    when('[t1] it is whitespace only', () => {
      then('it is degenerate', () => {
        expect(isSitrepDegenerate({ sitrep: '  \n\t ' })).toEqual(true);
      });
    });
  });

  given('[case2] a bare placeholder', () => {
    // every declared placeholder, so a typo or a drop in the set fails here
    ['N/A', 'na', 'none', 'null', 'undefined', '-', '...'].forEach(
      (placeholder, index) => {
        when(`[t${index}] the sitrep is '${placeholder}'`, () => {
          then('it is degenerate', () => {
            expect(isSitrepDegenerate({ sitrep: placeholder })).toEqual(true);
          });
        });
      },
    );
  });

  given('[case3] a placeholder in a wrap a brain emits', () => {
    // each wrap seen or plausible from a brain: whitespace, case, markdown, punctuation, unicode
    [
      '\n none \n',
      'NULL',
      '**N/A**',
      '`none`',
      'N/A.',
      'none!',
      '…',
      '"n/a"',
    ].forEach((wrapped, index) => {
      when(`[t${index}] the sitrep is ${JSON.stringify(wrapped)}`, () => {
        then('it is degenerate', () => {
          expect(isSitrepDegenerate({ sitrep: wrapped })).toEqual(true);
        });
      });
    });
  });

  given('[case4] a sitrep that holds a brief', () => {
    when('[t0] it is a real compressed brief', () => {
      then('it is not degenerate', () => {
        expect(
          isSitrepDegenerate({
            sitrep:
              '### .rule = require-explicit-return-types\n\nall exports declare a return type.',
          }),
        ).toEqual(false);
      });
    });
    when('[t1] it merely mentions n/a in a sentence', () => {
      then('it is not degenerate', () => {
        expect(
          isSitrepDegenerate({
            sitrep: 'field may be n/a when the surfer has no board',
          }),
        ).toEqual(false);
      });
    });
    when('[t2] it is a single real word', () => {
      then('it is not degenerate', () => {
        expect(isSitrepDegenerate({ sitrep: 'nonempty' })).toEqual(false);
      });
    });
  });
});
