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

  /**
   * .what = helper to set up a temp git repo with optional meter, branch, and commit
   * .why = reduces boilerplate across test cases
   */
  const setupTempRepo = (args: {
    meterState?: { uses: number; push: string };
    branch?: string;
    commits?: string[];
    commitAuthor?: { name: string; email: string };
  }): string => {
    const tempDir = genTempDir({ slug: 'git-commit-push-test', git: true });

    // configure git user
    spawnSync('git', ['config', 'user.name', 'Test Human'], {
      cwd: tempDir,
    });
    spawnSync('git', ['config', 'user.email', 'human@test.com'], {
      cwd: tempDir,
    });

    // setup .meter with gitignore
    if (args.meterState) {
      const meterDir = path.join(tempDir, '.meter');
      fs.mkdirSync(meterDir, { recursive: true });
      fs.writeFileSync(
        path.join(meterDir, 'git.commit.uses.jsonc'),
        JSON.stringify(args.meterState, null, 2),
      );
      fs.writeFileSync(path.join(tempDir, '.gitignore'), '.meter/\n');
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
   */
  const runPush = (args: {
    tempDir: string;
    pushArgs: string[];
    env?: Record<string, string>;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const result = spawnSync('bash', [pushScriptPath, ...args.pushArgs], {
      cwd: args.tempDir,
      encoding: 'utf-8' as BufferEncoding,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
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

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan'],
          env: { EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('heres the wave');
        expect(result.stdout).toContain('push: origin/turtle/feature');
        expect(result.stdout).toContain('title: feat: first commit');
        expect(result.stdout).toContain('findsert draft');
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

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan'],
          env: { EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token' },
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

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan', '--output', 'json'],
          env: { EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token' },
        });

        expect(result.exitCode).toBe(0);
        const parsed = JSON.parse(result.stdout.trim());
        expect(parsed.status).toBe('planned');
        expect(parsed.push_target).toBe('origin/turtle/feature');
        expect(parsed.pr_title).toBe('feat: json plan test');
        expect(parsed.pr_action).toBe('findsert draft');
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

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan'],
          env: { EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token' },
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
            env: { EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token' },
          });

          expect(result.exitCode).toBe(0);
          const parsed = JSON.parse(result.stdout.trim());
          expect(parsed.pr_title).toBe('feat: fallback title');
        });
      },
    );
  });

  given('[case12] token guard', () => {
    when('[t0] EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN is not set', () => {
      then('exits with error about token', () => {
        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: no token'],
        });

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan'],
          env: { EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: '' },
        });

        expect(result.exitCode).toBe(2); // blocked by constraints
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain(
          'EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN not set',
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] token not set with json output', () => {
      then('outputs json error', () => {
        const tempDir = setupTempRepo({
          meterState: { uses: 3, push: 'allow' },
          branch: 'turtle/feature',
          commits: ['feat: no token json'],
        });

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan', '--output', 'json'],
          env: { EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: '' },
        });

        expect(result.exitCode).toBe(2); // blocked by constraints
        const parsed = JSON.parse(result.stdout.trim());
        expect(parsed.status).toBe('error');
        expect(parsed.error).toContain('EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN');
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

        const result = runPush({
          tempDir,
          pushArgs: ['--mode', 'plan'],
          env: { EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('push: allowed → blocked (revoked)');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });
});
