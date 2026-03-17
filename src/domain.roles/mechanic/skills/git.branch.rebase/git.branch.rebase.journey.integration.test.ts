import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = acceptance test for the full git.branch.rebase journey
 * .why = demonstrates what a real caller sees at each step of a rebase workflow
 *
 * .note = stress tests with multi-commit rebases, multiple conflicts, and real git operations
 */

const SKILL_DIR = __dirname;

/**
 * .what = setup a git repo with real origin for rebase journey
 * .why = journey test needs real remote to show full rebase flow
 */
const setupJourneyRepo = (): { workDir: string; bareDir: string } => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-rebase-journey-'));
  const bareDir = path.join(baseDir, 'origin.git');
  const workDir = path.join(baseDir, 'work');

  // create bare repo (simulates origin)
  fs.mkdirSync(bareDir);
  spawnSync('git', ['init', '--bare'], { cwd: bareDir });

  // clone to work directory
  spawnSync('git', ['clone', bareDir, workDir]);
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: workDir });
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: workDir });

  // create initial commit on main
  fs.writeFileSync(path.join(workDir, 'README.md'), '# Test Repo\n');
  spawnSync('git', ['add', 'README.md'], { cwd: workDir });
  spawnSync('git', ['commit', '-m', 'init: initial commit'], { cwd: workDir });
  spawnSync('git', ['branch', '-M', 'main'], { cwd: workDir });
  spawnSync('git', ['push', '-u', 'origin', 'main'], { cwd: workDir });

  return { workDir, bareDir };
};

/**
 * .what = grant push permission for rebase
 * .why = rebase requires push permission in meter state
 */
const grantPushPermission = (workDir: string): void => {
  const meterDir = path.join(workDir, '.meter');
  fs.mkdirSync(meterDir, { recursive: true });
  fs.writeFileSync(
    path.join(meterDir, 'git.commit.uses.jsonc'),
    JSON.stringify({ uses: 5, push: 'allow' }, null, 2),
  );
};

/**
 * .what = sanitize output for stable snapshots
 * .why = temp paths and commit hashes change on each run
 */
