import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = integration tests for the layer rule in permissions.layers.operations.sh
 * .why = the check, decide, and notify hooks all source this one rule; its edges
 *        (nearest walk-up, an end slash, duplicate collapse, per-file state) are
 *        pinned here once, rather than only through each hook's verdict
 */
describe('permissions.layers.operations.sh', () => {
  const operationsPath = path.join(
    __dirname,
    'permissions.layers.operations.sh',
  );

  /**
   * .what = source the operations file in a hermetic env and run one bash snippet
   * .why = scrubs the runner's CLAUDE_CONFIG_DIR and HOME, so only the fixture counts
   */
  const runOperation = (input: {
    cwd: string;
    snippet: string;
    env: { CLAUDE_CONFIG_DIR: string | null; HOME: string | null };
  }): { stdout: string; stderr: string; exitCode: number } => {
    const {
      CLAUDE_CONFIG_DIR: _runnerConfigDir,
      HOME: _runnerHome,
      ...envRest
    } = process.env;
    const env: NodeJS.ProcessEnv = {
      ...envRest,
      ...(input.env.CLAUDE_CONFIG_DIR === null
        ? {}
        : { CLAUDE_CONFIG_DIR: input.env.CLAUDE_CONFIG_DIR }),
      ...(input.env.HOME === null ? {} : { HOME: input.env.HOME }),
    };
    const result = spawnSync(
      'bash',
      ['-c', `source "${operationsPath}"\n${input.snippet}`],
      {
        cwd: input.cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env,
      },
    );
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  /**
   * .what = a temp dir with the given dirs and files written, as its real path
   * .why = the walk-up compares real paths; a symlinked tmp would skew them
   */
  const genFixture = (input: {
    slug: string;
    files: Record<string, string>;
    dirs: string[];
  }): string => {
    const root = fs.realpathSync(genTempDir({ slug: input.slug }));
    for (const dir of input.dirs)
      fs.mkdirSync(path.join(root, dir), { recursive: true });
    for (const [rel, text] of Object.entries(input.files)) {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      fs.writeFileSync(path.join(root, rel), text);
    }
    return root;
  };

  given('[case1] two .claude dirs above a nested cwd', () => {
    when('[t0] the walk-up dir is sought from pool/reef/kelp', () => {
      then('it returns the nearest one, pool/.claude', () => {
        const root = genFixture({
          slug: 'layers-walkup-nearest',
          files: {},
          dirs: ['.claude', 'pool/.claude', 'pool/reef/kelp'],
        });
        const result = runOperation({
          cwd: path.join(root, 'pool/reef/kelp'),
          snippet: 'get_permissions_walkup_dir',
          env: { CLAUDE_CONFIG_DIR: null, HOME: null },
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe(path.join(root, 'pool/.claude'));
      });
    });
  });

  given('[case2] no .claude dir anywhere above the cwd', () => {
    when('[t0] the walk-up dir and the config dir are sought', () => {
      then('both exit 1 with no output', () => {
        const root = genFixture({
          slug: 'layers-walkup-none',
          files: {},
          dirs: ['reef'],
        });
        const result = runOperation({
          cwd: path.join(root, 'reef'),
          snippet:
            'get_permissions_walkup_dir; echo "walkup=$?"; get_permissions_config_dir; echo "config=$?"',
          env: { CLAUDE_CONFIG_DIR: null, HOME: null },
        });
        expect(result.stdout).toBe('walkup=1\nconfig=1\n');
        expect(result.stderr).toBe('');
      });
    });
  });

  given('[case3] $CLAUDE_CONFIG_DIR set, with a slash at its end', () => {
    when('[t0] the config dir and user dir are sought', () => {
      then(
        'both return the env dir, slash dropped, over the walk-up dir',
        () => {
          const root = genFixture({
            slug: 'layers-env-slash',
            files: {},
            dirs: ['.claude', 'actor/brain/.claude'],
          });
          const actorDir = path.join(root, 'actor/brain/.claude');
          const result = runOperation({
            cwd: root,
            snippet: 'get_permissions_config_dir; get_permissions_user_dir',
            env: {
              CLAUDE_CONFIG_DIR: `${actorDir}/`,
              HOME: path.join(root, 'home'),
            },
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toBe(`${actorDir}\n${actorDir}\n`);
        },
      );
    });
  });

  given('[case4] $CLAUDE_CONFIG_DIR unset', () => {
    when('[t0] HOME is set', () => {
      then('the user dir is $HOME/.claude', () => {
        const root = genFixture({
          slug: 'layers-user-home',
          files: {},
          dirs: [],
        });
        const result = runOperation({
          cwd: root,
          snippet: 'get_permissions_user_dir',
          env: { CLAUDE_CONFIG_DIR: null, HOME: path.join(root, 'home') },
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe(path.join(root, 'home/.claude'));
      });
    });
    when('[t1] HOME is unset too', () => {
      then('the user dir exits 1 with no output', () => {
        const root = genFixture({
          slug: 'layers-user-none',
          files: {},
          dirs: [],
        });
        const result = runOperation({
          cwd: root,
          snippet: 'get_permissions_user_dir; echo "user=$?"',
          env: { CLAUDE_CONFIG_DIR: null, HOME: null },
        });
        expect(result.stdout).toBe('user=1\n');
      });
    });
  });

  given('[case5] the config dir IS the walk-up dir', () => {
    when('[t0] the layer files are listed', () => {
      then('each path appears once, in rank order', () => {
        const root = genFixture({
          slug: 'layers-files-dedupe',
          files: {},
          dirs: ['.claude'],
        });
        const claudeDir = path.join(root, '.claude');
        const result = runOperation({
          cwd: root,
          snippet: 'get_all_permissions_layer_files',
          env: { CLAUDE_CONFIG_DIR: null, HOME: path.join(root, 'home') },
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim().split('\n')).toEqual([
          `${claudeDir}/settings.of.repo.json`,
          `${claudeDir}/settings.local.json`,
          `${root}/home/.claude/settings.json`,
          `${claudeDir}/settings.json`,
        ]);
      });
    });
  });

  given(
    '[case7] split layout: <repo>/.claude/settings.json links to the user file',
    () => {
      when('[t0] the layer files are listed', () => {
        then(
          'the list is the repo file and the user file; the linked path is not listed apart',
          () => {
            const root = genFixture({
              slug: 'layers-files-dedupe-link',
              files: {
                'home/.claude/settings.json': '{}',
                '.claude/settings.of.repo.json': '{}',
              },
              dirs: ['.claude'],
            });
            fs.symlinkSync(
              path.join(root, 'home/.claude/settings.json'),
              path.join(root, '.claude/settings.json'),
            );
            const claudeDir = path.join(root, '.claude');
            const result = runOperation({
              cwd: root,
              snippet: 'get_all_permissions_layer_files',
              env: { CLAUDE_CONFIG_DIR: null, HOME: path.join(root, 'home') },
            });
            expect(result.exitCode).toBe(0);
            expect(result.stdout.trim().split('\n')).toEqual([
              `${claudeDir}/settings.of.repo.json`,
              `${root}/home/.claude/settings.json`,
            ]);
          },
        );
      });
    },
  );

  given(
    '[case10] the layout is detected by settings.of.repo.json alone',
    () => {
      const listFiles = (input: {
        slug: string;
        files: Record<string, string>;
        configDir: string | null;
        purpose: 'approve' | 'nudge';
      }) => {
        const root = genFixture({
          slug: input.slug,
          files: input.files,
          dirs: ['.claude', 'actor/brain/.claude'],
        });
        const result = runOperation({
          cwd: root,
          snippet: `set_permissions_layer_files ${input.purpose}; echo "layout=$PERMISSIONS_LAYOUT"; printf "%s\\n" "\${PERMISSIONS_LAYER_FILES[@]}"`,
          env: {
            CLAUDE_CONFIG_DIR:
              input.configDir === null
                ? null
                : path.join(root, input.configDir),
            HOME: path.join(root, 'home'),
          },
        });
        return { root, lines: result.stdout.trim().split('\n') };
      };

      when('[t0] ccd; the actor dir holds settings.of.repo.json', () => {
        then('split: the actor repo file and the actor user file only', () => {
          const { root, lines } = listFiles({
            slug: 'layers-layout-split-actor',
            files: { 'actor/brain/.claude/settings.of.repo.json': '{}' },
            configDir: 'actor/brain/.claude',
            purpose: 'nudge',
          });
          const actorDir = path.join(root, 'actor/brain/.claude');
          expect(lines).toEqual([
            'layout=split',
            `${actorDir}/settings.of.repo.json`,
            `${actorDir}/settings.json`,
          ]);
        });
      });

      when(
        '[t1] ccd; only the walk-up dir holds settings.of.repo.json (an actor not yet seeded)',
        () => {
          then(
            'split still: the walk-up file marks the layout; the project layer is not read',
            () => {
              const { root, lines } = listFiles({
                slug: 'layers-layout-split-walkup',
                files: { '.claude/settings.of.repo.json': '{}' },
                configDir: 'actor/brain/.claude',
                purpose: 'approve',
              });
              const actorDir = path.join(root, 'actor/brain/.claude');
              expect(lines).toEqual([
                'layout=split',
                `${actorDir}/settings.of.repo.json`,
                `${actorDir}/settings.json`,
              ]);
            },
          );
        },
      );

      when(
        '[t2] ccd; no settings.of.repo.json anywhere, .claude/settings.json is real',
        () => {
          then('old: the project layer is read', () => {
            const { root, lines } = listFiles({
              slug: 'layers-layout-old',
              files: { '.claude/settings.json': '{}' },
              configDir: 'actor/brain/.claude',
              purpose: 'nudge',
            });
            expect(lines[0]).toBe('layout=old');
            expect(lines).toContain(`${root}/.claude/settings.json`);
            expect(lines).toContain(`${root}/.claude/settings.local.json`);
          });
        },
      );
    },
  );

  given('[case11] the enroll command a hash actor clone is told to run', () => {
    const getEnrollCmd = (input: {
      slug: string;
      actorJson: string | null;
      configDir: string;
      actorDir?: string; // relative to the temp dir; default 'actor'
      linkAt?: string; // relative; a link to <actorDir>/brain/.claude, as <repo>/.claude is
    }) => {
      const actorDir = input.actorDir ?? 'actor';
      const root = genFixture({
        slug: input.slug,
        files:
          input.actorJson === null
            ? {}
            : { [`${actorDir}/actor.json`]: input.actorJson },
        dirs: ['.claude', `${actorDir}/brain/.claude`],
      });
      if (input.linkAt)
        fs.symlinkSync(
          path.join(root, actorDir, 'brain/.claude'),
          path.join(root, input.linkAt),
        );
      return runOperation({
        cwd: root,
        snippet:
          'set_permissions_dirs; set_permissions_enroll_cmd; echo "$PERMISSIONS_ENROLL_CMD"',
        env: {
          CLAUDE_CONFIG_DIR: path.join(root, input.configDir),
          HOME: path.join(root, 'home'),
        },
      }).stdout.trim();
    };

    when('[t0] actor.json names an absolute role set', () => {
      then('the command carries the brain and the roles, comma-joined', () => {
        expect(
          getEnrollCmd({
            slug: 'layers-enroll-absolute',
            actorJson:
              '{"schemaVersion":1,"brain":"claude","roles":["mechanic", "driver"]}',
            configDir: 'actor/brain/.claude',
          }),
        ).toBe('rhx enroll claude --roles mechanic,driver');
      });
    });

    when('[t1] actor.json names a delta', () => {
      then('the command carries the delta, not the base roles', () => {
        expect(
          getEnrollCmd({
            slug: 'layers-enroll-delta',
            actorJson:
              '{"schemaVersion":1,"brain":"claude","roles":["mechanic"],"rolesDelta":["-driver"]}',
            configDir: 'actor/brain/.claude',
          }),
        ).toBe('rhx enroll claude --roles -driver');
      });
    });

    when('[t2] actor.json is absent', () => {
      then('the command is the generic form', () => {
        expect(
          getEnrollCmd({
            slug: 'layers-enroll-absent',
            actorJson: null,
            configDir: 'actor/brain/.claude',
          }),
        ).toBe('rhx enroll <brain> --roles <roles>');
      });
    });

    when('[t3] a delta of several tokens', () => {
      then(
        'the tokens are comma-joined, as rhx enroll --roles takes them',
        () => {
          expect(
            getEnrollCmd({
              slug: 'layers-enroll-delta-many',
              actorJson:
                '{"schemaVersion":1,"brain":"claude","roles":["mechanic","researcher"],"rolesDelta":["+researcher","-driver"]}',
              configDir: 'actor/brain/.claude',
            }),
          ).toBe('rhx enroll claude --roles +researcher,-driver');
        },
      );
    });

    when('[t4] an absolute actor with rolesDelta null', () => {
      then('the command carries the roles', () => {
        expect(
          getEnrollCmd({
            slug: 'layers-enroll-delta-null',
            actorJson:
              '{"schemaVersion":1,"brain":"claude","roles":["mechanic"],"rolesDelta":null}',
            configDir: 'actor/brain/.claude',
          }),
        ).toBe('rhx enroll claude --roles mechanic');
      });
    });

    when('[t5] rolesDelta is an empty list', () => {
      then('the command falls back to the roles, never a bare enroll', () => {
        expect(
          getEnrollCmd({
            slug: 'layers-enroll-delta-empty',
            actorJson:
              '{"schemaVersion":1,"brain":"claude","roles":["mechanic"],"rolesDelta":[]}',
            configDir: 'actor/brain/.claude',
          }),
        ).toBe('rhx enroll claude --roles mechanic');
      });
    });

    when('[t6] the repo actor (actor.via.repo=ambient)', () => {
      then('the command is a bare enroll, on the ambient roles', () => {
        expect(
          getEnrollCmd({
            slug: 'layers-enroll-repo-actor',
            actorJson:
              '{"schemaVersion":1,"brain":"claude","roles":["mechanic","driver"],"rolesDelta":null}',
            actorDir: 'actors/actor.via.repo=ambient',
            configDir: 'actors/actor.via.repo=ambient/brain/.claude',
          }),
        ).toBe('rhx enroll claude');
      });
    });

    when(
      '[t7] the config dir is reached through a link to the brain dir',
      () => {
        then('its real path is taken before the suffix is stripped', () => {
          expect(
            getEnrollCmd({
              slug: 'layers-enroll-via-link',
              actorJson:
                '{"schemaVersion":1,"brain":"claude","roles":["mechanic"]}',
              configDir: 'brainlink',
              linkAt: 'brainlink',
            }),
          ).toBe('rhx enroll claude --roles mechanic');
        });
      },
    );

    when('[t8] actor.json holds no brain', () => {
      then('the command is the generic form', () => {
        expect(
          getEnrollCmd({
            slug: 'layers-enroll-nobrain',
            actorJson: '{"schemaVersion":1,"roles":["mechanic"]}',
            configDir: 'actor/brain/.claude',
          }),
        ).toBe('rhx enroll <brain> --roles <roles>');
      });
    });
  });

  given('[case8] the purpose of the read', () => {
    when(
      '[t0] approve, with $CLAUDE_CONFIG_DIR apart from the walk-up dir',
      () => {
        then(
          'the config dir settings.local.json is dropped, since claude loads local only from the project',
          () => {
            const root = genFixture({
              slug: 'layers-files-approve-actor',
              files: {},
              dirs: ['.claude', 'actor/.claude'],
            });
            const actorDir = path.join(root, 'actor/.claude');
            const result = runOperation({
              cwd: root,
              snippet:
                'set_permissions_layer_files approve; printf "%s\\n" "${PERMISSIONS_LAYER_FILES[@]}"',
              env: {
                CLAUDE_CONFIG_DIR: actorDir,
                HOME: path.join(root, 'home'),
              },
            });
            expect(result.exitCode).toBe(0);
            expect(result.stdout.trim().split('\n')).toEqual([
              `${actorDir}/settings.of.repo.json`,
              `${actorDir}/settings.json`,
              `${root}/.claude/settings.json`,
              `${root}/.claude/settings.local.json`,
            ]);
          },
        );
      },
    );
    when('[t1] approve, with the config dir as the walk-up dir', () => {
      then(
        'settings.local.json is kept, since it is the project local file',
        () => {
          const root = genFixture({
            slug: 'layers-files-approve-repo',
            files: {},
            dirs: ['.claude'],
          });
          const claudeDir = path.join(root, '.claude');
          const result = runOperation({
            cwd: root,
            snippet:
              'set_permissions_layer_files approve; printf "%s\\n" "${PERMISSIONS_LAYER_FILES[@]}"',
            env: { CLAUDE_CONFIG_DIR: null, HOME: path.join(root, 'home') },
          });
          expect(result.stdout.trim().split('\n')).toContain(
            `${claudeDir}/settings.local.json`,
          );
        },
      );
    });
    when('[t2] nudge (the default), with $CLAUDE_CONFIG_DIR apart', () => {
      then('the config dir settings.local.json is read', () => {
        const root = genFixture({
          slug: 'layers-files-nudge-actor',
          files: {},
          dirs: ['.claude', 'actor/.claude'],
        });
        const actorDir = path.join(root, 'actor/.claude');
        const result = runOperation({
          cwd: root,
          snippet: 'get_all_permissions_layer_files',
          env: { CLAUDE_CONFIG_DIR: actorDir, HOME: path.join(root, 'home') },
        });
        expect(result.stdout.trim().split('\n')).toContain(
          `${actorDir}/settings.local.json`,
        );
      });
    });
  });

  given('[case9] $CLAUDE_CONFIG_DIR is a link to the walk-up dir', () => {
    const setup = () => {
      const root = genFixture({
        slug: 'layers-config-link-walkup',
        files: {},
        dirs: ['.claude'],
      });
      fs.symlinkSync(path.join(root, '.claude'), path.join(root, 'actorlink'));
      return { root, claudeDir: path.join(root, '.claude') };
    };
    when('[t0] the config dir is sought', () => {
      then('it takes the walk-up path, since both name one dir', () => {
        const { root, claudeDir } = setup();
        const result = runOperation({
          cwd: root,
          snippet: 'get_permissions_config_dir',
          env: {
            CLAUDE_CONFIG_DIR: path.join(root, 'actorlink'),
            HOME: path.join(root, 'home'),
          },
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe(claudeDir);
      });
    });
    when('[t1] approve lists the layer files', () => {
      then('the project settings.local.json is kept', () => {
        const { root, claudeDir } = setup();
        const result = runOperation({
          cwd: root,
          snippet:
            'set_permissions_layer_files approve; printf "%s\\n" "${PERMISSIONS_LAYER_FILES[@]}"',
          env: {
            CLAUDE_CONFIG_DIR: path.join(root, 'actorlink'),
            HOME: path.join(root, 'home'),
          },
        });
        expect(result.stdout.trim().split('\n')).toContain(
          `${claudeDir}/settings.local.json`,
        );
      });
    });
  });

  given('[case6] one valid layer, one invalid layer, the rest absent', () => {
    when('[t0] the allow layers are set', () => {
      const result = useThen('the layers are read', async () => {
        const root = genFixture({
          slug: 'layers-states',
          files: {
            '.claude/settings.json': JSON.stringify({
              permissions: {
                allow: [
                  'Bash(ls:*)',
                  'Read(src/**)',
                  'Bash(pwd)',
                  'Bash(ls:*)',
                ],
              },
            }),
            '.claude/settings.local.json': '{ "permissions": ',
          },
          dirs: [],
        });
        const run = runOperation({
          cwd: root,
          snippet: [
            'set_permissions_layers allow',
            'printf "pattern=%s\\n" "${PERMISSIONS_LAYER_PATTERNS[@]}"',
            'printf "state=%s\\n" "${PERMISSIONS_LAYER_STATES[@]}"',
            'printf "faults=%s\\n" "${#PERMISSIONS_LAYER_FAULT_FILES[@]}"',
            'printf "fault.file=%s\\n" "${PERMISSIONS_LAYER_FAULT_FILES[@]}"',
            'printf "fault.causes=%s\\n" "${#PERMISSIONS_LAYER_FAULT_CAUSES[@]}"',
          ].join('\n'),
          env: { CLAUDE_CONFIG_DIR: null, HOME: path.join(root, 'home') },
        });
        return { ...run, root };
      });
      then(
        'the union holds only the Bash patterns, sorted, no duplicates',
        () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('pattern=ls:*\npattern=pwd\nstate=');
          expect(result.stdout).not.toContain('Read(');
        },
      );
      then(
        'each file carries its state: absent, unreadable, or a rule count',
        () => {
          const dir = path.join(result.root, '.claude');
          expect(result.stdout).toContain(
            `state=${dir}/settings.of.repo.json: absent\n`,
          );
          expect(result.stdout).toContain(
            `state=${dir}/settings.local.json: unreadable\n`,
          );
          expect(result.stdout).toContain(
            `state=${result.root}/home/.claude/settings.json: absent\n`,
          );
          expect(result.stdout).toContain(
            `state=${dir}/settings.json: 3 Bash allow rules\n`,
          );
        },
      );
      then('the invalid layer records one fault for the caller to name', () => {
        expect(result.stdout).toContain('faults=1\n');
        expect(result.stdout).toContain(
          `fault.file=${path.join(result.root, '.claude/settings.local.json')}\n`,
        );
        expect(result.stdout).toContain('fault.causes=1\n');
      });
    });
  });
});
