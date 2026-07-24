import { spawnSync } from 'child_process';
import * as fs from 'fs';
import { MalfunctionError } from 'helpful-errors';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

/**
 * .what = integration tests for git.commit.push.sh
 * .why = verify standalone push + pr findsert works correctly with all guards and output modes
 *
 * .mock = three external command boundaries are stubbed in the hermetic temp repo:
 *         the `git` push subcommand, the `gh` cli (pr list/create/whoami), and the
 *         `rhachet` keyrack communicator (via the `fakeRhachet` fixture param).
 * .why  = these tests run in a throwaway temp git repo with NO real remote, NO
 *         github network/auth, and NO way to force a real keyrack outage. the whole
 *         point of this suite is the keyrack-failure fallback and the un-gated
 *         push→PR-open sequence — behaviors that CANNOT be driven with real
 *         git-remote / gh / keyrack. per rule.forbid.integration.mocks, these fakes
 *         are the "clearly unavoidable" exception: they stub only the unreachable
 *         boundaries so the skill's own decision logic runs for real. every NON-push
 *         git call execs the REAL /usr/bin/git, so the local commit/log/rev-parse
 *         the skill relies on are unfaked.
 * .real = the real transport + gh PR-open + keyrack are exercised by git.commit.push.sh
 *         in production; each fake stands in ONLY for the boundary that a hermetic
 *         harness cannot reach. individual fakes are marked `.mock` at their site.
 */