const sanitizeOutput = (output: string): string => {
  return (
    output
      // replace temp paths like /tmp/git-rebase-journey-abc123/
      .replace(/\/tmp\/git-rebase-journey-[^/]+\//g, '/tmp/TEST_REPO/')
      // replace commit hashes (7 char) with stable placeholder
      .replace(/\b[0-9a-f]{7}\b/g, 'HASH123')
      // strip control chars from git output
      .replace(/\[K/g, '')
  );
};

/**
 * .what = run git.branch.rebase via dispatcher
 * .why = tests should exercise the real entry point
 */
const runRebase = (
  workDir: string,
  args: string[] = [],
): { stdout: string; stderr: string; status: number | null } => {
  const dispatcherPath = path.join(SKILL_DIR, 'git.branch.rebase.sh');
  const result = spawnSync('bash', [dispatcherPath, ...args], {
    cwd: workDir,
    encoding: 'utf-8' as BufferEncoding,
    env: {
      ...process.env,
      PATH: process.env.PATH,
      GIT_AUTHOR_NAME: 'Test User',
      GIT_AUTHOR_EMAIL: 'test@test.com',
      GIT_COMMITTER_NAME: 'seaturtle[bot]',
      GIT_COMMITTER_EMAIL: 'seaturtle@ehmpathy.com',
    },
  });

  return {
    stdout: sanitizeOutput(result.stdout || ''),
    stderr: result.stderr || '',
    status: result.status,
  };
};

describe('git.branch.rebase journey', () => {
  given('[journey1] clean rebase: 4 commits onto 3 main commits', () => {
    let workDir: string;
    let baseDir: string;

    beforeAll(() => {
      const setup = setupJourneyRepo();
      workDir = setup.workDir;
      baseDir = path.dirname(workDir);

      // simulate main moved forward with 3 commits (push from "other developers")
      spawnSync('git', ['checkout', 'main'], { cwd: workDir });

      fs.writeFileSync(path.join(workDir, 'main-1.txt'), 'main commit 1\n');
      spawnSync('git', ['add', 'main-1.txt'], { cwd: workDir });
      spawnSync('git', ['commit', '-m', 'chore: main commit 1'], {
        cwd: workDir,
      });

      fs.writeFileSync(path.join(workDir, 'main-2.txt'), 'main commit 2\n');
      spawnSync('git', ['add', 'main-2.txt'], { cwd: workDir });
      spawnSync('git', ['commit', '-m', 'chore: main commit 2'], {
        cwd: workDir,
      });

      fs.writeFileSync(path.join(workDir, 'main-3.txt'), 'main commit 3\n');
      spawnSync('git', ['add', 'main-3.txt'], { cwd: workDir });
      spawnSync('git', ['commit', '-m', 'chore: main commit 3'], {
        cwd: workDir,
      });

      spawnSync('git', ['push', 'origin', 'main'], { cwd: workDir });

      // reset local main back so feature branch diverges
      spawnSync('git', ['reset', '--hard', 'HEAD~3'], { cwd: workDir });

      // create feature branch with 4 commits
      spawnSync('git', ['checkout', '-b', 'feature/big-feature'], {
        cwd: workDir,
      });

      fs.writeFileSync(path.join(workDir, 'feature-1.txt'), 'feature 1\n');
      spawnSync('git', ['add', 'feature-1.txt'], { cwd: workDir });
      spawnSync('git', ['commit', '-m', 'fix(api): feature commit 1'], {
        cwd: workDir,
      });

      fs.writeFileSync(path.join(workDir, 'feature-2.txt'), 'feature 2\n');
      spawnSync('git', ['add', 'feature-2.txt'], { cwd: workDir });
      spawnSync('git', ['commit', '-m', 'fix(api): feature commit 2'], {
        cwd: workDir,
      });

      fs.writeFileSync(path.join(workDir, 'feature-3.txt'), 'feature 3\n');
      spawnSync('git', ['add', 'feature-3.txt'], { cwd: workDir });
      spawnSync('git', ['commit', '-m', 'fix(api): feature commit 3'], {
        cwd: workDir,
      });

      fs.writeFileSync(path.join(workDir, 'feature-4.txt'), 'feature 4\n');
      spawnSync('git', ['add', 'feature-4.txt'], { cwd: workDir });
      spawnSync('git', ['commit', '-m', 'fix(api): feature commit 4'], {
        cwd: workDir,
      });

      grantPushPermission(workDir);
    });

    afterAll(() => {
      fs.rmSync(baseDir, { recursive: true, force: true });
    });

    when('[t0] before rebase - check divergence', () => {
      then('shows 4 commits ahead, 3 behind', () => {
        const ahead = spawnSync(
          'git',
          ['rev-list', '--count', 'origin/main..HEAD'],
          { cwd: workDir, encoding: 'utf-8' as BufferEncoding },
        );
        const behind = spawnSync(
          'git',
          ['rev-list', '--count', 'HEAD..origin/main'],
          { cwd: workDir, encoding: 'utf-8' as BufferEncoding },
        );
        expect(ahead.stdout.trim()).toBe('4');
        expect(behind.stdout.trim()).toBe('3');
      });
    });

    when('[t1] git.branch.rebase begin (plan mode)', () => {
      then('shows preview: 4 commits to rebase, 3 behind', () => {
        const result = runRebase(workDir, ['begin']);

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('git.branch.rebase begin');
        expect(result.stdout).toContain('commits');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] git.branch.rebase begin --mode apply', () => {
      then('rebase completes: all 4 commits rebased', () => {
        const result = runRebase(workDir, ['begin', '--mode', 'apply']);

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('righteous');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t3] after rebase - verify linear history', () => {
      then('all 7 commits in linear order', () => {
        const result = spawnSync('git', ['log', '--oneline', '-8'], {
          cwd: workDir,
          encoding: 'utf-8' as BufferEncoding,
        });
        // 4 feature + 3 main + 1 init = 8 commits
        expect(result.stdout).toContain('fix(api): feature commit 4');
        expect(result.stdout).toContain('fix(api): feature commit 1');
        expect(result.stdout).toContain('chore: main commit 3');
        expect(result.stdout).toContain('chore: main commit 1');
        expect(result.stdout.trim().split('\n').length).toBe(8);
      });
    });
  });

  given(
    '[journey2] multi-conflict rebase: 3 commits with 2 conflict files',
    () => {
      let workDir: string;
      let baseDir: string;

      beforeAll(() => {
        const setup = setupJourneyRepo();
        workDir = setup.workDir;
        baseDir = path.dirname(workDir);

        // create two files that will have conflicts
        spawnSync('git', ['checkout', 'main'], { cwd: workDir });

        // first conflict file on main
        fs.writeFileSync(
          path.join(workDir, 'config.json'),
          '{"env": "main"}\n',
        );
        spawnSync('git', ['add', 'config.json'], { cwd: workDir });
        spawnSync('git', ['commit', '-m', 'chore: add config.json on main'], {
          cwd: workDir,
        });

        // second conflict file on main
        fs.writeFileSync(
          path.join(workDir, 'settings.yml'),
          'mode: production\n',
        );
        spawnSync('git', ['add', 'settings.yml'], { cwd: workDir });
        spawnSync('git', ['commit', '-m', 'chore: add settings.yml on main'], {
          cwd: workDir,
        });

        spawnSync('git', ['push', 'origin', 'main'], { cwd: workDir });

        // reset back before both files
        spawnSync('git', ['reset', '--hard', 'HEAD~2'], { cwd: workDir });

        // create feature branch with versions that conflict
        spawnSync('git', ['checkout', '-b', 'feature/conflict-heavy'], {
          cwd: workDir,
        });

        // commit 1: config.json with different content
        fs.writeFileSync(
          path.join(workDir, 'config.json'),
          '{"env": "feature", "debug": true}\n',
        );
        spawnSync('git', ['add', 'config.json'], { cwd: workDir });
        spawnSync('git', ['commit', '-m', 'fix(config): feature config'], {
          cwd: workDir,
        });

        // commit 2: settings.yml with different content
        fs.writeFileSync(
          path.join(workDir, 'settings.yml'),
          'mode: development\nverbose: true\n',
        );
        spawnSync('git', ['add', 'settings.yml'], { cwd: workDir });
        spawnSync('git', ['commit', '-m', 'fix(settings): feature settings'], {
          cwd: workDir,
        });

        // commit 3: unrelated file (no conflict)
        fs.writeFileSync(
          path.join(workDir, 'feature-only.txt'),
          'no conflict here\n',
        );
        spawnSync('git', ['add', 'feature-only.txt'], { cwd: workDir });
        spawnSync('git', ['commit', '-m', 'fix(api): add feature-only file'], {
          cwd: workDir,
        });

        grantPushPermission(workDir);
      });

      afterAll(() => {
        fs.rmSync(baseDir, { recursive: true, force: true });
      });

      when('[t0] git.branch.rebase begin (plan mode)', () => {
        then('shows preview: 3 commits, 2 behind', () => {
          const result = runRebase(workDir, ['begin']);

          expect(result.status).toBe(0);
          expect(result.stdout).toContain('git.branch.rebase begin');
          expect(result.stdout).toMatchSnapshot();
        });
      });

      when('[t1] git.branch.rebase begin --mode apply', () => {
        then('shows conflict on first commit (config.json)', () => {
          const result = runRebase(workDir, ['begin', '--mode', 'apply']);

          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain('hold up dude');
          expect(result.stdout).toContain('conflict');
          expect(result.stdout).toContain('config.json');
          expect(result.stdout).toMatchSnapshot();
        });
      });

      when('[t2] settle first conflict (config.json) and continue', () => {
        then('shows second conflict (settings.yml)', () => {
          // settle config.json
          fs.writeFileSync(
            path.join(workDir, 'config.json'),
            '{"env": "merged", "debug": true}\n',
          );
          spawnSync('git', ['add', 'config.json'], { cwd: workDir });

          // continue rebase
          const result = runRebase(workDir, ['continue']);

          // should hit second conflict
          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain('hold up dude');
          expect(result.stdout).toContain('settings.yml');
          expect(result.stdout).toMatchSnapshot();
        });
      });

      when('[t3] settle second conflict (settings.yml) and continue', () => {
        then('rebase completes (third commit had no conflict)', () => {
          // settle settings.yml
          fs.writeFileSync(
            path.join(workDir, 'settings.yml'),
            'mode: merged\nverbose: true\n',
          );
          spawnSync('git', ['add', 'settings.yml'], { cwd: workDir });

          // continue rebase - should complete
          const result = runRebase(workDir, ['continue']);

          expect(result.status).toBe(0);
          expect(result.stdout).toContain('righteous');
          expect(result.stdout).toMatchSnapshot();
        });
      });

      when('[t4] after rebase - verify all 3 feature commits present', () => {
        then('linear history with all commits', () => {
          const result = spawnSync('git', ['log', '--oneline', '-6'], {
            cwd: workDir,
            encoding: 'utf-8' as BufferEncoding,
          });
          expect(result.stdout).toContain('fix(api): add feature-only file');
          expect(result.stdout).toContain('fix(settings): feature settings');
          expect(result.stdout).toContain('fix(config): feature config');
          expect(result.stdout).toContain('chore: add settings.yml on main');
          expect(result.stdout).toContain('chore: add config.json on main');
        });
      });
    },
  );

  given('[journey3] abort mid-conflict after multiple attempts', () => {
    let workDir: string;
    let baseDir: string;

    beforeAll(() => {
      const setup = setupJourneyRepo();
      workDir = setup.workDir;
      baseDir = path.dirname(workDir);

      // complex conflict scenario
      spawnSync('git', ['checkout', 'main'], { cwd: workDir });

      fs.writeFileSync(path.join(workDir, 'abort-me.txt'), 'main version\n');
      spawnSync('git', ['add', 'abort-me.txt'], { cwd: workDir });
      spawnSync('git', ['commit', '-m', 'chore: main abort-me'], {
        cwd: workDir,
      });
      spawnSync('git', ['push', 'origin', 'main'], { cwd: workDir });

      spawnSync('git', ['reset', '--hard', 'HEAD~1'], { cwd: workDir });

      spawnSync('git', ['checkout', '-b', 'feature/will-abort'], {
        cwd: workDir,
      });
      fs.writeFileSync(path.join(workDir, 'abort-me.txt'), 'feature version\n');
      spawnSync('git', ['add', 'abort-me.txt'], { cwd: workDir });
      spawnSync('git', ['commit', '-m', 'fix(api): feature abort-me'], {
        cwd: workDir,
      });

      // add more commits to make it complex
      fs.writeFileSync(path.join(workDir, 'extra-1.txt'), 'extra 1\n');
      spawnSync('git', ['add', 'extra-1.txt'], { cwd: workDir });
      spawnSync('git', ['commit', '-m', 'fix(api): extra commit 1'], {
        cwd: workDir,
      });

      fs.writeFileSync(path.join(workDir, 'extra-2.txt'), 'extra 2\n');
      spawnSync('git', ['add', 'extra-2.txt'], { cwd: workDir });
      spawnSync('git', ['commit', '-m', 'fix(api): extra commit 2'], {
        cwd: workDir,
      });

      grantPushPermission(workDir);
    });

    afterAll(() => {
      fs.rmSync(baseDir, { recursive: true, force: true });
    });

    when('[t0] git.branch.rebase begin --mode apply', () => {
      then('shows conflict on first commit', () => {
        const result = runRebase(workDir, ['begin', '--mode', 'apply']);

        expect(result.status).not.toBe(0);
        expect(result.stdout).toContain('hold up dude');
        expect(result.stdout).toContain('conflict');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] git.branch.rebase abort', () => {
      then('restores all 3 original commits', () => {
        const result = runRebase(workDir, ['abort']);

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('no worries dude');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] after abort - verify original state', () => {
      then('all 3 feature commits intact', () => {
        const result = spawnSync('git', ['log', '--oneline', '-4'], {
          cwd: workDir,
          encoding: 'utf-8' as BufferEncoding,
        });
        expect(result.stdout).toContain('fix(api): extra commit 2');
        expect(result.stdout).toContain('fix(api): extra commit 1');
        expect(result.stdout).toContain('fix(api): feature abort-me');
        expect(result.stdout).toContain('init: initial commit');

        // verify abort-me.txt has original feature content
        const content = fs.readFileSync(
          path.join(workDir, 'abort-me.txt'),
          'utf-8',
        );
        expect(content).toBe('feature version\n');
      });
    });
  });
});
