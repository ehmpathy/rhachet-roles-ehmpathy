import { given, then, when } from 'test-fns';

import { asMalformedHookPaths } from './asMalformedHookPaths';

/**
 * .what = unit coverage for the SHAPE half of the hook-path guard
 * .why = its header names the stake: a path that is absent fails with a non-2
 *        exit, and claude code reads non-2 as "not blocked" — so a malformed one
 *        silently RETIRES a gate rather than breaks it, in every repo that ports
 *        this role.
 *
 * ⚠️ this grades SHAPE only. that the file is on disk is a separate claim, held
 *    by `asAbsentHookPaths` in the reachability integration test, because a unit
 *    test may not touch the filesystem (`rule.forbid.unit.remote-boundaries`).
 *    the two are complements, refuted as a merge on exactly those grounds
 *   .
 *
 * ⇒ the live registry holds only well-formed paths, so every MALFORMED arm below
 *   is unreachable by real data — the crafted cases are the only way to prove the
 *   regex rejects what it claims to.
 */
describe('asMalformedHookPaths', () => {
  const ROLE = 'mechanic';
  const PORTED =
    '.agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/pretooluse.forbid-terms.gerunds.sh';

  given('[case1] a well-formed ported path', () => {
    when('[t0] the path is walked', () => {
      then('it is NOT malformed', () => {
        expect(asMalformedHookPaths({ role: ROLE, paths: [PORTED] })).toEqual(
          [],
        );
      });
    });
  });

  given('[case2] each way a path can be wrong', () => {
    // 🔴 each of these would be pointed at by `settings.json` and would FAIL
    //    OPEN — the hook never runs, the gate never gates, and no extant test
    //    notices, because the `.sh` harnesses invoke hooks by path directly.

    when('[t0] the path is absolute rather than repo-relative', () => {
      then('it is malformed', () => {
        expect(
          asMalformedHookPaths({ role: ROLE, paths: [`/${PORTED}`] }),
        ).toEqual([`/${PORTED}`]);
      });
    });

    when('[t1] the path names the wrong role', () => {
      then('it is malformed', () => {
        const wrong = PORTED.replace('role=mechanic', 'role=architect');
        expect(asMalformedHookPaths({ role: ROLE, paths: [wrong] })).toEqual([
          wrong,
        ]);
      });
    });

    when('[t2] the path sits outside the claude.hooks tree', () => {
      then('it is malformed', () => {
        const wrong = PORTED.replace('inits/claude.hooks/', 'skills/');
        expect(asMalformedHookPaths({ role: ROLE, paths: [wrong] })).toEqual([
          wrong,
        ]);
      });
    });

    when('[t3] the path does not end in .sh', () => {
      then('it is malformed', () => {
        const wrong = PORTED.replace(/\.sh$/, '.bash');
        expect(asMalformedHookPaths({ role: ROLE, paths: [wrong] })).toEqual([
          wrong,
        ]);
      });
    });

    when('[t4] the filename holds a char outside the allowed class', () => {
      then('it is malformed', () => {
        // the class is [a-zA-Z0-9.-], so an underscore is out. named because a
        // human who renames a hook is the likely author of this exact slip.
        const wrong = PORTED.replace('forbid-terms', 'forbid_terms');
        expect(asMalformedHookPaths({ role: ROLE, paths: [wrong] })).toEqual([
          wrong,
        ]);
      });
    });

    when('[t5] the path holds a traversal segment', () => {
      then('it is malformed', () => {
        const wrong =
          '.agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/../../riptide.sh';
        expect(asMalformedHookPaths({ role: ROLE, paths: [wrong] })).toEqual([
          wrong,
        ]);
      });
    });
  });

  given('[case3] a mix of well-formed and malformed', () => {
    when('[t0] the mix is walked', () => {
      then('only the malformed come back', () => {
        // a filter that returned every input, or returned [] always, would pass
        // a one-sided test. the mix is what proves it discriminates.
        const wrong = PORTED.replace(/\.sh$/, '.bash');
        expect(
          asMalformedHookPaths({ role: ROLE, paths: [PORTED, wrong] }),
        ).toEqual([wrong]);
      });
    });
  });
});
