import { spawnSync } from 'child_process';
import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

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
          label: 'visibility unreadable, held as public',
        },
      },
      {
        description: 'internal passes',
        given: { raw: 'internal' },
        expect: {
          visibility: 'internal',
          ungated: true,
          label: 'visibility unreadable, held as public',
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
    CASES.map((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
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
          // the label is read only on a hold; any non-public visibility reads as held
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
    CASES.map((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
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
        expect(result.stdout).toContain('check the comment holds none of:');
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
});
