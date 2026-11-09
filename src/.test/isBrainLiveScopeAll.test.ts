import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { isBrainLiveScopeAll } from './isBrainLiveScopeAll';

describe('isBrainLiveScopeAll', () => {
  given('[case1] an env with no BRAIN_LIVE_SCOPE', () => {
    when('[t0] the gate is read', () => {
      then('it reads as off', () => {
        expect(isBrainLiveScopeAll({ env: {} })).toEqual(false);
      });
    });
  });

  given('[case2] an env with an empty BRAIN_LIVE_SCOPE', () => {
    when('[t0] the gate is read', () => {
      then('it reads as off', () => {
        expect(isBrainLiveScopeAll({ env: { BRAIN_LIVE_SCOPE: '' } })).toEqual(
          false,
        );
      });
    });
  });

  given('[case3] an env with BRAIN_LIVE_SCOPE=all', () => {
    when('[t0] the gate is read', () => {
      then('it reads as on', () => {
        expect(
          isBrainLiveScopeAll({ env: { BRAIN_LIVE_SCOPE: 'all' } }),
        ).toEqual(true);
      });
    });
  });

  given('[case4] an env with a typo in BRAIN_LIVE_SCOPE', () => {
    when('[t0] the gate is read with BRAIN_LIVE_SCOPE=true', () => {
      then('it throws a ConstraintError that names the valid value', () => {
        const error = getError(() =>
          isBrainLiveScopeAll({ env: { BRAIN_LIVE_SCOPE: 'true' } }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain("BRAIN_LIVE_SCOPE must be 'all' or unset");
        expect(error.message).toContain('set BRAIN_LIVE_SCOPE=all');
        expect(error.message).toMatchSnapshot();
      });
    });

    when('[t1] the gate is read with BRAIN_LIVE_SCOPE=ALL', () => {
      then('it throws a ConstraintError, since the set is case-exact', () => {
        const error = getError(() =>
          isBrainLiveScopeAll({ env: { BRAIN_LIVE_SCOPE: 'ALL' } }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('"value": "ALL"');
        expect(error.message).toMatchSnapshot();
      });
    });
  });
});
