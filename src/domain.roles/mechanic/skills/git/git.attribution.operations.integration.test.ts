import { spawnSync } from 'child_process';
import * as path from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = caselist tests for the pr body attribution transformer
 * .why  = git.commit.push and git.pull.description.set both sign a pr body
 *         through this one file; its cases live here, beside it, so neither
 *         consumer's suite has to prove the other's strip
 */
describe('git.attribution.operations.sh', () => {
  const opsPath = path.join(__dirname, 'git.attribution.operations.sh');
  const FOOTER = '🐢🌊 surfed in by seaturtle[bot]';
  const FENCE = '```';

  // .what = run one pure transform of the ops file on a body from stdin
  const runOps =
    (fn: 'as_pr_body_attributed' | 'get_all_pr_body_repairs') =>
    (body: string) => {
      const result = spawnSync(
        'bash',
        ['-c', `source "$1" && ${fn} "$(cat)"`, 'ops', opsPath],
        { input: body, encoding: 'utf-8' },
      );
      if (result.status !== 0)
        throw new Error(`${fn} exited ${result.status}: ${result.stderr}`);
      return result.stdout;
    };
  const asAttributed = runOps('as_pr_body_attributed');
  const getRepairs = (body: string) =>
    runOps('get_all_pr_body_repairs')(body)
      .split('\n')
      .filter((line) => line.length > 0);
  const signed = (clean: string) => `${clean}\n\n---\n${FOOTER}`;

  const CASES: {
    description: string;
    given: { body: string };
    expect: { clean: string; repairs: string[] };
  }[] = [
    {
      description: 'a co-authored-by trailer is stripped (no email leak)',
      given: {
        body: 'fix(api): validate input\n\n- added schema validation\n\nCo-authored-by: Human Name <human@example.com>',
      },
      expect: {
        clean: 'fix(api): validate input\n\n- added schema validation',
        repairs: ['stripped the co-authored-by trailer(s)'],
      },
    },
    {
      description: 'every co-authored-by trailer is stripped',
      given: {
        body: 'feat(auth): add oauth\n\n- added provider\n\nCo-authored-by: Human One <one@example.com>\nCo-authored-by: Human Two <two@example.com>',
      },
      expect: {
        clean: 'feat(auth): add oauth\n\n- added provider',
        repairs: ['stripped the co-authored-by trailer(s)'],
      },
    },
    {
      description:
        'a prose line that opens with co-authored-by, with no <email>, is kept',
      given: {
        body: 'docs: explain the trailer\n\nCo-authored-by: is how a commit credits a pair\n\nCo-authored-by: Human <human@example.com>',
      },
      expect: {
        clean:
          'docs: explain the trailer\n\nCo-authored-by: is how a commit credits a pair',
        repairs: ['stripped the co-authored-by trailer(s)'],
      },
    },
    {
      description: 'the harness lines are stripped, in any case',
      given: {
        body: 'surf lesson booker\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>',
      },
      expect: {
        clean: 'surf lesson booker',
        repairs: [
          'stripped the claude code line',
          'stripped the co-authored-by trailer(s)',
        ],
      },
    },
    {
      description:
        'a prior footer of another bot name is stripped, so one footer stands',
      given: { body: 'wave report sync\n\n---\n🐢🌊 surfed in by kelp[bot]' },
      expect: {
        clean: 'wave report sync',
        repairs: ['stripped the prior seaturtle footer'],
      },
    },
    {
      description:
        'a stripped line mid-body takes the rule above it; the sections around it join',
      given: {
        body: 'intro\n\n---\nCo-authored-by: Kai <kai@example.com>\n\nmore words',
      },
      expect: {
        clean: 'intro\n\nmore words',
        repairs: ['stripped the co-authored-by trailer(s)'],
      },
    },
    {
      description:
        'attribution lines inside a closed code fence are quoted text, kept',
      given: {
        body: `how the repair reads a body:\n\n${FENCE}\nCo-Authored-By: Claude <noreply@anthropic.com>\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n${FENCE}\n\nCo-Authored-By: Claude <noreply@anthropic.com>`,
      },
      expect: {
        clean: `how the repair reads a body:\n\n${FENCE}\nCo-Authored-By: Claude <noreply@anthropic.com>\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n${FENCE}`,
        repairs: ['stripped the co-authored-by trailer(s)'],
      },
    },
    {
      description:
        'an unclosed fence shelters naught: the harness line after it is stripped',
      given: {
        body: `surf lesson booker\n\n${FENCE}\n🤖 Generated with [Claude Code](https://claude.com/claude-code)`,
      },
      expect: {
        clean: `surf lesson booker\n\n${FENCE}`,
        repairs: ['stripped the claude code line'],
      },
    },
    {
      description: 'a clean body is signed, with no repair',
      given: { body: 'surf lesson booker\n\nbooks a lesson for a surfer' },
      expect: {
        clean: 'surf lesson booker\n\nbooks a lesson for a surfer',
        repairs: [],
      },
    },
  ];

  CASES.forEach((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the body is signed', () => {
        then('it ends in one seaturtle footer, foreign lines gone', () => {
          expect(asAttributed(thisCase.given.body)).toEqual(
            signed(thisCase.expect.clean),
          );
        });
        then('the repairs name each kind stripped', () => {
          expect(getRepairs(thisCase.given.body)).toEqual(
            thisCase.expect.repairs,
          );
        });
        then('a signed body signs again to itself (round trip)', () => {
          const once = asAttributed(thisCase.given.body);
          expect(asAttributed(once)).toEqual(once);
        });
      });
    }),
  );
});
