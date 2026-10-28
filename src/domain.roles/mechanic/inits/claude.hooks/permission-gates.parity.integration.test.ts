import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = the two permission gates agree on allow vs not, for one settings pair
 * .why = `pretooluse.check-permissions.sh` (gate 2) and `permissionrequest.decide-permissions.sh`
 *        (the seam) each load the allowlist and match a command with their own copy of the
 *        loader and matcher. no runtime link ties them, so a change to one loader (a third
 *        settings file, a new pattern shape) could let the seam auto-approve what gate 2 blocks,
 *        in silence. this suite runs every command through both and compares
 * .note = neither gate lets a prefix cut through a word (`npm run test:*` does not match
 *         `npm run testx`); the seam is stricter still (whitespace only, so it does not match
 *         `npm run test:unit`, which gate 2 paves). so the invariant is containment — every seam
 *         allow is a gate-2 allow — plus equality on the plain single commands listed as such
 */
describe('permission gates parity (check-permissions vs decide-permissions)', () => {
  const gatePath = path.join(__dirname, 'pretooluse.check-permissions.sh');
  const seamPath = path.join(
    __dirname,
    'permissionrequest.decide-permissions.sh',
  );

  const ALLOW = [
    'Bash(npm run test:*)',
    'Bash(git status)',
    'Bash(tree:*)',
    'Bash(jq)',
    'Bash(cat:*)',
  ];

  /**
   * .what = the env both gates run under: the runner's, minus its own settings layers
   * .why = the loader takes $CLAUDE_CONFIG_DIR over the temp repo, and $HOME/.claude as the user
   *        layer (permissions.layers.operations.sh). left in, a run from a clone whose config dir
   *        is set reads that clone's allowlist, not ALLOW, and the verdicts follow it
   *        (rule.require.hermetic-tests)
   */
  const ENV_HERMETIC = {
    ...process.env,
    CLAUDE_CONFIG_DIR: undefined,
    HOME: '/nonexistent-home',
  };

  /**
   * .what = a temp repo with the settings pair both gates read
   * .note = returns an object: useBeforeAll proxies its value
   */
  const genRepo = (): { dir: string } => {
    const dir = genTempDir({ slug: 'permission-gates-parity', git: true });
    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, '.claude', 'settings.json'),
      JSON.stringify({ permissions: { allow: ALLOW, deny: [], ask: [] } }),
    );
    return { dir };
  };

  /**
   * .what = does gate 2 let the command run? (exit 0, no ask payload)
   * .note = each call runs in a fresh repo, so it is always a first attempt — never a retry
   */
  const isAllowedByGate = (input: { command: string }): boolean => {
    const repo = genRepo();
    const result = spawnSync('bash', [gatePath], {
      cwd: repo.dir,
      env: ENV_HERMETIC,
      encoding: 'utf-8',
      input: JSON.stringify({
        tool_name: 'Bash',
        tool_input: { command: input.command },
      }),
    });
    return result.status === 0 && (result.stdout ?? '').trim() === '';
  };

  /**
   * .what = does the seam auto-approve the command? (decision.behavior = allow)
   */
  const isAllowedBySeam = (input: { command: string }): boolean => {
    const repo = genRepo();
    const result = spawnSync('bash', [seamPath], {
      cwd: repo.dir,
      env: ENV_HERMETIC,
      encoding: 'utf-8',
      input: JSON.stringify({
        tool_name: 'Bash',
        hook_event_name: 'PermissionRequest',
        tool_input: { command: input.command },
      }),
    });
    const stdout = (result.stdout ?? '').trim();
    if (!stdout) return false;
    return (
      JSON.parse(stdout)?.hookSpecificOutput?.decision?.behavior === 'allow'
    );
  };

  /**
   * .what = plain single commands: no compound, no prefix assignment. both gates must agree
   */
  const PLAIN = [
    'npm run test',
    'npm run test -- --watch',
    'git status',
    'git status -s',
    'tree -L 1 src',
    'jq',
    'jq .scripts package.json',
    'cat package.json',
    'python3 -c "print(1)"',
    'du -sh dist',
  ];

  /**
   * .what = shapes where the seam may be stricter than gate 2, never looser
   */
  const EDGE = [
    'npm run testx',
    'git status && tree src',
    'cat package.json | jq',
    'git status; du -sh dist',
    'WAVE=1 npm run test',
    'tree src > out.txt',
    'cat "$(echo package.json)"',
    'git status\ndu -sh dist',
  ];

  given('[case1] plain single commands', () => {
    const verdicts = useBeforeAll(async () => ({
      rows: PLAIN.map((command) => ({
        command,
        gate: isAllowedByGate({ command }),
        seam: isAllowedBySeam({ command }),
      })),
    }));

    when('[t0] each command runs through both gates', () => {
      then('both gates return the same verdict for every command', () => {
        const drift = verdicts.rows.filter((row) => row.gate !== row.seam);
        expect(drift).toEqual([]);
      });

      then(
        'the matrix holds allowed and blocked commands alike, so the check is not vacuous',
        () => {
          expect(verdicts.rows.some((row) => row.gate)).toBe(true);
          expect(verdicts.rows.some((row) => !row.gate)).toBe(true);
        },
      );

      then('the verdict table matches snapshot', () => {
        expect(verdicts.rows).toMatchSnapshot();
      });
    });
  });

  given('[case2] compounds, assignments, redirects, substitutions', () => {
    const verdicts = useBeforeAll(async () => ({
      rows: EDGE.map((command) => ({
        command,
        gate: isAllowedByGate({ command }),
        seam: isAllowedBySeam({ command }),
      })),
    }));

    when('[t0] each command runs through both gates', () => {
      then(
        'every seam auto-approve is also a gate-2 allow (the seam is never looser)',
        () => {
          const looser = verdicts.rows.filter((row) => row.seam && !row.gate);
          expect(looser).toEqual([]);
        },
      );

      then('the verdict table matches snapshot', () => {
        expect(verdicts.rows).toMatchSnapshot();
      });
    });
  });
});
