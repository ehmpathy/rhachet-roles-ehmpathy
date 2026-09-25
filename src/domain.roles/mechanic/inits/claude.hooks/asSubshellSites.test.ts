import { given, then, when } from 'test-fns';

import { asSubshellSites } from './asSubshellSites';

/**
 * .what = unit tests for asSubshellSites
 * .why = the leaf decides what the static fork clamp counts, so a defect here
 *        is invisible at the clamp — the number would simply be wrong, and a
 *        wrong number that never fails reads exactly like a correct one
 */
describe('asSubshellSites', () => {
  given('[case1] a source with one command substitution', () => {
    when('[t0] the sites are read', () => {
      then('it finds the one', () => {
        expect(asSubshellSites({ source: 'X=$(date +%s)' })).toEqual(['$(']);
      });
    });
  });

  given('[case2] a source with arithmetic expansion', () => {
    when('[t0] the sites are read', () => {
      then('it finds none — `$((` forks naught', () => {
        // 🔴 THE case that separates the two. `$((` starts with `$(`, so a
        //    naive match counts it and reports a fork that does not exist.
        expect(asSubshellSites({ source: 'elapsed=$((NOW - LAST))' })).toEqual(
          [],
        );
      });
    });
  });

  given('[case3] a source with both on adjacent lines', () => {
    when('[t0] the sites are read', () => {
      then('it counts the substitution and skips the arithmetic', () => {
        const source = ['NOW=$(date +%s)', 'd=$((NOW - 1))'].join('\n');
        expect(asSubshellSites({ source })).toEqual(['$(']);
      });
    });
  });

  given('[case4] a whole-line comment that holds a substitution', () => {
    when('[t0] the sites are read', () => {
      then('it finds none — a comment forks naught', () => {
        expect(asSubshellSites({ source: '  # X=$(date)' })).toEqual([]);
      });
    });
  });

  given('[case5] one line with two substitutions', () => {
    when('[t0] the sites are read', () => {
      then(
        'it finds both — the tally is per occurrence, never per line',
        () => {
          // a per-line count would under-report, and under-report is the one
          // direction a fork guard must never err in.
          expect(asSubshellSites({ source: 'X=$(a)$(b)' })).toEqual([
            '$(',
            '$(',
          ]);
        },
      );
    });
  });

  given('[case6] a source with no substitution at all', () => {
    when('[t0] the sites are read', () => {
      then('it returns an empty list, never undefined', () => {
        expect(asSubshellSites({ source: 'echo hello' })).toEqual([]);
      });
    });
  });
});
