import { spawnSync } from 'child_process';

import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genTestDir } from './.test/invokeHook';

/**
 * .what = acceptance tests for `rhx git.pull.title get|set` and
 *         `rhx git.pull.description get|set`, run via rhachet against the linked role
 * .why  = a caller reaches the verbs through rhachet, never by their file path; the
 *         manifest registration, the spaced dispatch, and stdin passage must hold
 *         on that road. the contract itself (plan, repair, round trip, ownership,
 *         refusals) is proven in the noun integration suites
 * .note = no case here reaches github: each run stops at --help or at an input
 *         refusal, before any gh call, so no credential is needed
 */

/**
 * .what = run a verb the way a caller does: through rhachet, with an optional stdin
 */
const runViaRhachet = (input: {
  dir: string;
  skill: string;
  args: string[];
  stdin?: string;
}): { stdout: string; stderr: string; code: number | null } => {
  const result = spawnSync(
    'npx',
    ['rhachet', 'run', '--skill', input.skill, ...input.args],
    {
      cwd: input.dir,
      input: input.stdin ?? '',
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

describe('git.pull.title and git.pull.description, via rhachet', () => {
  given('[case1] a repo with the mechanic role linked', () => {
    const scene = useBeforeAll(async () => ({
      dir: await genTestDir({ slug: 'git-pull-title-description-acceptance' }),
    }));

    when('[t0] each verb is asked for --help', () => {
      const result = useThen('they run', async () => ({
        titleGet: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.title.get',
          args: ['--help'],
        }),
        titleSet: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.title.set',
          args: ['--help'],
        }),
        descGet: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.description.get',
          args: ['--help'],
        }),
        descSet: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.description.set',
          args: ['--help'],
        }),
      }));
      then('each exits 0 and names its own usage', () => {
        expect(result.titleGet.code).toBe(0);
        expect(result.titleSet.code).toBe(0);
        expect(result.descGet.code).toBe(0);
        expect(result.descSet.code).toBe(0);
        expect(result.titleGet.stdout).toContain('usage: git.pull.title.get');
        expect(result.titleSet.stdout).toContain('usage: git.pull.title.set');
        expect(result.descGet.stdout).toContain(
          'usage: git.pull.description.get',
        );
        expect(result.descSet.stdout).toContain(
          'usage: git.pull.description.set',
        );
      });
      then('the description round trip goes through a file, never a redirect', () => {
        expect(result.descGet.stdout).toContain('--to <path>');
        expect(result.descGet.stdout).toContain(
          'rhx git.pull.description get --to ./.temp/body.md',
        );
        expect(result.descGet.stdout).not.toContain('--output text >');
      });
      then('each help is snapped', () => {
        expect({
          titleGet: asSkillRender(result.titleGet),
          titleSet: asSkillRender(result.titleSet),
          descGet: asSkillRender(result.descGet),
          descSet: asSkillRender(result.descSet),
        }).toMatchSnapshot();
      });
    });

    when('[t1] the dispatchers are called with a spaced verb, or none', () => {
      const result = useThen('they run', async () => ({
        titleSetHelp: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.title',
          args: ['set', '--help'],
        }),
        descGetHelp: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.description',
          args: ['get', '--help'],
        }),
        bare: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.description',
          args: [],
        }),
      }));
      then('a known verb runs that verb', () => {
        expect(result.titleSetHelp.code).toBe(0);
        expect(result.titleSetHelp.stdout).toContain(
          'usage: git.pull.title.set',
        );
        expect(result.descGetHelp.code).toBe(0);
        expect(result.descGetHelp.stdout).toContain(
          'usage: git.pull.description.get',
        );
      });
      then('no verb refuses with exit 2 and names the verbs', () => {
        expect(result.bare.code).toBe(2);
        expect(result.bare.stdout).toContain('get | set');
        expect(asSkillRender(result.bare)).toMatchSnapshot();
      });
    });

    when('[t2] description set is piped a body of attribution lines alone', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.description.set',
          args: ['--pr', '7', '--from', '@stdin'],
          stdin:
            '🤖 Generated with [Claude Code](https://claude.com/claude-code)\n',
        }),
      );
      then('stdin reaches the verb: it is read, stripped, and refused as wordless', () => {
        expect(result.code).toBe(2);
        expect(result.stdout).toContain(
          'holds no words once its attribution lines are stripped',
        );
        expect(result.stdout).not.toContain('is empty');
        expect(result.stderr).toContain('ConstraintError');
        expect(asSkillRender(result)).toMatchSnapshot();
      });
    });

    when('[t3] description get --to names a path outside the repo', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.description.get',
          args: ['--pr', '7', '--to', '../outside-the-reef.md'],
        }),
      );
      then('it refuses with exit 2 and names the fix, on both streams', () => {
        expect(result.code).toBe(2);
        expect(result.stdout).toContain(
          "--to must name a path inside this repo, got '../outside-the-reef.md'",
        );
        expect(result.stderr).toContain('ConstraintError');
        expect(asSkillRender(result)).toMatchSnapshot();
      });
    });
  });
});
