import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = integration tests for git.commit.push.sh
 * .why = verify standalone push + pr findsert works correctly with all guards and output modes
 */
describe('git.commit.push.sh', () => {
  const pushScriptPath = path.join(__dirname, 'git.commit.push.sh');
  const setScriptPath = path.join(__dirname, 'git.commit.set.sh');

  // note: happy path tests pass EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN via env
  // keyrack returns env var value if already set, so no real keyrack fetch needed
  // sad path tests use fake HOME to force keyrack errors

  /**
   * .what = helper to set up a temp git repo with optional meter, branch, and commit
   * .why = reduces boilerplate across test cases
   */
  const setupTempRepo = (args: {
    meterState?: { uses: number; push: string };
    branch?: string;
    commits?: string[];
    commitAuthor?: { name: string; email: string };
    withKeyrack?: boolean;
  }): string => {
    const tempDir = genTempDir({
      slug: 'git-commit-push-test',
      git: true,
      symlink: [{ at: 'node_modules', to: 'node_modules' }],
    });

    // configure git user
    spawnSync('git', ['config', 'user.name', 'Test Human'], {
      cwd: tempDir,
    });
    spawnSync('git', ['config', 'user.email', 'human@test.com'], {
      cwd: tempDir,
    });

    // setup keyrack fixture
    if (args.withKeyrack !== false) {
      const agentDir = path.join(tempDir, '.agent');
      fs.mkdirSync(agentDir, { recursive: true });
      fs.writeFileSync(
        path.join(agentDir, 'keyrack.yml'),
        `org: ehmpathy
env.all:
  - EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN
env.prod:
  # required for valid schema
`,
      );
    }

    // setup .meter with gitignore
    if (args.meterState) {
      const meterDir = path.join(tempDir, '.meter');
      fs.mkdirSync(meterDir, { recursive: true });
      fs.writeFileSync(
        path.join(meterDir, 'git.commit.uses.jsonc'),
        JSON.stringify(args.meterState, null, 2),
      );
      fs.writeFileSync(path.join(tempDir, '.gitignore'), '.meter/\n.agent/\n');
      spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
      spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
        cwd: tempDir,
      });
    }

    // create branch if specified
    if (args.branch) {
      spawnSync('git', ['checkout', '-b', args.branch], { cwd: tempDir });
    }

    // create commits
    if (args.commits) {
      const author = args.commitAuthor ?? {
        name: 'Test Human',
        email: 'human@test.com',
      };
      for (const [i, message] of args.commits.entries()) {
        const fileName = `file-${i}.txt`;
        fs.writeFileSync(path.join(tempDir, fileName), `content ${i}`);
        spawnSync('git', ['add', fileName], { cwd: tempDir });
        spawnSync(
          'git',
          [
            'commit',
            `--author=${author.name} <${author.email}>`,
            '-m',
            message,
          ],
          { cwd: tempDir },
        );
      }
    }

    return tempDir;
  };

  /**
   * .what = run git.commit.push in the given temp dir
   * .why = consistent invocation across test cases
   * .note = always excludes EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN from process.env
   *         for deterministic tests; pass explicit token via env if needed
   */
  const runPush = (args: {
    tempDir: string;
    pushArgs: string[];
    env?: Record<string, string>;
  }): { stdout: string; stderr: string; exitCode: number } => {
    // always exclude token from process.env for deterministic tests
    const { EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: _token, ...envWithoutToken } =
      process.env;

    const result = spawnSync('bash', [pushScriptPath, ...args.pushArgs], {
      cwd: args.tempDir,
      encoding: 'utf-8' as BufferEncoding,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...envWithoutToken,
        ...args.env,
      },
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  given('[case1] plan mode on feature branch', () => {
    when('[t0] branch has commits and meter allows push', () => {
      then('shows tree with push target and pr title', () => {
        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: first commit'],
        });

        // mock gh cli for token validation
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });
        fs.writeFileSync(
          path.join(fakeBinDir, 'gh'),
          `#!/bin/bash
if [[ "$1" == "api" && "$2" == "/user" ]]; then
  echo '{"login":"ehm-seaturtle"}'
  exit 0
fi
exit 1`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan'],
          env: {
            EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token',
            PATH: `${fakeBinDir}:${process.env.PATH}`,
          },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('heres the wave');
        expect(result.stdout).toContain('push: origin/turtle/feature');
        expect(result.stdout).toContain('title: feat: first commit');
        expect(result.stdout).toContain('findsert');
        expect(result.stdout).toContain('push: allowed');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] author guard in apply mode', () => {
    when('[t0] HEAD commit authored by a human (not seaturtle[bot])', () => {
      then('exits with error about author', () => {
        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: human commit'],
          commitAuthor: { name: 'Test Human', email: 'human@test.com' },
        });

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'apply'],
          env: { EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token' },
        });

        expect(result.exitCode).toBe(2); // blocked by constraints
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain(
          'HEAD commit not authored by seaturtle[bot]',
        );
        expect(result.stdout).toContain('git.commit.set');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case3] author guard skipped in plan mode', () => {
    when('[t0] HEAD commit authored by a human, plan mode', () => {
      then('plan succeeds (guard skipped)', () => {
        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: human commit'],
          commitAuthor: { name: 'Test Human', email: 'human@test.com' },
        });

        // mock gh cli for token validation
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });
        fs.writeFileSync(
          path.join(fakeBinDir, 'gh'),
          `#!/bin/bash
if [[ "$1" == "api" && "$2" == "/user" ]]; then
  echo '{"login":"ehm-seaturtle"}'
  exit 0
fi
exit 1`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan'],
          env: {
            EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token',
            PATH: `${fakeBinDir}:${process.env.PATH}`,
          },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('heres the wave');
        expect(result.stdout).toContain('push: origin/turtle/feature');
      });
    });
  });

  given('[case4] branch guard (main/master)', () => {
    when('[t0] on main branch', () => {
      then('exits with error about main branch', () => {
        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          commits: ['feat: on main'],
        });

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan'],
          env: { EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token' },
        });

        expect(result.exitCode).toBe(2); // blocked by constraints
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain('cannot push directly to main');
        expect(result.stdout).toContain('git checkout -b turtle/');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case5] push not allowed', () => {
    when('[t0] no meter state file', () => {
      then('exits with push not allowed', () => {
        const tempDir = setupTempRepo({
          branch: 'turtle/feature',
          commits: ['feat: no meter'],
        });

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan'],
          env: { EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token' },
        });

        expect(result.exitCode).toBe(2); // blocked by constraints
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain('push not allowed');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] meter has push: block', () => {
      then('exits with push not allowed', () => {
        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'block' },
          branch: 'turtle/feature',
          commits: ['feat: blocked push'],
        });

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan'],
          env: { EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token' },
        });

        expect(result.exitCode).toBe(2); // blocked by constraints
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain('push not allowed');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case7] json output plan mode', () => {
    when('[t0] plan mode with --output json', () => {
      then('outputs valid json with planned fields', () => {
        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: json plan test'],
        });

        // mock gh cli for token validation
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });
        fs.writeFileSync(
          path.join(fakeBinDir, 'gh'),
          `#!/bin/bash
if [[ "$1" == "api" && "$2" == "/user" ]]; then
  echo '{"login":"ehm-seaturtle"}'
  exit 0
fi
exit 1`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan', '--output', 'json'],
          env: {
            EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token',
            PATH: `${fakeBinDir}:${process.env.PATH}`,
          },
        });

        expect(result.exitCode).toBe(0);
        const parsed = JSON.parse(result.stdout.trim());
        expect(parsed.status).toBe('planned');
        expect(parsed.push_target).toBe('origin/turtle/feature');
        expect(parsed.pr_title).toBe('feat: json plan test');
        expect(parsed.pr_action).toBe('findsert');
      });
    });
  });

  given('[case8] json output error', () => {
    when('[t0] error with --output json', () => {
      then('outputs valid json with error field', () => {
        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'block' },
          branch: 'turtle/feature',
          commits: ['feat: json error test'],
        });

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan', '--output', 'json'],
          env: { EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token' },
        });

        expect(result.exitCode).toBe(2); // blocked by constraints
        const parsed = JSON.parse(result.stdout.trim());
        expect(parsed.status).toBe('error');
        expect(parsed.error).toContain('push not allowed');
      });
    });
  });

  given('[case9] stacked branch pr title', () => {
    when('[t0] branch B created from branch A, both with commits', () => {
      then('pr title is first commit unique to branch B', () => {
        const tempDir = setupTempRepo({
          meterState: { uses: 5, push: 'allow' },
        });

        // create branch A from main
        spawnSync('git', ['checkout', '-b', 'turtle/branch-a'], {
          cwd: tempDir,
        });

        // commits on branch A
        fs.writeFileSync(path.join(tempDir, 'a1.txt'), 'a1');
        spawnSync('git', ['add', 'a1.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'feat: A1 first on branch-a'], {
          cwd: tempDir,
        });

        fs.writeFileSync(path.join(tempDir, 'a2.txt'), 'a2');
        spawnSync('git', ['add', 'a2.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'feat: A2 second on branch-a'], {
          cwd: tempDir,
        });

        // create branch B from branch A
        spawnSync('git', ['checkout', '-b', 'turtle/branch-b'], {
          cwd: tempDir,
        });

        // commits on branch B
        fs.writeFileSync(path.join(tempDir, 'b1.txt'), 'b1');
        spawnSync('git', ['add', 'b1.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'feat: B1 first on branch-b'], {
          cwd: tempDir,
        });

        fs.writeFileSync(path.join(tempDir, 'b2.txt'), 'b2');
        spawnSync('git', ['add', 'b2.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'feat: B2 second on branch-b'], {
          cwd: tempDir,
        });

        // mock gh cli for token validation
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });
        fs.writeFileSync(
          path.join(fakeBinDir, 'gh'),
          `#!/bin/bash
if [[ "$1" == "api" && "$2" == "/user" ]]; then
  echo '{"login":"ehm-seaturtle"}'
  exit 0
fi
exit 1`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan'],
          env: {
            EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token',
            PATH: `${fakeBinDir}:${process.env.PATH}`,
          },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('title: feat: B1 first on branch-b');
        expect(result.stdout).not.toContain('title: feat: A1');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case10] meter not decremented', () => {
    when('[t0] plan mode runs', () => {
      then('uses remain unchanged', () => {
        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: meter check'],
        });

        runPush({
          tempDir,
          pushArgs: ['--mode', 'plan'],
          env: { EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token' },
        });

        const stateFile = path.join(tempDir, '.meter', 'git.commit.uses.jsonc');
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(3);
      });
    });
  });

  given('[case11] pr title fallback', () => {
    when(
      '[t0] branch has no unique commits and --pr-title-fallback is set',
      () => {
        then('uses fallback as pr title', () => {
          const tempDir = setupTempRepo({
            meterState: { uses: 3, push: 'allow' },
            branch: 'turtle/feature',
          });

          // mock gh cli for token validation
          const fakeBinDir = path.join(tempDir, '.fakebin');
          fs.mkdirSync(fakeBinDir, { recursive: true });
          fs.writeFileSync(
            path.join(fakeBinDir, 'gh'),
            `#!/bin/bash
if [[ "$1" == "api" && "$2" == "/user" ]]; then
  echo '{"login":"ehm-seaturtle"}'
  exit 0
fi
exit 1`,
          );
          fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

          const result = runPush({
            tempDir,
            pushArgs: [
              '--mode',
              'plan',
              '--output',
              'json',
              '--pr-title-fallback',
              'feat: fallback title',
            ],
            env: {
              EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token',
              PATH: `${fakeBinDir}:${process.env.PATH}`,
            },
          });

          expect(result.exitCode).toBe(0);
          const parsed = JSON.parse(result.stdout.trim());
          expect(parsed.pr_title).toBe('feat: fallback title');
        });
      },
    );
  });

  given('[case12] keyrack not configured (sad path)', () => {
    when('[t0] no keyrack.yml in repo and no host manifest', () => {
      then('exits with clear message to ask human to configure', () => {
        // relock ehmpath to clear daemon cache
        spawnSync(
          'npx',
          ['rhachet', 'keyrack', 'relock', '--owner', 'ehmpath'],
          {
            encoding: 'utf-8',
            stdio: 'pipe',
          },
        );

        // create fake HOME with no keyrack host manifests
        const fakeHome = genTempDir({
          slug: 'fake-home-no-keyrack',
        });

        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: no keyrack config'],
          withKeyrack: false,
          commitAuthor: {
            name: 'seaturtle[bot]',
            email: 'seaturtle@ehmpath.com',
          },
        });

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'apply'], // apply mode is where keyrack is fetched
          env: {
            HOME: fakeHome,
          },
        });

        // keyrack errors propagate — no fallback
        expect(result.exitCode).not.toBe(0);
        // stderr has clear actionable message about keyrack
        expect(result.stderr).toContain('keyrack');
        // snapshot test for clear error message
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case13] author guard with seaturtle[bot] commit', () => {
    when('[t0] HEAD commit authored by seaturtle[bot], apply mode', () => {
      then('author guard passes (would proceed to push)', () => {
        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: robot commit'],
          commitAuthor: {
            name: 'seaturtle[bot]',
            email: 'seaturtle@ehmpath.com',
          },
        });

        // apply mode will pass author guard but fail at git push (no remote)
        // that's expected; we verify it gets past the author guard
        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'apply'],
          env: { EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token' },
        });

        // should NOT contain the author guard error
        expect(result.stdout).not.toContain(
          'HEAD commit not authored by seaturtle[bot]',
        );
      });
    });
  });

  given('[case14] push-only auto-revoke plan display', () => {
    when('[t0] uses 0 with push allowed (push-only mode)', () => {
      then('plan shows push: allowed to blocked (revoked)', () => {
        const tempDir = setupTempRepo({
          meterState: { uses: 0, push: 'allow' },
          branch: 'turtle/push-revoke',
          commits: ['feat: prior commit'],
        });

        // mock gh cli for token validation
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });
        fs.writeFileSync(
          path.join(fakeBinDir, 'gh'),
          `#!/bin/bash
if [[ "$1" == "api" && "$2" == "/user" ]]; then
  echo '{"login":"ehm-seaturtle"}'
  exit 0
fi
exit 1`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan'],
          env: {
            EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token',
            PATH: `${fakeBinDir}:${process.env.PATH}`,
          },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('push: allowed → blocked (revoked)');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case15] real user locked, no ehmpath host (sad path)', () => {
    when('[t0] keyrack.yml exists but no host manifest', () => {
      then('exits with clear unlock message, no fallback noise', () => {
        // relock ehmpath to clear daemon cache
        spawnSync(
          'npx',
          ['rhachet', 'keyrack', 'relock', '--owner', 'ehmpath'],
          {
            encoding: 'utf-8',
            stdio: 'pipe',
          },
        );

        // create fake HOME with no keyrack host manifests
        const fakeHome = genTempDir({
          slug: 'fake-home-no-keyrack',
        });

        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: locked keyrack test'],
          withKeyrack: true,
          commitAuthor: {
            name: 'seaturtle[bot]',
            email: 'seaturtle@ehmpath.com',
          },
        });

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'apply'],
          env: {
            HOME: fakeHome,
            // clear token so keyrack actually tries to fetch
            EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: '',
          },
        });

        // keyrack errors propagate — exits non-zero
        expect(result.exitCode).not.toBe(0);
        // stderr has actionable message about keyrack
        expect(result.stderr).toContain('keyrack');
        // stderr does NOT contain fallback owner noise (--owner ehmpath)
        // note: "ehmpathy" in key name contains "ehmpath" prefix — check for owner specifically
        expect(result.stderr).not.toContain('--owner ehmpath');
        expect(result.stderr).not.toContain('owner ehmpath');
        // snapshot test for clear error message
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given(
    '[case16] keyrack.yml does not declare requested key (sad path)',
    () => {
      when('[t0] keyrack.yml exists but key declaration absent', () => {
        then('exits with clear message about key not declared', () => {
          // relock ehmpath to clear daemon cache
          spawnSync(
            'npx',
            ['rhachet', 'keyrack', 'relock', '--owner', 'ehmpath'],
            {
              encoding: 'utf-8',
              stdio: 'pipe',
            },
          );

          // create fake HOME with no keyrack host manifests
          const fakeHome = genTempDir({
            slug: 'fake-home-key-not-declared',
          });

          // setup temp repo with keyrack.yml that declares a DIFFERENT key
          const tempDir = genTempDir({
            slug: 'git-commit-push-test',
            git: true,
            symlink: [{ at: 'node_modules', to: 'node_modules' }],
          });

          // configure git user
          spawnSync('git', ['config', 'user.name', 'Test Human'], {
            cwd: tempDir,
          });
          spawnSync('git', ['config', 'user.email', 'human@test.com'], {
            cwd: tempDir,
          });

          // create keyrack.yml that does NOT include EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN
          const agentDir = path.join(tempDir, '.agent');
          fs.mkdirSync(agentDir, { recursive: true });
          fs.writeFileSync(
            path.join(agentDir, 'keyrack.yml'),
            `org: ehmpathy
env.all:
  - SOME_OTHER_KEY_NOT_THE_GITHUB_TOKEN
env.prod:
  # required for valid schema
`,
          );

          // setup meter
          const meterDir = path.join(tempDir, '.meter');
          fs.mkdirSync(meterDir, { recursive: true });
          fs.writeFileSync(
            path.join(meterDir, 'git.commit.uses.jsonc'),
            JSON.stringify({ uses: 3, push: 'allow' }, null, 2),
          );
          fs.writeFileSync(
            path.join(tempDir, '.gitignore'),
            '.meter/\n.agent/\n',
          );
          spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
          spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
            cwd: tempDir,
          });

          // create branch and commit (as seaturtle[bot] to pass author guard)
          spawnSync('git', ['checkout', '-b', 'turtle/feature'], {
            cwd: tempDir,
          });
          fs.writeFileSync(path.join(tempDir, 'file.txt'), 'content');
          spawnSync('git', ['add', 'file.txt'], { cwd: tempDir });
          spawnSync(
            'git',
            [
              'commit',
              '-m',
              'feat: key not declared test',
              '--author',
              'seaturtle[bot] <seaturtle@ehmpath.com>',
            ],
            { cwd: tempDir },
          );

          const result = runPush({
            tempDir,
            pushArgs: ['--mode', 'apply'], // apply mode is where keyrack is fetched
            env: {
              HOME: fakeHome,
              // clear token so keyrack actually tries to fetch
              EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: '',
            },
          });

          // keyrack errors propagate — exits non-zero
          expect(result.exitCode).not.toBe(0);
          // stderr has actionable message
          expect(result.stderr.length).toBeGreaterThan(0);
          // snapshot test for clear error message
          expect(result.stderr).toMatchSnapshot();
        });
      });
    },
  );

  given('[case17] Co-authored-by trailer stripped from PR body', () => {
    when('[t0] commit body has Co-authored-by trailer', () => {
      then('trailer is removed (privacy: no email leak)', () => {
        // run the same strip logic used in git.commit.push.sh
        // grep -v returns exit 1 if no lines match, so use || true
        const inputWithTrailer = `fix(api): validate input

- added schema validation
- updated tests

Co-authored-by: Human Name <human@example.com>`;

        // use stdin to pass multiline content reliably
        const result = spawnSync(
          'bash',
          [
            '-c',
            "{ grep -v '^Co-authored-by:' || true; } | sed -e :a -e '/^\\n*$/{$d;N;ba;}'",
          ],
          {
            input: inputWithTrailer,
            encoding: 'utf-8' as BufferEncoding,
          },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).not.toContain('Co-authored-by');
        expect(result.stdout).not.toContain('human@example.com');
        expect(result.stdout).toContain('fix(api): validate input');
        expect(result.stdout).toContain('added schema validation');
      });
    });

    when('[t1] commit body has multiple Co-authored-by trailers', () => {
      then('all trailers are removed', () => {
        const inputWithTrailers = `feat(auth): add oauth

- added provider

Co-authored-by: Human One <one@example.com>
Co-authored-by: Human Two <two@example.com>`;

        const result = spawnSync(
          'bash',
          [
            '-c',
            "{ grep -v '^Co-authored-by:' || true; } | sed -e :a -e '/^\\n*$/{$d;N;ba;}'",
          ],
          {
            input: inputWithTrailers,
            encoding: 'utf-8' as BufferEncoding,
          },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).not.toContain('Co-authored-by');
        expect(result.stdout).not.toContain('one@example.com');
        expect(result.stdout).not.toContain('two@example.com');
        expect(result.stdout).toContain('feat(auth): add oauth');
      });
    });

    when(
      '[t2] commit body mentions Co-authored-by inline (not as trailer)',
      () => {
        then('inline mention is preserved, only trailer removed', () => {
          const inputWithInline = `docs: explain Co-authored-by convention

- describes how Co-authored-by trailers work
- links to docs

Co-authored-by: Human <human@example.com>`;

          const result = spawnSync(
            'bash',
            [
              '-c',
              "{ grep -v '^Co-authored-by:' || true; } | sed -e :a -e '/^\\n*$/{$d;N;ba;}'",
            ],
            {
              input: inputWithInline,
              encoding: 'utf-8' as BufferEncoding,
            },
          );

          expect(result.status).toBe(0);
          // inline mention (not at start of line) is preserved
          expect(result.stdout).toContain('how Co-authored-by trailers work');
          // trailer at start of line is stripped
          expect(result.stdout).not.toContain('Co-authored-by: Human');
          expect(result.stdout).not.toContain('human@example.com');
        });
      },
    );
  });

  given('[case18] CI watch reminder after successful push', () => {
    when('[t0] push and pr creation succeed', () => {
      then('shows full output with vibey reminder at end', () => {
        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: test ci reminder'],
          commitAuthor: {
            name: 'seaturtle[bot]',
            email: 'seaturtle@ehmpath.com',
          },
        });

        // create fake bin dir with mock gh and git
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });

        // mock gh cli - returns success for token validation, pr list (empty), and pr create
        fs.writeFileSync(
          path.join(fakeBinDir, 'gh'),
          `#!/bin/bash
if [[ "$1" == "api" && "$2" == "/user" ]]; then
  echo '{"login":"ehm-seaturtle"}'
  exit 0
elif [[ "$1" == "pr" && "$2" == "list" ]]; then
  echo "[]"
  exit 0
elif [[ "$1" == "pr" && "$2" == "create" ]]; then
  echo "https://github.com/test/repo/pull/42"
  exit 0
fi
exit 1
`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        // mock git push - returns success
        fs.writeFileSync(
          path.join(fakeBinDir, 'git'),
          `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  echo "   abc123..def456  HEAD -> turtle/feature"
  exit 0
fi
# pass through to real git for other commands
exec /usr/bin/git "$@"
`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'apply'],
          env: {
            EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token',
            PATH: `${fakeBinDir}:${process.env.PATH}`,
          },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('cowabunga');
        expect(result.stdout).toContain('push:');
        expect(result.stdout).toContain('pr:');
        expect(result.stdout).toContain('🌊 now lets ride the ci wave');
        expect(result.stdout).toContain('wipeouts');
        expect(result.stdout).toContain('git release --watch');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case19] local main behind origin/main (PR #269 regression)', () => {
    when(
      '[t0] branch rebased onto origin/main but local main is behind',
      () => {
        then(
          'pr title/body only includes commits unique to feature branch',
          () => {
            // reproduce bug from PR #269:
            // 1. Feature branch created from main at commit A
            // 2. Other PRs merged to origin/main (commits B, C)
            // 3. User rebases feature branch onto origin/main
            // 4. Local main never updated (still at A)
            // 5. BUG: pr body included B, C (already on origin/main) because
            //    git.commit.push compared against local main, not origin/main

            // create bare "remote" repo
            const remoteDir = genTempDir({ slug: 'git-commit-push-remote' });
            spawnSync('git', ['init', '--bare'], { cwd: remoteDir });

            // create local repo
            const tempDir = genTempDir({
              slug: 'git-commit-push-local',
              git: true,
              symlink: [{ at: 'node_modules', to: 'node_modules' }],
            });

            // configure git user
            spawnSync('git', ['config', 'user.name', 'Test Human'], {
              cwd: tempDir,
            });
            spawnSync('git', ['config', 'user.email', 'human@test.com'], {
              cwd: tempDir,
            });

            // setup keyrack fixture
            const agentDir = path.join(tempDir, '.agent');
            fs.mkdirSync(agentDir, { recursive: true });
            fs.writeFileSync(
              path.join(agentDir, 'keyrack.yml'),
              `org: ehmpathy
env.all:
  - EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN
env.prod:
  # required for valid schema
`,
            );

            // setup .meter
            const meterDir = path.join(tempDir, '.meter');
            fs.mkdirSync(meterDir, { recursive: true });
            fs.writeFileSync(
              path.join(meterDir, 'git.commit.uses.jsonc'),
              JSON.stringify({ uses: 3, push: 'allow' }, null, 2),
            );
            fs.writeFileSync(
              path.join(tempDir, '.gitignore'),
              '.meter/\n.agent/\n',
            );
            spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
            spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
              cwd: tempDir,
            });

            // add remote
            spawnSync('git', ['remote', 'add', 'origin', remoteDir], {
              cwd: tempDir,
            });

            // commit A on main (the point where local main will stay frozen)
            fs.writeFileSync(path.join(tempDir, 'a.txt'), 'commit A');
            spawnSync('git', ['add', 'a.txt'], { cwd: tempDir });
            spawnSync('git', ['commit', '-m', 'chore: commit A (shared)'], {
              cwd: tempDir,
            });

            // push main to origin
            spawnSync('git', ['push', '-u', 'origin', 'main'], {
              cwd: tempDir,
            });

            // create feature branch from main at point A
            spawnSync('git', ['checkout', '-b', 'turtle/feature'], {
              cwd: tempDir,
            });

            // add feature commit D on feature branch
            fs.writeFileSync(path.join(tempDir, 'd.txt'), 'commit D');
            spawnSync('git', ['add', 'd.txt'], { cwd: tempDir });
            spawnSync(
              'git',
              ['commit', '-m', 'feat(feature): commit D (unique to branch)'],
              { cwd: tempDir },
            );

            // switch back to main and add commits B, C (like other PRs were merged)
            spawnSync('git', ['checkout', 'main'], { cwd: tempDir });

            fs.writeFileSync(path.join(tempDir, 'b.txt'), 'commit B');
            spawnSync('git', ['add', 'b.txt'], { cwd: tempDir });
            spawnSync(
              'git',
              ['commit', '-m', 'fix(api): commit B (on origin, not local)'],
              { cwd: tempDir },
            );

            fs.writeFileSync(path.join(tempDir, 'c.txt'), 'commit C');
            spawnSync('git', ['add', 'c.txt'], { cwd: tempDir });
            spawnSync(
              'git',
              [
                'commit',
                '-m',
                'chore(release): commit C (on origin, not local)',
              ],
              { cwd: tempDir },
            );

            // push B and C to origin
            spawnSync('git', ['push', 'origin', 'main'], { cwd: tempDir });

            // reset local main back to A (user never pulled)
            spawnSync('git', ['reset', '--hard', 'HEAD~2'], { cwd: tempDir });

            // verify local main is behind origin/main
            const behindCheck = spawnSync(
              'git',
              ['rev-list', '--count', 'main..origin/main'],
              { cwd: tempDir, encoding: 'utf-8' }, // note: library api requires this term
            );
            expect(behindCheck.stdout.trim()).toBe('2');

            // switch to feature branch
            spawnSync('git', ['checkout', 'turtle/feature'], { cwd: tempDir });

            // rebase feature branch onto origin/main (this is where the bug triggers)
            // after rebase: feature has A, B, C, D
            // local main still has: A
            // origin/main has: A, B, C
            spawnSync('git', ['rebase', 'origin/main'], { cwd: tempDir });

            // verify feature branch now has B and C in history
            const featureLog = spawnSync('git', ['log', '--oneline', '-5'], {
              cwd: tempDir,
              encoding: 'utf-8', // note: library api requires this term
            });
            expect(featureLog.stdout).toContain('commit B');
            expect(featureLog.stdout).toContain('commit C');
            expect(featureLog.stdout).toContain('commit D');

            // mock gh cli to bypass token validation
            const fakeBinDir = path.join(tempDir, '.fakebin');
            fs.mkdirSync(fakeBinDir, { recursive: true });
            fs.writeFileSync(
              path.join(fakeBinDir, 'gh'),
              `#!/bin/bash
# mock gh api /user to return ehm-seaturtle
if [[ "$1" == "api" && "$2" == "/user" ]]; then
  echo '{"login":"ehm-seaturtle"}'
  exit 0
fi
exit 1
`,
            );
            fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

            // run git.commit.push in plan mode
            const result = runPush({
              tempDir,
              pushArgs: ['--mode', 'plan', '--output', 'json'],
              env: {
                EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token',
                PATH: `${fakeBinDir}:${process.env.PATH}`,
              },
            });

            expect(result.exitCode).toBe(0);
            const parsed = JSON.parse(result.stdout.trim());

            // CRITICAL: pr_title should be commit D, NOT commit B
            // if this fails, the bug from PR #269 is reproduced
            // BUG behavior: pr_title = "fix(api): commit B (on origin, not local)"
            // CORRECT behavior: pr_title = "feat(feature): commit D (unique to branch)"
            expect(parsed.pr_title).toBe(
              'feat(feature): commit D (unique to branch)',
            );
            expect(parsed.pr_title).not.toContain('commit B');
            expect(parsed.pr_title).not.toContain('commit C');
          },
        );
      },
    );

    when('[t1] also verify PR body excludes origin/main commits', () => {
      then('pr body only has feature branch commit body', () => {
        // same setup with rebase, check tree output
        const remoteDir = genTempDir({ slug: 'git-commit-push-remote-body' });
        spawnSync('git', ['init', '--bare'], { cwd: remoteDir });

        const tempDir = genTempDir({
          slug: 'git-commit-push-local-body',
          git: true,
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
        });

        spawnSync('git', ['config', 'user.name', 'Test Human'], {
          cwd: tempDir,
        });
        spawnSync('git', ['config', 'user.email', 'human@test.com'], {
          cwd: tempDir,
        });

        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(agentDir, { recursive: true });
        fs.writeFileSync(
          path.join(agentDir, 'keyrack.yml'),
          `org: ehmpathy
env.all:
  - EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN
env.prod:
`,
        );

        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 3, push: 'allow' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup'], { cwd: tempDir });

        spawnSync('git', ['remote', 'add', 'origin', remoteDir], {
          cwd: tempDir,
        });

        // commit A on main
        fs.writeFileSync(path.join(tempDir, 'a.txt'), 'a');
        spawnSync('git', ['add', 'a.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'chore: A'], { cwd: tempDir });
        spawnSync('git', ['push', '-u', 'origin', 'main'], { cwd: tempDir });

        // create feature branch and add commit D
        spawnSync('git', ['checkout', '-b', 'turtle/feature'], {
          cwd: tempDir,
        });
        fs.writeFileSync(path.join(tempDir, 'd.txt'), 'd');
        spawnSync('git', ['add', 'd.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'feat: D unique to feature'], {
          cwd: tempDir,
        });

        // switch to main, add B and C, push to origin
        spawnSync('git', ['checkout', 'main'], { cwd: tempDir });
        fs.writeFileSync(path.join(tempDir, 'b.txt'), 'b');
        spawnSync('git', ['add', 'b.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'fix: B on origin'], {
          cwd: tempDir,
        });
        fs.writeFileSync(path.join(tempDir, 'c.txt'), 'c');
        spawnSync('git', ['add', 'c.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'chore: C on origin'], {
          cwd: tempDir,
        });
        spawnSync('git', ['push', 'origin', 'main'], { cwd: tempDir });

        // reset local main back to A
        spawnSync('git', ['reset', '--hard', 'HEAD~2'], { cwd: tempDir });

        // rebase feature branch onto origin/main
        spawnSync('git', ['checkout', 'turtle/feature'], { cwd: tempDir });
        spawnSync('git', ['rebase', 'origin/main'], { cwd: tempDir });

        // mock gh cli to bypass token validation
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });
        fs.writeFileSync(
          path.join(fakeBinDir, 'gh'),
          `#!/bin/bash
# mock gh api /user to return ehm-seaturtle
if [[ "$1" == "api" && "$2" == "/user" ]]; then
  echo '{"login":"ehm-seaturtle"}'
  exit 0
fi
exit 1
`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan'],
          env: {
            EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token',
            PATH: `${fakeBinDir}:${process.env.PATH}`,
          },
        });

        expect(result.exitCode).toBe(0);
        // tree output should show D as title, not B or C
        expect(result.stdout).toContain('title: feat: D unique to feature');
        expect(result.stdout).not.toContain('B on origin');
        expect(result.stdout).not.toContain('C on origin');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case20] both keyrack sources locked (sad path)', () => {
    when('[t0] no user keyrack, no ehmpath host manifest', () => {
      then('exits with first error only, no fallback noise', () => {
        // relock ehmpath to clear daemon cache
        spawnSync(
          'npx',
          ['rhachet', 'keyrack', 'relock', '--owner', 'ehmpath'],
          {
            encoding: 'utf-8',
            stdio: 'pipe',
          },
        );

        // create fake HOME with no keyrack host manifests
        const fakeHome = genTempDir({
          slug: 'fake-home-all-locked',
        });

        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: all locked test'],
          withKeyrack: true,
          commitAuthor: {
            name: 'seaturtle[bot]',
            email: 'seaturtle@ehmpath.com',
          },
        });

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'apply'],
          env: {
            HOME: fakeHome,
            // clear token so keyrack actually tries to fetch
            EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: '',
          },
        });

        // keyrack errors propagate — exits non-zero
        expect(result.exitCode).not.toBe(0);
        // stderr has actionable message about keyrack
        expect(result.stderr).toContain('keyrack');
        // stderr does NOT contain fallback owner noise (--owner ehmpath)
        // note: "ehmpathy" in key name contains "ehmpath" prefix — check for owner specifically
        expect(result.stderr).not.toContain('--owner ehmpath');
        expect(result.stderr).not.toContain('owner ehmpath');
        // snapshot test for clear error message
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });
});
