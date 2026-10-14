import { spawnSync } from 'child_process';
import { copyFileSync, mkdirSync } from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import {
  genPermissionLayersFixture,
  type PermissionLayerFileContent,
} from './genPermissionLayersFixture';

/**
 * .what = integration tests for which settings layers sessionstart.notify-permissions.sh lists
 * .why = the boot list must show the same union the PreToolUse gate checks (issue #895), so
 *        a clone never believes an allowed command needs a prompt; and an empty list must
 *        say so, never print no line at all
 */
describe('sessionstart.notify-permissions.sh layers', () => {
  const scriptPath = path.join(__dirname, 'sessionstart.notify-permissions.sh');

  /**
   * .what = cast one Bash pattern into a settings file that allows only it
   * .why = each layout declares its allow in one short call
   */
  const asAllowSettings = (pattern: string): PermissionLayerFileContent => ({
    json: { permissions: { allow: [`Bash(${pattern})`] } },
  });

  /**
   * .what = run the boot hook in a fresh fixture
   * .why = each case observes the boot list against its own layout
   */
  const runNotify = (input: {
    files: Record<string, PermissionLayerFileContent>;
    configDir: string | null;
  }) => {
    const fixture = genPermissionLayersFixture({
      slug: 'notify-permissions-layers',
      files: input.files,
    });
    const result = fixture.run({
      scriptPath,
      stdin: '',
      configDir: input.configDir,
      args: [],
    });
    return { ...result, tempDir: fixture.tempDir };
  };

  /**
   * .what = a run's stdout with its temp dir masked as <tmp>, and each jq parse cause as
   *         <jq error>
   * .why = a snapshot pins the notice shape, not the temp path; a jq parse message carries a
   *        version-bound lead (jq 1.6/1.7 write `jq: `, later builds drop it)
   */
  const asStdoutMasked = (input: { stdout: string; tempDir: string }) =>
    input.stdout
      .split(input.tempDir)
      .join('<tmp>')
      .replace(
        /\((?:jq: )?(?:parse error|error \(at )[^)]*\)/g,
        '(<jq error>)',
      );

  given('[case12] the boot list reads the layered allow set', () => {
    when(
      '[t0] split, walk; settings.of.repo.json allows rhx git.repo.test, home allows ls',
      () => {
        const result = useThen('the boot hook runs', async () =>
          runNotify({
            files: {
              '.claude/settings.of.repo.json': asAllowSettings(
                'rhx git.repo.test:*',
              ),
              '.claude/settings.json': { linkTo: 'home/.claude/settings.json' },
              'home/.claude/settings.json': asAllowSettings('ls:*'),
            },
            configDir: null,
          }),
        );
        then('exit 0', () => {
          expect(result.exitCode).toBe(0);
        });
        then('stdout counts the repo allow and the home allow, by head', () => {
          expect(result.stdout).toContain('rhx (1)');
          expect(result.stdout).toContain('ls (1)');
          expect(result.stdout).toContain('2 commands pre-approved');
        });
        then('stdout matches snapshot', () => {
          expect(asStdoutMasked(result)).toMatchSnapshot();
        });
      },
    );

    when(
      '[t1] ccd, split; the actor allows wavetool; the walk-up settings.of.repo.json allows foreigntide',
      () => {
        const result = useThen('the boot hook runs', async () =>
          runNotify({
            files: {
              'actor/.claude/settings.of.repo.json':
                asAllowSettings('wavetool:*'),
              '.claude/settings.of.repo.json': asAllowSettings('foreigntide:*'),
            },
            configDir: 'actor/.claude',
          }),
        );
        then('stdout counts wavetool', () => {
          expect(result.stdout).toContain('wavetool (1)');
        });
        then('stdout does not list foreigntide', () => {
          expect(result.stdout).not.toContain('foreigntide');
        });
        then('stdout names the audit log in the config dir', () => {
          expect(result.stdout).toContain(
            `jq . ${path.join(result.tempDir, 'actor/.claude')}/permission.decisions.local.log`,
          );
        });
        then('stdout matches snapshot: the config dir variant', () => {
          expect(asStdoutMasked(result)).toMatchSnapshot();
        });
      },
    );

    when('[t2] no layer holds a Bash allow', () => {
      const result = useThen('the boot hook runs', async () =>
        runNotify({ files: {}, configDir: null }),
      );
      then('exit 0; a boot hook never halts the session', () => {
        expect(result.exitCode).toBe(0);
      });
      then('stdout says no pre-approved bash permissions were found', () => {
        expect(result.stdout).toContain(
          'no pre-approved bash permissions were found',
        );
      });
      then('stdout names each path sought', () => {
        expect(result.stdout).toContain(
          `${path.join(result.tempDir, '.claude/settings.of.repo.json')}: absent`,
        );
        expect(result.stdout).toContain(
          `${path.join(result.tempDir, 'home/.claude/settings.json')}: absent`,
        );
      });
      then('stdout matches snapshot', () => {
        expect(asStdoutMasked(result)).toMatchSnapshot();
      });
    });

    when(
      '[t3] $CLAUDE_CONFIG_DIR unset; no .claude anywhere above $PWD',
      () => {
        // a bare temp dir: genTempDir's store has no .claude up its tree. the env is
        // scrubbed and HOME points inside the temp dir, so the runner's dirs never count
        const result = useThen('the boot hook runs', async () => {
          const tempDir = genTempDir({ slug: 'notify-permissions-no-dirs' });
          const { CLAUDE_CONFIG_DIR: _runnerConfigDir, ...envRest } =
            process.env;
          const spawned = spawnSync('bash', [scriptPath], {
            cwd: tempDir,
            encoding: 'utf-8',
            input: '',
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...envRest, HOME: path.join(tempDir, 'home') },
          });
          return {
            exitCode: spawned.status ?? 1,
            stdout: spawned.stdout ?? '',
            stderr: spawned.stderr ?? '',
          };
        });
        then('exit 0; a boot hook never halts the session', () => {
          expect(result.exitCode).toBe(0);
        });
        then('stdout and stderr are empty: no dir, no notice', () => {
          expect(result.stdout).toBe('');
          expect(result.stderr).toBe('');
        });
        then('stdout matches snapshot: the silent variant', () => {
          expect(result.stdout).toMatchSnapshot();
        });
      },
    );

    when(
      '[t4] the user settings.json is invalid json; settings.of.repo.json allows ls',
      () => {
        const result = useThen('the boot hook runs', async () =>
          runNotify({
            files: {
              '.claude/settings.of.repo.json': asAllowSettings('ls:*'),
              'home/.claude/settings.json': { text: '{ not json' },
            },
            configDir: null,
          }),
        );
        then('exit 0; a boot hook never halts the session', () => {
          expect(result.exitCode).toBe(0);
        });
        then('stdout names the corrupt layer, with its fix', () => {
          expect(result.stdout).toContain(
            '💥 MalfunctionError: home/.claude/settings.json is not valid json (',
          );
          expect(result.stdout).toContain('repair the json in each file named');
        });
        then('stdout still counts the valid allow', () => {
          expect(result.stdout).toContain('ls (1)');
        });
        then('stdout does not cheer over a partial list', () => {
          expect(result.stdout).not.toContain('shell yeah');
          expect(result.stdout).toContain('but only in part');
        });
        then('stdout matches snapshot: the corrupt layer variant', () => {
          expect(asStdoutMasked(result)).toMatchSnapshot();
        });
      },
    );

    when(
      '[t5] settings.of.repo.json is invalid json and the only source',
      () => {
        const result = useThen('the boot hook runs', async () =>
          runNotify({
            files: { '.claude/settings.of.repo.json': { text: '{ not json' } },
            configDir: null,
          }),
        );
        then('exit 0', () => {
          expect(result.exitCode).toBe(0);
        });
        then('stdout names the corrupt layer and the empty list', () => {
          expect(result.stdout).toContain(
            '💥 MalfunctionError: .claude/settings.of.repo.json is not valid json (',
          );
          expect(result.stdout).toContain(
            'no pre-approved bash permissions were found',
          );
        });
        then('stdout matches snapshot: the corrupt-only variant', () => {
          expect(asStdoutMasked(result)).toMatchSnapshot();
        });
      },
    );

    when(
      '[t6] ccd, split; the actor dir holds no settings.of.repo.json; its user settings.json allows ls',
      () => {
        // the walk-up settings.of.repo.json marks the split layout; under a config dir it is not read
        const result = useThen('the boot hook runs', async () =>
          runNotify({
            files: {
              'actor/.claude/settings.json': asAllowSettings('ls:*'),
              '.claude/settings.of.repo.json': asAllowSettings('foreigntide:*'),
            },
            configDir: 'actor/.claude',
          }),
        );
        then('exit 0', () => {
          expect(result.exitCode).toBe(0);
        });
        then(
          'stdout still counts the user-layer allow, not the foreign one',
          () => {
            expect(result.stdout).toContain('ls (1)');
            expect(result.stdout).not.toContain('foreigntide');
          },
        );
        then('stdout does not cheer: the actor allowlist is absent', () => {
          expect(result.stdout).not.toContain('shell yeah');
          expect(result.stdout).toContain('but only in part');
        });
        then(
          'stdout notes the absent actor file, and the fix names re-enroll',
          () => {
            const actorFile = `${path.join(result.tempDir, 'actor/.claude')}/settings.of.repo.json`;
            expect(result.stdout).toContain(`🐚 note: ${actorFile} is absent`);
            expect(result.stdout).toContain(
              `fix: this clone reads its actor allowlist from ${actorFile}, which rhx enroll derives; re-enroll this clone`,
            );
          },
        );
        then('stdout matches snapshot: the absent actor file variant', () => {
          expect(asStdoutMasked(result)).toMatchSnapshot();
        });
      },
    );

    when('[t7] ccd; the actor settings.of.repo.json is seeded', () => {
      then('stdout cheers and carries no absent-actor note', () => {
        const result = runNotify({
          files: {
            'actor/.claude/settings.of.repo.json': asAllowSettings('ls:*'),
          },
          configDir: 'actor/.claude',
        });
        expect(result.stdout).toContain('shell yeah');
        expect(result.stdout).not.toContain('is absent');
      });
    });

    when(
      '[t8] ccd, old layout; the actor dir holds no settings.of.repo.json; the project settings.json allows ls',
      () => {
        // the old layout keeps the repo's allows in settings.json, so an absent actor file is
        // expected; the vision calls this cell (#25) happy, so the boot list cheers
        then('stdout cheers and carries no absent-actor note', () => {
          const result = runNotify({
            files: {
              'actor/.claude/.keep': { text: '' },
              '.claude/settings.json': asAllowSettings('ls:*'),
            },
            configDir: 'actor/.claude',
          });
          expect(result.stdout).toContain('ls (1)');
          expect(result.stdout).toContain('shell yeah');
          expect(result.stdout).not.toContain('is absent');
        });
      },
    );
  });

  given('[case13] the layer lib is absent beside the hook', () => {
    when('[t0] the hook is copied with its render lib only, then run', () => {
      const result = useThen('the hook runs', async () => {
        const tempDir = genTempDir({ slug: 'notify-permissions-lone-hook' });
        const hookCopy = path.join(
          tempDir,
          'sessionstart.notify-permissions.sh',
        );
        copyFileSync(scriptPath, hookCopy);
        // the render lib loads first; copy it so the layer lib's absence is the fault probed
        copyFileSync(
          path.join(__dirname, '_permissions.render.lib.sh'),
          path.join(tempDir, '_permissions.render.lib.sh'),
        );
        mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
        const { CLAUDE_CONFIG_DIR: _runnerConfigDir, ...envRest } = process.env;
        const spawned = spawnSync('bash', [hookCopy], {
          cwd: tempDir,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...envRest, HOME: path.join(tempDir, 'home') },
        });
        return {
          exitCode: spawned.status ?? 1,
          stdout: spawned.stdout ?? '',
          stderr: spawned.stderr ?? '',
          tempDir,
        };
      });
      then('exit 0: the session never halts', () => {
        expect(result.exitCode).toBe(0);
      });
      then('stdout and stderr each name the fault, with the fix', () => {
        const fault = `💥 MalfunctionError: sessionstart.notify-permissions.sh could not load ${result.tempDir}/permissions.layers.operations.sh; the permission notice is skipped`;
        expect(result.stdout).toContain(fault);
        expect(result.stderr).toContain(fault);
        expect(result.stdout).toContain(
          'ask your human to run rhx init at the repo root, in their own shell, then restart the session',
        );
      });
    });
  });
});
