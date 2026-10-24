import { spawnSync } from 'child_process';

import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genTestDir } from './.test/invokeHook';

/**
 * .what = acceptance tests for `rhx github.comment.get | set | del`, run via rhachet against the linked role
 * .why  = a caller reaches the verbs through rhachet, never by their file path; the
 *         manifest registration and the dispatch must hold on that road. the contract
 *         itself (plan, upsert, thread scope, refusals) is proven in
 *         github.comment.integration.test.ts, and against the real api in
 *         github.comment.real.integration.test.ts
 * .note = no case here reaches github: each run stops at --help or at an input
 *         refusal, before any gh call, so no credential is needed
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
 * .what = what the caller sees, from the skill's 🐢 header on, color codes stripped
 * .why  = npx and rhachet may print before the skill; color codes vary by terminal
 */
const asSkillRender = (input: { stdout: string }): string => {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: strip ansi color codes
  const plain = input.stdout.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
  const at = plain.search(/🐢|✋/u);
  return plain.slice(Math.max(0, at));
};

describe('github.comment, via rhachet', () => {
  given('[case1] a repo with the mechanic role linked', () => {
    const scene = useBeforeAll(async () => ({
      dir: await genTestDir({ slug: 'github-comment-acceptance' }),
    }));

    when('[t0] each verb is asked for --help', () => {
      const result = useThen('they run', async () => ({
        get: runViaRhachet({
          dir: scene.dir,
          skill: 'github.comment.get',
          args: ['--help'],
        }),
        set: runViaRhachet({
          dir: scene.dir,
          skill: 'github.comment.set',
          args: ['--help'],
        }),
        del: runViaRhachet({
          dir: scene.dir,
          skill: 'github.comment.del',
          args: ['--help'],
        }),
      }));
      then('each exits 0 and names its own usage', () => {
        expect(result.get.code).toBe(0);
        expect(result.set.code).toBe(0);
        expect(result.del.code).toBe(0);
        expect(result.get.stdout).toContain('usage: rhx github.comment.get');
        expect(result.set.stdout).toContain('usage: rhx github.comment.set');
        expect(result.del.stdout).toContain('usage: rhx github.comment.del');
      });
      then('each help is snapped', () => {
        expect({
          get: asSkillRender(result.get),
          set: asSkillRender(result.set),
          del: asSkillRender(result.del),
        }).toMatchSnapshot();
      });
    });

    when('[t1] set names a body file that is absent', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({
          dir: scene.dir,
          skill: 'github.comment.set',
          args: ['--pr', '7', '--key', 'status', '--from', './absent.md'],
        }),
      );
      then('it refuses with exit 2 and names the fix, on both streams', () => {
        expect(result.code).toBe(2);
        expect(result.stdout).toContain(
          "✋ ConstraintError: --from './absent.md' is not a file",
        );
        expect(result.stderr).toContain('ConstraintError');
        expect(asSkillRender(result)).toMatchSnapshot();
      });
    });

    when('[t2] get and del each meet an input refusal', () => {
      const result = useThen('they run', async () => ({
        get: runViaRhachet({
          dir: scene.dir,
          skill: 'github.comment.get',
          args: ['--pr', '7', '--id', '5'],
        }),
        del: runViaRhachet({
          dir: scene.dir,
          skill: 'github.comment.del',
          args: ['--pr', '7', '--kind', 'body'],
        }),
      }));
      then('each refuses with exit 2 and names the fix', () => {
        expect(result.get.code).toBe(2);
        expect(result.get.stdout).toContain('--id needs --kind issue|review');
        expect(result.del.code).toBe(2);
        expect(result.del.stdout).toContain(
          'github offers no delete for a pr description',
        );
        expect({
          get: asSkillRender(result.get),
          del: asSkillRender(result.del),
        }).toMatchSnapshot();
      });
    });
  });
});
