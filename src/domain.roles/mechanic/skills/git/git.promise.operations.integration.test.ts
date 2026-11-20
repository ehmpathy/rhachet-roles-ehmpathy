import { spawnSync } from 'child_process';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = caselist tests for the public-repo text promise transformers
 * .why  = five writers (comment, title, description, push, set) read their
 *         value, visibility rule, rerun line, and nudge from this one file;
 *         its cases live here, beside it, so no writer's suite has to prove
 *         the rules the others share
 */
describe('git.promise.operations.sh', () => {
  const opsPath = path.join(__dirname, 'git.promise.operations.sh');
  const PROMISE = 'text-to-public-repo-is-anonymized';

  // .what = run one function of the ops file with argv; report stdout and exit
  const runOps = (input: { fn: string; args: string[] }) => {
    const result = spawnSync(
      'bash',
      [
        '-c',
        'source "$1"; shift; "$@"',
        'ops',
        opsPath,
        input.fn,
        ...input.args,
      ],
      { encoding: 'utf-8' }, // note: library api requires this term
    );
    return { stdout: result.stdout, exitCode: result.status };
  };

  given('[case1] a gh visibility answer', () => {
    const CASES: {
      description: string;
      given: { raw: string };
      expect: { visibility: string; ungated: boolean; label: string };
    }[] = [
      {
        description: 'rest lowercase public holds',
        given: { raw: 'public' },
        expect: { visibility: 'public', ungated: false, label: 'public' },
      },
      {
        description: 'gh repo view uppercase PUBLIC holds',
        given: { raw: 'PUBLIC' },
        expect: { visibility: 'public', ungated: false, label: 'public' },
      },
      {
        description: 'private passes',
        given: { raw: 'PRIVATE' },
        expect: {
          visibility: 'private',
          ungated: true,
          label: 'private',
        },
      },
      {
        description: 'internal passes',
        given: { raw: 'internal' },
        expect: {
          visibility: 'internal',
          ungated: true,
          label: 'internal',
        },
      },
      {
        description: 'an empty answer cannot prove private, so it holds',
        given: { raw: '' },
        expect: {
          visibility: 'unreadable',
          ungated: false,
          label: 'visibility unreadable, held as public',
        },
      },
      {
        description: 'an unknown answer cannot prove private, so it holds',
        given: { raw: 'secret' },
        expect: {
          visibility: 'unreadable',
          ungated: false,
          label: 'visibility unreadable, held as public',
        },
      },
    ];
    CASES.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then('it maps, gates, and labels as expected', () => {
          const visibility = runOps({
            fn: 'as_repo_visibility',
            args: [thisCase.given.raw],
          }).stdout.trim();
          expect(visibility).toEqual(thisCase.expect.visibility);
          const ungated = runOps({
            fn: 'is_repo_visibility_ungated',
            args: [visibility],
          });
          expect(ungated.exitCode === 0).toEqual(thisCase.expect.ungated);
          // each known visibility names itself; only an unreadable one reads as held
          const label = runOps({
            fn: 'as_repo_visibility_label',
            args: [visibility],
          }).stdout.trim();
          expect(label).toEqual(thisCase.expect.label);
        });
      }),
    );
  });

  given('[case2] a --promise value', () => {
    when('[t0] the value is the text promise', () => {
      then('it is the promise', () => {
        expect(
          runOps({ fn: 'is_promise_text_public', args: [PROMISE] }).exitCode,
        ).toEqual(0);
      });
    });
    when("[t1] the value is bhuild's radio promise", () => {
      then('it is not this promise', () => {
        expect(
          runOps({
            fn: 'is_promise_text_public',
            args: ['task-to-public-repo-is-anonymized'],
          }).exitCode,
        ).toEqual(1);
      });
    });
  });

  given('[case3] an argv rendered as a rerun line', () => {
    const CASES: {
      description: string;
      given: { args: string[] };
      expect: { line: string };
    }[] = [
      {
        description: 'plain words stay bare, % included',
        given: { args: ['--mode', 'apply', '--from', './a%b.md'] },
        expect: { line: 'rhx git.commit.push --mode apply --from ./a%b.md' },
      },
      {
        description: 'a word with a space is single-quoted',
        given: { args: ['-m', 'fix(reef): map the kelp'] },
        expect: { line: "rhx git.commit.push -m 'fix(reef): map the kelp'" },
      },
      {
        description: 'an inner single quote closes, escapes, and reopens',
        given: { args: ['-m', "kai's reef"] },
        expect: { line: "rhx git.commit.push -m 'kai'\\''s reef'" },
      },
      {
        description: "rhachet's passthrough args and their values are dropped",
        given: {
          args: [
            '--repo',
            'ehmpathy',
            '--mode',
            'apply',
            '--role',
            'mechanic',
            '--skill',
            'git.commit.push',
          ],
        },
        expect: { line: 'rhx git.commit.push --mode apply' },
      },
    ];
    CASES.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then('the line pastes back as the same command', () => {
          const line = runOps({
            fn: 'as_shell_cmd_without_passthrough',
            args: ['rhx git.commit.push', ...thisCase.given.args],
          }).stdout;
          expect(line).toEqual(thisCase.expect.line);
        });
      }),
    );
  });

  given('[case4] a rerun line gets the promise', () => {
    when('[t0] the text came from a file', () => {
      then('the promise is appended, with no pipe', () => {
        const line = runOps({
          fn: 'as_cmd_with_promise_text_public',
          args: ['cmd=rhx git.pull.title.set --which 7 --from ./t.md'],
        }).stdout;
        expect(line).toEqual(
          `rhx git.pull.title.set --which 7 --from ./t.md --promise ${PROMISE}`,
        );
      });
    });
    when('[t1] the text came via @stdin', () => {
      then('the line pipes the text in again, and says so', () => {
        const line = runOps({
          fn: 'as_cmd_with_promise_text_public',
          args: [
            'cmd=rhx git.commit.set -m @stdin --push',
            'pipe=cat ./.temp/commit.md | ',
            'note=   # pipe the same message in again',
          ],
        }).stdout;
        expect(line).toEqual(
          `cat ./.temp/commit.md | rhx git.commit.set -m @stdin --push --promise ${PROMISE}   # pipe the same message in again`,
        );
      });
    });
  });

  given('[case5] the nudge', () => {
    when('[t0] a public repo', () => {
      const result = useThen('it renders', async () =>
        runOps({
          fn: 'as_promise_nudge',
          args: [
            'repo=ehmpathy/surf-demo',
            'visibility=public',
            'subject=the comment holds',
            `rerun=rhx git.pull.comment.set --which 7 --promise ${PROMISE}`,
            'cause=ignored for a public repo',
          ],
        }),
      );
      then('it names the repo, the text to check, and the rerun', () => {
        expect(result.stdout).toContain(
          '🐢 hold up — this text goes to a public repo',
        );
        expect(result.stdout).toContain('repo: ehmpathy/surf-demo (public)');
        expect(result.stdout).toContain('check the comment holds none of');
        expect(result.stdout).not.toContain('cause:');
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t1] an unreadable visibility, with its cause', () => {
      const result = useThen('it renders', async () =>
        runOps({
          fn: 'as_promise_nudge',
          args: [
            'repo=ehmpathy/surf-demo',
            'visibility=unreadable',
            'subject=the title holds',
            `rerun=rhx git.pull.title.set --which 7 --promise ${PROMISE}`,
            'cause=gh: Bad Gateway (HTTP 502)',
          ],
        }),
      );
      then(
        'the repo line says held as public, and the cause sits under it',
        () => {
          expect(result.stdout).toContain(
            'repo: ehmpathy/surf-demo (visibility unreadable, held as public)',
          );
          expect(result.stdout).toContain(
            '│  └─ cause: gh: Bad Gateway (HTTP 502)',
          );
          expect(result.stdout).toMatchSnapshot();
        },
      );
    });
  });

  given('[case6] a held text, named for its keep path', () => {
    const TEXT = 'fix(reef): map the kelp beds\n\n- add the kelp map';
    // .what = the path, from an oracle apart from the shell: node's own sha256
    const PATH_EXPECTED = `./.temp/commit.${createHash('sha256').update(TEXT).digest('hex').slice(0, 8)}.md`;

    /**
     * .what = a bin dir that holds shasum and no sha256sum, as a mac host does
     * .mock = PATH holds only a symlink to the host's real shasum
     * .why  = a linux runner ships sha256sum, so the shasum fallback never runs without it
     * .real = [t0] runs the host's own sha256sum; both answers meet node's sha256 oracle
     */
    const genBinWithShasumOnly = (): string => {
      const binDir = genTempDir({ slug: 'keep-path-shasum-only', git: false });
      fs.symlinkSync(
        spawnSync('bash', ['-c', 'command -v shasum'], {
          encoding: 'utf-8', // note: library api requires this term
        }).stdout.trim(),
        path.join(binDir, 'shasum'),
      );
      return binDir;
    };

    when('[t0] the host ships sha256sum', () => {
      const result = useThen('it runs', async () =>
        runOps({
          fn: 'as_text_keep_path',
          args: ['name=commit', `text=${TEXT}`],
        }),
      );
      then('the path is the text digest, prefix eight, under ./.temp', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toEqual(PATH_EXPECTED);
      });
    });

    when('[t1] the host ships only shasum', () => {
      const result = useThen('it runs', async () => {
        const binDir = genBinWithShasumOnly();
        return spawnSync(
          'bash',
          [
            '-c',
            'source "$1"; PATH="$2"; as_text_keep_path name=commit "text=$3"',
            'ops',
            opsPath,
            binDir,
            TEXT,
          ],
          { encoding: 'utf-8' }, // note: library api requires this term
        );
      });
      then('the shasum fallback gives the same path', () => {
        expect(result.status).toBe(0);
        expect(result.stdout).toEqual(PATH_EXPECTED);
      });
    });

    when('[t2] two texts differ by one character', () => {
      const result = useThen('it runs', async () => ({
        one: runOps({
          fn: 'as_text_keep_path',
          args: ['name=commit', `text=${TEXT}`],
        }).stdout,
        two: runOps({
          fn: 'as_text_keep_path',
          args: ['name=commit', `text=${TEXT}.`],
        }).stdout,
      }));
      then('they name two paths, so two held runs never share a file', () => {
        expect(result.one).not.toEqual(result.two);
      });
    });
  });
});
