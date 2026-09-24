import { given, then, when } from 'test-fns';

import { asUnaccountedCommands } from './asUnaccountedCommands';

/**
 * .what = unit coverage for the KIND test over registered hook commands
 * .why = every command this role registers takes one of exactly two shapes, so a
 *        command that is neither is a shape nobody declared. the caller asserts
 *        this set is empty — and an empty result is also what a BROKEN predicate
 *        returns, so the cases that prove it discriminates are owed here rather than
 *        inferred from a green caller.
 *
 * ⚠️ this is a KIND test — "which of the two is it?" — never a SHAPE test. whether a
 *    bash-invoked path holds its `.sh`-under-the-ported-tree shape is
 *    `asMalformedHookPaths`, a separate claim. ⇒ do not fuse the two.
 */
describe('asUnaccountedCommands', () => {
  const PORTED =
    'bash .agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/pretooluse.forbid-terms.gerunds.sh';
  const BOOT =
    './node_modules/.bin/rhachet roles boot --repo ehmpathy --role mechanic';

  given('[case1] both declared kinds', () => {
    when('[t0] the pair is walked', () => {
      then('neither is unaccounted', () => {
        expect(asUnaccountedCommands({ commands: [PORTED, BOOT] })).toEqual([]);
      });
    });
  });

  given('[case2] a command of neither kind', () => {
    when('[t0] the old wrapper command is walked', () => {
      then('it is unaccounted', () => {
        // the shape lever B retired. if a re-stamp restores it, this is one of
        // the two tells that catch it — the other is `asWrappedCommands`.
        const wrapped =
          './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.forbid-terms.gerunds';
        expect(asUnaccountedCommands({ commands: [wrapped] })).toEqual([
          wrapped,
        ]);
      });
    });

    when('[t1] a bare interpreter call is walked', () => {
      then('it is unaccounted', () => {
        expect(
          asUnaccountedCommands({ commands: ['node ./reef.hook.js'] }),
        ).toEqual(['node ./reef.hook.js']);
      });
    });

    when('[t2] a boot command with a different bin path is walked', () => {
      then('it is unaccounted', () => {
        // ⚠️ the carve-out is a LITERAL, prefix-anchored on
        //    `./node_modules/.bin/rhachet roles boot `. a bare `rhachet roles
        //    boot` does NOT satisfy it. that is deliberate — the carve-out is
        //    as narrow as the registry it describes — and it is pinned so a
        //    later widen is a decision rather than a drift.
        expect(
          asUnaccountedCommands({
            commands: ['rhachet roles boot --repo ehmpathy --role mechanic'],
          }),
        ).toEqual(['rhachet roles boot --repo ehmpathy --role mechanic']);
      });
    });
  });

  given('[case3] a KIND-valid command whose path SHAPE is wrong', () => {
    when('[t0] the command is walked', () => {
      then('it is NOT unaccounted — shape is a different claim', () => {
        // 🔴 `bash /etc/riptide.sh` is a bash-invoked command, so its KIND is
        //    accounted for. that its path is malformed is `asMalformedHookPaths`'
        //    verdict, in its own assertion. one predicate that answered both would
        //    report a single failure for two distinct defects, and name the wrong one.
        expect(
          asUnaccountedCommands({ commands: ['bash /etc/riptide.sh'] }),
        ).toEqual([]);
      });
    });
  });

  given('[case4] a mix of accounted and unaccounted', () => {
    when('[t0] the mix is walked', () => {
      then('only the unaccounted come back', () => {
        expect(
          asUnaccountedCommands({
            commands: [PORTED, 'node ./reef.hook.js', BOOT],
          }),
        ).toEqual(['node ./reef.hook.js']);
      });
    });
  });
});
