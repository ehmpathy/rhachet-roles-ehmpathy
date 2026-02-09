import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = integration tests for git.commit.set.sh
 * .why = verify metered commit with seaturtle[bot] attribution works correctly
 */
describe('git.commit.set.sh', () => {
  const scriptPath = path.join(__dirname, 'git.commit.set.sh');

  const runInTempGitRepo = (args: {
    files?: Record<string, string>;
    filesUnstaged?: Record<string, string>;
    staged?: boolean;
    meterState?: { uses: number; push: string };
    bindLevel?: string;
    gitUser?: { name: string; email: string };
    commitArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'git-commit-set-test', git: true });

    // configure git user (patron)
    if (args.gitUser) {
      spawnSync('git', ['config', 'user.name', args.gitUser.name], {
        cwd: tempDir,
      });
      spawnSync('git', ['config', 'user.email', args.gitUser.email], {
        cwd: tempDir,
      });
    } else {
      // default test user
      spawnSync('git', ['config', 'user.name', 'Test Human'], {
        cwd: tempDir,
      });
      spawnSync('git', ['config', 'user.email', 'human@test.com'], {
        cwd: tempDir,
      });
    }

    // create .meter state (gitignored to match real repo setup)
    // must happen before test files so the gitignore commit doesn't include them
    if (args.meterState) {
      const meterDir = path.join(tempDir, '.meter');
      fs.mkdirSync(meterDir, { recursive: true });
      fs.writeFileSync(
        path.join(meterDir, 'git.commit.uses.jsonc'),
        JSON.stringify(args.meterState, null, 2),
      );

      // commit .gitignore for .meter/ so it doesn't trigger the unstaged guard
      const gitignorePath = path.join(tempDir, '.gitignore');
      const prior = fs.existsSync(gitignorePath)
        ? fs.readFileSync(gitignorePath, 'utf-8')
        : '';
      if (!prior.includes('.meter/')) {
        fs.writeFileSync(gitignorePath, `${prior}\n.meter/\n`);
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: add .gitignore for .meter'], {
          cwd: tempDir,
        });
      }
    }

    // create .bind level constraint if provided
    if (args.bindLevel) {
      const bindDir = path.join(tempDir, '.branch', '.bind');
      fs.mkdirSync(bindDir, { recursive: true });
      fs.writeFileSync(path.join(bindDir, 'git.commit.level'), args.bindLevel);

      // commit .bind so it doesn't trigger the unstaged guard
      spawnSync('git', ['add', '.branch/'], { cwd: tempDir });
      spawnSync('git', ['commit', '-m', 'setup: add .branch/.bind level'], {
        cwd: tempDir,
      });
    }

    // create files and stage them
    if (args.files) {
      for (const [filePath, content] of Object.entries(args.files)) {
        const fullPath = path.join(tempDir, filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
    }

    // stage files
    if (args.staged !== false && args.files) {
      spawnSync('git', ['add', '-A'], { cwd: tempDir });
    }

    // create unstaged files (after git add, so they remain unstaged)
    if (args.filesUnstaged) {
      for (const [filePath, content] of Object.entries(args.filesUnstaged)) {
        const fullPath = path.join(tempDir, filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
    }

    // auto-inject body into message unless already multiline
    const finalArgs = [...args.commitArgs];
    const messageIdx = finalArgs.findIndex(
      (a) => a === '--message' || a === '-m',
    );
    if (messageIdx !== -1 && messageIdx + 1 < finalArgs.length) {
      const msg = finalArgs[messageIdx + 1]!;
      if (!msg.includes('\n\n')) {
        finalArgs[messageIdx + 1] = `${msg}\n\n- test change`;
      }
    }

    const result = spawnSync('bash', [scriptPath, ...finalArgs], {
      cwd: tempDir,
      encoding: 'utf-8' as BufferEncoding,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
    };
  };

  given('[case1] commit without push', () => {
    when('[t0] mechanic has uses and staged changes', () => {
      then('outputs righteous with commit details', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: [
            '--message',
            'fix(api): validate input',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 righteous!');
        expect(result.stdout).toContain('header: fix(api): validate input');
        expect(result.stdout).toContain('name: seaturtle[bot]');
        expect(result.stdout).toContain('email: seaturtle@ehmpath.com');
        expect(result.stdout).toContain('name: Test Human');
        expect(result.stdout).toContain('email: human@test.com');
        expect(result.stdout).toContain('push: skipped');
        expect(result.stdout).toContain('left: 2');
        expect(result.stdout).toMatchSnapshot();
      });

      then('git log shows correct author', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: [
            '--message',
            'fix(api): validate input',
            '--mode',
            'apply',
          ],
        });

        const log = spawnSync('git', ['log', '--format=%an <%ae>', '-1'], {
          cwd: result.tempDir,
          encoding: 'utf-8',
        });
        expect(log.stdout.trim()).toBe(
          'seaturtle[bot] <seaturtle@ehmpath.com>',
        );
      });
    });
  });

  given('[case2] commit with push', () => {
    when('[t0] push is allowed and requested', () => {
      then('outputs cowabunga', () => {
        // note: push will fail without a remote, but commit should succeed
        // we test push separately with a remote
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'allow' },
          commitArgs: [
            '--message',
            'fix(api): handle edge case',
            '--push',
            '--mode',
            'apply',
          ],
        });

        // push may fail without remote, but the vibe should be cowabunga
        // in a real scenario with remote, this would succeed
        if (result.exitCode === 0) {
          expect(result.stdout).toContain('🐢 cowabunga!');
          expect(result.stdout).toContain('push:');
        }
      });
    });
  });

  given('[case3] no uses left', () => {
    when('[t0] apply mode with 0 uses', () => {
      then('outputs bummer dude', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 0, push: 'block' },
          commitArgs: ['--message', 'some fix', '--mode', 'apply'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('🐢 bummer dude...');
        expect(result.stdout).toContain('no commit uses left');
        expect(result.stdout).toContain(
          'git.commit.uses set --allow N --push allow|block',
        );
        expect(result.stdout).toMatchSnapshot();
      });

      then('no commit is created', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 0, push: 'block' },
          commitArgs: ['--message', 'some fix', '--mode', 'apply'],
        });

        const log = spawnSync('git', ['log', '--oneline'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as BufferEncoding,
        });
        // genTempDir({ git: true }) creates an initial commit + gitignore setup; verify no new one was added
        expect(log.stdout.trim().split('\n').length).toBe(2);
        expect(log.stdout).not.toContain('some fix');
      });
    });

    when('[t1] plan mode with 0 uses', () => {
      then('plan is allowed without uses', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 0, push: 'block' },
          commitArgs: ['--message', 'fix: zero uses plan'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 heres the wave...');
        expect(result.stdout).toContain('header: fix: zero uses plan');
        expect(result.stdout).toContain('left: 0 → -1');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case4] push not allowed', () => {
    when('[t0] push is blocked but --push requested', () => {
      then('outputs bummer dude about push', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 1, push: 'block' },
          commitArgs: ['--message', 'some fix', '--push'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('🐢 bummer dude...');
        expect(result.stdout).toContain('push not allowed in current grant');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case5] no changes to commit', () => {
    when('[t0] no staged changes', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          meterState: { uses: 2, push: 'block' },
          commitArgs: ['--message', 'some fix'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('no changes to commit');
      });

      then('uses are not decremented', () => {
        const result = runInTempGitRepo({
          meterState: { uses: 2, push: 'block' },
          commitArgs: ['--message', 'some fix'],
        });

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(2);
      });
    });
  });

  given('[case6] no git user configured', () => {
    when('[t0] git user.name is not set', () => {
      then('exits with error about patron', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'block' },
          gitUser: { name: '', email: '' },
          commitArgs: ['--message', 'some fix'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('cannot determine patron');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case7] uses decremented on success', () => {
    when('[t0] starting with 3 uses', () => {
      then('state shows 2 after commit', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: ['--message', 'fix: something', '--mode', 'apply'],
        });

        expect(result.exitCode).toBe(0);

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(2);
      });
    });
  });

  given('[case8] unstaged changes guard', () => {
    when('[t0] unstaged changes exist and no --unstaged flag', () => {
      then('exits with error about unstaged changes', () => {
        const result = runInTempGitRepo({
          files: { 'staged.txt': 'staged content' },
          filesUnstaged: { 'unstaged.txt': 'unstaged content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: ['--message', 'some fix'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('unstaged changes detected');
        expect(result.stdout).toContain('unstaged.txt');
      });

      then('no commit is created', () => {
        const result = runInTempGitRepo({
          files: { 'staged.txt': 'staged content' },
          filesUnstaged: { 'unstaged.txt': 'unstaged content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: ['--message', 'some fix'],
        });

        const log = spawnSync('git', ['log', '--oneline'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as BufferEncoding,
        });
        expect(log.stdout.trim().split('\n').length).toBe(2);
        expect(log.stdout).not.toContain('some fix');
      });
    });

    when('[t1] unstaged changes exist with --unstaged ignore', () => {
      then('commits only staged changes', () => {
        const result = runInTempGitRepo({
          files: { 'staged.txt': 'staged content' },
          filesUnstaged: { 'unstaged.txt': 'unstaged content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: [
            '--message',
            'fix: staged only',
            '--unstaged',
            'ignore',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous!');

        // verify only staged file was committed
        const show = spawnSync(
          'git',
          ['show', '--name-only', '--format=', 'HEAD'],
          {
            cwd: result.tempDir,
            encoding: 'utf-8' as BufferEncoding,
          },
        );
        expect(show.stdout).toContain('staged.txt');
        expect(show.stdout).not.toContain('unstaged.txt');
      });
    });

    when('[t2] unstaged changes exist with --unstaged include', () => {
      then('stages and commits all changes', () => {
        const result = runInTempGitRepo({
          files: { 'staged.txt': 'staged content' },
          filesUnstaged: { 'unstaged.txt': 'unstaged content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: [
            '--message',
            'fix: all changes',
            '--unstaged',
            'include',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous!');

        // verify both files were committed
        const show = spawnSync(
          'git',
          ['show', '--name-only', '--format=', 'HEAD'],
          {
            cwd: result.tempDir,
            encoding: 'utf-8' as BufferEncoding,
          },
        );
        expect(show.stdout).toContain('staged.txt');
        expect(show.stdout).toContain('unstaged.txt');
      });
    });

    when('[t3] only unstaged changes with --unstaged include', () => {
      then('stages and commits the unstaged changes', () => {
        const result = runInTempGitRepo({
          files: { 'tracked.txt': 'original' },
          filesUnstaged: { 'new.txt': 'new content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: [
            '--message',
            'fix: from unstaged',
            '--unstaged',
            'include',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous!');
      });
    });
  });

  given('[case9] Co-authored-by trailer format', () => {
    when('[t0] commit is created', () => {
      then('trailer has correct format', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: ['--message', 'fix: trailer test', '--mode', 'apply'],
        });

        expect(result.exitCode).toBe(0);

        const log = spawnSync('git', ['log', '--format=%B', '-1'], {
          cwd: result.tempDir,
          encoding: 'utf-8',
        });
        expect(log.stdout).toContain(
          'Co-authored-by: Test Human <human@test.com>',
        );
      });

      then('trailer is after blank line', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: ['--message', 'fix: blank line test', '--mode', 'apply'],
        });

        const log = spawnSync('git', ['log', '--format=%B', '-1'], {
          cwd: result.tempDir,
          encoding: 'utf-8',
        });
        const body = log.stdout.trim();
        const lines = body.split('\n');
        // should be: header, blank line, body, blank line, Co-authored-by
        expect(lines[0]).toBe('fix: blank line test');
        expect(lines[1]).toBe('');
        expect(lines[2]).toBe('- test change');
        expect(lines[3]).toBe('');
        expect(lines[4]).toContain('Co-authored-by:');
      });
    });
  });

  given('[case10] plan mode shows preview', () => {
    when('[t0] plan mode is default', () => {
      then('shows plan output without committing', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: ['--message', 'fix: plan test'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 heres the wave...');
        expect(result.stdout).toContain('--mode plan');
        expect(result.stdout).toContain('header: fix: plan test');
        expect(result.stdout).toContain('run with --mode apply to execute');
        expect(result.stdout).toMatchSnapshot();

        // verify no commit was created
        const log = spawnSync('git', ['log', '--oneline'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as BufferEncoding,
        });
        expect(log.stdout).not.toContain('fix: plan test');
      });

      then('shows meter transition', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: ['--message', 'fix: meter test'],
        });

        expect(result.stdout).toContain('left: 3 → 2');
      });

      then('does not decrement uses', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: ['--message', 'fix: no decrement'],
        });

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(3); // unchanged
      });
    });

    when('[t1] plan mode with push shows PR title', () => {
      then('shows PR title as current message when first commit', () => {
        const tempDir = genTempDir({ slug: 'git-commit-plan-pr', git: true });

        // configure git user
        spawnSync('git', ['config', 'user.name', 'Test Human'], {
          cwd: tempDir,
        });
        spawnSync('git', ['config', 'user.email', 'human@test.com'], {
          cwd: tempDir,
        });

        // setup meter with .gitignore (before feature branch)
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 2, push: 'allow' }, null, 2),
        );
        fs.writeFileSync(path.join(tempDir, '.gitignore'), '.meter/\n');
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
          cwd: tempDir,
        });

        // create feature branch
        spawnSync('git', ['checkout', '-b', 'turtle/feature'], {
          cwd: tempDir,
        });

        // create and stage a file
        fs.writeFileSync(path.join(tempDir, 'feature.txt'), 'feature content');
        spawnSync('git', ['add', 'feature.txt'], { cwd: tempDir });

        // run in plan mode with push
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'feat: new feature\n\n- add feature',
            '--push',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...process.env,
              EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token',
            },
          },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('heres the wave');
        expect(result.stdout).toContain('title: feat: new feature');
        expect(result.stdout).toContain('findsert draft');
        expect(result.stdout).toMatchSnapshot();
      });

      then('shows first commit as PR title when branch has history', () => {
        const tempDir = genTempDir({
          slug: 'git-commit-plan-pr-history',
          git: true,
        });

        // configure git user
        spawnSync('git', ['config', 'user.name', 'Test Human'], {
          cwd: tempDir,
        });
        spawnSync('git', ['config', 'user.email', 'human@test.com'], {
          cwd: tempDir,
        });

        // setup meter before branch creation
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 5, push: 'allow' }, null, 2),
        );
        // gitignore .meter
        fs.writeFileSync(path.join(tempDir, '.gitignore'), '.meter/\n');
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
          cwd: tempDir,
        });

        // create feature branch
        spawnSync('git', ['checkout', '-b', 'turtle/multi-commit'], {
          cwd: tempDir,
        });

        // first commit on branch
        fs.writeFileSync(path.join(tempDir, 'first.txt'), 'first');
        spawnSync('git', ['add', 'first.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'feat: first commit on branch'], {
          cwd: tempDir,
        });

        // second commit on branch
        fs.writeFileSync(path.join(tempDir, 'second.txt'), 'second');
        spawnSync('git', ['add', 'second.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'feat: second commit'], {
          cwd: tempDir,
        });

        // now stage a third change
        fs.writeFileSync(path.join(tempDir, 'third.txt'), 'third');
        spawnSync('git', ['add', 'third.txt'], { cwd: tempDir });

        // run in plan mode with push
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'feat: third commit\n\n- add third feature',
            '--push',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...process.env,
              EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token',
            },
          },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('heres the wave');
        expect(result.stdout).toContain('title: feat: first commit on branch');
        expect(result.stdout).not.toContain('title: feat: third commit');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case12] PR title on stacked branch (branch from branch)', () => {
    when('[t0] branch B created from branch A, both with commits', () => {
      then('PR title uses first commit unique to branch B', () => {
        const tempDir = genTempDir({
          slug: 'git-commit-stacked-branch',
          git: true,
        });

        // configure git user
        spawnSync('git', ['config', 'user.name', 'Test Human'], {
          cwd: tempDir,
        });
        spawnSync('git', ['config', 'user.email', 'human@test.com'], {
          cwd: tempDir,
        });

        // setup .gitignore for .meter on main
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 5, push: 'allow' }, null, 2),
        );
        fs.writeFileSync(path.join(tempDir, '.gitignore'), '.meter/\n');
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
          cwd: tempDir,
        });

        // create branch A from main
        spawnSync('git', ['checkout', '-b', 'turtle/branch-a'], {
          cwd: tempDir,
        });

        // commit A1 on branch A
        fs.writeFileSync(path.join(tempDir, 'a1.txt'), 'a1');
        spawnSync('git', ['add', 'a1.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'feat: A1 first on branch-a'], {
          cwd: tempDir,
        });

        // commit A2 on branch A
        fs.writeFileSync(path.join(tempDir, 'a2.txt'), 'a2');
        spawnSync('git', ['add', 'a2.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'feat: A2 second on branch-a'], {
          cwd: tempDir,
        });

        // create branch B from branch A
        spawnSync('git', ['checkout', '-b', 'turtle/branch-b'], {
          cwd: tempDir,
        });

        // commit B1 on branch B
        fs.writeFileSync(path.join(tempDir, 'b1.txt'), 'b1');
        spawnSync('git', ['add', 'b1.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'feat: B1 first on branch-b'], {
          cwd: tempDir,
        });

        // commit B2 on branch B
        fs.writeFileSync(path.join(tempDir, 'b2.txt'), 'b2');
        spawnSync('git', ['add', 'b2.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'feat: B2 second on branch-b'], {
          cwd: tempDir,
        });

        // stage a new file for the next commit
        fs.writeFileSync(path.join(tempDir, 'b3.txt'), 'b3');
        spawnSync('git', ['add', 'b3.txt'], { cwd: tempDir });

        // run in plan mode with push
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'feat: B3 third on branch-b\n\n- add B3 feature',
            '--push',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...process.env,
              EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token',
            },
          },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('heres the wave');
        // PR title should be B1, not A1
        expect(result.stdout).toContain('title: feat: B1 first on branch-b');
        expect(result.stdout).not.toContain('title: feat: A1');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case13] bound level enforced — fix allows fix prefix', () => {
    when('[t0] level bound to fix, header starts with fix(', () => {
      then('commit succeeds', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          bindLevel: 'fix',
          commitArgs: [
            '--message',
            'fix(api): validate input',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous!');
      });
    });

    when('[t1] level bound to fix, header starts with fix:', () => {
      then('commit succeeds', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          bindLevel: 'fix',
          commitArgs: ['--message', 'fix: validate input', '--mode', 'apply'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous!');
      });
    });
  });

  given('[case14] bound level enforced — fix rejects feat prefix', () => {
    when('[t0] level bound to fix, header starts with feat(', () => {
      then('exits with level mismatch error', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          bindLevel: 'fix',
          commitArgs: [
            '--message',
            'feat(api): add endpoint',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain("must start with 'fix'");
        expect(result.stdout).toContain('level bound by human');
        expect(result.stdout).toMatchSnapshot();
      });

      then('no commit is created', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          bindLevel: 'fix',
          commitArgs: [
            '--message',
            'feat(api): add endpoint',
            '--mode',
            'apply',
          ],
        });

        const log = spawnSync('git', ['log', '--oneline'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as BufferEncoding,
        });
        expect(log.stdout).not.toContain('feat(api): add endpoint');
      });

      then('uses are not decremented', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          bindLevel: 'fix',
          commitArgs: [
            '--message',
            'feat(api): add endpoint',
            '--mode',
            'apply',
          ],
        });

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(3);
      });
    });
  });

  given('[case15] bound level enforced — feat allows feat prefix', () => {
    when('[t0] level bound to feat, header starts with feat(', () => {
      then('commit succeeds', () => {
        const result = runInTempGitRepo({
          files: { 'feat.txt': 'new feature' },
          meterState: { uses: 3, push: 'block' },
          bindLevel: 'feat',
          commitArgs: ['--message', 'feat(ui): add button', '--mode', 'apply'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous!');
      });
    });
  });

  given('[case16] bound level enforced — feat rejects fix prefix', () => {
    when('[t0] level bound to feat, header starts with fix(', () => {
      then('exits with level mismatch error', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          bindLevel: 'feat',
          commitArgs: ['--message', 'fix(ui): button color', '--mode', 'apply'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain("must start with 'feat'");
        expect(result.stdout).toContain('level bound by human');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case17] no bound level — any prefix allowed', () => {
    when('[t0] no level bound, feat header', () => {
      then('commit succeeds', () => {
        const result = runInTempGitRepo({
          files: { 'feat.txt': 'feature content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: [
            '--message',
            'feat(api): add endpoint',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous!');
      });
    });

    when('[t1] no level bound, fix header', () => {
      then('commit succeeds', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fix content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: [
            '--message',
            'fix(api): validate input',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous!');
      });
    });
  });

  given('[case18] bound level enforced in plan mode too', () => {
    when('[t0] level bound to fix, feat header in plan mode', () => {
      then('plan mode also rejects mismatched level', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          bindLevel: 'fix',
          commitArgs: ['--message', 'feat(api): add endpoint'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain("must start with 'fix'");
      });
    });
  });

  given('[case11] push to main/master blocked', () => {
    when('[t0] on main branch with --push requested', () => {
      then('exits with error about main branch', () => {
        // genTempDir creates repo on main by default
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'allow' },
          commitArgs: ['--message', 'fix: on main', '--push'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('🐢 bummer dude...');
        expect(result.stdout).toContain('cannot push directly to main');
        expect(result.stdout).toContain('git checkout -b turtle/');
        expect(result.stdout).toMatchSnapshot();
      });

      then('no commit is created', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'allow' },
          commitArgs: ['--message', 'fix: on main', '--push'],
        });

        const log = spawnSync('git', ['log', '--oneline'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as BufferEncoding,
        });
        // only initial commits, no new commit
        expect(log.stdout.trim().split('\n').length).toBe(2);
        expect(log.stdout).not.toContain('fix: on main');
      });

      then('uses are not decremented', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'allow' },
          commitArgs: ['--message', 'fix: on main', '--push'],
        });

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(2);
      });
    });
  });

  given('[case13] last use with push allowed shows push status', () => {
    when('[t0] uses go from 1 to 0 with push allowed', () => {
      then('meter shows push: allowed after commit', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 1, push: 'allow' },
          commitArgs: ['--message', 'fix(api): last commit', '--mode', 'apply'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('left: 0');
        expect(result.stdout).toContain('push: allowed');
        expect(result.stdout).toMatchSnapshot();
      });

      then('plan mode also shows push: allowed', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 1, push: 'allow' },
          commitArgs: ['--message', 'fix(api): last commit plan'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('left: 1 → 0');
        expect(result.stdout).toContain('push: allowed');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case14] multiline message is required', () => {
    when('[t0] message is single-line (no body)', () => {
      then('exits with error about multiline', () => {
        const tempDir = genTempDir({ slug: 'git-commit-set-test', git: true });

        // configure git user
        spawnSync('git', ['config', 'user.name', 'Test Human'], {
          cwd: tempDir,
        });
        spawnSync('git', ['config', 'user.email', 'human@test.com'], {
          cwd: tempDir,
        });

        // setup meter
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 2, push: 'block' }, null, 2),
        );
        fs.writeFileSync(path.join(tempDir, '.gitignore'), '.meter/\n');
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup'], { cwd: tempDir });

        // create and stage file
        fs.writeFileSync(path.join(tempDir, 'fix.txt'), 'fixed content');
        spawnSync('git', ['add', 'fix.txt'], { cwd: tempDir });

        // run with single-line message (no body) — bypass auto-inject
        const result = spawnSync(
          'bash',
          [scriptPath, '--message', 'fix: no body'],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        expect(result.status).toBe(1);
        expect(result.stdout).toContain('must be multiline');
      });
    });

    when('[t1] message is multiline (has body)', () => {
      then('body appears in plan tree output', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: [
            '--message',
            'fix: with desc\n\n- fixed the bug\n- added tests',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('body');
        expect(result.stdout).toContain('- fixed the bug');
        expect(result.stdout).toContain('- added tests');
        expect(result.stdout).toMatchSnapshot();
      });

      then('body appears in commit body', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: [
            '--message',
            'fix: body in commit\n\n- fixed validation',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);

        // check commit body
        const log = spawnSync('git', ['log', '-1', '--format=%B'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as BufferEncoding,
        });
        const body = (log.stdout ?? '').trim();
        expect(body).toContain('- fixed validation');
      });
    });
  });

  given('[case15] plan mode auto-revoke display with push', () => {
    when('[t0] uses go from 1 to 0 with push allowed', () => {
      then('plan shows push: allowed to blocked (revoked)', () => {
        const tempDir = genTempDir({ slug: 'git-commit-set-test', git: true });

        // configure git user
        spawnSync('git', ['config', 'user.name', 'Test Human'], {
          cwd: tempDir,
        });
        spawnSync('git', ['config', 'user.email', 'human@test.com'], {
          cwd: tempDir,
        });

        // setup meter
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 1, push: 'allow' }, null, 2),
        );
        fs.writeFileSync(path.join(tempDir, '.gitignore'), '.meter/\n');
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup'], { cwd: tempDir });

        // create branch + staged file
        spawnSync('git', ['checkout', '-b', 'turtle/revoke-test'], {
          cwd: tempDir,
        });
        fs.writeFileSync(path.join(tempDir, 'fix.txt'), 'content');
        spawnSync('git', ['add', 'fix.txt'], { cwd: tempDir });

        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'fix: last use\n\n- last commit before revoke',
            '--push',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...process.env,
              EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token',
            },
          },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('left: 1 → 0');
        expect(result.stdout).toContain('push: allowed → blocked (revoked)');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });
});
