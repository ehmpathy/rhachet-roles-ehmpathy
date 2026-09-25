import { given, then, when } from 'test-fns';

import { isBashInvokedCommand } from './isBashInvokedCommand';

/**
 * .what = unit coverage for the one tell three assertions share
 * .why = the leaf's own header states the hazard: every consumer FILTERS on it,
 *        so a command that stops to match is dropped from ALL of them and each
 *        assertion then passes VACUOUSLY. a desync here does not turn a test red
 *        — it turns three tests hollow.
 *
 * ⇒ so the cases that matter are the NEAR-MISSES, never the happy path. a tell
 *   that over-matches and a tell that under-matches are both silent downstream.
 */
describe('isBashInvokedCommand', () => {
  given('[case1] a command of the shape lever B writes', () => {
    when('[t0] the command is `bash <ported path>`', () => {
      then('it is bash-invoked', () => {
        expect(
          isBashInvokedCommand({
            command:
              'bash .agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/pretooluse.forbid-terms.gerunds.sh',
          }),
        ).toEqual(true);
      });
    });
  });

  given('[case2] the commands this role deliberately leaves wrapped', () => {
    when('[t0] the command is a `rhachet roles boot` call', () => {
      then('it is NOT bash-invoked', () => {
        // a boot command runs real TS through the runner, which is what the
        // runner exists for. it is not an init hook and must not be counted.
        expect(
          isBashInvokedCommand({
            command:
              './node_modules/.bin/rhachet roles boot --repo ehmpathy --role mechanic',
          }),
        ).toEqual(false);
      });
    });

    when('[t1] the command is the old `rhachet run --init` wrapper', () => {
      then('it is NOT bash-invoked', () => {
        expect(
          isBashInvokedCommand({
            command:
              './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.forbid-terms.gerunds',
          }),
        ).toEqual(false);
      });
    });
  });

  given('[case3] the near-misses that would make a consumer hollow', () => {
    // 🔴 each of these is a string a careless tell would mis-sort, and the
    //    mis-sort is SILENT: an over-match pulls a non-hook into a path
    //    extractor; an under-match drops a real hook from all three consumers
    //    and every assertion over it then passes on a smaller set.

    when('[t0] the command merely CONTAINS bash, not at the start', () => {
      then('it is NOT bash-invoked', () => {
        expect(
          isBashInvokedCommand({ command: 'env FOO=1 bash reef.sh' }),
        ).toEqual(false);
      });
    });

    when('[t1] the command starts with bash but has no space', () => {
      then('it is NOT bash-invoked', () => {
        // `bashful.sh` starts with the four letters and is not a bash call.
        // the space at the end of the tell is what parts them, so it is pinned.
        expect(isBashInvokedCommand({ command: 'bashful.sh' })).toEqual(false);
      });
    });

    when('[t2] the command is empty', () => {
      then('it is NOT bash-invoked', () => {
        expect(isBashInvokedCommand({ command: '' })).toEqual(false);
      });
    });
  });
});
