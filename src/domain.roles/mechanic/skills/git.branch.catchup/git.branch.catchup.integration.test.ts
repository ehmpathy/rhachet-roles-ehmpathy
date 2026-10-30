import { given, then, useBeforeAll, when } from 'test-fns';

import {
  asStableOutput,
  genCatchupScene,
  runCatchup,
} from './.test/genCatchupScene';

/**
 * .what = integration tests for the `git.branch.catchup` dispatcher
 * .why = proves --help names how the verb levels a branch (merge, no
 *        rewrite) and an unknown subcommand fails loud with the usage
 */
describe('git.branch.catchup', () => {
  given('[case29] a feature branch', () => {
    const scene = useBeforeAll(async () =>
      genCatchupScene({ slug: 'catchup-dispatch-case29' }),
    );

    when('[t0] --help', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['--help'] }),
      );

      then('exits 0; names the how line and each subcommand', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          'catch up via merge (no rewrite) from origin/main',
        );
        for (const sub of ['begin', 'take', 'lock', 'continue', 'abort'])
          expect(result.stdout).toContain(`├─ ${sub}`);
        expect(result.stdout).toContain('rhx git.commit.push --mode apply');
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] no subcommand', () => {
      const result = useBeforeAll(async () => runCatchup({ scene, args: [] }));

      then('exits 0 with the usage', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('subcommands');
      });
    });

    when('[t2] an unknown subcommand', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['merge'] }),
      );

      then(
        'exits 2 on both streams; names the subcommand and the usage',
        () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            '✋ ConstraintError: unknown subcommand: merge',
          );
          expect(result.stderr).toContain(
            '✋ ConstraintError: unknown subcommand: merge',
          );
          expect(result.stdout).toContain('subcommands');
        },
      );
    });
  });
});
