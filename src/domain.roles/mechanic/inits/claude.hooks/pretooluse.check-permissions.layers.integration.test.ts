import { spawnSync } from 'child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import {
  genPermissionLayersFixture,
  type PermissionLayerFileContent,
} from './genPermissionLayersFixture';

/**
 * .what = integration tests for which settings layers pretooluse.check-permissions.sh reads
 * .why = the hook must read the same layers claude merges — on the split layout, the actor
 *        settings.of.repo.json + the user settings.json; on the old layout, also the local files
 *        and the project settings.json — so it never blocks a command claude allows, and never
 *        passes a command on another actor's allowlist (issue #895)
 */
describe('pretooluse.check-permissions.sh layers', () => {
  const scriptPath = path.join(__dirname, 'pretooluse.check-permissions.sh');

  /**
   * .what = cast one Bash pattern into a settings file that allows only it
   * .why = each layout declares its allow in one short call
   */
  const asAllowSettings = (pattern: string): PermissionLayerFileContent => ({
    json: { permissions: { allow: [`Bash(${pattern})`] } },
  });

  /**
   * .what = run the check hook for one command in one fresh fixture
   * .why = each case observes exit code and stderr against its own layout
   */
  const runCheck = (input: {
    files: Record<string, PermissionLayerFileContent>;
    command: string;
    configDir: string | null;
  }) => {
    const fixture = genPermissionLayersFixture({
      slug: 'check-permissions-layers',
      files: input.files,
    });
    const result = fixture.run({
      scriptPath,
      stdin: JSON.stringify({
        tool_name: 'Bash',
        tool_input: { command: input.command },
      }),
      configDir: input.configDir,
      args: [],
    });
    return { ...result, tempDir: fixture.tempDir };
  };

  /**
   * .what = a run's output with its temp dir masked as <tmp>, each os or jq fault cause inside
   *         a record malfunction as <os error>, and each jq parse cause as <jq error>
   * .why = a snapshot pins the message shape, not the temp path; an os or jq fault message
   *        carries locale-bound quotes, line numbers, and a version-bound lead (jq 1.6/1.7
   *        write `jq: `, later builds drop it), so its text is asserted apart
   */
  const asTextMasked = (input: { text: string; tempDir: string }) =>
    input.text
      .split(input.tempDir)
      .join('<tmp>')
      .replace(
        /(the nudge record[^(]*\(<tmp>[^:]*): .*?\) — /g,
        '$1: <os error>) — ',
      )
      .replace(/(settings file unparseable: [^(]*)\([^)]*\)/g, '$1(<jq error>)')
      .replace(
        /\((?:jq: )?(?:parse error|error \(at )[^)]*\)/g,
        '(<jq error>)',
      );
  const asStderrMasked = (input: { stderr: string; tempDir: string }) =>
    asTextMasked({ text: input.stderr, tempDir: input.tempDir });

  // the split layout of the repo actor: repo allows in settings.of.repo.json, settings.json → home
  const splitRepoActor = {
    '.claude/settings.of.repo.json': asAllowSettings('rhx git.repo.test:*'),
    '.claude/settings.json': { linkTo: 'home/.claude/settings.json' },
    'home/.claude/settings.json': asAllowSettings('ls:*'),
  };

  // the split layout of a hash actor, beside the repo actor's split layout
  const splitHashActor = {
    'actor/.claude/settings.of.repo.json': asAllowSettings('rhx review:*'),
    'actor/.claude/settings.json': asAllowSettings('cat:*'),
    '.claude/settings.of.repo.json': asAllowSettings('npm run build:*'),
    '.claude/settings.json': { linkTo: 'home/.claude/settings.json' },
    'home/.claude/settings.json': asAllowSettings('tree:*'),
  };

  /**
   * .what = a copy of a layout without one file
   * .why = a negative control proves which layer a pass came from
   */
  const without = (input: {
    files: Record<string, PermissionLayerFileContent>;
    relPath: string;
  }) =>
    Object.fromEntries(
      Object.entries(input.files).filter(([k]) => k !== input.relPath),
    );

  given(
    '[case1] split layout, repo actor: allows in settings.of.repo.json, settings.json → home',
    () => {
      when(
        '[t0] the clone runs a command listed only in settings.of.repo.json',
        () => {
          const result = useThen('the hook runs', async () =>
            runCheck({
              files: splitRepoActor,
              command: 'rhx git.repo.test --what types',
              configDir: null,
            }),
          );
          then('exit 0', () => {
            expect(result.exitCode).toBe(0);
          });
          then('stderr is empty', () => {
            expect(result.stderr).toBe('');
          });
          then(
            'with settings.of.repo.json absent, the same command exits 2 (the pass came from this layer)',
            () => {
              const control = runCheck({
                files: without({
                  files: splitRepoActor,
                  relPath: '.claude/settings.of.repo.json',
                }),
                command: 'rhx git.repo.test --what types',
                configDir: null,
              });
              expect(control.exitCode).toBe(2);
            },
          );
        },
      );

      when(
        '[t1] the clone runs a command listed only in the home file, via the project link',
        () => {
          then('exit 0', () => {
            const result = runCheck({
              files: splitRepoActor,
              command: 'ls -la',
              configDir: null,
            });
            expect(result.exitCode).toBe(0);
          });
          then(
            'with the home file absent, the same command exits 2 (the home layer was read)',
            () => {
              const control = runCheck({
                files: without({
                  files: splitRepoActor,
                  relPath: 'home/.claude/settings.json',
                }),
                command: 'ls -la',
                configDir: null,
              });
              expect(control.exitCode).toBe(2);
            },
          );
        },
      );
    },
  );

  given(
    '[case2] a hash actor on the split layout, CLAUDE_CONFIG_DIR=<tmp>/actor/.claude',
    () => {
      const cases = [
        {
          label: '[t0] its own settings.of.repo.json',
          command: 'rhx review --rules x',
          file: 'actor/.claude/settings.of.repo.json',
        },
        {
          label: '[t1] its own user-scope settings.json',
          command: 'cat readme.md',
          file: 'actor/.claude/settings.json',
        },
      ];
      for (const item of cases) {
        when(`${item.label} lists the command, and no other file does`, () => {
          then('exit 0', () => {
            const result = runCheck({
              files: splitHashActor,
              command: item.command,
              configDir: 'actor/.claude',
            });
            expect(result.exitCode).toBe(0);
          });
          then('with that one file absent, the same command exits 2', () => {
            const control = runCheck({
              files: without({ files: splitHashActor, relPath: item.file }),
              command: item.command,
              configDir: 'actor/.claude',
            });
            expect(control.exitCode).toBe(2);
          });
        });
      }
      when(
        '[t2] only the project settings.json (→ home) lists the command',
        () => {
          then(
            'exit 2: a clone runs with --setting-sources user, so claude never loads the project layer',
            () => {
              const result = runCheck({
                files: splitHashActor,
                command: 'tree src',
                configDir: 'actor/.claude',
              });
              expect(result.exitCode).toBe(2);
            },
          );
        },
      );
    },
  );

  given(
    '[case3] old layout: allows in a real <tmp>/.claude/settings.json',
    () => {
      when('[t0] the clone runs a listed command', () => {
        then('exit 0', () => {
          const result = runCheck({
            files: {
              '.claude/settings.json': asAllowSettings('npm run build:*'),
            },
            command: 'npm run build',
            configDir: null,
          });
          expect(result.exitCode).toBe(0);
        });
      });
    },
  );

  given(
    '[case4] CLAUDE_CONFIG_DIR names a dir with no settings file; allows in the project settings.json',
    () => {
      const files = {
        'actor/.claude/.keep': { text: '' },
        '.claude/settings.json': asAllowSettings('rhx git.repo.test:*'),
      };
      when('[t0] the clone runs a project-listed command', () => {
        then('exit 0, via the project layer', () => {
          const result = runCheck({
            files,
            command: 'rhx git.repo.test --what lint',
            configDir: 'actor/.claude',
          });
          expect(result.exitCode).toBe(0);
        });
      });
      when('[t1] CLAUDE_CONFIG_DIR names a dir that does not exist', () => {
        then('exit 0, via the project layer', () => {
          const result = runCheck({
            files: {
              '.claude/settings.json': asAllowSettings('rhx git.repo.test:*'),
            },
            command: 'rhx git.repo.test --what lint',
            configDir: 'absent/.claude',
          });
          expect(result.exitCode).toBe(0);
        });
      });
      when(
        '[t2] CLAUDE_CONFIG_DIR names a dir that does not exist; an unlisted command',
        () => {
          const result = useThen('the hook runs', async () => {
            const run = runCheck({
              files: {
                '.claude/settings.json': asAllowSettings('rhx git.repo.test:*'),
              },
              command: 'wavetool --unlisted',
              configDir: 'absent/.claude',
            });
            return {
              ...run,
              configDirMade: existsSync(path.join(run.tempDir, 'absent')),
            };
          });
          then('exit 2: the command blocks', () => {
            expect(result.exitCode).toBe(2);
          });
          then('the hook does not create the absent config dir', () => {
            expect(result.configDirMade).toBe(false);
          });
          then('stderr names the absent dir as a MalfunctionError', () => {
            expect(result.stderr).toContain(
              `💥 MalfunctionError: the nudge record could not be created (${path.join(result.tempDir, 'absent/.claude/permission.nudges.local.json')}: `,
            );
            expect(result.stderr).toContain(
              `make ${path.join(result.tempDir, 'absent/.claude')} a writable dir`,
            );
          });
          then('stderr matches snapshot', () => {
            expect(asStderrMasked(result)).toMatchSnapshot();
          });
        },
      );
    },
  );

  given(
    '[case5] a hash actor, and a command listed only in the repo actor settings.of.repo.json',
    () => {
      when('[t0] the clone runs that command', () => {
        const result = useThen('the hook runs', async () =>
          runCheck({
            files: splitHashActor,
            command: 'npm run build',
            configDir: 'actor/.claude',
          }),
        );
        then('exit 2: another actor allowlist never counts', () => {
          expect(result.exitCode).toBe(2);
        });
        then(
          'stderr names the config dir it read, and no project layer (the split layout)',
          () => {
            expect(result.stderr).toContain(
              `judged by the allowlist of config dir ${path.join(result.tempDir, 'actor/.claude')}`,
            );
            expect(result.stderr).not.toContain('plus the project layer');
          },
        );
        then('stderr offers no foreign allow as a candidate', () => {
          expect(result.stderr).not.toMatch(/\[[pe]\] npm run build/);
        });
        then('stderr matches snapshot: the config dir variant', () => {
          expect(asStderrMasked(result)).toMatchSnapshot();
        });
      });
    },
  );

  given('[case6] an unlisted command still blocks', () => {
    when('[t0] split layout, repo actor', () => {
      const result = useThen('the hook runs', async () =>
        runCheck({
          files: splitRepoActor,
          command: 'wavetool --go',
          configDir: null,
        }),
      );
      then('exit 2', () => {
        expect(result.exitCode).toBe(2);
      });
      then('stderr names no config dir (it is the walk-up dir)', () => {
        expect(result.stderr).not.toContain('allowlist of config dir');
      });
      then('stderr matches snapshot: the walk-up variant', () => {
        expect(asStderrMasked(result)).toMatchSnapshot();
      });
    });
    when('[t1] a hash actor', () => {
      const result = useThen('the hook runs', async () =>
        runCheck({
          files: splitHashActor,
          command: 'wavetool --go',
          configDir: 'actor/.claude',
        }),
      );
      then('exit 2, and stderr names the config dir that judged it', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain(
          `judged by the allowlist of config dir ${path.join(result.tempDir, 'actor/.claude')}`,
        );
      });
      then('stderr matches snapshot: the config dir variant', () => {
        expect(asStderrMasked(result)).toMatchSnapshot();
      });
    });
    when('[t2] the clone retries the same command within the window', () => {
      then('the second run exits 0', () => {
        const fixture = genPermissionLayersFixture({
          slug: 'check-permissions-layers',
          files: splitHashActor,
        });
        const stdin = JSON.stringify({
          tool_name: 'Bash',
          tool_input: { command: 'wavetool --go' },
        });
        const first = fixture.run({
          scriptPath,
          stdin,
          configDir: 'actor/.claude',
          args: [],
        });
        const second = fixture.run({
          scriptPath,
          stdin,
          configDir: 'actor/.claude',
          args: [],
        });
        expect(first.exitCode).toBe(2);
        expect(second.exitCode).toBe(0);
      });
      then(
        'the nudge record lands in the config dir, not the walk-up dir',
        () => {
          const fixture = genPermissionLayersFixture({
            slug: 'check-permissions-layers',
            files: splitHashActor,
          });
          fixture.run({
            scriptPath,
            stdin: JSON.stringify({
              tool_name: 'Bash',
              tool_input: { command: 'wavetool --go' },
            }),
            configDir: 'actor/.claude',
            args: [],
          });
          expect(
            existsSync(
              path.join(
                fixture.tempDir,
                'actor/.claude/permission.nudges.local.json',
              ),
            ),
          ).toBe(true);
          expect(
            existsSync(
              path.join(
                fixture.tempDir,
                '.claude/permission.nudges.local.json',
              ),
            ),
          ).toBe(false);
        },
      );
    });
  });

  given('[case7] no allowlist found in any layer', () => {
    when('[t0] CLAUDE_CONFIG_DIR unset, an empty <tmp>/.claude', () => {
      const result = useThen('the hook runs', async () =>
        runCheck({ files: {}, command: 'pwd', configDir: null }),
      );
      then('exit 2', () => {
        expect(result.exitCode).toBe(2);
      });
      then('stderr says no pre-approved bash permissions were found', () => {
        expect(result.stderr).toContain(
          'no pre-approved bash permissions were found',
        );
      });
      then('stderr names each file sought, with its state', () => {
        expect(result.stderr).toContain(
          `${path.join(result.tempDir, '.claude/settings.of.repo.json')}: absent`,
        );
        expect(result.stderr).toContain(
          `${path.join(result.tempDir, 'home/.claude/settings.json')}: absent`,
        );
      });
      then('stderr matches snapshot', () => {
        expect(asStderrMasked(result)).toMatchSnapshot();
      });
    });
    when(
      '[t1] CLAUDE_CONFIG_DIR set; neither the config dir nor the walk-up dir holds an allow',
      () => {
        const result = useThen('the hook runs', async () =>
          runCheck({
            files: {
              'actor/.claude/settings.of.repo.json': {
                json: { permissions: { allow: [] } },
              },
            },
            command: 'pwd',
            configDir: 'actor/.claude',
          }),
        );
        then(
          'exit 2, and stderr names the two files a split-layout clone loads',
          () => {
            expect(result.exitCode).toBe(2);
            expect(result.stderr).toContain(
              `${path.join(result.tempDir, 'actor/.claude/settings.of.repo.json')}: 0 Bash allow rules`,
            );
            expect(result.stderr).toContain(
              `${path.join(result.tempDir, 'actor/.claude/settings.json')}: absent`,
            );
            expect(result.stderr).not.toContain(
              `${path.join(result.tempDir, '.claude/settings.json')}:`,
            );
          },
        );
        then(
          'the fix names the actor file, not rhx init: init writes only the repo .claude',
          () => {
            expect(result.stderr).toContain(
              `fix: this clone reads its actor allowlist from ${path.join(result.tempDir, 'actor/.claude')}/settings.of.repo.json`,
            );
            expect(result.stderr).not.toContain(
              "to write the repo's allowlist",
            );
          },
        );
        then('the walk-up variant [t0] names rhx init', () => {
          const walkup = runCheck({
            files: {},
            command: 'pwd',
            configDir: null,
          });
          expect(walkup.stderr).toContain(
            "fix: to write the repo's allowlist, ask your human to run rhx init at the repo root, in their own shell",
          );
        });
        then('stderr matches snapshot', () => {
          expect(asStderrMasked(result)).toMatchSnapshot();
        });
      },
    );
  });

  given('[case8] a home allow passes, as claude passes it', () => {
    when(
      '[t0] old layout; the allow lives only in <tmp>/home/.claude/settings.json',
      () => {
        then('exit 0', () => {
          const result = runCheck({
            files: {
              '.claude/settings.json': asAllowSettings('npm run build:*'),
              'home/.claude/settings.json': asAllowSettings('tree:*'),
            },
            command: 'tree src',
            configDir: null,
          });
          expect(result.exitCode).toBe(0);
        });
      },
    );
    when(
      '[t1] CLAUDE_CONFIG_DIR unset; the only allow lives in <tmp>/home/.claude/settings.json; <tmp>/.claude holds no settings file',
      () => {
        then('exit 0: the user layer alone carries the allow', () => {
          const result = runCheck({
            files: { 'home/.claude/settings.json': asAllowSettings('tree:*') },
            command: 'tree src',
            configDir: null,
          });
          expect(result.exitCode).toBe(0);
        });
        then(
          'with the home file absent, the same command exits 2 (the pass came from the user layer)',
          () => {
            const control = runCheck({
              files: {},
              command: 'tree src',
              configDir: null,
            });
            expect(control.exitCode).toBe(2);
          },
        );
      },
    );
    when(
      '[t2] split layout; settings.of.repo.json lists another command; the home file, not linked, lists the command',
      () => {
        const files = {
          '.claude/settings.of.repo.json': asAllowSettings(
            'rhx git.repo.test:*',
          ),
          'home/.claude/settings.json': asAllowSettings('tree:*'),
        };
        then('exit 0', () => {
          const result = runCheck({
            files,
            command: 'tree src',
            configDir: null,
          });
          expect(result.exitCode).toBe(0);
        });
        then(
          'with the home file absent, the same command exits 2 (the pass came from the user layer)',
          () => {
            const control = runCheck({
              files: without({ files, relPath: 'home/.claude/settings.json' }),
              command: 'tree src',
              configDir: null,
            });
            expect(control.exitCode).toBe(2);
          },
        );
      },
    );
  });

  given('[case9] old layout, an unlisted command', () => {
    const files = {
      '.claude/settings.json': asAllowSettings('npm run build:*'),
    };
    when('[t0] CLAUDE_CONFIG_DIR unset', () => {
      const result = useThen('the hook runs', async () =>
        runCheck({ files, command: 'wavetool', configDir: null }),
      );
      then(
        'exit 2, with no config dir line (the walk-up dir judged it)',
        () => {
          expect(result.exitCode).toBe(2);
          expect(result.stderr).not.toContain('allowlist of config dir');
        },
      );
      then('the project allow still passes', () => {
        expect(
          runCheck({ files, command: 'npm run build', configDir: null })
            .exitCode,
        ).toBe(0);
      });
      then('stderr matches snapshot: the old layout variant', () => {
        expect(asStderrMasked(result)).toMatchSnapshot();
      });
    });
    when('[t1] CLAUDE_CONFIG_DIR set to an extant hash actor dir', () => {
      // the actor dir exists, as claude makes it at session start, with a real settings.json
      // that holds no allow; the old layout has no settings.of.repo.json anywhere
      const result = useThen('the hook runs', async () =>
        runCheck({
          files: {
            ...files,
            'actor/.claude/settings.json': { json: {} },
          },
          command: 'wavetool',
          configDir: 'actor/.claude',
        }),
      );
      then('exit 2, and stderr names the config dir that judged it', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('allowlist of config dir');
      });
      then('the project allow still passes: the old layout loads it', () => {
        expect(
          runCheck({
            files: { ...files, 'actor/.claude/settings.json': { json: {} } },
            command: 'npm run build',
            configDir: 'actor/.claude',
          }).exitCode,
        ).toBe(0);
      });
      then('the block is the normal one, not a nudge-record fault', () => {
        expect(result.stderr).not.toContain('MalfunctionError');
      });
      then('no absent-actor note: the old layout expects no such file', () => {
        expect(result.stderr).not.toContain('settings.of.repo.json is absent');
      });
      then(
        'stderr matches snapshot: the old layout, config dir variant',
        () => {
          expect(asStderrMasked(result)).toMatchSnapshot();
        },
      );
    });
    when(
      '[t2] CLAUDE_CONFIG_DIR set to an extant hash actor dir with no settings.of.repo.json',
      () => {
        // the old layout keeps the repo's allows in settings.json, so an absent actor file is
        // expected here; an alarm would be false (cell #25, the vision's happy world)
        const result = useThen('the hook runs', async () =>
          runCheck({
            files: { ...files, 'actor/.claude/.keep': { text: '' } },
            command: 'wavetool',
            configDir: 'actor/.claude',
          }),
        );
        then('exit 2, and the project allow still passes', () => {
          expect(result.exitCode).toBe(2);
          expect(
            runCheck({
              files: { ...files, 'actor/.claude/.keep': { text: '' } },
              command: 'npm run build',
              configDir: 'actor/.claude',
            }).exitCode,
          ).toBe(0);
        });
        then(
          'no absent-actor note: the old layout expects no such file',
          () => {
            expect(result.stderr).not.toContain(
              'settings.of.repo.json is absent',
            );
          },
        );
      },
    );
  });

  given('[case22] split layout, the actor allowlist file is absent', () => {
    // a hash actor dir as rhachet lays it out: <actor dir>/actor.json beside <actor dir>/brain/.claude.
    // its user layer (settings.json) allows ls, so the list is not empty and only the note
    // says its own allowlist is absent. the walk-up settings.of.repo.json marks the split layout
    const genAbsentActorFiles = (input: {
      actorJson: PermissionLayerFileContent | null;
    }): Record<string, PermissionLayerFileContent> => ({
      '.claude/settings.of.repo.json': asAllowSettings('foreigntide:*'),
      'actor/brain/.claude/settings.json': asAllowSettings('ls:*'),
      ...(input.actorJson ? { 'actor/actor.json': input.actorJson } : {}),
    });

    when(
      '[t0] an absolute actor: actor.json names its brain and roles; no settings.of.repo.json',
      () => {
        const result = useThen('the hook runs', async () =>
          runCheck({
            files: genAbsentActorFiles({
              actorJson: {
                json: {
                  schemaVersion: 1,
                  brain: 'claude',
                  roles: ['mechanic', 'driver'],
                },
              },
            }),
            command: 'wavetool',
            configDir: 'actor/brain/.claude',
          }),
        );
        then('exit 2', () => {
          expect(result.exitCode).toBe(2);
        });
        then('the foreign repo actor allow is not offered', () => {
          expect(result.stderr).not.toMatch(/\[[pe]\] foreigntide/);
        });
        then('stderr notes the absent actor file', () => {
          expect(result.stderr).toContain(
            `💥 MalfunctionError: ${path.join(result.tempDir, 'actor/brain/.claude')}/settings.of.repo.json is absent, though this repo's layout keeps its allows there, so this allowlist lacks them`,
          );
        });
        then(
          'the fix names the enroll command that lands on this actor, built from actor.json',
          () => {
            expect(result.stderr).toContain(
              `fix: this clone reads its actor allowlist from ${path.join(result.tempDir, 'actor/brain/.claude')}/settings.of.repo.json, which rhx enroll derives; re-enroll this clone (rhx enroll claude --roles mechanic,driver), or ask your human to run rhx init at the repo root`,
            );
          },
        );
        then(
          'the user-layer allow still passes; the foreign allow blocks',
          () => {
            const files = genAbsentActorFiles({
              actorJson: {
                json: {
                  schemaVersion: 1,
                  brain: 'claude',
                  roles: ['mechanic', 'driver'],
                },
              },
            });
            expect(
              runCheck({
                files,
                command: 'ls',
                configDir: 'actor/brain/.claude',
              }).exitCode,
            ).toBe(0);
            expect(
              runCheck({
                files,
                command: 'foreigntide go',
                configDir: 'actor/brain/.claude',
              }).exitCode,
            ).toBe(2);
          },
        );
        then('stderr matches snapshot: the absent actor file variant', () => {
          expect(asStderrMasked(result)).toMatchSnapshot();
        });
      },
    );

    when(
      '[t1] a delta actor: actor.json holds rolesDelta; no settings.of.repo.json',
      () => {
        then('the fix enrolls with the delta', () => {
          const result = runCheck({
            files: genAbsentActorFiles({
              actorJson: {
                json: {
                  schemaVersion: 1,
                  brain: 'claude',
                  roles: ['mechanic'],
                  rolesDelta: ['-driver'],
                },
              },
            }),
            command: 'wavetool',
            configDir: 'actor/brain/.claude',
          });
          expect(result.stderr).toContain(
            're-enroll this clone (rhx enroll claude --roles -driver)',
          );
        });
      },
    );

    when('[t2] no actor.json beside the actor dir', () => {
      then('the fix names the enroll command in its generic form', () => {
        const result = runCheck({
          files: genAbsentActorFiles({ actorJson: null }),
          command: 'wavetool',
          configDir: 'actor/brain/.claude',
        });
        expect(result.stderr).toContain(
          're-enroll this clone (rhx enroll <brain> --roles <roles>)',
        );
      });
    });

    when(
      '[t3] CLAUDE_CONFIG_DIR unset; settings.json links to a home file that allows ls; no settings.of.repo.json anywhere',
      () => {
        // with no settings.of.repo.json in any dir, no split signal fires, so the old-layout
        // read applies: rhachet seeds settings.of.repo.json on every migrated repo, so this
        // state is an unmigrated repo, where an absent-file note would be false
        const result = useThen('the hook runs', async () =>
          runCheck({
            files: {
              '.claude/settings.json': { linkTo: 'home/.claude/settings.json' },
              'home/.claude/settings.json': asAllowSettings('ls:*'),
            },
            command: 'wavetool',
            configDir: null,
          }),
        );
        then('exit 2, and the home allow still passes', () => {
          expect(result.exitCode).toBe(2);
          expect(
            runCheck({
              files: {
                '.claude/settings.json': {
                  linkTo: 'home/.claude/settings.json',
                },
                'home/.claude/settings.json': asAllowSettings('ls:*'),
              },
              command: 'ls',
              configDir: null,
            }).exitCode,
          ).toBe(0);
        });
        then('no absent-file note: no split signal fired', () => {
          expect(result.stderr).not.toContain(
            'settings.of.repo.json is absent',
          );
        });
      },
    );
  });

  given('[case10] local grants pass; a corrupt layer reads as absent', () => {
    when('[t0] a grant lives only in <tmp>/.claude/settings.local.json', () => {
      then('exit 0', () => {
        const result = runCheck({
          files: { '.claude/settings.local.json': asAllowSettings('wavetool') },
          command: 'wavetool',
          configDir: null,
        });
        expect(result.exitCode).toBe(0);
      });
    });
    when('[t1] a grant lives only in the actor settings.local.json', () => {
      then('exit 0', () => {
        const result = runCheck({
          files: {
            'actor/.claude/settings.local.json': asAllowSettings('wavetool'),
          },
          command: 'wavetool',
          configDir: 'actor/.claude',
        });
        expect(result.exitCode).toBe(0);
      });
    });
    when(
      '[t2] old layout; an allow lives only in the actor settings.json',
      () => {
        then('exit 0', () => {
          const result = runCheck({
            files: {
              'actor/.claude/settings.json': asAllowSettings('wavetool'),
            },
            command: 'wavetool',
            configDir: 'actor/.claude',
          });
          expect(result.exitCode).toBe(0);
        });
      },
    );
    when('[t3] split layout; the settings.json link has no target', () => {
      const result = useThen('the hook runs', async () =>
        runCheck({
          files: {
            '.claude/settings.of.repo.json': asAllowSettings(
              'rhx git.repo.test:*',
            ),
            '.claude/settings.json': { linkTo: 'home/.claude/settings.json' },
          },
          command: 'rhx git.repo.test --what types',
          configDir: null,
        }),
      );
      then('exit 0', () => {
        expect(result.exitCode).toBe(0);
      });
      then('stderr is empty', () => {
        expect(result.stderr).toBe('');
      });
    });
    when(
      '[t4] settings.local.json is invalid json and held the only allow for wavetool',
      () => {
        const files = {
          '.claude/settings.local.json': {
            text: '{ "permissions": { "allow": ["Bash(wavetool)"',
          },
          '.claude/settings.json': asAllowSettings('ls:*'),
        };
        const result = useThen('the hook runs for wavetool', async () =>
          runCheck({ files, command: 'wavetool', configDir: null }),
        );
        then(
          'wavetool exits 2: its only allow sat in the corrupt layer',
          () => {
            expect(result.exitCode).toBe(2);
          },
        );
        then(
          'stderr names the corrupt layer, though another layer holds an allow',
          () => {
            expect(result.stderr).toContain(
              '💥 MalfunctionError: settings file unparseable: .claude/settings.local.json (',
            );
            expect(result.stderr).toContain(
              'its allows do not count, so the commands it paves block',
            );
            expect(result.stderr).toContain('repair the json in that file');
          },
        );
        then('stderr matches snapshot: the corrupt layer variant', () => {
          expect(asStderrMasked(result)).toMatchSnapshot();
        });
        then('ls exits 0', () => {
          const result = runCheck({ files, command: 'ls', configDir: null });
          expect(result.exitCode).toBe(0);
        });
      },
    );
    when(
      '[t5] settings.of.repo.json is invalid json and is the only allow source',
      () => {
        const result = useThen('the hook runs for wavetool', async () =>
          runCheck({
            files: {
              '.claude/settings.of.repo.json': {
                text: '{ "permissions": { "allow": ["Bash(wavetool)"',
              },
            },
            command: 'wavetool',
            configDir: null,
          }),
        );
        then('exit 2: the command blocks', () => {
          expect(result.exitCode).toBe(2);
        });
        then(
          'stderr names the corrupt layer with its cause and fix, though no layer holds an allow',
          () => {
            expect(result.stderr).toMatch(
              /💥 MalfunctionError: settings file unparseable: \.claude\/settings\.of\.repo\.json \(.+\)/,
            );
            expect(result.stderr).toContain('repair the json in that file');
          },
        );
        then('stderr still says no pre-approved permissions were found', () => {
          expect(result.stderr).toContain(
            'no pre-approved bash permissions were found',
          );
        });
        then('stderr matches snapshot: the corrupt-only variant', () => {
          expect(asStderrMasked(result)).toMatchSnapshot();
        });
      },
    );
  });

  given(
    '[case18] SOFTNUDGE shows the same diagnostics, without a block',
    () => {
      when(
        '[t0] a hash actor; its settings.json is invalid json; an unlisted command',
        () => {
          const result = useThen(
            'the hook runs in SOFTNUDGE mode',
            async () => {
              const fixture = genPermissionLayersFixture({
                slug: 'check-permissions-layers',
                files: {
                  ...splitHashActor,
                  'actor/.claude/settings.json': { text: '{ not json' },
                },
              });
              const run = fixture.run({
                scriptPath,
                stdin: JSON.stringify({
                  tool_name: 'Bash',
                  tool_input: { command: 'wavetool --unlisted' },
                }),
                configDir: 'actor/.claude',
                args: ['--mode', 'SOFTNUDGE'],
              });
              return { ...run, tempDir: fixture.tempDir };
            },
          );
          then('exit 0: SOFTNUDGE never blocks', () => {
            expect(result.exitCode).toBe(0);
          });
          then('stdout names the config dir', () => {
            expect(result.stdout).toContain(
              `judged by the allowlist of config dir ${path.join(result.tempDir, 'actor/.claude')}`,
            );
          });
          then('stdout names the corrupt layer', () => {
            expect(result.stdout).toContain(
              '💥 MalfunctionError: settings file unparseable: actor/.claude/settings.json (',
            );
          });
          then('the actor allow from the valid layer still passes', () => {
            expect(
              runCheck({
                files: {
                  ...splitHashActor,
                  'actor/.claude/settings.json': { text: '{ not json' },
                },
                command: 'rhx review --rules x',
                configDir: 'actor/.claude',
              }).exitCode,
            ).toBe(0);
          });
          then('stdout matches snapshot', () => {
            expect(
              asTextMasked({ text: result.stdout, tempDir: result.tempDir }),
            ).toMatchSnapshot();
          });
        },
      );
      when('[t1] no layer holds an allow; an unlisted command', () => {
        const result = useThen('the hook runs in SOFTNUDGE mode', async () => {
          const fixture = genPermissionLayersFixture({
            slug: 'check-permissions-layers',
            files: { '.claude/settings.of.repo.json': { json: {} } },
          });
          const run = fixture.run({
            scriptPath,
            stdin: JSON.stringify({
              tool_name: 'Bash',
              tool_input: { command: 'wavetool --unlisted' },
            }),
            configDir: null,
            args: ['--mode', 'SOFTNUDGE'],
          });
          return { ...run, tempDir: fixture.tempDir };
        });
        then('exit 0', () => {
          expect(result.exitCode).toBe(0);
        });
        then('stdout says no pre-approved permissions were found', () => {
          expect(result.stdout).toContain(
            'no pre-approved bash permissions were found',
          );
        });
        then('stdout matches snapshot: the empty variant', () => {
          expect(
            asTextMasked({ text: result.stdout, tempDir: result.tempDir }),
          ).toMatchSnapshot();
        });
      });
    },
  );

  given('[case19] the layer lib is absent beside the hook', () => {
    when('[t0] the hook is copied with its render lib only, then run', () => {
      const result = useThen('the hook runs', async () => {
        const tempDir = genTempDir({ slug: 'check-permissions-lone-hook' });
        const hookCopy = path.join(tempDir, 'pretooluse.check-permissions.sh');
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
          input: JSON.stringify({
            tool_name: 'Bash',
            tool_input: { command: 'wavetool --go' },
          }),
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...envRest, HOME: path.join(tempDir, 'home') },
        });
        return {
          exitCode: spawned.status ?? 1,
          stderr: spawned.stderr ?? '',
          tempDir,
        };
      });
      then('exit 2: the gate fails closed, never open', () => {
        expect(result.exitCode).toBe(2);
      });
      then('stderr names the fault as a MalfunctionError, with the fix', () => {
        expect(result.stderr).toContain(
          `💥 MalfunctionError: check-permissions could not load ${result.tempDir}/permissions.layers.operations.sh; the command stays blocked`,
        );
        expect(result.stderr).toContain(
          'ask your human to run rhx init at the repo root, in their own shell, then retry',
        );
      });
      then('stderr matches snapshot', () => {
        expect(asStderrMasked(result)).toMatchSnapshot();
      });
    });
  });

  given('[case16] the config dir cannot hold a nudge record', () => {
    when(
      '[t0] CLAUDE_CONFIG_DIR names a path under a regular file, so mkdir fails',
      () => {
        const result = useThen('the hook runs', async () =>
          runCheck({
            files: {
              reef: { text: 'a file, not a dir' },
              '.claude/settings.json': asAllowSettings('ls:*'),
            },
            command: 'wavetool --go',
            configDir: 'reef/.claude',
          }),
        );
        then('exit 2: the gate fails closed, never open', () => {
          expect(result.exitCode).toBe(2);
        });
        then(
          'stderr names the fault as a MalfunctionError, with the fix',
          () => {
            expect(result.stderr).toContain(
              `💥 MalfunctionError: the nudge record could not be created (${path.join(result.tempDir, 'reef/.claude/permission.nudges.local.json')}: `,
            );
            expect(result.stderr).toContain(
              `make ${path.join(result.tempDir, 'reef/.claude')} a writable dir`,
            );
          },
        );
        then(
          'the allows still pass: a record fault never empties the list',
          () => {
            expect(
              runCheck({
                files: {
                  reef: { text: 'a file, not a dir' },
                  '.claude/settings.json': asAllowSettings('ls:*'),
                },
                command: 'ls',
                configDir: 'reef/.claude',
              }).exitCode,
            ).toBe(0);
          },
        );
        then('stderr names the os cause of the fault', () => {
          expect(result.stderr).toMatch(
            /the nudge record could not be created \(.+: .+\) — /,
          );
        });
        then('stderr matches snapshot', () => {
          expect(asStderrMasked(result)).toMatchSnapshot();
        });
      },
    );
  });

  given('[case17] the nudge record exists but cannot be updated', () => {
    when(
      '[t0] the config dir is read-only, so the atomic rename into it fails',
      () => {
        const result = useThen('the hook runs', async () => {
          const fixture = genPermissionLayersFixture({
            slug: 'check-permissions-layers',
            files: {
              'actor/.claude/permission.nudges.local.json': { json: {} },
              '.claude/settings.json': asAllowSettings('ls:*'),
            },
          });
          const actorDir = path.join(fixture.tempDir, 'actor/.claude');
          chmodSync(actorDir, 0o555);
          const run = fixture.run({
            scriptPath,
            stdin: JSON.stringify({
              tool_name: 'Bash',
              tool_input: { command: 'wavetool --go' },
            }),
            configDir: 'actor/.claude',
            args: [],
          });
          chmodSync(actorDir, 0o755);
          return { ...run, tempDir: fixture.tempDir };
        });
        then('exit 2: the command still blocks', () => {
          expect(result.exitCode).toBe(2);
        });
        then('stderr names the update fault as a MalfunctionError', () => {
          expect(result.stderr).toContain(
            `💥 MalfunctionError: the nudge record lock could not be made (${path.join(result.tempDir, 'actor/.claude/permission.nudges.local.json.lock')}: `,
          );
        });
        then('stderr names the fix', () => {
          expect(result.stderr).toContain(
            `make ${path.join(result.tempDir, 'actor/.claude')} a writable dir`,
          );
        });
        then('stderr names the os cause of the fault', () => {
          expect(result.stderr).toMatch(
            /the nudge record lock could not be made \(.+: mkdir: .+\) — /,
          );
        });
        then('stderr says a retry blocks again, never that it passes', () => {
          expect(result.stderr).toContain(
            'a retry will block again rather than reach the human',
          );
        });
        then('stderr matches snapshot', () => {
          expect(asStderrMasked(result)).toMatchSnapshot();
        });
      },
    );
  });

  given('[case20] the nudge record is not valid json', () => {
    const files = {
      'actor/.claude/permission.nudges.local.json': { text: '{ not json' },
      '.claude/settings.json': asAllowSettings('ls:*'),
    };
    when('[t0] the clone runs an unlisted command', () => {
      const result = useThen('the hook runs', async () =>
        runCheck({
          files,
          command: 'wavetool --go',
          configDir: 'actor/.claude',
        }),
      );
      then('exit 2: the first attempt blocks', () => {
        expect(result.exitCode).toBe(2);
      });
      then(
        'the unreadable record is named, with its path in the config dir',
        () => {
          expect(result.stderr).toContain(
            `💥 MalfunctionError: the nudge record could not be read (${path.join(result.tempDir, 'actor/.claude/permission.nudges.local.json')}: `,
          );
        },
      );
    });
    when('[t1] the clone retries the same command at once', () => {
      const result = useThen('the hook runs twice', async () => {
        const fixture = genPermissionLayersFixture({
          slug: 'check-permissions-layers',
          files,
        });
        const stdin = JSON.stringify({
          tool_name: 'Bash',
          tool_input: { command: 'wavetool --go' },
        });
        fixture.run({
          scriptPath,
          stdin,
          configDir: 'actor/.claude',
          args: [],
        });
        return fixture.run({
          scriptPath,
          stdin,
          configDir: 'actor/.claude',
          args: [],
        });
      });
      then(
        'exit 2: an unreadable record never passes a retry (fail closed)',
        () => {
          expect(result.exitCode).toBe(2);
        },
      );
    });
  });

  given(
    '[case21] a slow host: every layer read takes 1s, so the reads alone pass the 4s failfast',
    () => {
      when('[t0] the clone runs a command the allowlist holds', () => {
        const result = useThen('the hook runs with a slow jq', async () => {
          const fixture = genPermissionLayersFixture({
            slug: 'check-permissions-slow-host',
            files: {
              'actor/.claude/settings.of.repo.json':
                asAllowSettings('rhx review:*'),
              'actor/.claude/settings.local.json': asAllowSettings('cat:*'),
              'actor/.claude/settings.json': asAllowSettings('tree:*'),
              '.claude/settings.json': asAllowSettings('ls:*'),
              '.claude/settings.local.json': asAllowSettings('pwd'),
            },
          });

          // a jq shim that sleeps 1s, then runs the real jq: six jq calls before the match
          // loop (the stdin parse, then one per layer file) take 6s
          const shimDir = path.join(fixture.tempDir, 'shim');
          mkdirSync(shimDir, { recursive: true });
          const asToolPath = (tool: string) =>
            spawnSync('bash', ['-c', `command -v ${tool}`], {
              encoding: 'utf-8',
            }).stdout.trim();
          const shimPath = path.join(shimDir, 'jq');
          writeFileSync(
            shimPath,
            `#!/bin/sh\n"${asToolPath('sleep')}" 1\nexec "${asToolPath('jq')}" "$@"\n`,
          );
          chmodSync(shimPath, 0o755);

          const { CLAUDE_CONFIG_DIR: _runnerConfigDir, ...envRest } =
            process.env;
          const spawned = spawnSync('bash', [scriptPath], {
            cwd: fixture.tempDir,
            encoding: 'utf-8',
            input: JSON.stringify({
              tool_name: 'Bash',
              tool_input: { command: 'rhx review --rules x' },
            }),
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...envRest,
              HOME: path.join(fixture.tempDir, 'home'),
              CLAUDE_CONFIG_DIR: path.join(fixture.tempDir, 'actor/.claude'),
              PATH: `${shimDir}:${process.env.PATH ?? ''}`,
            },
          });
          return {
            exitCode: spawned.status ?? 1,
            stderr: spawned.stderr ?? '',
          };
        });
        then(
          'exit 0, with no stderr: the failfast times the match loop, not the layer reads',
          () => {
            expect({
              exitCode: result.exitCode,
              stderr: result.stderr,
            }).toEqual({ exitCode: 0, stderr: '' });
          },
        );
      });
    },
  );

  given('[case15] no config dir and no walk-up dir', () => {
    when(
      '[t0] $CLAUDE_CONFIG_DIR unset; no .claude anywhere above $PWD',
      () => {
        // a bare temp dir: genTempDir's store has no .claude up its tree (the decide
        // suite's [case9] leans on the same fact). the env is scrubbed and HOME points
        // inside the temp dir, so the runner's own dirs never count
        const result = useThen('the hook runs', async () => {
          const tempDir = genTempDir({ slug: 'check-permissions-no-dirs' });
          const { CLAUDE_CONFIG_DIR: _runnerConfigDir, ...envRest } =
            process.env;
          const spawned = spawnSync('bash', [scriptPath], {
            cwd: tempDir,
            encoding: 'utf-8',
            input: JSON.stringify({
              tool_name: 'Bash',
              tool_input: { command: 'wavetool --unlisted' },
            }),
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...envRest, HOME: path.join(tempDir, 'home') },
          });
          return {
            exitCode: spawned.status ?? 1,
            stderr: spawned.stderr ?? '',
            claudeDirMade: existsSync(path.join(tempDir, '.claude')),
          };
        });
        then('exit 0: the command proceeds', () => {
          expect(result.exitCode).toBe(0);
        });
        then('stderr is empty', () => {
          expect(result.stderr).toBe('');
        });
        then('no .claude dir is created for a nudge record', () => {
          expect(result.claudeDirMade).toBe(false);
        });
      },
    );
    when(
      '[t1] negative control: the same command with a walk-up .claude',
      () => {
        const result = useThen('the hook runs', async () =>
          runCheck({
            files: { '.claude/settings.json': asAllowSettings('ls:*') },
            command: 'wavetool --unlisted',
            configDir: null,
          }),
        );
        then('exit 2: the unlisted command is blocked', () => {
          expect(result.exitCode).toBe(2);
        });
        then('stderr matches snapshot', () => {
          expect(asStderrMasked(result)).toMatchSnapshot();
        });
      },
    );
    when(
      '[t2] $CLAUDE_CONFIG_DIR names an actor dir; no .claude above $PWD',
      () => {
        // a bare temp dir, as in [t0]: the shared fixture always seeds a walk-up .claude
        const result = useThen('the hook runs', async () => {
          const tempDir = genTempDir({ slug: 'check-permissions-no-walkup' });
          const actorDir = path.join(tempDir, 'actor/.claude');
          mkdirSync(actorDir, { recursive: true });
          writeFileSync(
            path.join(actorDir, 'settings.of.repo.json'),
            JSON.stringify({ permissions: { allow: ['Bash(ls:*)'] } }),
          );
          const { CLAUDE_CONFIG_DIR: _runnerConfigDir, ...envRest } =
            process.env;
          const spawned = spawnSync('bash', [scriptPath], {
            cwd: tempDir,
            encoding: 'utf-8',
            input: JSON.stringify({
              tool_name: 'Bash',
              tool_input: { command: 'wavetool --unlisted' },
            }),
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...envRest,
              HOME: path.join(tempDir, 'home'),
              CLAUDE_CONFIG_DIR: actorDir,
            },
          });
          return {
            exitCode: spawned.status ?? 1,
            stderr: spawned.stderr ?? '',
            tempDir,
          };
        });
        then('exit 2: the unlisted command is blocked', () => {
          expect(result.exitCode).toBe(2);
        });
        then(
          'stderr names the config dir alone, since no project layer exists and the user layer is the config dir',
          () => {
            expect(result.stderr).toContain(
              `judged by the allowlist of config dir ${path.join(result.tempDir, 'actor/.claude')}`,
            );
            expect(result.stderr).not.toContain('plus the');
          },
        );
        then('stderr matches snapshot', () => {
          expect(asStderrMasked(result)).toMatchSnapshot();
        });
      },
    );
  });
});
