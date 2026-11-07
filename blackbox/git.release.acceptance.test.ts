import { spawnSync } from 'child_process';

import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genTestDir } from './.test/invokeHook';

/**
 * .what = acceptance tests for `rhx git.release`, run via rhachet against the linked role
 * .why  = a caller reaches the release verb through rhachet; the help it prints there
 *         must name the comment gate, so a driver learns of the gate before it refuses.
 *         the gate itself (refusal, automerge disable, fail-closed read) is proven in
 *         git.release.p9.comment_gate.integration.test.ts, and against the real api in
 *         git.release.p9.comment_gate.real.integration.test.ts
 * .note = no case here reaches github: --help and the unknown-flag refusal both stop
 *         before any gh call, so no credential and no mock is needed. a case that
 *         reaches the gate needs a live pr with a comment that waits, which an
 *         acceptance run can hold only with a gh mock (rule.forbid.acceptance.mocks)
 *         or a write-scoped token on a home-org pr; see fulcrum F24 of route
 *         v2026_10_26.fix-release-blocked-on-unanswered-comments
 */

/**
 * .what = run a verb the way a caller does: through rhachet
 */
const runViaRhachet = (input: {
  dir: string;
  skill: string;
  args: string[];
}): { stdout: string; stderr: string; code: number | null } => {
  const result = spawnSync(
    'npx',
    ['rhachet', 'run', '--skill', input.skill, ...input.args],
    {
      cwd: input.dir,
      encoding: 'utf-8', // node api param name
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60_000, // node api param name
    },
  );
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    code: result.status,
  };
};

/**
 * .what = what the caller sees, from the skill's first line on, color codes stripped
 * .why  = npx and rhachet may print before the skill; color codes vary by terminal
 */
const asSkillRender = (input: { stdout: string }): string => {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: strip ansi color codes
  const plain = input.stdout.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
  const at = plain.search(/🐢|✋|^usage/mu);
  return plain.slice(Math.max(0, at));
};

describe('git.release, via rhachet', () => {
  given('[case1] a repo with the mechanic role linked', () => {
    const scene = useBeforeAll(async () => ({
      dir: await genTestDir({ slug: 'git-release-acceptance' }),
    }));

    when('[t0] git.release is asked for --help', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({
          dir: scene.dir,
          skill: 'git.release',
          args: ['--help'],
        }),
      );
      then('it exits 0', () => {
        expect(result.code).toBe(0);
      });
      then('it names the comment gate and the verb that answers it', () => {
        expect(result.stdout).toContain(
          'comment gate: plan and --watch show each unanswered pr comment',
        );
        expect(result.stdout).toContain(
          '--apply refuses (exit 2) while any is unanswered',
        );
        expect(result.stdout).toContain('rhx git.pull.comment set');
        expect(result.stdout).toContain('no flag skips the gate');
      });
      then('the help is snapped', () => {
        expect(asSkillRender(result)).toMatchSnapshot();
      });
    });

    when('[t1] git.release --apply is asked to skip the gate', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({
          dir: scene.dir,
          skill: 'git.release',
          args: ['--into', 'main', '--apply', '--skip-comments'],
        }),
      );
      then('it refuses, exit 2, before any release act', () => {
        expect(result.code).toBe(2);
        expect(result.stdout).not.toContain("let's watch");
      });
      then('it names the flag as unknown, on both streams', () => {
        expect(result.stdout).toContain(
          '✋ ConstraintError: unknown argument: --skip-comments',
        );
        expect(result.stderr).toContain(
          '✋ ConstraintError: unknown argument: --skip-comments',
        );
        expect(result.stdout).toContain('see every flag: rhx git.release --help');
      });
      then('it says no flag skips the gate, and how to clear it', () => {
        expect(result.stdout).toContain(
          'note: no flag skips the comment gate: answer each unanswered comment, then rerun',
        );
      });
      then('the refusal is snapped', () => {
        expect(asSkillRender(result)).toMatchSnapshot();
      });
    });
  });
});