describe('git.commit.push.sh', () => {
  const pushScriptPath = path.join(__dirname, 'git.commit.push.sh');
  const setScriptPath = path.join(__dirname, 'git.commit.set.sh');

  // note: happy path tests pass EHMPATHY_SEATURTLE_GITHUB_TOKEN via env
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
    fakeRhachet?: string; // shadow node_modules/.bin/rhachet (the keyrack communicator) with this bash body
  }): string => {
    const tempDir = genTempDir({
      slug: 'git-commit-push-test',
      git: true,
      symlink: [{ at: 'node_modules', to: 'node_modules' }],
    });

    // optionally shadow node_modules/.bin/rhachet (the keyrack communicator) with
    // a fake. the helper owns the node_modules symlink, so it owns its stand-in:
    // drop the symlink to the real node_modules and stand up a minimal .bin/rhachet
    // so a keyrack fetch is deterministic (a real rhachet failure emits
    // machine-dependent text that would flake any guide snapshot).
    if (args.fakeRhachet) {
      const nodeModulesLink = path.join(tempDir, 'node_modules');
      fs.rmSync(nodeModulesLink, { recursive: true, force: true });
      const fakeNodeBin = path.join(tempDir, 'node_modules', '.bin');
      fs.mkdirSync(fakeNodeBin, { recursive: true });
      fs.writeFileSync(path.join(fakeNodeBin, 'rhachet'), args.fakeRhachet);
      fs.chmodSync(path.join(fakeNodeBin, 'rhachet'), '755');
    }

    // configure git user
    configureTestGitUser({ cwd: tempDir });

    // setup keyrack fixture
    if (args.withKeyrack !== false) {
      const agentDir = path.join(tempDir, '.agent');
      fs.mkdirSync(agentDir, { recursive: true });
      fs.writeFileSync(
        path.join(agentDir, 'keyrack.yml'),
        `org: ehmpathy
env.all:
  - EHMPATHY_SEATURTLE_GITHUB_TOKEN
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
   * .note = always excludes EHMPATHY_SEATURTLE_GITHUB_TOKEN from process.env
   *         for deterministic tests; pass explicit token via env if needed
   * .note = always isolates HOME so global blocker does not leak into tests
   * .note = sets up org permission by default (ehmpathy allowed) unless skipOrgSetup
   */
  const runPush = (args: {
    tempDir: string;
    pushArgs: string[];
    env?: Record<string, string>;
    tempHome?: string;
    skipOrgSetup?: boolean;
  }): { stdout: string; stderr: string; exitCode: number } => {
    // always exclude token from process.env for deterministic tests
    const { EHMPATHY_SEATURTLE_GITHUB_TOKEN: _token, ...envWithoutToken } =
      process.env;

    // always use isolated HOME so global blocker does not leak into tests
    // note: args.env?.HOME can override isolatedHome, so org state must be set up
    //       in the actual HOME that will be used
    const isolatedHome =
      args.tempHome ?? genTempDir({ slug: 'git-push-home', git: false });
    const effectiveHome = args.env?.HOME ?? isolatedHome;

    // set up org permission by default so org blocker check passes
    if (!args.skipOrgSetup) {
      const orgMeterDir = path.join(
        effectiveHome,
        '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
      );
      fs.mkdirSync(orgMeterDir, { recursive: true });
      fs.writeFileSync(
        path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
        JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
      );
    }

    // create stub bash alias files to prevent warnings when HOME is fake
    // (user's .bash_aliases sources these from $HOME, which breaks with fake HOME)
    fs.writeFileSync(path.join(effectiveHome, '.bash_aliases.ductwork.sh'), '');
    fs.writeFileSync(path.join(effectiveHome, '.bash_aliases.termwork.sh'), '');

    const result = spawnSync('bash', [pushScriptPath, ...args.pushArgs], {
      cwd: args.tempDir,
      encoding: 'utf-8' as BufferEncoding,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...envWithoutToken,
        HOME: effectiveHome,
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

        // .mock = fake gh cli for token validation
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
            EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
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
          env: { EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token' },
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

        // .mock = fake gh cli for token validation
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
            EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
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
          env: { EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token' },
        });

        expect(result.exitCode).toBe(2); // blocked by constraints
        expect(result.stdout).toContain('bummer dude');
        // branch name varies by git config (main vs master)
        expect(result.stdout).toMatch(/cannot push directly to (main|master)/);
        expect(result.stdout).toContain('git checkout -b turtle/');
        // skip snapshot: branch name varies by environment
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
          env: { EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token' },
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
          env: { EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token' },
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

        // .mock = fake gh cli for token validation
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
            EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
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
          env: { EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token' },
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

        // .mock = fake gh cli for token validation
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
            EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
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
          env: { EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token' },
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

          // .mock = fake gh cli for token validation
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
              EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
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
        const relockResult = spawnSync(
          'npx',
          ['rhachet', 'keyrack', 'relock', '--owner', 'ehmpath'],
          {
            encoding: 'utf-8',
            stdio: 'pipe',
          },
        );
        if (relockResult.status !== 0) {
          throw new MalfunctionError('keyrack relock failed', {
            status: relockResult.status,
            stderr: relockResult.stderr,
          });
        }

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
        // snapshot both streams — the guide now rides stdout too (the code change
        // added stdout output on this path), so lock both per snapshot-exhaustiveness
        expect(result.stdout).toMatchSnapshot();
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
          env: { EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token' },
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

        // .mock = fake gh cli for token validation
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
            EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
            PATH: `${fakeBinDir}:${process.env.PATH}`,
          },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('push: allowed → blocked (revoked)');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given(
    '[case15] as-ehmpath keyrack locked → guide to as-human (sad path)',
    () => {
      when('[t0] keyrack.yml exists but no host manifest', () => {
        then(
          'the commit is pushed, then a guide names the as-human fallback',
          () => {
            // relock ehmpath to clear daemon cache
            const relockResult = spawnSync(
              'npx',
              ['rhachet', 'keyrack', 'relock', '--owner', 'ehmpath'],
              {
                encoding: 'utf-8',
                stdio: 'pipe',
              },
            );
            if (relockResult.status !== 0) {
              throw new MalfunctionError('keyrack relock failed', {
                status: relockResult.status,
                stderr: relockResult.stderr,
              });
            }

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

            // .mock = fake git push success so we reach the keyrack step (push is un-gated)
            const fakeBinDir = path.join(tempDir, '.fakebin');
            fs.mkdirSync(fakeBinDir, { recursive: true });
            fs.writeFileSync(
              path.join(fakeBinDir, 'git'),
              `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
            );
            fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

            const result = runPush({
              tempDir,
              pushArgs: ['--mode', 'apply', '--auth', 'as-ehmpath'],
              env: {
                HOME: fakeHome,
                PATH: `${fakeBinDir}:${process.env.PATH}`,
                // clear token so keyrack actually tries to fetch
                EHMPATHY_SEATURTLE_GITHUB_TOKEN: '',
              },
            });

            // caller must choose: unlock keyrack, or retry as-human
            expect(result.exitCode).toBe(2);
            // the guide surfaces the keyrack failure and the as-human fallback
            expect(result.stderr).toContain('keyrack token not available');
            expect(result.stderr).toContain(
              'rhx git.commit.push --mode apply --auth as-human',
            );
            // under a fake HOME the keyrack fetch captures no stderr, so the guide
            // is causeless and deterministic — snapshot-stable on both streams. the
            // cause path (a captured keyrack error → a 'cause:' line on stderr) is
            // locked by case38 with a deterministic fake instead.
            expect(result.stdout).toMatchSnapshot();
            expect(result.stderr).toMatchSnapshot();
          },
        );
      });
    },
  );

  given(
    '[case16] keyrack.yml does not declare requested key (sad path)',
    () => {
      when('[t0] keyrack.yml exists but key declaration absent', () => {
        then('exits with clear message about key not declared', () => {
          // relock ehmpath to clear daemon cache
          const relockResult = spawnSync(
            'npx',
            ['rhachet', 'keyrack', 'relock', '--owner', 'ehmpath'],
            {
              encoding: 'utf-8',
              stdio: 'pipe',
            },
          );
          if (relockResult.status !== 0) {
            throw new MalfunctionError('keyrack relock failed', {
              status: relockResult.status,
              stderr: relockResult.stderr,
            });
          }

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
          configureTestGitUser({ cwd: tempDir });

          // create keyrack.yml that does NOT include EHMPATHY_SEATURTLE_GITHUB_TOKEN
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

          // .mock = fake git push success so we reach the keyrack step (push is un-gated)
          const fakeBinDir = path.join(tempDir, '.fakebin');
          fs.mkdirSync(fakeBinDir, { recursive: true });
          fs.writeFileSync(
            path.join(fakeBinDir, 'git'),
            `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
          );
          fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

          const result = runPush({
            tempDir,
            // apply mode is where keyrack is fetched (as-ehmpath, post-push)
            pushArgs: ['--mode', 'apply', '--auth', 'as-ehmpath'],
            env: {
              HOME: fakeHome,
              PATH: `${fakeBinDir}:${process.env.PATH}`,
              // clear token so keyrack actually tries to fetch
              EHMPATHY_SEATURTLE_GITHUB_TOKEN: '',
            },
          });

          // caller must choose: unlock keyrack, or retry as-human
          expect(result.exitCode).toBe(2);
          // the guide names the keyrack failure and the as-human fallback
          expect(result.stderr).toContain('keyrack token not available');
          expect(result.stderr).toContain(
            'rhx git.commit.push --mode apply --auth as-human',
          );
          // fake HOME → keyrack fetch captures no stderr → causeless, deterministic
          // guide on both streams (case38 locks the cause path via a fake)
          expect(result.stdout).toMatchSnapshot();
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

        // .mock = fake gh cli - returns success for token validation, pr list (empty), and pr create
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

        // .mock = fake git push - returns success
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
            EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
            PATH: `${fakeBinDir}:${process.env.PATH}`,
          },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('cowabunga');
        expect(result.stdout).toContain('push:');
        expect(result.stdout).toContain('pr:');
        expect(result.stdout).toContain('🌊 now lets ride the release wave');
        expect(result.stdout).toContain('wipeouts');
        expect(result.stdout).toContain('rhx git.release --watch');
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
            configureTestGitUser({ cwd: tempDir });

            // ensure default branch is main (CI may default to master)
            spawnSync('git', ['branch', '-m', 'master', 'main'], {
              cwd: tempDir,
            });

            // setup keyrack fixture
            const agentDir = path.join(tempDir, '.agent');
            fs.mkdirSync(agentDir, { recursive: true });
            fs.writeFileSync(
              path.join(agentDir, 'keyrack.yml'),
              `org: ehmpathy
env.all:
  - EHMPATHY_SEATURTLE_GITHUB_TOKEN
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

            // .mock = fake gh cli to bypass token validation
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
                EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
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

        configureTestGitUser({ cwd: tempDir });

        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(agentDir, { recursive: true });
        fs.writeFileSync(
          path.join(agentDir, 'keyrack.yml'),
          `org: ehmpathy
env.all:
  - EHMPATHY_SEATURTLE_GITHUB_TOKEN
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

        // .mock = fake gh cli to bypass token validation
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
            EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
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

  given(
    '[case20] both keyrack sources locked → guide to as-human (sad path)',
    () => {
      when('[t0] no user keyrack, no ehmpath host manifest', () => {
        then(
          'the commit is pushed, then a guide names the as-human fallback',
          () => {
            // relock ehmpath to clear daemon cache
            const relockResult = spawnSync(
              'npx',
              ['rhachet', 'keyrack', 'relock', '--owner', 'ehmpath'],
              {
                encoding: 'utf-8',
                stdio: 'pipe',
              },
            );
            if (relockResult.status !== 0) {
              throw new MalfunctionError('keyrack relock failed', {
                status: relockResult.status,
                stderr: relockResult.stderr,
              });
            }

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

            // .mock = fake git push success so we reach the keyrack step (push is un-gated)
            const fakeBinDir = path.join(tempDir, '.fakebin');
            fs.mkdirSync(fakeBinDir, { recursive: true });
            fs.writeFileSync(
              path.join(fakeBinDir, 'git'),
              `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
            );
            fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

            const result = runPush({
              tempDir,
              pushArgs: ['--mode', 'apply', '--auth', 'as-ehmpath'],
              env: {
                HOME: fakeHome,
                PATH: `${fakeBinDir}:${process.env.PATH}`,
                // clear token so keyrack actually tries to fetch
                EHMPATHY_SEATURTLE_GITHUB_TOKEN: '',
              },
            });

            // caller must choose: unlock keyrack, or retry as-human
            expect(result.exitCode).toBe(2);
            // the guide surfaces the keyrack failure and the as-human fallback
            expect(result.stderr).toContain('keyrack token not available');
            expect(result.stderr).toContain(
              'rhx git.commit.push --mode apply --auth as-human',
            );
            // fake HOME → keyrack fetch captures no stderr → causeless, deterministic
            // guide on both streams (case38 locks the cause path via a fake)
            expect(result.stdout).toMatchSnapshot();
            expect(result.stderr).toMatchSnapshot();
          },
        );
      });
    },
  );

  given('[case21] global blocker guard', () => {
    when('[t0] global blocker is active but local meter allows push', () => {
      then('exits with global blocked error', () => {
        // create fake HOME with global blocker
        const fakeHome = genTempDir({
          slug: 'fake-home-global-blocked',
        });
        const globalMeterDir = path.join(
          fakeHome,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        );
        fs.mkdirSync(globalMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(globalMeterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ blocked: true }, null, 2),
        );

        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: global blocked test'],
        });

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan'],
          env: {
            HOME: fakeHome,
            EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
          },
        });

        expect(result.exitCode).toBe(2); // blocked by constraints
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain('commits blocked globally');
        expect(result.stdout).toContain('git.commit.uses allow --global');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] global blocker is not active', () => {
      then('proceeds to local meter check', () => {
        // create fake HOME with NO global blocker
        const fakeHome = genTempDir({
          slug: 'fake-home-no-global-block',
        });

        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: no global block test'],
        });

        // .mock = fake gh cli for token validation
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
            HOME: fakeHome,
            EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
            PATH: `${fakeBinDir}:${process.env.PATH}`,
          },
        });

        // should NOT be blocked by global blocker
        expect(result.stdout).not.toContain('commits blocked globally');
        // should proceed to plan output
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('heres the wave');
      });
    });

    when('[t2] global blocker file is corrupt', () => {
      then('fails safe with file corrupt error', () => {
        // create fake HOME with corrupt global blocker file
        const fakeHome = genTempDir({
          slug: 'fake-home-corrupt-global',
        });
        const globalMeterDir = path.join(
          fakeHome,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        );
        fs.mkdirSync(globalMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(globalMeterDir, 'git.commit.uses.jsonc'),
          'not valid json {{{',
        );

        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: corrupt global test'],
        });

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan'],
          env: {
            HOME: fakeHome,
            EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
          },
        });

        expect(result.exitCode).toBe(2); // blocked by constraints
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain('global blocker file corrupt');
      });
    });
  });

  given('[case30] --auth plan mode reflects the pr-open source', () => {
    when('[t0] --auth as-human', () => {
      then('plan shows the pr opens via the gh cli login', () => {
        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: auth human plan'],
        });

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan', '--auth', 'as-human'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          'opened: as-human (gh cli login, fallback)',
        );
        expect(result.stdout).toMatchSnapshot();
        // pin stderr too (expected empty) so a stray warn cannot slip in unseen
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] no --auth (default)', () => {
      then('plan shows the pr opens via the ehmpath keyrack', () => {
        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: auth default plan'],
        });

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('opened: as-ehmpath (ehmpath keyrack)');
        expect(result.stdout).toMatchSnapshot();
        // pin stderr too (expected empty) so a stray warn cannot slip in unseen
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t2] --auth json plan', () => {
      then('json carries the auth mode', () => {
        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: auth json plan'],
        });

        const result = runPush({
          tempDir,
          pushArgs: [
            '--mode',
            'plan',
            '--output',
            'json',
            '--auth',
            'as-human',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(JSON.parse(result.stdout).auth).toEqual('as-human');
        expect(result.stdout).toMatchSnapshot();
        // pin stderr too (expected empty) so a stray warn cannot slip in unseen
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case22] invalid --auth value', () => {
    when('[t0] --auth as-robot (unsupported)', () => {
      then('exits as constraint with a clear error', () => {
        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: auth invalid'],
        });

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan', '--auth', 'as-robot'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stderr + result.stdout).toContain(
          "--auth must be 'as-ehmpath' or 'as-human'",
        );
        // the error rides both streams per skill-output-streams; snap both
        expect(result.stdout).toMatchSnapshot();
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case23] --auth as-human apply opens the pr via ambient gh', () => {
    when('[t0] no keyrack token, gh cli login available', () => {
      then('push succeeds and the pr opens without a GH_TOKEN override', () => {
        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: auth human apply'],
          commitAuthor: {
            name: 'seaturtle[bot]',
            email: 'seaturtle@ehmpath.com',
          },
        });

        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });

        // .mock = fake gh — fail loud if a GH_TOKEN override leaks in (as-human must
        // use the ambient login, never the keyrack token)
        fs.writeFileSync(
          path.join(fakeBinDir, 'gh'),
          `#!/bin/bash
if [[ -n "$GH_TOKEN" ]]; then
  echo "unexpected GH_TOKEN override under as-human" >&2
  exit 3
fi
if [[ "$1" == "pr" && "$2" == "list" ]]; then
  echo ""
  exit 0
elif [[ "$1" == "pr" && "$2" == "create" ]]; then
  echo "https://github.com/test/repo/pull/77"
  exit 0
fi
exit 1
`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        // .mock = fake git push success; pass through other git commands
        fs.writeFileSync(
          path.join(fakeBinDir, 'git'),
          `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'apply', '--auth', 'as-human'],
          env: {
            PATH: `${fakeBinDir}:${process.env.PATH}`,
          },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('cowabunga');
        expect(result.stdout).toContain(
          'opened: as-human (gh cli login, fallback)',
        );
        expect(result.stdout).toMatchSnapshot();
        // pin stderr too (expected empty on the success path) so a stray warn
        // or debug line cannot slip in unseen
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given(
    '[case24] --auth as-ehmpath guides to as-human on keyrack failure',
    () => {
      when(
        '[t0] push succeeds but the ehmpath keyrack token is unavailable',
        () => {
          then(
            'the commit is pushed, then a guide names the as-human fallback',
            () => {
              const tempDir = setupTempRepo({
                meterState: { uses: 3, push: 'allow' },
                branch: 'turtle/feature',
                commits: ['feat: auth ehmpath guide'],
                commitAuthor: {
                  name: 'seaturtle[bot]',
                  email: 'seaturtle@ehmpath.com',
                },
              });

              // .mock = fake git push success so we reach the token step (un-gated push)
              const fakeBinDir = path.join(tempDir, '.fakebin');
              fs.mkdirSync(fakeBinDir, { recursive: true });
              fs.writeFileSync(
                path.join(fakeBinDir, 'git'),
                `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

              // no EHMPATHY_SEATURTLE_GITHUB_TOKEN → keyrack fetch fails → guide
              const result = runPush({
                tempDir,
                pushArgs: ['--mode', 'apply', '--auth', 'as-ehmpath'],
                env: {
                  PATH: `${fakeBinDir}:${process.env.PATH}`,
                },
              });

              expect(result.exitCode).toBe(2); // caller must choose
              expect(result.stderr).toContain('keyrack token not available');
              expect(result.stderr).toContain(
                'rhx git.commit.push --mode apply --auth as-human',
              );
              // real keyrack cause rides stderr (machine dependent → assert presence,
              // not snapshot; case38 locks the exact cause line via a fake)
              expect(result.stderr).toContain('cause:');
              // tree mode delivers the guide on stdout per skill-output-streams
              expect(result.stdout).toMatchSnapshot();
              // lock the stderr guide framing too (r008/r010: snapshot
              // exhaustiveness on the user-facing stream) — the cause tail is
              // machine-dependent (pid, abs paths, rhachet version), so mask it
              // with a stable placeholder and snapshot the deterministic guide
              // above it
              const stderrMasked = result.stderr.replace(
                /cause:[\s\S]*/,
                'cause: <machine-dependent keyrack error, masked>',
              );
              expect(stderrMasked).toMatchSnapshot();
            },
          );
        },
      );
    },
  );

  given(
    '[case25] --auth as-ehmpath keyrack failure in json mode emits a json error on stdout',
    () => {
      when('[t0] json output, push succeeds, keyrack token unavailable', () => {
        then(
          'stdout carries a machine-readable error, stderr carries the guide',
          () => {
            const tempDir = setupTempRepo({
              meterState: { uses: 3, push: 'allow' },
              branch: 'turtle/feature',
              commits: ['feat: auth ehmpath json guide'],
              commitAuthor: {
                name: 'seaturtle[bot]',
                email: 'seaturtle@ehmpath.com',
              },
            });

            // .mock = fake git push success so we reach the token step (un-gated push)
            const fakeBinDir = path.join(tempDir, '.fakebin');
            fs.mkdirSync(fakeBinDir, { recursive: true });
            fs.writeFileSync(
              path.join(fakeBinDir, 'git'),
              `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
            );
            fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

            // no EHMPATHY_SEATURTLE_GITHUB_TOKEN → keyrack fetch fails → guide
            const result = runPush({
              tempDir,
              pushArgs: [
                '--mode',
                'apply',
                '--output',
                'json',
                '--auth',
                'as-ehmpath',
              ],
              env: {
                PATH: `${fakeBinDir}:${process.env.PATH}`,
              },
            });

            expect(result.exitCode).toBe(2); // caller must choose
            // stdout is a valid, machine-readable error object (not prose)
            const parsed = JSON.parse(result.stdout.trim());
            expect(parsed.status).toBe('error');
            expect(parsed.error).toContain('--auth as-human');
            // the json error stays concise: the raw keyrack trace never taints
            // the machine object — it rides stderr as the cause instead
            expect(parsed.error).not.toContain('cause:');
            // stderr carries the human-readable guide AND the real cause
            expect(result.stderr).toContain('keyrack token not available');
            expect(result.stderr).toContain(
              'rhx git.commit.push --mode apply --auth as-human',
            );
            expect(result.stderr).toContain('cause:');
            // stdout json is deterministic (concise), so it stays snapshot-locked
            expect(result.stdout).toMatchSnapshot();
            // lock the stderr guide framing too (r008/r010: snapshot
            // exhaustiveness) — mask the machine-dependent cause tail with a
            // stable placeholder, snapshot the deterministic guide above it
            const stderrMasked = result.stderr.replace(
              /cause:[\s\S]*/,
              'cause: <machine-dependent keyrack error, masked>',
            );
            expect(stderrMasked).toMatchSnapshot();
          },
        );
      });
    },
  );

  given(
    '[case38] --auth as-ehmpath surfaces the exact keyrack cause in the guide',
    () => {
      when(
        '[t0] the keyrack fetch fails with a known, deterministic error',
        () => {
          then(
            'the guide names the fallback AND the stderr carries the cause verbatim',
            () => {
              // a fake rhachet stands in for the keyrack communicator so the cause
              // text is deterministic (a real rhachet failure emits machine-
              // dependent paths + a pid). it fails every keyrack call with one
              // fixed line, so the surfaced cause is snapshot-stable. this is the
              // one case that locks the exact cause rendering; the real-rhachet
              // sad paths (case15/16/20/24/25) assert only that a cause rides
              // stderr, since their cause text is machine dependent.
              const tempDir = setupTempRepo({
                meterState: { uses: 3, push: 'allow' },
                branch: 'turtle/feature',
                commits: ['feat: auth ehmpath cause surfaced'],
                commitAuthor: {
                  name: 'seaturtle[bot]',
                  email: 'seaturtle@ehmpath.com',
                },
                fakeRhachet: `#!/bin/bash
# deterministic fake keyrack: fails every call with one fixed cause line.
# $2 is the keyrack subcommand (get / unlock / get across the fetch's tries).
echo "fake keyrack: $2 unreachable (host manifest absent)" >&2
exit 1
`,
              });

              // .mock = fake git push success so we reach the token step (un-gated push)
              const fakeBinDir = path.join(tempDir, '.fakebin');
              fs.mkdirSync(fakeBinDir, { recursive: true });
              fs.writeFileSync(
                path.join(fakeBinDir, 'git'),
                `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

              // no EHMPATHY_SEATURTLE_GITHUB_TOKEN → keyrack fetch fails → guide
              const result = runPush({
                tempDir,
                pushArgs: ['--mode', 'apply', '--auth', 'as-ehmpath'],
                env: {
                  PATH: `${fakeBinDir}:${process.env.PATH}`,
                  EHMPATHY_SEATURTLE_GITHUB_TOKEN: '',
                },
              });

              expect(result.exitCode).toBe(2); // caller must choose
              // the guide names the fallback, and the deterministic cause rides
              // stderr so the human learns WHY the fetch failed
              expect(result.stderr).toContain('keyrack token not available');
              expect(result.stderr).toContain(
                'fake keyrack: get unreachable (host manifest absent)',
              );
              // the pretty stdout guide stays clean of the raw cause
              expect(result.stdout).not.toContain('fake keyrack:');
              // snapshot both streams: stdout = causeless guide, stderr = guide +
              // the exact cause line(s) — the deterministic proof of surfacing
              expect(result.stdout).toMatchSnapshot();
              expect(result.stderr).toMatchSnapshot();
            },
          );
        },
      );
    },
  );

  given(
    '[case26] --auth as-human guides to the two fixes when gh is not logged in',
    () => {
      when('[t0] push succeeds but the ambient gh login is unavailable', () => {
        then(
          'the commit is pushed, then a guide names unlock-keyrack + gh-auth-login',
          () => {
            const tempDir = setupTempRepo({
              meterState: { uses: 3, push: 'allow' },
              branch: 'turtle/feature',
              commits: ['feat: auth human no-login guide'],
              commitAuthor: {
                name: 'seaturtle[bot]',
                email: 'seaturtle@ehmpath.com',
              },
            });

            const fakeBinDir = path.join(tempDir, '.fakebin');
            fs.mkdirSync(fakeBinDir, { recursive: true });

            // .mock = fake gh — the ambient login is absent, so every pr op fails with
            // the auth signature gh emits when it has no usable credential
            fs.writeFileSync(
              path.join(fakeBinDir, 'gh'),
              `#!/bin/bash
if [[ "$1" == "pr" ]]; then
  echo "gh: To use GitHub CLI, please run: gh auth login" >&2
  echo "HTTP 401: Bad credentials" >&2
  exit 1
fi
exit 1
`,
            );
            fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

            // .mock = fake git push success so we reach the pr-open step (un-gated push)
            fs.writeFileSync(
              path.join(fakeBinDir, 'git'),
              `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
            );
            fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

            const result = runPush({
              tempDir,
              pushArgs: ['--mode', 'apply', '--auth', 'as-human'],
              env: {
                PATH: `${fakeBinDir}:${process.env.PATH}`,
              },
            });

            // caller must fix: unlock keyrack, or gh auth login
            expect(result.exitCode).toBe(2);
            // the guide names BOTH fixes so it is correct whichever mode failed
            expect(result.stderr).toContain('no usable gh credential');
            expect(result.stderr).toContain(
              'rhx keyrack unlock --owner ehmpath --env prep',
            );
            expect(result.stderr).toContain('gh auth login');
            // tree mode delivers the guide on both streams per skill-output-streams
            expect(result.stdout).toContain('gh auth login');
            expect(result.stdout).toMatchSnapshot();
            expect(result.stderr).toMatchSnapshot();
          },
        );
      });
    },
  );

  given(
    '[case39] --auth as-human + --output json emits a json error when gh is not logged in',
    () => {
      when(
        '[t0] json output, push succeeds, ambient gh login unavailable',
        () => {
          then(
            'stdout carries a machine-readable error, stderr carries the two-fix guide',
            () => {
              // the as-ehmpath fallback has both a tree (case24) and json (case25)
              // guide locked; this locks the SAME json contract on the as-human
              // side so the two auth modes stay symmetric (contract-snapshot-
              // exhaustiveness). the fake gh emits a fixed auth signature, so both
              // streams are deterministic and snapshot-safe.
              const tempDir = setupTempRepo({
                meterState: { uses: 3, push: 'allow' },
                branch: 'turtle/feature',
                commits: ['feat: auth human json guide'],
                commitAuthor: {
                  name: 'seaturtle[bot]',
                  email: 'seaturtle@ehmpath.com',
                },
              });

              const fakeBinDir = path.join(tempDir, '.fakebin');
              fs.mkdirSync(fakeBinDir, { recursive: true });

              // .mock = fake gh — the ambient login is absent, so every pr op fails with
              // the auth signature gh emits when it has no usable credential
              fs.writeFileSync(
                path.join(fakeBinDir, 'gh'),
                `#!/bin/bash
if [[ "$1" == "pr" ]]; then
  echo "gh: To use GitHub CLI, please run: gh auth login" >&2
  echo "HTTP 401: Bad credentials" >&2
  exit 1
fi
exit 1
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

              // .mock = fake git push success so we reach the pr-open step (un-gated push)
              fs.writeFileSync(
                path.join(fakeBinDir, 'git'),
                `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

              const result = runPush({
                tempDir,
                pushArgs: [
                  '--mode',
                  'apply',
                  '--output',
                  'json',
                  '--auth',
                  'as-human',
                ],
                env: {
                  PATH: `${fakeBinDir}:${process.env.PATH}`,
                },
              });

              // caller must fix: unlock keyrack, or gh auth login
              expect(result.exitCode).toBe(2);
              // stdout is a valid, machine-readable error object (not prose)
              const parsed = JSON.parse(result.stdout.trim());
              expect(parsed.status).toBe('error');
              expect(parsed.error).toContain('gh auth login');
              // stderr carries the human-readable two-fix guide
              expect(result.stderr).toContain('no usable gh credential');
              expect(result.stderr).toContain('gh auth login');
              expect(result.stdout).toMatchSnapshot();
              expect(result.stderr).toMatchSnapshot();
            },
          );
        },
      );
    },
  );

  given(
    '[case27] a non-auth gh failure does NOT fire the two-fix guide',
    () => {
      when(
        '[t0] pr create fails for a branch-protection reason (not auth)',
        () => {
          then(
            'the generic failure is surfaced, the auth guide stays silent',
            () => {
              const tempDir = setupTempRepo({
                meterState: { uses: 3, push: 'allow' },
                branch: 'turtle/feature',
                commits: ['feat: auth human non-auth failure'],
                commitAuthor: {
                  name: 'seaturtle[bot]',
                  email: 'seaturtle@ehmpath.com',
                },
              });

              const fakeBinDir = path.join(tempDir, '.fakebin');
              fs.mkdirSync(fakeBinDir, { recursive: true });

              // .mock = fake gh — the login is fine (pr list works), but pr create fails
              // for a clearly non-auth reason: branch protection. the guide must
              // NOT fire — this proves is_gh_auth_failure never misdirects.
              fs.writeFileSync(
                path.join(fakeBinDir, 'gh'),
                `#!/bin/bash
if [[ "$1" == "pr" && "$2" == "list" ]]; then
  echo ""
  exit 0
elif [[ "$1" == "pr" && "$2" == "create" ]]; then
  echo "GraphQL: Changes must be made through a pull request; required status checks are expected (createPullRequest)" >&2
  exit 1
fi
exit 1
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

              // .mock = fake git push success so we reach the pr-open step (un-gated push)
              fs.writeFileSync(
                path.join(fakeBinDir, 'git'),
                `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

              const result = runPush({
                tempDir,
                pushArgs: ['--mode', 'apply', '--auth', 'as-human'],
                env: {
                  PATH: `${fakeBinDir}:${process.env.PATH}`,
                },
              });

              // push succeeded, but the non-auth pr create failed. the pr-open
              // outcome is decomposed from the push transport, so a failed
              // pr-open surfaces as a caller-must-fix constraint (exit 2) rather
              // than ride the push success as exit 0 (which would let a chained
              // caller believe a pr exists when none opened)
              expect(result.exitCode).toBe(2);
              // the generic failure path is taken, verbatim from gh
              expect(result.stdout).toContain('pr creation failed');
              // the header no longer celebrates — the pr did not open
              expect(result.stdout).toContain('pushed but the pr didnt open');
              // stream parity: the failure tree also rides stderr, so a
              // stderr-only consumer sees why exit 2 happened, not just the code
              // (rule.require.skill-output-streams)
              expect(result.stderr).toContain('pushed but the pr didnt open');
              // the two-fix auth guide must stay silent on both streams
              expect(result.stdout).not.toContain('no usable gh credential');
              expect(result.stderr).not.toContain('no usable gh credential');
              expect(result.stdout).toMatchSnapshot();
              // the mock echoes the branch-protection error to stderr; lock that
              // exact text so its format cannot drift undetected
              expect(result.stderr).toMatchSnapshot();
            },
          );
        },
      );
    },
  );

  given(
    '[case28] --auth as-human, the pr already exists → found branch (not created)',
    () => {
      when('[t0] gh pr list returns an extant pr number', () => {
        then(
          'the tree states pr #N (found) and opened: as-human, no create attempt',
          () => {
            const tempDir = setupTempRepo({
              meterState: { uses: 3, push: 'allow' },
              branch: 'turtle/feature',
              commits: ['feat: auth human found'],
              commitAuthor: {
                name: 'seaturtle[bot]',
                email: 'seaturtle@ehmpath.com',
              },
            });

            const fakeBinDir = path.join(tempDir, '.fakebin');
            fs.mkdirSync(fakeBinDir, { recursive: true });

            // .mock = fake gh — a pr already exists on this branch, so pr list returns
            // its number and the create branch must never run. fail loud if a
            // GH_TOKEN override leaks (as-human must ride the ambient login) or
            // if pr create is ever reached.
            fs.writeFileSync(
              path.join(fakeBinDir, 'gh'),
              `#!/bin/bash
if [[ -n "$GH_TOKEN" ]]; then
  echo "unexpected GH_TOKEN override under as-human" >&2
  exit 3
fi
if [[ "$1" == "pr" && "$2" == "list" ]]; then
  echo "55"
  exit 0
elif [[ "$1" == "pr" && "$2" == "create" ]]; then
  echo "unexpected pr create — an extant pr should short-circuit to found" >&2
  exit 4
fi
exit 1
`,
            );
            fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

            // .mock = fake git push success; pass through other git commands
            fs.writeFileSync(
              path.join(fakeBinDir, 'git'),
              `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
            );
            fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

            const result = runPush({
              tempDir,
              pushArgs: ['--mode', 'apply', '--auth', 'as-human'],
              env: {
                PATH: `${fakeBinDir}:${process.env.PATH}`,
              },
            });

            // the found branch ran: exit 0, pr #55 (found), opened as-human
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('pr: pr #55 (found)');
            expect(result.stdout).toContain(
              'opened: as-human (gh cli login, fallback)',
            );
            expect(result.stdout).toMatchSnapshot();
            // pin stderr too (expected empty on the found path) to catch drift
            expect(result.stderr).toMatchSnapshot();
          },
        );
      });
    },
  );

  given(
    '[case29] --auth as-human, gh create fails for auth → guide via the create path',
    () => {
      when('[t0] pr list succeeds empty but pr create fails with a 401', () => {
        then(
          'the two-fix guide fires from the create path (distinct from case26 list path)',
          () => {
            const tempDir = setupTempRepo({
              meterState: { uses: 3, push: 'allow' },
              branch: 'turtle/feature',
              commits: ['feat: auth human create-fail'],
              commitAuthor: {
                name: 'seaturtle[bot]',
                email: 'seaturtle@ehmpath.com',
              },
            });

            const fakeBinDir = path.join(tempDir, '.fakebin');
            fs.mkdirSync(fakeBinDir, { recursive: true });

            // .mock = fake gh — the login lists fine (so the list-path guard passes),
            // but pr create hits an expired-credential 401. this exercises the
            // create-path auth guard (push.sh:457), the sibling of case26's
            // list-path guard (push.sh:417). fail loud on any GH_TOKEN leak.
            fs.writeFileSync(
              path.join(fakeBinDir, 'gh'),
              `#!/bin/bash
if [[ -n "$GH_TOKEN" ]]; then
  echo "unexpected GH_TOKEN override under as-human" >&2
  exit 3
fi
if [[ "$1" == "pr" && "$2" == "list" ]]; then
  echo ""
  exit 0
elif [[ "$1" == "pr" && "$2" == "create" ]]; then
  echo "HTTP 401: Bad credentials" >&2
  exit 1
fi
exit 1
`,
            );
            fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

            // .mock = fake git push success so we reach the pr-open step (un-gated push)
            fs.writeFileSync(
              path.join(fakeBinDir, 'git'),
              `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
            );
            fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

            const result = runPush({
              tempDir,
              pushArgs: ['--mode', 'apply', '--auth', 'as-human'],
              env: {
                PATH: `${fakeBinDir}:${process.env.PATH}`,
              },
            });

            // caller must fix: the create-path auth guard fired the two-fix guide
            expect(result.exitCode).toBe(2);
            expect(result.stderr).toContain('no usable gh credential');
            expect(result.stderr).toContain('gh auth login');
            expect(result.stderr).toContain(
              'rhx keyrack unlock --owner ehmpath --env prep',
            );
            // tree mode delivers the guide on both streams per skill-output-streams
            expect(result.stdout).toContain('no usable gh credential');
            expect(result.stdout).toMatchSnapshot();
            expect(result.stderr).toMatchSnapshot();
          },
        );
      });
    },
  );

  given('[case31] --help short-circuits before any keyrack fetch', () => {
    when('[t0] a fake rhachet records if it is ever called', () => {
      then('--help exits 0 with usage and never touches keyrack', () => {
        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: help fast path'],
          commitAuthor: {
            name: 'seaturtle[bot]',
            email: 'seaturtle@ehmpath.com',
          },
        });

        // replace the node_modules symlink with a real dir that carries a fake
        // rhachet. the fetch calls "$repo_root/node_modules/.bin/rhachet" by
        // absolute path, so this shadows the real binary. the fake drops a
        // sentinel when invoked — if --help ever reached fetch_github_token,
        // the sentinel would appear. this clamps the most-repeated blocker
        // (identity-fetch used to block --help) per rule.require.test-covered-repairs.
        // .mock = fake rhachet (keyrack communicator boundary) — no real keyrack in temp repo
        const sentinel = path.join(tempDir, 'rhachet-was-called');
        const nodeModulesLink = path.join(tempDir, 'node_modules');
        fs.rmSync(nodeModulesLink, { recursive: true, force: true });
        const fakeNodeBin = path.join(tempDir, 'node_modules', '.bin');
        fs.mkdirSync(fakeNodeBin, { recursive: true });
        fs.writeFileSync(
          path.join(fakeNodeBin, 'rhachet'),
          `#!/bin/bash
echo called > "${sentinel}"
exit 1
`,
        );
        fs.chmodSync(path.join(fakeNodeBin, 'rhachet'), '755');

        const result = runPush({ tempDir, pushArgs: ['--help'] });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('usage: git.commit.push');
        expect(result.stdout).toContain('--auth as-ehmpath|as-human');
        // the decisive assertion: --help never invoked keyrack
        expect(fs.existsSync(sentinel)).toBe(false);
        // lock the human-visible --help contract so a reworded or dropped flag
        // cannot ship undetected (rule.require.contract-snapshot-exhaustiveness)
        expect(result.stdout).toMatchSnapshot();
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given(
    '[case32] FETCH_TOKEN_TIMEOUT bounds a stalled keyrack so the guide still fires',
    () => {
      when('[t0] rhachet hangs, but the timeout is lowered to 1s', () => {
        then('the fetch is bounded and the as-human guide fires fast', () => {
          const tempDir = setupTempRepo({
            meterState: { uses: 3, push: 'allow' },
            branch: 'turtle/feature',
            commits: ['feat: bounded keyrack timeout'],
            commitAuthor: {
              name: 'seaturtle[bot]',
              email: 'seaturtle@ehmpath.com',
            },
          });

          // .mock = fake git push success so we reach the token step (un-gated push)
          const fakeBinDir = path.join(tempDir, '.fakebin');
          fs.mkdirSync(fakeBinDir, { recursive: true });
          fs.writeFileSync(
            path.join(fakeBinDir, 'git'),
            `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
          );
          fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

          // shadow node_modules/.bin/rhachet with a binary that HANGS (sleep 10).
          // with FETCH_TOKEN_TIMEOUT=1 each of the up-to-3 keyrack calls is bound
          // to ~1s, so the guide fires in ~3s. without the timeout the run would
          // stall ~30s — the limit below proves the bound holds (so the
          // FETCH_TOKEN_TIMEOUT constant cannot regress silently).
          // .mock = fake rhachet (keyrack communicator boundary) — hangs to prove the fetch timeout bound
          const nodeModulesLink = path.join(tempDir, 'node_modules');
          fs.rmSync(nodeModulesLink, { recursive: true, force: true });
          const fakeNodeBin = path.join(tempDir, 'node_modules', '.bin');
          fs.mkdirSync(fakeNodeBin, { recursive: true });
          fs.writeFileSync(
            path.join(fakeNodeBin, 'rhachet'),
            `#!/bin/bash
sleep 10
exit 0
`,
          );
          fs.chmodSync(path.join(fakeNodeBin, 'rhachet'), '755');

          const start = Date.now();
          const result = runPush({
            tempDir,
            pushArgs: ['--mode', 'apply', '--auth', 'as-ehmpath'],
            env: {
              PATH: `${fakeBinDir}:${process.env.PATH}`,
              FETCH_TOKEN_TIMEOUT: '1',
            },
          });
          const elapsedMs = Date.now() - start;

          // the fetch stalled but was bounded → the same empty-token guide fires
          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('keyrack token not available');
          expect(result.stderr).toContain(
            'rhx git.commit.push --mode apply --auth as-human',
          );
          // bounded well under the ~30s unbounded hang (generous limit for ci)
          expect(elapsedMs).toBeLessThan(20000);
          // lock the guide output under the timeout variant; the stalled fake
          // emits no fetch-error detail, so both streams are deterministic
          expect(result.stdout).toMatchSnapshot();
          expect(result.stderr).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case33] a threaded (prefetched) token is reused — no second keyrack fetch',
    () => {
      when(
        '[t0] SEATURTLE_PR_TOKEN_PREFETCHED=1 with a threaded token value',
        () => {
          then(
            'push.sh opens the pr with the threaded token and never fetches',
            () => {
              const tempDir = setupTempRepo({
                meterState: { uses: 3, push: 'allow' },
                branch: 'turtle/feature',
                commits: ['feat: threaded token reuse'],
                commitAuthor: {
                  name: 'seaturtle[bot]',
                  email: 'seaturtle@ehmpath.com',
                },
              });

              // shadow node_modules/.bin/rhachet with a fake that drops a sentinel
              // whenever it is called. this locks the token-threading contract
              // (set.sh → push.sh via SEATURTLE_PR_TOKEN_*): a composed --push must
              // perform exactly ONE keyrack fetch (in set.sh), so push.sh — given a
              // prefetched token — must NOT fetch again. if a future change dropped
              // the reuse, push.sh would call rhachet and the sentinel would appear,
              // silently reopening the double-fetch/identity-divergence window
              // (rule.require.test-covered-repairs).
              // .mock = fake rhachet (keyrack communicator boundary) — sentinel proves push.sh never re-fetches
              const sentinel = path.join(tempDir, 'rhachet-was-called');
              const nodeModulesLink = path.join(tempDir, 'node_modules');
              fs.rmSync(nodeModulesLink, { recursive: true, force: true });
              const fakeNodeBin = path.join(tempDir, 'node_modules', '.bin');
              fs.mkdirSync(fakeNodeBin, { recursive: true });
              fs.writeFileSync(
                path.join(fakeNodeBin, 'rhachet'),
                `#!/bin/bash
echo called >> "${sentinel}"
exit 1
`,
              );
              fs.chmodSync(path.join(fakeNodeBin, 'rhachet'), '755');

              const fakeBinDir = path.join(tempDir, '.fakebin');
              fs.mkdirSync(fakeBinDir, { recursive: true });

              // .mock = fake git push success so we reach the pr-open step (un-gated push)
              fs.writeFileSync(
                path.join(fakeBinDir, 'git'),
                `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

              // .mock = fake gh — the pr opens. it also proves the THREADED token reached
              // the pr op: under as-ehmpath, run_gh sets GH_TOKEN to the token, so
              // the fake fails loud if GH_TOKEN is not the exact threaded value.
              fs.writeFileSync(
                path.join(fakeBinDir, 'gh'),
                `#!/bin/bash
if [[ "$GH_TOKEN" != "ghp_threadedfake" ]]; then
  echo "expected the threaded token as GH_TOKEN, got: $GH_TOKEN" >&2
  exit 3
fi
if [[ "$1" == "pr" && "$2" == "list" ]]; then
  echo ""
  exit 0
elif [[ "$1" == "pr" && "$2" == "create" ]]; then
  echo "https://github.com/test/repo/pull/42"
  exit 0
fi
exit 1
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

              const result = runPush({
                tempDir,
                pushArgs: ['--mode', 'apply', '--auth', 'as-ehmpath'],
                env: {
                  PATH: `${fakeBinDir}:${process.env.PATH}`,
                  // the token set.sh would have threaded (a pat → standard
                  // seaturtle identity, matching the commit author above)
                  SEATURTLE_PR_TOKEN_PREFETCHED: '1',
                  SEATURTLE_PR_TOKEN_VALUE: 'ghp_threadedfake',
                },
              });

              // the pr opened with the threaded token
              expect(result.exitCode).toBe(0);
              expect(result.stdout).toContain('pr #42 (created)');
              // the decisive lock: push.sh reused the threaded token, so rhachet
              // (the keyrack communicator) was never called for a second fetch
              expect(fs.existsSync(sentinel)).toBe(false);
              // lock the composed-success contract (git.commit.set reads this
              // tree); both streams are deterministic on this path
              expect(result.stdout).toMatchSnapshot();
              expect(result.stderr).toMatchSnapshot();
            },
          );
        },
      );
    },
  );

  given(
    '[case35] identity-sync guard fires when the token identity ≠ the commit author',
    () => {
      when(
        '[t0] HEAD is a standard seaturtle commit, but the token is an app-bot (ghs_)',
        () => {
          then(
            'the pr-open is refused before any gh call (no 3rd contributor)',
            () => {
              const tempDir = setupTempRepo({
                meterState: { uses: 3, push: 'allow' },
                branch: 'turtle/feature',
                // the commit is authored by the STANDARD seaturtle identity
                commits: ['feat: identity mismatch guard'],
                commitAuthor: {
                  name: 'seaturtle[bot]',
                  email: 'seaturtle@ehmpath.com',
                },
              });

              const fakeBinDir = path.join(tempDir, '.fakebin');
              fs.mkdirSync(fakeBinDir, { recursive: true });

              // .mock = fake git push success so we reach the identity-sync guard
              fs.writeFileSync(
                path.join(fakeBinDir, 'git'),
                `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

              // .mock = fake gh — must NEVER be called: the guard exits before any pr op.
              // if it fires, the test fails loud on the unexpected pr output.
              fs.writeFileSync(
                path.join(fakeBinDir, 'gh'),
                `#!/bin/bash
echo "gh should not be called once identities diverge" >&2
exit 99
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

              // pass an APP-BOT token (ghs_ → ehm-a-seaturtle[bot]) that diverges
              // from the standard-seaturtle commit author above. a prefetched token
              // keeps the test hermetic (no real keyrack fetch) yet still exercises
              // the guard, which runs on both the prefetched and standalone paths.
              const result = runPush({
                tempDir,
                pushArgs: ['--mode', 'apply', '--auth', 'as-ehmpath'],
                env: {
                  PATH: `${fakeBinDir}:${process.env.PATH}`,
                  SEATURTLE_PR_TOKEN_PREFETCHED: '1',
                  SEATURTLE_PR_TOKEN_VALUE: 'ghs_appbotfake',
                },
              });

              // the guard refused the pr-open as a caller-must-fix constraint
              expect(result.exitCode).toBe(2);
              expect(result.stdout).toContain(
                'pr-open identity out of sync with the commit author',
              );
              expect(result.stdout).toContain('3rd contributor on squash');
              // it names the as-human fix (the safe way to open the pr)
              expect(result.stdout).toContain(
                'rhx git.commit.push --mode apply --auth as-human',
              );
              // gh was never reached (no unexpected pr op leaked through)
              expect(result.stdout).not.toContain('gh should not be called');
              // lock both streams (rule.require.contract-snapshot-exhaustiveness)
              expect(result.stdout).toMatchSnapshot();
              expect(result.stderr).toMatchSnapshot();
            },
          );
        },
      );
    },
  );

  given(
    '[case36] a non-auth pr-open failure in json mode duplicates the error to stderr',
    () => {
      when(
        '[t0] pr create fails for a non-auth reason under --output json',
        () => {
          then(
            'stdout carries the json error AND stderr carries the same line',
            () => {
              // the json-mode counterpart of case27: on a failed pr-open, the json
              // error object must ride BOTH streams so a stderr-only consumer (ci
              // log scan, hook) still sees the failure (rule.require.skill-output-streams).
              // as-human keeps this off the keyrack fetch so the pr-create path is
              // reached directly.
              const tempDir = setupTempRepo({
                meterState: { uses: 3, push: 'allow' },
                branch: 'turtle/feature',
                commits: ['feat: json non-auth failure'],
                commitAuthor: {
                  name: 'seaturtle[bot]',
                  email: 'seaturtle@ehmpath.com',
                },
              });

              const fakeBinDir = path.join(tempDir, '.fakebin');
              fs.mkdirSync(fakeBinDir, { recursive: true });

              // .mock = fake gh: login is fine (pr list works), but pr create fails for a
              // clearly non-auth reason (branch protection)
              fs.writeFileSync(
                path.join(fakeBinDir, 'gh'),
                `#!/bin/bash
if [[ "$1" == "pr" && "$2" == "list" ]]; then
  echo ""
  exit 0
elif [[ "$1" == "pr" && "$2" == "create" ]]; then
  echo "GraphQL: Changes must be made through a pull request; required status checks are expected (createPullRequest)" >&2
  exit 1
fi
exit 1
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

              // .mock = fake git push success so we reach the pr-open step (un-gated push)
              fs.writeFileSync(
                path.join(fakeBinDir, 'git'),
                `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

              const result = runPush({
                tempDir,
                pushArgs: [
                  '--mode',
                  'apply',
                  '--auth',
                  'as-human',
                  '--output',
                  'json',
                ],
                env: {
                  PATH: `${fakeBinDir}:${process.env.PATH}`,
                },
              });

              // a failed pr-open is a caller-must-fix constraint (exit 2)
              expect(result.exitCode).toBe(2);
              // stdout carries the machine-readable error object
              expect(result.stdout).toContain('"pr":"error"');
              expect(result.stdout).toContain('pr creation failed');
              // the decisive lock: the SAME json line is duplicated to stderr so a
              // stderr-only consumer sees the failure, not just the exit code
              expect(result.stderr).toContain('"pr":"error"');
              expect(result.stderr).toContain('pr creation failed');
              // lock both streams (rule.require.contract-snapshot-exhaustiveness)
              expect(result.stdout).toMatchSnapshot();
              expect(result.stderr).toMatchSnapshot();
            },
          );
        },
      );
    },
  );

  given(
    '[case37] a standalone as-ehmpath fetch runs the strong graphql identity assert',
    () => {
      when(
        '[t0] the freshly-fetched ghs_ token maps to a DIFFERENT app bot id',
        () => {
          then(
            'the graphql-verified assert fails loud (exit 2), gh never opens a pr',
            () => {
              // r11#1: the identity-sync guarantee is recomposed onto push.sh's
              // STANDALONE fetch, not only set.sh. the local name check (:432)
              // can't catch a ghs_ token rotated to a different app installation
              // (same prefix, different bot id) — assert_token_identity_in_sync
              // verifies the live bot id via graphql. this proves the assert is
              // wired into the standalone fetch path (rule.require.test-covered-repairs).
              const tempDir = setupTempRepo({
                meterState: { uses: 3, push: 'allow' },
                branch: 'turtle/feature',
                commits: ['feat: standalone fetch identity assert'],
                commitAuthor: {
                  name: 'ehm-a-seaturtle[bot]',
                  email:
                    '295111357+ehm-a-seaturtle[bot]@users.noreply.github.com',
                },
              });

              // shadow node_modules/.bin/rhachet: a healthy keyrack that hands
              // back a ghs_ (app) token as json — so push.sh takes the STANDALONE
              // fetch path (no threaded token) and then must verify it
              // .mock = fake rhachet (keyrack communicator boundary) — hands back a ghs_ app token as json
              const nodeModulesLink = path.join(tempDir, 'node_modules');
              fs.rmSync(nodeModulesLink, { recursive: true, force: true });
              const fakeNodeBin = path.join(tempDir, 'node_modules', '.bin');
              fs.mkdirSync(fakeNodeBin, { recursive: true });
              fs.writeFileSync(
                path.join(fakeNodeBin, 'rhachet'),
                `#!/bin/bash
echo '{"grant":{"key":{"secret":"ghs_appbotfake"}}}'
exit 0
`,
              );
              fs.chmodSync(path.join(fakeNodeBin, 'rhachet'), '755');

              const fakeBinDir = path.join(tempDir, '.fakebin');
              fs.mkdirSync(fakeBinDir, { recursive: true });

              // .mock = fake git push success so we reach the fetch + assert step
              fs.writeFileSync(
                path.join(fakeBinDir, 'git'),
                `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

              // .mock = fake gh: the graphql whoami returns a MISMATCHED bot id, so the
              // assert must fail loud. if any pr op is reached, the assert wrongly
              // passed — fail the test loudly.
              fs.writeFileSync(
                path.join(fakeBinDir, 'gh'),
                `#!/bin/bash
if [[ "$1" == "api" && "$2" == "graphql" ]]; then
  echo '{"data":{"viewer":{"login":"impostor[bot]","databaseId":999999}}}'
  exit 0
fi
if [[ "$1" == "pr" ]]; then
  echo "gh pr should not be reached — the identity assert should have exited" >&2
  exit 99
fi
exit 1
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

              const result = runPush({
                tempDir,
                pushArgs: ['--mode', 'apply', '--auth', 'as-ehmpath'],
                env: {
                  PATH: `${fakeBinDir}:${process.env.PATH}`,
                },
              });

              // the strong assert refused the token as a caller-must-fix constraint
              expect(result.exitCode).toBe(2);
              // the assert's loud reason reaches BOTH streams (a malfunction rides
              // stdout + stderr, not a silent-stdout dead end — skill-output-streams)
              expect(result.stderr).toContain('out of sync');
              expect(result.stderr).toContain('3rd contributor');
              expect(result.stdout).toContain('out of sync');
              expect(result.stdout).toContain('3rd contributor');
              // no pr op leaked past the assert
              expect(result.stdout).not.toContain('should not be reached');
              expect(result.stderr).not.toContain('should not be reached');
              // lock both streams (rule.require.contract-snapshot-exhaustiveness)
              expect(result.stdout).toMatchSnapshot();
              expect(result.stderr).toMatchSnapshot();
            },
          );
        },
      );
    },
  );

  given(
    '[case40] the git push transport itself fails (non-fast-forward)',
    () => {
      when('[t0] apply mode, the un-gated push exits non-zero', () => {
        then(
          'the "git push failed" error rides BOTH streams with the raw cause, exit 1',
          () => {
            const tempDir = setupTempRepo({
              meterState: { uses: 3, push: 'allow' },
              branch: 'turtle/feature',
              commits: ['feat: push-fail test'],
              commitAuthor: {
                name: 'seaturtle[bot]',
                email: 'seaturtle@ehmpath.com',
              },
            });

            // .mock = fake git whose `push` fails like a real non-fast-forward
            // rejection; every other git subcommand execs the REAL binary so the
            // author/branch guards run for real. this drives push.sh's transport-
            // failure branch (push.sh:368), which a hermetic repo cannot otherwise
            // reach (no real remote to reject the push).
            const fakeBinDir = path.join(tempDir, '.fakebin');
            fs.mkdirSync(fakeBinDir, { recursive: true });
            fs.writeFileSync(
              path.join(fakeBinDir, 'git'),
              `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git" >&2
  echo " ! [rejected]        HEAD -> turtle/feature (non-fast-forward)" >&2
  echo "error: failed to push some refs to 'github.com:test/repo.git'" >&2
  exit 1
fi
exec /usr/bin/git "$@"
`,
            );
            fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

            const result = runPush({
              tempDir,
              // as-human keeps the pr-open off keyrack; the push fails first
              // (un-gated), so the pr-open is never reached
              pushArgs: ['--mode', 'apply', '--auth', 'as-human'],
              env: {
                PATH: `${fakeBinDir}:${process.env.PATH}`,
              },
            });

            // a transport failure is a malfunction (exit 1) — the commit is safe
            // locally, but the push could not complete
            expect(result.exitCode).toBe(1);
            // the headline rides BOTH streams (never stdout-silent) per
            // rule.require.skill-output-streams
            expect(result.stdout).toContain('git push failed');
            expect(result.stderr).toContain('git push failed');
            // the raw git cause follows on both streams so the human sees WHY
            expect(result.stdout).toContain('non-fast-forward');
            expect(result.stderr).toContain('non-fast-forward');
            // no pr-open ran — the push aborted before it
            expect(result.stdout).not.toContain('opened:');
            expect(result.stderr).not.toContain('opened:');
            // lock both streams (rule.require.contract-snapshot-exhaustiveness)
            expect(result.stdout).toMatchSnapshot();
            expect(result.stderr).toMatchSnapshot();
          },
        );
      });
    },
  );
});
