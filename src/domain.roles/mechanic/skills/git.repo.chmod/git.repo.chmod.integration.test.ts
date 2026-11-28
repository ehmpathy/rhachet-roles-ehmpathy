import { spawnSync } from 'child_process';
import {
  chmodSync,
  mkdirSync,
  realpathSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = clamps git.repo.chmod: set or clear the exec bit of one file inside the repo, plan by default
 * .why  = raw chmod is denied; this is the one paved way, and it refuses all else:
 *         a path outside the repo, a symlink that escapes, a directory, an absent file,
 *         and any mode beyond the exec bit (numeric modes, setuid, world-write)
 */
const SKILL = join(__dirname, 'git.repo.chmod.sh');

const run = (input: { cwd: string; args: string[] }) => {
  const res = spawnSync('bash', [SKILL, ...input.args], {
    cwd: input.cwd,
    encoding: 'utf-8', // node api param name
  });
  return {
    status: res.status,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
  };
};

const modeOf = (path: string): number => statSync(path).mode & 0o7777;

const gitq = (cwd: string, args: string[]) =>
  spawnSync(
    'git',
    ['-c', 'user.name=Test Human', '-c', 'user.email=human@test.com', ...args],
    { cwd },
  );

const genRepo = (slug: string): string =>
  realpathSync(genTempDir({ slug, git: true }));

const genDir = (slug: string): string => realpathSync(genTempDir({ slug }));

describe('git.repo.chmod', () => {
  given('[case1] a file inside a repo', () => {
    const root = genRepo('git-repo-chmod');
    const file = join(root, 'tool.sh');
    writeFileSync(file, '#!/bin/sh\n', { mode: 0o644 });

    when('[t0] --help', () => {
      then('it prints usage, inputs, and an example, exit 0', () => {
        const res = run({ cwd: root, args: ['--help'] });
        expect(res.status).toBe(0);
        expect(res.stdout).toContain('usage');
        expect(res.stdout).toContain('--path');
        expect(res.stdout).toContain('--exec');
        expect(res.stdout).toContain('--mode');
        expect(res.stdout).toContain('example');
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t1] plan by default', () => {
      then(
        'it prints the file, the mode now, and the mode after, and changes naught',
        () => {
          const res = run({
            cwd: root,
            args: ['--path', 'tool.sh', '--exec', 'on'],
          });
          expect(res.status).toBe(0);
          expect(res.stdout).toContain('tool.sh');
          expect(res.stdout).toContain('644');
          expect(res.stdout).toContain('755');
          expect(res.stdout).toContain('plan only');
          expect(modeOf(file)).toBe(0o644);
          expect(res.stdout).toMatchSnapshot();
        },
      );
    });

    when('[t2] --mode plan stated', () => {
      then('it changes naught', () => {
        const res = run({
          cwd: root,
          args: ['--path', 'tool.sh', '--exec', 'on', '--mode', 'plan'],
        });
        expect(res.status).toBe(0);
        expect(modeOf(file)).toBe(0o644);
      });
    });

    when('[t3] apply on', () => {
      then('it sets the exec bit and reads it back', () => {
        const res = run({
          cwd: root,
          args: ['--path', 'tool.sh', '--exec', 'on', '--mode', 'apply'],
        });
        expect(res.status).toBe(0);
        expect(res.stdout).toContain('read back: 755');
        expect(modeOf(file)).toBe(0o755);
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t4] apply off', () => {
      then('it clears the exec bit and reads it back', () => {
        const res = run({
          cwd: root,
          args: ['--path', 'tool.sh', '--exec', 'off', '--mode', 'apply'],
        });
        expect(res.status).toBe(0);
        expect(res.stdout).toContain('read back: 644');
        expect(modeOf(file)).toBe(0o644);
      });
    });

    when('[t5] a numeric mode is given as --exec', () => {
      then('it refuses, exit 2, and names the fix', () => {
        const res = run({
          cwd: root,
          args: ['--path', 'tool.sh', '--exec', '755', '--mode', 'apply'],
        });
        expect(res.status).toBe(2);
        expect(res.stdout).toContain('ConstraintError');
        expect(res.stdout).toContain('--exec on|off');
        expect(res.stderr).toContain('--exec on|off');
        expect(modeOf(file)).toBe(0o644);
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t6] --exec is absent', () => {
      then('it refuses, exit 2', () => {
        const res = run({ cwd: root, args: ['--path', 'tool.sh'] });
        expect(res.status).toBe(2);
        expect(res.stdout).toContain('--exec on|off');
      });
    });

    when('[t7] --mode is neither plan nor apply', () => {
      then('it refuses, exit 2', () => {
        const res = run({
          cwd: root,
          args: ['--path', 'tool.sh', '--exec', 'on', '--mode', 'yolo'],
        });
        expect(res.status).toBe(2);
        expect(modeOf(file)).toBe(0o644);
      });
    });
  });

  given('[case2] a path that must be refused', () => {
    const root = genRepo('git-repo-chmod');
    const outside = genDir('git-repo-chmod-out');
    const outsideFile = join(outside, 'far.sh');
    writeFileSync(outsideFile, 'x\n', { mode: 0o644 });

    when('[t0] the path is outside the repo root', () => {
      then('it refuses, exit 2, and leaves the file as is', () => {
        const res = run({
          cwd: root,
          args: ['--path', outsideFile, '--exec', 'on', '--mode', 'apply'],
        });
        expect(res.status).toBe(2);
        expect(res.stdout).toContain('outside');
        expect(modeOf(outsideFile)).toBe(0o644);
      });
    });

    when('[t1] a symlink inside the repo resolves outside', () => {
      then('it refuses, exit 2, and leaves the target as is', () => {
        symlinkSync(outsideFile, join(root, 'link.sh'));
        const res = run({
          cwd: root,
          args: ['--path', 'link.sh', '--exec', 'on', '--mode', 'apply'],
        });
        expect(res.status).toBe(2);
        expect(res.stdout).toContain('symlink');
        expect(modeOf(outsideFile)).toBe(0o644);
      });
    });

    when('[t2] the path is a directory', () => {
      then('it refuses, exit 2', () => {
        mkdirSync(join(root, 'adir'));
        const res = run({
          cwd: root,
          args: ['--path', 'adir', '--exec', 'on', '--mode', 'apply'],
        });
        expect(res.status).toBe(2);
        expect(res.stdout).toContain('directory');
      });
    });

    when('[t3] the file is absent', () => {
      then('it refuses, exit 2', () => {
        const res = run({
          cwd: root,
          args: ['--path', 'nope.sh', '--exec', 'on', '--mode', 'apply'],
        });
        expect(res.status).toBe(2);
        expect(res.stdout).toContain('absent');
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t4] the file carries setuid', () => {
      then('it refuses, exit 2, and leaves the mode as is', () => {
        const f = join(root, 'suid.sh');
        writeFileSync(f, 'x\n');
        chmodSync(f, 0o4755);
        const res = run({
          cwd: root,
          args: ['--path', 'suid.sh', '--exec', 'off', '--mode', 'apply'],
        });
        expect(res.status).toBe(2);
        expect(res.stdout).toContain('beyond the exec bit');
        expect(modeOf(f)).toBe(0o4755);
      });
    });

    when('[t5] the file is world-writable', () => {
      then('it refuses, exit 2, and leaves the mode as is', () => {
        const f = join(root, 'ww.sh');
        writeFileSync(f, 'x\n');
        chmodSync(f, 0o666);
        const res = run({
          cwd: root,
          args: ['--path', 'ww.sh', '--exec', 'on', '--mode', 'apply'],
        });
        expect(res.status).toBe(2);
        expect(res.stdout).toContain('beyond the exec bit');
        expect(modeOf(f)).toBe(0o666);
      });
    });
  });

  /**
   * .why = a worktree's .agent/repo=.this links into the main checkout of the SAME repo, so a
   *        live role skill with no exec bit, read from a worktree, sits outside the worktree root
   */
  given(
    '[case3] a worktree whose .agent/repo=.this links into the main worktree',
    () => {
      const main = genRepo('git-repo-chmod-main');
      gitq(main, ['commit', '-q', '--allow-empty', '-m', 'init']);
      const skillsRel = join('.agent', 'repo=.this', 'role=director', 'skills');
      mkdirSync(join(main, skillsRel), { recursive: true });
      const live = join(main, skillsRel, 'tool.sh');
      writeFileSync(live, '#!/bin/sh\n', { mode: 0o644 });
      mkdirSync(join(main, skillsRel, 'adir'));
      const outside = genDir('git-repo-chmod-out');
      const outsideFile = join(outside, 'far.sh');
      writeFileSync(outsideFile, 'x\n', { mode: 0o644 });
      symlinkSync(outsideFile, join(main, skillsRel, 'esc.sh'));

      const worktree = join(genDir('git-repo-chmod-wt'), 'wt');
      gitq(main, ['worktree', 'add', '-q', worktree]);
      // the shape a worktree has: .agent/repo=.this is a dir, each role=<x> in it a link into main
      mkdirSync(join(worktree, '.agent', 'repo=.this'), { recursive: true });
      symlinkSync(
        join(main, '.agent', 'repo=.this', 'role=director'),
        join(worktree, '.agent', 'repo=.this', 'role=director'),
      );
      symlinkSync(
        join(main, '.agent', 'repo=.this'),
        join(worktree, '.agent', 'repo=other'),
      );

      // a foreign repo, and a second worktree of main whose .agent/repo=.this links into it
      const foreign = genRepo('git-repo-chmod-foreign');
      mkdirSync(join(foreign, skillsRel), { recursive: true });
      const foreignFile = join(foreign, skillsRel, 'tool.sh');
      writeFileSync(foreignFile, '#!/bin/sh\n', { mode: 0o644 });
      const worktreeFar = join(genDir('git-repo-chmod-wt'), 'wt');
      gitq(main, ['worktree', 'add', '-q', '-b', 'far', worktreeFar]);
      mkdirSync(join(worktreeFar, '.agent', 'repo=.this'), { recursive: true });
      symlinkSync(
        join(foreign, '.agent', 'repo=.this', 'role=director'),
        join(worktreeFar, '.agent', 'repo=.this', 'role=director'),
      );

      const viaThis = join(skillsRel, 'tool.sh');

      when('[t0] plan on a role skill through the link', () => {
        then('it plans, shows the real path, and changes naught', () => {
          const res = run({
            cwd: worktree,
            args: ['--path', viaThis, '--exec', 'on'],
          });
          expect(res.status).toBe(0);
          expect(res.stdout).toContain(live);
          expect(res.stdout).toContain('644');
          expect(res.stdout).toContain('755');
          expect(res.stdout).toContain('plan only');
          expect(modeOf(live)).toBe(0o644);
        });
      });

      when('[t1] apply on a role skill through the link', () => {
        then('it sets the exec bit on the real file', () => {
          const res = run({
            cwd: worktree,
            args: ['--path', viaThis, '--exec', 'on', '--mode', 'apply'],
          });
          expect(res.status).toBe(0);
          expect(modeOf(live)).toBe(0o755);
        });
      });

      when('[t2] the .agent/repo=.this link points into a foreign repo', () => {
        then('it refuses, exit 2, and leaves the foreign file as is', () => {
          const res = run({
            cwd: worktreeFar,
            args: ['--path', viaThis, '--exec', 'on', '--mode', 'apply'],
          });
          expect(res.status).toBe(2);
          expect(res.stdout).toContain('outside');
          expect(modeOf(foreignFile)).toBe(0o644);
        });
      });

      when(
        '[t3] a link of another name points into the same main worktree',
        () => {
          then(
            'it refuses, exit 2: only the .agent/repo=.this link is admitted',
            () => {
              chmodSync(live, 0o644);
              const res = run({
                cwd: worktree,
                args: [
                  '--path',
                  join(
                    '.agent',
                    'repo=other',
                    'role=director',
                    'skills',
                    'tool.sh',
                  ),
                  '--exec',
                  'on',
                  '--mode',
                  'apply',
                ],
              });
              expect(res.status).toBe(2);
              expect(res.stdout).toContain('outside');
              expect(modeOf(live)).toBe(0o644);
            },
          );
        },
      );

      when('[t4] a symlink behind the link escapes the main worktree', () => {
        then('it refuses, exit 2, and leaves the target as is', () => {
          const res = run({
            cwd: worktree,
            args: [
              '--path',
              join(skillsRel, 'esc.sh'),
              '--exec',
              'on',
              '--mode',
              'apply',
            ],
          });
          expect(res.status).toBe(2);
          expect(res.stdout).toContain('symlink');
          expect(modeOf(outsideFile)).toBe(0o644);
        });
      });

      when('[t5] a directory through the link', () => {
        then('it refuses, exit 2', () => {
          const res = run({
            cwd: worktree,
            args: [
              '--path',
              join(skillsRel, 'adir'),
              '--exec',
              'on',
              '--mode',
              'apply',
            ],
          });
          expect(res.status).toBe(2);
          expect(res.stdout).toContain('directory');
        });
      });
    },
  );
});
