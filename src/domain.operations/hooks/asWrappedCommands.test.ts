import { given, then, when } from 'test-fns';

import { asWrappedCommands } from './asWrappedCommands';

/**
 * .what = unit coverage for the tell that guards lever B against a re-stamp
 * .why = its 🔴 note records a clamp-with-no-teeth this leaf repaired: the two
 *        tokens `rhachet run` and `--init` are NOT adjacent in a real command,
 *        so a naive `includes('rhachet run --init')` matches no command at all
 *        and every assertion over it passes VACUOUSLY.
 *
 * ⇒ so [case1][t0] is the single most load-carrying case in this file: it is the
 *   one a naive tell fails, and the one no real-data test can reach — the live
 *   registry holds zero wrapped commands by construction, so the true-positive
 *   arm is unreachable except by a crafted case.
 */
describe('asWrappedCommands', () => {
  given('[case1] a real wrapper command, with non-adjacent tokens', () => {
    when('[t0] the command is walked', () => {
      then('it is caught as wrapped', () => {
        // 🔴 note the gap between the tokens — `--repo X --role Y` sits between
        //    `rhachet run` and `--init`. a tell that expects them adjacent
        //    returns [] here, and [] is what a healthy registry also returns.
        //    the clamp would then be green in both worlds and guard naught.
        expect(
          asWrappedCommands({
            commands: [
              './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.forbid-terms.gerunds',
            ],
          }),
        ).toEqual([
          './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.forbid-terms.gerunds',
        ]);
      });
    });
  });

  given('[case2] the boot carve-out', () => {
    when('[t0] a `rhachet roles boot` command is walked', () => {
      then('it is NOT caught', () => {
        // deliberate: a boot command runs real TS through the runner, which is
        // what the runner exists for. it carries no `--init`, and THAT is the
        // discriminator — never the word `roles`.
        expect(
          asWrappedCommands({
            commands: [
              './node_modules/.bin/rhachet roles boot --repo ehmpathy --role mechanic',
            ],
          }),
        ).toEqual([]);
      });
    });
  });

  given('[case3] each token alone, without its partner', () => {
    // both tokens are required TOGETHER. a tell that fired on either one alone
    // would catch the boot commands this role keeps wrapped on purpose, and
    // lever B's clamp would fail red against a correct registry.
    when('[t0] a command holds `rhachet run` but no `--init`', () => {
      then('it is NOT caught', () => {
        expect(
          asWrappedCommands({
            commands: ['./node_modules/.bin/rhachet run --skill git.repo.test'],
          }),
        ).toEqual([]);
      });
    });

    when('[t1] a command holds `--init` but no `rhachet run`', () => {
      then('it is NOT caught', () => {
        expect(
          asWrappedCommands({ commands: ['bash paddleout.sh --init fast'] }),
        ).toEqual([]);
      });
    });
  });

  given('[case4] the shape lever B leaves behind', () => {
    when('[t0] a bash-invoked hook is walked', () => {
      then('it is NOT caught — this is the post-lever-B world', () => {
        expect(
          asWrappedCommands({
            commands: [
              'bash .agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/pretooluse.forbid-terms.gerunds.sh',
            ],
          }),
        ).toEqual([]);
      });
    });
  });
});
