import { spawnSync } from 'child_process';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { ConstraintError } from 'helpful-errors';
import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

import { asResolvedToolPaths } from './asResolvedToolPaths';
import { asTallyByTool } from './asTallyByTool';
import { genPermissionLayersFixture } from './genPermissionLayersFixture';

/**
 * .what = clamps the exec count of pretooluse.check-permissions.sh on its pass path
 * .why = the hook runs before every Bash call; the layer read (issue #895) added a jq
 *        per settings file. a ratchet holds that fixed cost, so a later edit cannot
 *        grow it unseen
 *
 * .how = a PATH shim per external tool: it appends its name to a tally file, then
 *        execs the real binary, so it adds no fork and shifts no verdict
 *        (the method of pretooluse.forbid-terms.forkbudget.integration.test.ts)
 *
 * .note = the shim counts execs; a bare $( ) around a bash function forks without
 *         an exec and stays invisible. execs dominate the cost, so this is a floor
 */
describe('pretooluse.check-permissions.sh · fork budget', () => {
  const scriptPath = path.join(__dirname, 'pretooluse.check-permissions.sh');

  /**
   * .what = the ratchet: measured count plus small headroom
   * .note = measured at 8 on the old layout, the costliest case (jq x5: one stdin read + one
   *         per extant layer; cat, dirname, sort); 6 on the split layout, which reads two layers.
   *         to raise it is fine, and is the decision this clamp exists to force
   */
  const RATCHET = 10;

  /**
   * .what = every external command the hook can reach
   * .why = a command absent from this list would go uncounted
   */
  const TALLIED = [
    'jq',
    'grep',
    'sed',
    'cat',
    'date',
    'mktemp',
    'mv',
    'rm',
    'dirname',
    'sort',
    'tr',
    'mkdir',
    'awk',
    'basename',
    'timeout',
  ];

  /**
   * .what = the layer files of each layout, every one extant, for a hash actor
   * .why = the old layout reads up to four extant files; the split layout reads two (the actor
   *        repo file and the user file), so each layout has its own pass-path cost
   */
  const LAYOUT_FILES = {
    split: {
      'actor/.claude/settings.of.repo.json': {
        json: { permissions: { allow: ['Bash(rhx review:*)'] } },
      },
      'actor/.claude/settings.json': {
        json: { permissions: { allow: ['Bash(tree:*)'] } },
      },
    },
    old: {
      'actor/.claude/settings.local.json': {
        json: { permissions: { allow: ['Bash(cat:*)'] } },
      },
      'actor/.claude/settings.json': {
        json: { permissions: { allow: ['Bash(tree:*)'] } },
      },
      '.claude/settings.json': {
        json: { permissions: { allow: ['Bash(rhx review:*)'] } },
      },
      '.claude/settings.local.json': {
        json: { permissions: { allow: ['Bash(pwd)'] } },
      },
    },
  } as const;

  /**
   * .what = run the hook on a hash-actor fixture of the given layout, with a shim tally
   * .why = the pass path with every layer of the layout extant is its costliest common case
   */
  const runWithTally = (input: {
    command: string;
    layout: keyof typeof LAYOUT_FILES;
  }) => {
    const fixture = genPermissionLayersFixture({
      slug: `check-permissions-forkbudget-${input.layout}`,
      files: LAYOUT_FILES[input.layout],
    });
    const shimDir = path.join(fixture.tempDir, 'shim');
    const tallyFile = path.join(fixture.tempDir, 'tally.txt');
    mkdirSync(shimDir, { recursive: true });
    writeFileSync(tallyFile, '');

    // fail loud on an absent tool: its shim would be absent, and its count lost
    const realPathOf = asResolvedToolPaths({ tools: TALLIED });
    const toolsAbsent = TALLIED.filter((tool) => !realPathOf[tool]);
    if (toolsAbsent.length)
      throw new ConstraintError(
        'the fork-budget instrument is incomplete — a tallied tool is absent from PATH',
        {
          toolsAbsent,
          hint: 'install the absent tool, or drop it from TALLIED with a note that states why',
        },
      );

    // one shim per tool: tally, then exec the real binary
    for (const [tool, realPath] of Object.entries(realPathOf)) {
      const shimPath = path.join(shimDir, tool);
      writeFileSync(
        shimPath,
        `#!/bin/sh\nprintf '%s\\n' ${tool} >> "${tallyFile}"\nexec "${realPath}" "$@"\n`,
      );
      chmodSync(shimPath, 0o755);
    }

    // run the hook with the shim at the head of PATH
    const { CLAUDE_CONFIG_DIR: _runnerConfigDir, ...envRest } = process.env;
    const result = spawnSync('bash', [scriptPath], {
      cwd: fixture.tempDir,
      encoding: 'utf-8',
      input: JSON.stringify({
        tool_name: 'Bash',
        tool_input: { command: input.command },
      }),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...envRest,
        HOME: path.join(fixture.tempDir, 'home'),
        CLAUDE_CONFIG_DIR: path.join(fixture.tempDir, 'actor/.claude'),
        PATH: `${shimDir}:${process.env.PATH ?? ''}`,
      },
    });
    const execs = readFileSync(tallyFile, 'utf-8')
      .split('\n')
      .filter((line) => line.length > 0);
    return {
      exitCode: result.status ?? 1,
      stderr: result.stderr ?? '',
      execs,
      byTool: asTallyByTool({ execs }),
    };
  };

  const LAYOUT_CASES = [
    {
      given: '[case1] a hash actor on the split layout, both layers extant',
      layout: 'split',
      jqExpected: 3, // one stdin read + one per layer
    },
    {
      // the actor settings.of.repo.json is absent by definition here: its presence marks split
      given:
        '[case2] a hash actor on the old layout, its four other layers extant',
      layout: 'old',
      jqExpected: 5, // one stdin read + one per layer
    },
  ] as const;

  LAYOUT_CASES.map((layoutCase) =>
    given(layoutCase.given, () => {
      when('[t0] the clone runs an allowlisted command', () => {
        const result = useThen('the hook runs', async () =>
          runWithTally({
            command: 'rhx review --rules x',
            layout: layoutCase.layout,
          }),
        );
        then('exit 0, with no stderr: the command passes', () => {
          // one assertion on both, so a failure prints the hook's own reason
          expect({ exitCode: result.exitCode, stderr: result.stderr }).toEqual({
            exitCode: 0,
            stderr: '',
          });
        });
        then(`the hook execs at most ${RATCHET} external commands`, () => {
          expect(result.execs.length).toBeLessThanOrEqual(RATCHET);
        });
        then('the layer read spends one jq per extant file, no grep', () => {
          expect(result.byTool.jq).toEqual(layoutCase.jqExpected);
          expect(result.byTool.grep ?? 0).toEqual(0);
          expect(result.byTool.sort ?? 0).toBeLessThanOrEqual(1);
        });
        then('the exec tally by tool matches snapshot', () => {
          expect(result.byTool).toMatchSnapshot();
        });
      });
    }),
  );
});
