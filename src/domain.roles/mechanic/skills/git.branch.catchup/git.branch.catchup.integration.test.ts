import { given, then, useBeforeAll, when } from 'test-fns';

import {
  asStableOutput,
  genCatchupScene,
  getHeadFacts,
  isMergeInFlight,
  runCatchup,
} from './.test/genCatchupScene';

/**
 * .what = integration tests for the `git.branch.catchup` dispatcher
 * .why = proves --help names how the verb levels a branch (merge, no
 *        rewrite), each subcommand explains itself on demand, and an
 *        unknown subcommand fails loud with the usage
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

      then('matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t3] --help on each subcommand', () => {
      const result = useBeforeAll(async () => {
        const headBefore = getHeadFacts({ scene }).sha;
        const runs = ['begin', 'take', 'lock', 'continue', 'abort'].map(
          (sub) => ({ sub, run: runCatchup({ scene, args: [sub, '--help'] }) }),
        );
        return { headBefore, runs };
      });

      then('each exits 0 with a usage line that names its own verb', () => {
        for (const { sub, run } of result.runs) {
          expect(run.exitCode).toBe(0);
          expect(run.stdout).toContain('├─ usage');
          expect(run.stdout).toContain(`rhx git.branch.catchup ${sub}`);
        }
      });

      then('begin and take, which take options, show a worked example', () => {
        for (const { run } of result.runs.filter((r) =>
          ['begin', 'take'].includes(r.sub),
        ))
          expect(run.stdout).toContain('└─ examples');
      });

      then('each mutates naught: no merge starts, HEAD holds', () => {
        for (const { run } of result.runs)
          expect(run.stdout).not.toContain('ConstraintError');
        expect(getHeadFacts({ scene }).sha).toBe(result.headBefore);
        expect(isMergeInFlight({ scene })).toBe(false);
      });

      then('matches snapshot', () => {
        expect(
          result.runs
            .map(
              ({ sub, run }) =>
                `$ ${sub} --help\n${asStableOutput(run.stdout)}`,
            )
            .join('\n'),
        ).toMatchSnapshot();
      });
    });

    when('[t4] an unknown flag on each subcommand', () => {
      const result = useBeforeAll(async () => {
        const headBefore = getHeadFacts({ scene }).sha;
        const runs = [
          ['begin', '--force'],
          ['take', '--force'],
          ['lock', 'refresh', '--force'],
          ['continue', '--force'],
          ['abort', '--force'],
        ].map((args) => ({ args, run: runCatchup({ scene, args }) }));
        return { headBefore, runs };
      });

      then('each exits 2 on both streams and names the flag', () => {
        for (const { run } of result.runs) {
          expect(run.exitCode).toBe(2);
          expect(run.stdout).toContain(
            '✋ ConstraintError: unknown argument: --force',
          );
          expect(run.stderr).toContain(
            '✋ ConstraintError: unknown argument: --force',
          );
          expect(run.stdout).toContain('└─ usage: rhx git.branch.catchup');
        }
      });

      then('each mutates naught: no merge starts, HEAD holds', () => {
        expect(getHeadFacts({ scene }).sha).toBe(result.headBefore);
        expect(isMergeInFlight({ scene })).toBe(false);
      });

      then('matches snapshot', () => {
        expect(
          result.runs
            .map(
              ({ args, run }) =>
                `$ ${args.join(' ')}\n${asStableOutput(run.stdout)}`,
            )
            .join('\n'),
        ).toMatchSnapshot();
      });
    });
  });
});
