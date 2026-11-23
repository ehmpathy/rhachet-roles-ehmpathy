import { spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { maskSpinnerTicks } from '../../../../.test/maskSpinnerTicks';

/**
 * .what = verify git.repo.test.sh caps jest workers on a shared box
 * .why = one crew's uncapped suite takes every core and starves its
 *        neighbors. the cap holds jest at 4 on a shared box, never raises
 *        a lower config count, never applies on ci, and never overrides a
 *        worker flag the caller passed after `--`.
 */
describe('git.repo.test.sh workers', () => {
  const scriptPath = path.join(__dirname, 'git.repo.test.sh');
  const repoRoot = path.join(__dirname, '../../../../..');

  /**
   * .what = mask the values that vary per run (timer ticks, temp paths)
   * .why = the snapshot pins the shape of the run tree, not its clock
   * .note = the same mask chain as the peer suites, so one timer tree
   *         renders one shape across the snapshots dir
   */
  const asStableOutput = (output: string): string =>
    maskSpinnerTicks(output)
      .replace(/\(\d+s\)/g, '(Xs)')
      .replace(/time: \d+s/g, 'time: Xs')
      // collapse a run of spinner ticks to one: the count tracks host speed
      .replace(/(^[^\n]*💤 inflight \(Xs\)\n)+/gm, '$1')
      .replace(/\/tmp\/[^\s\n]+/g, '/tmp/__sanitized__')
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z/g, '__isotime__')
      .trim();

  /**
   * .what = run the skill in a temp repo with fake jest + npm, and capture
   *         the args npm received plus whether jest --showConfig was called
   * .why = the cap is an arg the skill hands to jest, so the proof is the
   *        args npm receives; the --showConfig call count proves when the
   *        skill skips the lookup (ci, caller flag, non-jest kind)
   * .note = the fake jest answers --showConfig with the count chosen per
   *         test type; 'fail' makes the lookup exit 1 (jest cannot load the
   *         config); 'garbage' exits 0 with output that holds no count
   */
  const runAndCapture = (args: {
    what: string;
    ci: string | null;
    configWorkers: Record<string, number | 'fail' | 'garbage'>;
    restArgs?: string[];
    extraArgs?: string[];
    timeout?: string;
    configFiles?: 'js' | 'ts' | 'both';
    jestBin?: 'present' | 'absent';
    npmSleepSeconds?: number;
    showConfigSleepSeconds?: number;
    unitCommand?: string;
    extraConfigFiles?: string[];
    mode?: 'plan' | 'apply';
  }): {
    stdout: string;
    stderr: string;
    exitCode: number;
    npmCalls: string[];
    showConfigCalls: number;
  } => {
    const tempDir = genTempDir({ slug: 'workers-test', git: true });

    // package.json with every command the cases reach
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-repo',
          devDependencies: { jest: '30.2.0' },
          scripts: {
            'test:lint': 'echo lint',
            'test:types': 'tsc --noEmit',
            'test:unit':
              args.unitCommand ?? 'jest --config jest.unit.config.js',
            'test:integration': 'jest --config jest.integration.config.js',
            'test:acceptance:locally':
              'jest --config jest.acceptance.config.js --runInBand',
          },
        },
        null,
        2,
      ),
    );

    // jest configs + one test file per type
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    const configFiles = args.configFiles ?? 'js';
    for (const configType of ['unit', 'integration', 'acceptance']) {
      if (configFiles !== 'ts')
        fs.writeFileSync(
          path.join(tempDir, `jest.${configType}.config.js`),
          `module.exports = { testMatch: ['**/*.${configType}.test.js'] };`,
        );
      if (configFiles !== 'js')
        fs.writeFileSync(
          path.join(tempDir, `jest.${configType}.config.ts`),
          `export default { testMatch: ['**/*.${configType}.test.js'], maxWorkers: 1 };`,
        );
      fs.writeFileSync(
        path.join(tempDir, 'src', `example.${configType}.test.js`),
        `describe('example', () => { it('passes', () => {}); });`,
      );
    }
    for (const configFile of args.extraConfigFiles ?? [])
      fs.writeFileSync(
        path.join(tempDir, configFile),
        `module.exports = { testMatch: ['**/*.test.js'] };`,
      );

    // fake jest: --listTests lists files; --showConfig answers per config
    const showConfigLog = path.join(tempDir, '.showconfig-calls.txt');
    const showConfigBranches = Object.entries(args.configWorkers)
      .map(([type, workers]) => {
        if (workers === 'fail')
          return `  if [[ "$*" == *"jest.${type}.config"* ]]; then exit 1; fi`;
        if (workers === 'garbage')
          return `  if [[ "$*" == *"jest.${type}.config"* ]]; then echo 'not json'; exit 0; fi`;
        return `  if [[ "$*" == *"jest.${type}.config"* ]]; then echo '{"configs":[],"globalConfig":{"maxWorkers":${workers}},"version":"30.2.0"}'; exit 0; fi`;
      })
      .join('\n');
    const jestBinDir = path.join(tempDir, 'node_modules', '.bin');
    fs.mkdirSync(jestBinDir, { recursive: true });
    fs.writeFileSync(
      path.join(jestBinDir, 'jest'),
      `#!/bin/bash
if [[ "$*" == *"--listTests"* ]]; then
  echo "${tempDir}/src/example.unit.test.js"
  exit 0
fi
if [[ "$*" == *"--showConfig"* ]]; then
  echo "called" >> "${showConfigLog}"
  sleep ${args.showConfigSleepSeconds ?? 0}
${showConfigBranches}
  exit 1
fi
exit 1
`,
    );
    fs.chmodSync(path.join(jestBinDir, 'jest'), '755');
    if (args.jestBin === 'absent') fs.rmSync(path.join(jestBinDir, 'jest'));

    // fake npm: record args; only a jest kind emits jest-shaped output,
    // so a types/lint child renders the tree a real tsc or biome run does
    const npmLog = path.join(tempDir, '.npm-calls.txt');
    const fakeBinDir = path.join(tempDir, '.fakebin');
    fs.mkdirSync(fakeBinDir, { recursive: true });
    fs.writeFileSync(
      path.join(fakeBinDir, 'npm'),
      `#!/bin/bash
echo "$*" >> "${npmLog}"
sleep ${args.npmSleepSeconds ?? 0}
case "$2" in
  test:unit|test:integration|test:acceptance*)
    echo "Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        0.1 s" >&2
    ;;
esac
exit 0
`,
    );
    fs.chmodSync(path.join(fakeBinDir, 'npm'), '755');

    // fake rhx keyrack for integration; pass the rest through
    const realRhxPath = spawnSync('which', ['rhx'], {
      encoding: 'utf-8' as const, // node api requires this exact string
    }).stdout.trim();
    fs.writeFileSync(
      path.join(fakeBinDir, 'rhx'),
      `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "unlock" ]]; then
  echo "unlocked ehmpath/test"
  exit 0
fi
if [[ "$1" == "keyrack" && "$2" == "source" ]]; then
  echo "# fake keyrack source"
  exit 0
fi
exec "${realRhxPath}" "$@"
`,
    );
    fs.chmodSync(path.join(fakeBinDir, 'rhx'), '755');

    // env: CI set exactly as the case demands, never inherited
    const envBase = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key !== 'CI'),
    );
    const env = {
      ...envBase,
      ...(args.ci === null ? {} : { CI: args.ci }),
      PATH: `${fakeBinDir}:${process.env.PATH}`,
    };

    // commit to establish git history
    spawnSync('git', ['add', '.'], { cwd: tempDir });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd: tempDir });

    // build skill args
    const skillArgs = [
      '--what',
      args.what,
      '--mode',
      args.mode ?? 'apply',
      '--thorough',
    ];
    if (args.timeout) skillArgs.push('--timeout', args.timeout);
    if (args.extraArgs) skillArgs.push(...args.extraArgs);
    if (args.restArgs) skillArgs.push('--', ...args.restArgs);

    const result = spawnSync('bash', [scriptPath, ...skillArgs], {
      cwd: tempDir,
      encoding: 'utf-8' as const, // node api requires this exact string
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
      timeout: 60_000,
    });

    const npmCalls = fs.existsSync(npmLog)
      ? fs.readFileSync(npmLog, 'utf-8').trim().split('\n')
      : [];
    const showConfigCalls = fs.existsSync(showConfigLog)
      ? fs.readFileSync(showConfigLog, 'utf-8').trim().split('\n').length
      : 0;

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      npmCalls,
      showConfigCalls,
    };
  };

  given('[case1] a shared box, a config above the cap', () => {
    when('[t0] --what unit runs with CI unset', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({ what: 'unit', ci: null, configWorkers: { unit: 18 } }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('jest receives --maxWorkers=4', () => {
        expect(result.npmCalls).toEqual(['run test:unit -- --maxWorkers=4']);
      });

      then('stdout names no worker count (no new output)', () => {
        expect(result.stdout).not.toContain('maxWorkers');
      });

      then('stderr carries no worker note (no new output)', () => {
        expect(result.stderr).not.toContain('worker');
        expect(asStableOutput(result.stderr)).toMatchSnapshot();
      });

      then('stdout matches snapshot (the tree matches an uncapped run)', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] --what integration runs with a maxWorkers: 18 config', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'integration',
          ci: null,
          configWorkers: { integration: 18 },
        }),
      );

      then('jest receives --maxWorkers=4 on the keyrack branch too', () => {
        expect(result.exitCode).toBe(0);
        expect(result.npmCalls).toEqual([
          'run test:integration -- --maxWorkers=4',
        ]);
      });
    });

    when('[t1] --what unit runs with --timeout', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'unit',
          ci: null,
          configWorkers: { unit: 18 },
          timeout: '30',
        }),
      );

      then('jest receives --maxWorkers=4 on the timeout branch too', () => {
        expect(result.exitCode).toBe(0);
        expect(result.npmCalls).toEqual(['run test:unit -- --maxWorkers=4']);
      });
    });

    when('[t2] the repo has only jest.unit.config.ts', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'unit',
          ci: null,
          configWorkers: { unit: 18 },
          configFiles: 'ts',
        }),
      );

      then(
        'the lookup reads the .ts config and jest receives --maxWorkers=4',
        () => {
          expect(result.exitCode).toBe(0);
          expect(result.showConfigCalls).toBe(1);
          expect(result.npmCalls).toEqual(['run test:unit -- --maxWorkers=4']);
        },
      );
    });
  });

  given('[case2] a shared box, a config at or below the cap', () => {
    when('[t0] --what integration runs with a maxWorkers: 1 config', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'integration',
          ci: null,
          configWorkers: { integration: 1 },
        }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('jest receives no worker flag, so the suite stays serial', () => {
        expect(result.npmCalls).toEqual(['run test:integration']);
      });

      then('stdout matches snapshot (the tree matches an uncapped run)', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --what unit runs with a config count of exactly 4', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({ what: 'unit', ci: null, configWorkers: { unit: 4 } }),
      );

      then('jest receives no worker flag', () => {
        expect(result.npmCalls).toEqual(['run test:unit']);
      });
    });
  });

  given('[case3] a ci runner', () => {
    when('[t0] --what unit runs with CI=true', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'unit',
          ci: 'true',
          configWorkers: { unit: 18 },
        }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('jest receives no worker flag', () => {
        expect(result.npmCalls).toEqual(['run test:unit']);
      });

      then('no --showConfig lookup runs', () => {
        expect(result.showConfigCalls).toBe(0);
      });

      then('stdout matches snapshot (the tree matches an uncapped run)', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --what unit runs with CI=false', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'unit',
          ci: 'false',
          configWorkers: { unit: 18 },
        }),
      );

      then('the box counts as shared, and jest receives --maxWorkers=4', () => {
        expect(result.npmCalls).toEqual(['run test:unit -- --maxWorkers=4']);
      });
    });
  });

  given('[case4] a caller that passes its own worker flag', () => {
    when('[t0] the caller passes -- --maxWorkers=16', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'unit',
          ci: null,
          configWorkers: { unit: 18 },
          restArgs: ['--maxWorkers=16'],
        }),
      );

      then('jest receives only the caller count', () => {
        expect(result.exitCode).toBe(0);
        expect(result.npmCalls).toEqual(['run test:unit -- --maxWorkers=16']);
      });

      then('no --showConfig lookup runs', () => {
        expect(result.showConfigCalls).toBe(0);
      });

      then('stdout matches snapshot (the tree matches an uncapped run)', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] the caller passes -- -w 8', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'unit',
          ci: null,
          configWorkers: { unit: 18 },
          restArgs: ['-w', '8'],
        }),
      );

      then('jest receives only the caller count', () => {
        expect(result.npmCalls).toEqual(['run test:unit -- -w 8']);
      });
    });

    when('[t2] the caller passes -- --runInBand', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'unit',
          ci: null,
          configWorkers: { unit: 18 },
          restArgs: ['--runInBand'],
        }),
      );

      then('jest receives --runInBand and no --maxWorkers', () => {
        expect(result.npmCalls).toEqual(['run test:unit -- --runInBand']);
      });
    });
  });

  given('[case5] a shared box where the count is unknown', () => {
    when('[t0] jest --showConfig exits 1', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'unit',
          ci: null,
          configWorkers: { unit: 'fail' },
        }),
      );

      then('the run proceeds', () => {
        expect(result.exitCode).toBe(0);
      });

      then('jest receives no worker flag, since the count is unknown', () => {
        expect(result.npmCalls).toEqual(['run test:unit']);
      });

      then('no worker note on stderr (an expected failure)', () => {
        expect(result.stderr).not.toContain('worker cap skipped');
      });
    });

    when('[t1] jest --showConfig exits 0 with no integer count', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'unit',
          ci: null,
          configWorkers: { unit: 'garbage' },
        }),
      );

      then('the run proceeds', () => {
        expect(result.exitCode).toBe(0);
      });

      then('jest receives no worker flag', () => {
        expect(result.npmCalls).toEqual(['run test:unit']);
      });

      then('stderr names the skipped cap, why, and the fix', () => {
        expect(result.stderr).toContain(
          [
            '💥 MalfunctionError: worker cap skipped; the suite runs uncapped',
            '   ├─ why: jest --showConfig gave no integer globalConfig.maxWorkers (found: none)',
            '   └─ fix: pass -- --maxWorkers=4 to cap this run',
          ].join('\n'),
        );
      });

      then('stdout carries the same note as a workers branch', () => {
        // a malfunction reaches both streams (rule.require.skill-output-streams)
        expect(result.stdout).toContain(
          [
            '   ├─ workers: 💥 MalfunctionError: worker cap skipped; the suite runs uncapped',
            '   │  ├─ why: jest --showConfig gave no integer globalConfig.maxWorkers (found: none)',
            '   │  └─ fix: pass -- --maxWorkers=4 to cap this run',
          ].join('\n'),
        );
      });

      then('stdout matches snapshot (the workers branch in the tree)', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });

      then('the note matches snapshot', () => {
        const noteLine = result.stderr
          .split('\n')
          .filter((line) => /worker cap skipped|why: |fix: /.test(line))
          .join('\n');
        expect(noteLine).toMatchSnapshot();
      });
    });

    when(
      '[t2] both jest.unit.config.js (derives 18) and a serial .ts are present',
      () => {
        const result = useThen('skill executes', () =>
          runAndCapture({
            what: 'unit',
            ci: null,
            configWorkers: { unit: 18 },
            configFiles: 'both',
            unitCommand: 'jest',
          }),
        );

        then(
          'jest receives no worker flag, since the run may use either',
          () => {
            expect(result.exitCode).toBe(0);
            expect(result.npmCalls).toEqual(['run test:unit']);
          },
        );

        then('no --showConfig lookup runs', () => {
          expect(result.showConfigCalls).toBe(0);
        });
      },
    );

    when('[t3] no jest bin sits in node_modules/.bin', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'unit',
          ci: null,
          configWorkers: { unit: 18 },
          jestBin: 'absent',
        }),
      );

      then('the run proceeds with no worker flag', () => {
        expect(result.exitCode).toBe(0);
        expect(result.npmCalls).toEqual(['run test:unit']);
      });

      then('no worker note on stderr (an expected failure)', () => {
        expect(result.stderr).not.toContain('worker cap skipped');
      });
    });

    when('[t4] the --showConfig lookup hangs past the --timeout', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'unit',
          ci: null,
          configWorkers: { unit: 18 },
          timeout: '1',
          showConfigSleepSeconds: 5,
        }),
      );

      then('the lookup is cut off and the run proceeds uncapped', () => {
        expect(result.exitCode).toBe(0);
        expect(result.showConfigCalls).toBe(1);
        expect(result.npmCalls).toEqual(['run test:unit']);
      });

      then('stderr names the timed-out lookup, its bound, and the fix', () => {
        expect(result.stderr).toContain(
          [
            '💥 MalfunctionError: worker cap skipped; the suite runs uncapped',
            '   ├─ why: jest --showConfig lookup timed out after 1s (the smaller of --timeout and 30s)',
            '   └─ fix: pass -- --maxWorkers=4 to cap this run',
          ].join('\n'),
        );
      });

      then('stdout carries the same note as a workers branch', () => {
        expect(result.stdout).toContain(
          [
            '   ├─ workers: 💥 MalfunctionError: worker cap skipped; the suite runs uncapped',
            '   │  ├─ why: jest --showConfig lookup timed out after 1s (the smaller of --timeout and 30s)',
            '   │  └─ fix: pass -- --maxWorkers=4 to cap this run',
          ].join('\n'),
        );
      });

      then('the note matches snapshot', () => {
        const noteLine = result.stderr
          .split('\n')
          .filter((line) => /worker cap skipped|why: |fix: /.test(line))
          .join('\n');
        expect(noteLine).toMatchSnapshot();
      });

      then('stdout matches snapshot (the workers branch in the tree)', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t5] a multi-mode run where each jest lookup yields no count', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'unit,integration',
          ci: null,
          configWorkers: { unit: 'garbage', integration: 'garbage' },
        }),
      );

      then('both children run uncapped, and exit 0', () => {
        expect(result.exitCode).toBe(0);
        expect(result.npmCalls).toEqual([
          'run test:unit',
          'run test:integration',
        ]);
      });

      then('each child notes its skip once per stream, none doubled', () => {
        const countOf = (text: string): number =>
          text.split('worker cap skipped').length - 1;
        expect(countOf(result.stdout)).toBe(2);
        expect(countOf(result.stderr)).toBe(2);
      });

      then('stdout matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case6] every caller worker-flag form the skill detects', () => {
    const CALLER_FORMS: string[][] = [
      ['--maxWorkers', '6'],
      ['--maxWorkers=6'],
      ['--max-workers', '6'],
      ['--max-workers=6'],
      ['-w', '6'],
      ['-w=6'],
      ['-w6'],
      ['--runInBand'],
      ['--run-in-band'],
      ['-i'],
    ];

    CALLER_FORMS.forEach((form, index) => {
      when(`[t${index}] the caller passes -- ${form.join(' ')}`, () => {
        const result = useThen('skill executes', () =>
          runAndCapture({
            what: 'unit',
            ci: null,
            configWorkers: { unit: 18 },
            restArgs: form,
          }),
        );

        then('jest receives only the caller flag', () => {
          expect(result.exitCode).toBe(0);
          expect(result.npmCalls).toEqual([
            `run test:unit -- ${form.join(' ')}`,
          ]);
        });

        then('no --showConfig lookup runs', () => {
          expect(result.showConfigCalls).toBe(0);
        });
      });
    });
  });

  given('[case7] a non-jest kind', () => {
    when('[t0] --what lint runs on a shared box', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({ what: 'lint', ci: null, configWorkers: { unit: 18 } }),
      );

      then('the lint command receives no worker flag', () => {
        expect(result.exitCode).toBe(0);
        expect(result.npmCalls).toEqual(['run test:lint']);
      });

      then('no --showConfig lookup runs', () => {
        expect(result.showConfigCalls).toBe(0);
      });
    });
  });

  given('[case8] acceptance, whose npm command carries --runInBand', () => {
    when('[t0] --what acceptance --against local runs on a shared box', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'acceptance',
          ci: null,
          configWorkers: { acceptance: 18 },
          extraArgs: ['--against', 'local', '--env', 'test'],
        }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('the skill reads the command and sends no worker flag', () => {
        // .note = the command's own --runInBand already fixes 1 worker; a cap
        //         there would be moot, and a cap-aware timeout hint would lie
        expect(result.npmCalls).toEqual(['run test:acceptance:locally']);
      });

      then('no --showConfig lookup runs', () => {
        expect(result.showConfigCalls).toBe(0);
      });
    });
  });

  given('[case9] the npm command names its own config file', () => {
    when('[t0] test:unit runs jest -c ./jest.custom.config.js', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'unit',
          ci: null,
          configWorkers: { custom: 18, unit: 1 },
          unitCommand: 'jest -c ./jest.custom.config.js',
          configFiles: 'js',
          extraConfigFiles: ['jest.custom.config.js'],
        }),
      );

      then('the lookup reads the named config (18), not the guess (1)', () => {
        expect(result.exitCode).toBe(0);
        expect(result.npmCalls).toEqual(['run test:unit -- --maxWorkers=4']);
      });
    });

    when('[t1] the command chains tools whose flags are not jest flags', () => {
      // tsc's -i is not jest's --runInBand; eslint's -c is not jest's config
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'unit',
          ci: null,
          configWorkers: { unit: 18 },
          unitCommand:
            'tsc -i -p . && jest --config jest.unit.config.js && eslint -c .eslintrc.js',
          extraConfigFiles: ['.eslintrc.js'],
        }),
      );

      then('only the jest segment is read: the cap applies', () => {
        expect(result.exitCode).toBe(0);
        expect(result.npmCalls).toEqual(['run test:unit -- --maxWorkers=4']);
      });
    });
  });

  given('[case10] a jest worker flag after -- reaches a non-jest kind', () => {
    when('[t0] --what types,unit -- --maxWorkers=16 --pretty', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'types,unit',
          ci: null,
          configWorkers: { unit: 18 },
          restArgs: ['--maxWorkers=16', '--pretty'],
        }),
      );

      then(
        'the types child drops the jest flag; the unit child keeps it',
        () => {
          expect(result.exitCode).toBe(0);
          expect(result.npmCalls).toEqual([
            'run test:types -- --pretty',
            'run test:unit -- --maxWorkers=16 --pretty',
          ]);
        },
      );

      then('stdout matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --what types,unit -- --maxWorkers 16 (space form)', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'types,unit',
          ci: null,
          configWorkers: { unit: 18 },
          restArgs: ['--maxWorkers', '16'],
        }),
      );

      then('the types child drops both the flag and its value', () => {
        expect(result.exitCode).toBe(0);
        expect(result.npmCalls).toEqual([
          'run test:types',
          'run test:unit -- --maxWorkers 16',
        ]);
      });
    });

    when('[t2] a single --what types run passes -- -i through as is', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'types',
          ci: null,
          configWorkers: {},
          restArgs: ['-i'],
        }),
      );

      then('tsc receives -i, its own flag', () => {
        expect(result.exitCode).toBe(0);
        expect(result.npmCalls).toEqual(['run test:types -- -i']);
      });
    });
  });

  given('[case11] multi-mode across configs above and below the cap', () => {
    when('[t0] --what unit,integration runs on a shared box', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'unit,integration',
          ci: null,
          configWorkers: { unit: 18, integration: 1 },
        }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('unit is capped and integration stays serial', () => {
        expect(result.npmCalls).toEqual([
          'run test:unit -- --maxWorkers=4',
          'run test:integration',
        ]);
      });
    });

    when('[t1] --what all runs every type in order', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'all',
          ci: null,
          configWorkers: { unit: 18, integration: 1, acceptance: 18 },
          extraArgs: ['--against', 'local', '--env', 'test'],
        }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('each suite gets its own answer: none, cap, none, none', () => {
        // lint: not jest · unit: 18 → cap · integration: 1 → none
        // acceptance: its npm command carries --runInBand → none
        expect(result.npmCalls).toEqual([
          'run test:lint',
          'run test:unit -- --maxWorkers=4',
          'run test:integration',
          'run test:acceptance:locally',
        ]);
      });

      then('stdout matches snapshot (the tree matches an uncapped run)', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot (each child adds no line)', () => {
        expect(result.stderr).not.toContain('worker');
        expect(asStableOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case12] a run that exceeds its --timeout', () => {
    when('[t0] the run was capped', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'unit',
          ci: null,
          configWorkers: { unit: 18 },
          timeout: '1',
          npmSleepSeconds: 3,
        }),
      );

      then('exit code is 1 (timeout is a malfunction)', () => {
        expect(result.exitCode).toBe(1);
      });

      then('a coconut hint names the cap and the command to widen it', () => {
        expect(result.stdout).toContain('🥥 did you know?');
        expect(result.stdout).toContain(
          '├─ this run was capped at 4 jest workers (shared box)',
        );
        expect(result.stdout).toContain(
          '└─ rhx git.repo.test --what unit --mode apply --thorough -- --maxWorkers=8',
        );
      });

      then('stdout matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr carries the same hint, and matches snapshot', () => {
        expect(result.stderr).toContain('🥥 did you know?');
        expect(asStableOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] the run was not capped', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'unit',
          ci: null,
          configWorkers: { unit: 1 },
          timeout: '1',
          npmSleepSeconds: 3,
        }),
      );

      then('the timeout hint stays as it was', () => {
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(
          'hint: increase --timeout or check for slow tests',
        );
        expect(result.stdout).not.toContain('this run was capped');
      });

      then('stdout matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(result.stderr).not.toContain('this run was capped');
        expect(asStableOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] a capped run with its own jest args after --', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'unit',
          ci: null,
          configWorkers: { unit: 18 },
          timeout: '1',
          npmSleepSeconds: 3,
          restArgs: ['--bail'],
        }),
      );

      then(
        'the widen command keeps the caller args, not the spent timeout',
        () => {
          expect(result.exitCode).toBe(1);
          expect(result.stdout).toContain(
            '└─ rhx git.repo.test --what unit --mode apply --thorough -- --bail --maxWorkers=8',
          );
        },
      );
    });
  });

  given('[case15] plan mode', () => {
    when('[t0] --what unit --mode plan, with a config above the cap', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({
          what: 'unit',
          ci: null,
          configWorkers: { unit: 18 },
          mode: 'plan',
        }),
      );

      then('no lookup runs and no test runs', () => {
        expect(result.exitCode).toBe(0);
        expect(result.showConfigCalls).toBe(0);
        expect(result.npmCalls).toEqual([]);
      });

      then('the plan tree names no workers branch', () => {
        expect(result.stdout).not.toContain('├─ workers');
        expect(result.stdout).toContain('--mode apply');
      });
    });
  });

  /**
   * .what = run the skill in a temp repo that links this repo's real jest,
   *         with `-- --showConfig` so jest prints the worker count it would use
   * .why = the fakes prove what args the skill sends; only real jest proves
   *        that --showConfig carries globalConfig.maxWorkers and that a cli
   *        --maxWorkers beats the config's own value
   * .note = the config pins maxWorkers to a number, so the result does not
   *         depend on the host's core count
   */
  const runAgainstRealJest = (args: {
    configMaxWorkers: number | `${number}%`;
    configExt?: 'js' | 'ts';
    restArgs: string[];
  }): { exitCode: number; npmLog: string } => {
    const configExt = args.configExt ?? 'js';
    const configFile = `jest.unit.config.${configExt}`;
    const configValue =
      typeof args.configMaxWorkers === 'number'
        ? `${args.configMaxWorkers}`
        : `'${args.configMaxWorkers}'`;
    const tempDir = genTempDir({ slug: 'workers-real-jest', git: true });
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-repo',
          type: 'commonjs',
          devDependencies: { jest: '30.2.0' },
          scripts: { 'test:unit': `jest -c ./${configFile}` },
        },
        null,
        2,
      ),
    );
    // the .ts form mirrors ehmpathy configs: an esbuild-register docblock
    fs.writeFileSync(
      path.join(tempDir, configFile),
      configExt === 'js'
        ? `module.exports = { testMatch: ['**/*.test.js'], testEnvironment: 'node', transform: {}, maxWorkers: ${configValue} };`
        : `/**\n * @jest-config-loader esbuild-register\n */\nexport default { testMatch: ['**/*.test.js'], testEnvironment: 'node', transform: {}, maxWorkers: ${configValue} };\n`,
    );
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'example.test.js'),
      `describe('example', () => { it('passes', () => { expect(true).toBe(true); }); });`,
    );
    fs.symlinkSync(
      path.join(repoRoot, 'node_modules'),
      path.join(tempDir, 'node_modules'),
    );
    spawnSync('git', ['add', '.'], { cwd: tempDir });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd: tempDir });

    // env: no CI, so the shared-box rule applies on any host
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key !== 'CI'),
    );
    const result = spawnSync(
      'bash',
      [
        scriptPath,
        '--what',
        'unit',
        '--mode',
        'apply',
        '--thorough',
        '--log',
        'always',
        '--',
        ...args.restArgs,
      ],
      {
        cwd: tempDir,
        encoding: 'utf-8' as const, // node api requires this exact string
        stdio: ['pipe', 'pipe', 'pipe'],
        env,
        timeout: 120_000,
      },
    );

    // read the persisted npm stdout, which holds jest's --showConfig json
    const logMatch = (result.stdout ?? '').match(/stdout: (\S+\.stdout\.log)/);
    const npmLog = logMatch
      ? fs.readFileSync(path.join(tempDir, logMatch[1]!), 'utf-8')
      : 'NO_LOG_FOUND';
    return { exitCode: result.status ?? 1, npmLog };
  };

  given('[case13] real jest, through the built skill', () => {
    when('[t0] the config says maxWorkers: 18', () => {
      const result = useThen('skill executes', () =>
        runAgainstRealJest({
          configMaxWorkers: 18,
          restArgs: ['--showConfig'],
        }),
      );

      then('npm passes --maxWorkers=4 to jest', () => {
        expect(result.exitCode).toBe(0);
        expect(result.npmLog).toContain('--showConfig --maxWorkers=4');
      });

      then(
        'real jest resolves 4 workers (the cli flag beats the config)',
        () => {
          expect(result.npmLog).toContain('"maxWorkers": 4,');
        },
      );
    });

    when('[t1] the config says maxWorkers: 2', () => {
      const result = useThen('skill executes', () =>
        runAgainstRealJest({ configMaxWorkers: 2, restArgs: ['--showConfig'] }),
      );

      then('the skill sends no flag and real jest keeps 2', () => {
        expect(result.exitCode).toBe(0);
        expect(result.npmLog).not.toContain('--maxWorkers=');
        expect(result.npmLog).toContain('"maxWorkers": 2,');
      });
    });

    when('[t2] the caller passes -- --maxWorkers=16', () => {
      const result = useThen('skill executes', () =>
        runAgainstRealJest({
          configMaxWorkers: 18,
          restArgs: ['--showConfig', '--maxWorkers=16'],
        }),
      );

      then('real jest resolves the caller count alone', () => {
        expect(result.exitCode).toBe(0);
        expect(result.npmLog).not.toContain('--maxWorkers=4');
        expect(result.npmLog).toContain('"maxWorkers": 16,');
      });
    });

    when(
      '[t3] the ehmpathy shape: a .ts config with a percent maxWorkers',
      () => {
        // .note = '1000%' derives above 4 on any host (even 1 core), so the cap
        //         must apply; the ehmpathy '50%' derives <= 4 on a small runner
        //         and would pass with the cap removed
        const result = useThen('skill executes', () =>
          runAgainstRealJest({
            configMaxWorkers: '1000%',
            configExt: 'ts',
            restArgs: ['--showConfig'],
          }),
        );

        then(
          'the lookup reads the .ts config and npm passes --maxWorkers=4',
          () => {
            expect(result.exitCode).toBe(0);
            expect(result.npmLog).toContain('--showConfig --maxWorkers=4');
          },
        );

        then('real jest resolves exactly 4 workers', () => {
          expect(result.npmLog).toContain('"maxWorkers": 4,');
        });
      },
    );
  });

  /**
   * .what = a temp repo whose real jest suite records which worker ran each
   *         test, plus a runner that drives the skill there asynchronously
   * .why = the neighbor's experience is a bound on the worker pool, not an
   *        arg; only real jest workers can show how many processes a crew
   *        took. each worker carries JEST_WORKER_ID (1..N), so the distinct
   *        ids a run leaves behind are the workers it occupied
   * .note = 12 test files that each hold for 1.5s, so jest must fan out
   *         (it runs in band only for a single file, or a cached fast set),
   *         and the config asks for 18 workers, above the cap
   */
  const genCrewRepo = (): { repoDir: string } => {
    const repoDir = genTempDir({ slug: 'workers-crew', git: true });
    fs.writeFileSync(
      path.join(repoDir, 'package.json'),
      JSON.stringify(
        {
          name: 'crew-repo',
          type: 'commonjs',
          devDependencies: { jest: '30.2.0' },
          scripts: { 'test:unit': 'jest -c ./jest.unit.config.js' },
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(
      path.join(repoDir, 'jest.unit.config.js'),
      `module.exports = { testMatch: ['**/*.test.js'], testEnvironment: 'node', transform: {}, maxWorkers: 18 };`,
    );
    fs.mkdirSync(path.join(repoDir, 'src'), { recursive: true });
    for (let n = 0; n < 12; n += 1)
      fs.writeFileSync(
        path.join(repoDir, 'src', `hold${n}.test.js`),
        [
          `const fs = require('fs');`,
          `const path = require('path');`,
          `it('holds a worker', async () => {`,
          `  fs.writeFileSync(path.join(process.env.WORKER_LOG_DIR, process.env.JEST_WORKER_ID + '.${n}'), '');`,
          `  await new Promise((done) => setTimeout(done, 1500));`,
          `});`,
        ].join('\n'),
      );
    fs.symlinkSync(
      path.join(repoRoot, 'node_modules'),
      path.join(repoDir, 'node_modules'),
    );
    spawnSync('git', ['add', '.'], { cwd: repoDir });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd: repoDir });
    return { repoDir };
  };

  const runCrew = async (args: {
    repoDir: string;
    restArgs: string[];
  }): Promise<{ exitCode: number; workerIds: Set<string> }> => {
    const workerLogDir = genTempDir({ slug: 'workers-crew-log' });
    const env = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([key]) => key !== 'CI'),
      ),
      WORKER_LOG_DIR: workerLogDir,
    };
    const skillArgs = ['--what', 'unit', '--mode', 'apply', '--thorough'];
    if (args.restArgs.length) skillArgs.push('--', ...args.restArgs);
    const exitCode = await new Promise<number>((done) => {
      const child = spawn('bash', [scriptPath, ...skillArgs], {
        cwd: args.repoDir,
        env,
        stdio: 'ignore',
      });
      child.on('close', (code) => done(code ?? 1));
    });
    const workerIds = new Set(
      fs.readdirSync(workerLogDir).map((name) => name.split('.')[0]!),
    );
    return { exitCode, workerIds };
  };

  given('[case14] crews that share one box (the neighbor experience)', () => {
    when('[t0] one crew runs a suite whose config asks for 18', () => {
      const result = useThen('the suite runs', async () =>
        runCrew({ repoDir: genCrewRepo().repoDir, restArgs: [] }),
      );

      then('the suite passes', () => {
        expect(result.exitCode).toBe(0);
      });

      then('it occupies at most 4 worker processes', () => {
        expect(result.workerIds.size).toBeLessThanOrEqual(4);
      });

      then(
        'it still fans out, so the bound is the cap, not a serial run',
        () => {
          expect(result.workerIds.size).toBeGreaterThan(1);
        },
      );
    });

    when('[t1] the same crew passes -- --maxWorkers=8 (control)', () => {
      const result = useThen('the suite runs', async () =>
        runCrew({
          repoDir: genCrewRepo().repoDir,
          restArgs: ['--maxWorkers=8'],
        }),
      );

      then('the measure sees past 4, so [t0] and [t2] can fail', () => {
        expect(result.exitCode).toBe(0);
        expect(result.workerIds.size).toBeGreaterThan(4);
      });
    });

    when('[t2] two crews run at once on the same box', () => {
      const result = useThen('both suites run', async () => {
        const [crewA, crewB] = await Promise.all([
          runCrew({ repoDir: genCrewRepo().repoDir, restArgs: [] }),
          runCrew({ repoDir: genCrewRepo().repoDir, restArgs: [] }),
        ]);
        return { crewA, crewB };
      });

      then('both suites pass', () => {
        expect(result.crewA.exitCode).toBe(0);
        expect(result.crewB.exitCode).toBe(0);
      });

      then('each crew holds at most 4 workers', () => {
        expect(result.crewA.workerIds.size).toBeLessThanOrEqual(4);
        expect(result.crewB.workerIds.size).toBeLessThanOrEqual(4);
      });

      then('the box carries at most 8 jest workers; the rest stay free', () => {
        expect(
          result.crewA.workerIds.size + result.crewB.workerIds.size,
        ).toBeLessThanOrEqual(8);
      });
    });
  });
});
