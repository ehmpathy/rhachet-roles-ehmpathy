import { given, then, when } from 'test-fns';

import { asBashInvokedPaths } from './asBashInvokedPaths';

/**
 * .what = unit coverage for the path extractor two assertions share
 * .why = its ⚠️ note records a real defect this leaf repaired: the shape check
 *        read the WHOLE remainder of the command before the leaf existed, which
 *        made it an accidental no-args assertion as well as a path-shape one.
 *
 * ⇒ the case that pins that repair is a command WITH args. no command in the
 *   live registry carries args today, so a real-data test would pass either way
 *   — which is exactly why a crafted case is owed.
 */
describe('asBashInvokedPaths', () => {
  const PORTED =
    '.agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/pretooluse.forbid-terms.gerunds.sh';

  given('[case1] a mix of both command kinds this role registers', () => {
    when('[t0] the mix is walked', () => {
      then('only the bash-invoked paths come back', () => {
        expect(
          asBashInvokedPaths({
            commands: [
              `bash ${PORTED}`,
              './node_modules/.bin/rhachet roles boot --repo ehmpathy --role mechanic',
            ],
          }),
        ).toEqual([PORTED]);
      });
    });
  });

  given('[case2] a bash command that carries args after the path', () => {
    // 🔴 THE case this leaf exists for. before it, the extractor returned
    //    `<path> --flag value` and the shape regex rejected it — so the shape
    //    assertion silently doubled as "no hook may take args". that is a claim
    //    nobody declared, enforced by a test that named a different subject.
    when('[t0] the command is walked', () => {
      then('the path alone comes back, never the args', () => {
        expect(
          asBashInvokedPaths({ commands: [`bash ${PORTED} --mode apply`] }),
        ).toEqual([PORTED]);
      });
    });
  });

  given('[case3] a bash command with extra space after the prefix', () => {
    when('[t0] the command is walked', () => {
      then('the path is still extracted whole', () => {
        // the strip is `/^bash\s+/`, never `/^bash /`, so repeated whitespace
        // does not leak into the path and turn a healthy hook malformed.
        expect(asBashInvokedPaths({ commands: [`bash   ${PORTED}`] })).toEqual([
          PORTED,
        ]);
      });
    });
  });

  given('[case4] no bash-invoked command at all', () => {
    when('[t0] the set is walked', () => {
      then('the result is empty, never a stray entry', () => {
        // ⚠️ an empty result is the VACUOUS state both consumers are exposed to
        //    — every downstream `toEqual([])` passes over it. the consumers
        //    guard that with a non-empty positive control; this pins that the
        //    emptiness is real rather than an extractor defect.
        expect(
          asBashInvokedPaths({
            commands: [
              './node_modules/.bin/rhachet roles boot --repo ehmpathy --role mechanic',
            ],
          }),
        ).toEqual([]);
      });
    });
  });
});
