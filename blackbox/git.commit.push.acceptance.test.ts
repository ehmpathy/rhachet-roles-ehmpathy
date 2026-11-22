import { spawnSync } from 'child_process';
import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genTestDir } from './.test/invokeHook';

/**
 * .what = acceptance tests for `rhx git.commit.push`, run via rhachet against the linked role
 * .why  = a caller reaches the push through rhachet, never by its file path; the
 *         manifest registration and the dispatch must hold on that road. the contract
 *         itself (push, pr findsert, watch) is proven in git.commit.push.integration.test.ts
 *         and git.commit.push.watch-journey.integration.test.ts
 * .note = no case here reaches git or github: each run stops at --help or at an input
 *         refusal, before any push, so no credential is needed
 */

/**
 * .what = run the skill the way a caller does: through rhachet
 */
const runViaRhachet = (input: {
  dir: string;
  args: string[];
}): { stdout: string; stderr: string; code: number | null } => {
  const result = spawnSync(
    'npx',
    ['rhachet', 'run', '--skill', 'git.commit.push', ...input.args],
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
 * .what = what the caller sees, from the skill's first line on (a 🐢 or ✋ header,
 *         or a help's usage line), color codes stripped
 * .why  = npx and rhachet may print before the skill; color codes vary by terminal
 */
const asSkillRender = (input: { stdout: string }): string => {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: strip ansi color codes
  const plain = input.stdout.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
  const at = plain.search(/🐢|✋|^usage: /mu);
  return plain.slice(Math.max(0, at));
};

describe('git.commit.push, via rhachet', () => {
  given('[case1] a repo with the mechanic role linked', () => {
    const scene = useBeforeAll(async () => ({
      dir: await genTestDir({ slug: 'git-commit-push-acceptance' }),
    }));

    when('[t0] the push is asked for --help', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({ dir: scene.dir, args: ['--help'] }),
      );
      then('it exits 0 and names its usage and each flag', () => {
        expect(result.code).toBe(0);
        expect(result.stdout).toContain('usage: git.commit.push');
        expect(result.stdout).toContain('--mode plan|apply');
        expect(result.stdout).toContain('--auth as-ehmpath|as-human');
      });
      then('the help is snapped', () => {
        expect(asSkillRender(result)).toMatchSnapshot();
      });
    });

    when('[t1] the push is handed an unknown --mode', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({ dir: scene.dir, args: ['--mode', 'surf'] }),
      );
      then('it refuses with exit 2, on both streams', () => {
        expect(result.code).toBe(2);
        expect(result.stdout).toContain(
          "✋ ConstraintError: --mode must be 'plan' or 'apply'",
        );
        expect(result.stderr).toContain(
          "✋ ConstraintError: --mode must be 'plan' or 'apply'",
        );
      });
      then('the refusal is snapped', () => {
        expect(asSkillRender(result)).toMatchSnapshot();
      });
    });
  });
});
