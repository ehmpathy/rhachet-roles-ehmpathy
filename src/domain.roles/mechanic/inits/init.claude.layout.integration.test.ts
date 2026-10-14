import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = integration tests for which file init.claude.sh writes, by layout, and its backups
 * .why = under the split layout the repo's permissions live in settings.of.repo.json and
 *        settings.json is a link to the human's home defaults (issue #895). the init must
 *        write settings.of.repo.json by name, never replace or write through the link, and
 *        leave at most one backup per run
 */
describe('init.claude.sh layout', () => {
  const initsSrcDir = __dirname;

  // the permissions the init writes
  const PERMISSIONS_JSONC = `{
  // the mechanic allows, for this test
  "permissions": {
    "allow": ["Bash(pwd)", "Bash(rhx:*)"],
    "deny": ["Bash(rm -rf)"],
    "ask": []
  }
}`;

  // a settings file whose permissions already match PERMISSIONS_JSONC
  const PERMISSIONS_CURRENT = {
    permissions: {
      allow: ['Bash(pwd)', 'Bash(rhx:*)'],
      deny: ['Bash(rm -rf)'],
      ask: [],
    },
  };

  /**
   * .what = the shape of a settings file, as these tests read it
   * .why = a typed read; an absent or reshaped key fails the assertion, not silently
   */
  type SettingsFound = {
    permissions: { allow: string[]; deny?: string[]; ask?: string[] };
    [key: string]: unknown;
  };

  /**
   * .what = lay out a temp repo with the given .claude files, run init.claude.sh in it
   * .why = each case observes the files, links, and backups the init leaves behind
   * .note = `link` entries are symlinks to a path relative to the temp dir, which may be absent
   */
  const runInit = (input: {
    files: Record<string, { json: unknown } | { link: string }>;
    configDir?: string; // relative to the temp dir; absent = CLAUDE_CONFIG_DIR unset
    claudeDirLinkTo?: string; // relative to the temp dir; absent = .claude is a real dir
  }) => {
    const tempDir = fs.realpathSync(
      genTempDir({ slug: 'init-claude-layout', git: true }),
    );
    const initsDir = path.join(tempDir, 'inits');
    fs.mkdirSync(initsDir, { recursive: true });

    // the .claude dir: a real dir, or a link to an actor dir, as rhachet lays it out
    if (input.claudeDirLinkTo) {
      fs.mkdirSync(path.join(tempDir, input.claudeDirLinkTo), {
        recursive: true,
      });
      fs.symlinkSync(
        path.join(tempDir, input.claudeDirLinkTo),
        path.join(tempDir, '.claude'),
      );
    }
    if (!input.claudeDirLinkTo)
      fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });

    // copy the inits beside their jsonc, so each finds its peer relative to itself
    for (const name of ['init.claude.sh', 'init.claude.permissions.sh']) {
      fs.copyFileSync(path.join(initsSrcDir, name), path.join(initsDir, name));
      fs.chmodSync(path.join(initsDir, name), '755');
    }
    fs.writeFileSync(
      path.join(initsDir, 'init.claude.permissions.jsonc'),
      PERMISSIONS_JSONC,
    );

    // lay out the declared files
    for (const [relPath, content] of Object.entries(input.files)) {
      const absPath = path.join(tempDir, relPath);
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      if ('link' in content) {
        fs.symlinkSync(path.join(tempDir, content.link), absPath);
        continue;
      }
      fs.writeFileSync(absPath, JSON.stringify(content.json, null, 2));
    }

    // run the init; the runner's own CLAUDE_CONFIG_DIR never leaks in
    const { CLAUDE_CONFIG_DIR: _runnerConfigDir, ...envRest } = process.env;
    const env = input.configDir
      ? { ...envRest, CLAUDE_CONFIG_DIR: path.join(tempDir, input.configDir) }
      : envRest;
    const result = spawnSync('bash', [path.join(initsDir, 'init.claude.sh')], {
      encoding: 'utf-8',
      cwd: tempDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    });

    // observe the .claude dir after the run
    const claudeDir = path.join(tempDir, '.claude');
    const backups = fs
      .readdirSync(claudeDir)
      .filter((f) => f.endsWith('.bak.json'));
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
      claudeDir,
      backups,
    };
  };

  /**
   * .what = read a settings json file from the temp dir
   * .why = one typed read for every assertion on file content
   */
  const readJson = (input: {
    tempDir: string;
    relPath: string;
  }): SettingsFound =>
    JSON.parse(
      fs.readFileSync(path.join(input.tempDir, input.relPath), 'utf-8'),
    );

  /**
   * .what = mask the run's timestamp, temp dir, and error-trap line number in an output stream
   * .why = snapshots pin the shape of the output, not the moment, the path, or a line
   *        number that shifts on any edit above it
   */
  const asOutputMasked = (input: { output: string; tempDir: string }): string =>
    input.output
      .split(input.tempDir)
      .join('<tmp>')
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z/g, 'TIMESTAMP')
      .replace(/failed at line \d+/g, 'failed at line <N>');

  given(
    '[case13] split layout: settings.json links to the home defaults',
    () => {
      const HOME_DEFAULTS = {
        permissions: { allow: ['Bash(ls:*)'] },
        theme: 'dark',
      };

      when('[t0] settings.of.repo.json holds stale permissions', () => {
        const result = useThen('the init runs', async () =>
          runInit({
            files: {
              '.claude/settings.of.repo.json': {
                json: { permissions: { allow: ['Bash(old)'] }, hooks: {} },
              },
              '.claude/settings.json': { link: 'home/.claude/settings.json' },
              'home/.claude/settings.json': { json: HOME_DEFAULTS },
            },
          }),
        );
        then('exit 0', () => {
          expect(result.exitCode).toBe(0);
        });
        then(
          'settings.of.repo.json holds the mechanic allows, and keeps its other keys',
          () => {
            const repo = readJson({
              tempDir: result.tempDir,
              relPath: '.claude/settings.of.repo.json',
            });
            expect(repo.permissions.allow).toEqual([
              'Bash(pwd)',
              'Bash(rhx:*)',
            ]);
            expect(repo.hooks).toEqual({});
          },
        );
        then('settings.json is still a link to the same target', () => {
          const linkPath = path.join(result.claudeDir, 'settings.json');
          expect(fs.lstatSync(linkPath).isSymbolicLink()).toBe(true);
          expect(fs.readlinkSync(linkPath)).toBe(
            path.join(result.tempDir, 'home/.claude/settings.json'),
          );
        });
        then('the home file is unchanged', () => {
          expect(
            readJson({
              tempDir: result.tempDir,
              relPath: 'home/.claude/settings.json',
            }),
          ).toEqual(HOME_DEFAULTS);
        });
        then('exactly one backup: settings.of.repo.<stamp>.bak.json', () => {
          expect(result.backups).toHaveLength(1);
          expect(result.backups[0]).toMatch(
            /^settings\.of\.repo\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z\.bak\.json$/,
          );
        });
        then('stdout matches snapshot', () => {
          expect(
            asOutputMasked({ output: result.stdout, tempDir: result.tempDir }),
          ).toMatchSnapshot();
        });
      });

      when(
        '[t1] settings.of.repo.json is absent; settings.json is a link',
        () => {
          const result = useThen('the init runs', async () =>
            runInit({
              files: {
                '.claude/settings.json': { link: 'home/.claude/settings.json' },
                'home/.claude/settings.json': { json: HOME_DEFAULTS },
              },
            }),
          );
          then(
            'settings.of.repo.json is created with the mechanic allows',
            () => {
              expect(result.exitCode).toBe(0);
              const repo = readJson({
                tempDir: result.tempDir,
                relPath: '.claude/settings.of.repo.json',
              });
              expect(repo.permissions.allow).toEqual([
                'Bash(pwd)',
                'Bash(rhx:*)',
              ]);
            },
          );
          then('no backup file is written', () => {
            expect(result.backups).toEqual([]);
          });
          then('the home file is unchanged', () => {
            expect(
              readJson({
                tempDir: result.tempDir,
                relPath: 'home/.claude/settings.json',
              }),
            ).toEqual(HOME_DEFAULTS);
          });
          then('stdout matches snapshot: no backup line', () => {
            expect(result.stdout).not.toContain('.bak.json');
            expect(
              asOutputMasked({
                output: result.stdout,
                tempDir: result.tempDir,
              }),
            ).toMatchSnapshot();
          });
        },
      );

      when('[t2] the settings.json link has no target', () => {
        const result = useThen('the init runs', async () =>
          runInit({
            files: {
              '.claude/settings.json': { link: 'home/.claude/settings.json' },
            },
          }),
        );
        then(
          'exit 0, and settings.of.repo.json holds the mechanic allows',
          () => {
            expect(result.exitCode).toBe(0);
            const repo = readJson({
              tempDir: result.tempDir,
              relPath: '.claude/settings.of.repo.json',
            });
            expect(repo.permissions.allow).toEqual([
              'Bash(pwd)',
              'Bash(rhx:*)',
            ]);
          },
        );
        then('settings.json is still the same broken link', () => {
          const linkPath = path.join(result.claudeDir, 'settings.json');
          expect(fs.lstatSync(linkPath).isSymbolicLink()).toBe(true);
          expect(fs.readlinkSync(linkPath)).toBe(
            path.join(result.tempDir, 'home/.claude/settings.json'),
          );
        });
        then('the link target is still absent (never written through)', () => {
          expect(
            fs.existsSync(
              path.join(result.tempDir, 'home/.claude/settings.json'),
            ),
          ).toBe(false);
        });
        then('stdout matches snapshot', () => {
          expect(
            asOutputMasked({ output: result.stdout, tempDir: result.tempDir }),
          ).toMatchSnapshot();
        });
      });

      when('[t3] settings.of.repo.json is itself a link with no target', () => {
        const result = useThen('the init runs', async () =>
          runInit({
            files: {
              '.claude/settings.of.repo.json': {
                link: 'elsewhere/settings.of.repo.json',
              },
              '.claude/settings.json': { link: 'home/.claude/settings.json' },
            },
          }),
        );
        then('exit 2: the init refuses a linked target', () => {
          expect(result.exitCode).toBe(2);
        });
        then('stderr names the link as a ConstraintError', () => {
          expect(result.stderr).toContain(
            '✋ ConstraintError: .claude/settings.of.repo.json is a link',
          );
        });
        then('stderr matches snapshot', () => {
          expect(
            asOutputMasked({ output: result.stderr, tempDir: result.tempDir }),
          ).toMatchSnapshot();
        });
        then('the link target is still absent (never written through)', () => {
          expect(
            fs.existsSync(
              path.join(result.tempDir, 'elsewhere/settings.of.repo.json'),
            ),
          ).toBe(false);
        });
        then('stdout matches snapshot', () => {
          expect(
            asOutputMasked({ output: result.stdout, tempDir: result.tempDir }),
          ).toMatchSnapshot();
        });
      });
    },
  );

  given('[case14] old layout, and the backup count', () => {
    when('[t0] settings.json is a real file with stale permissions', () => {
      const result = useThen('the init runs', async () =>
        runInit({
          files: {
            '.claude/settings.json': {
              json: { permissions: { allow: ['Bash(old)'] } },
            },
          },
        }),
      );
      then('settings.json holds the mechanic allows', () => {
        expect(result.exitCode).toBe(0);
        expect(
          readJson({
            tempDir: result.tempDir,
            relPath: '.claude/settings.json',
          }).permissions.allow,
        ).toEqual(['Bash(pwd)', 'Bash(rhx:*)']);
      });
      then('no settings.of.repo.json is created', () => {
        expect(
          fs.existsSync(path.join(result.claudeDir, 'settings.of.repo.json')),
        ).toBe(false);
      });
      then('exactly one backup is written', () => {
        expect(result.backups).toHaveLength(1);
        expect(result.backups[0]).toMatch(
          /^settings\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z\.bak\.json$/,
        );
      });
      then('stdout matches snapshot', () => {
        expect(
          asOutputMasked({ output: result.stdout, tempDir: result.tempDir }),
        ).toMatchSnapshot();
      });
    });

    when('[t1] no settings file exists', () => {
      const result = useThen('the init runs', async () =>
        runInit({ files: {} }),
      );
      then('settings.json is created with the mechanic allows', () => {
        expect(result.exitCode).toBe(0);
        expect(
          readJson({
            tempDir: result.tempDir,
            relPath: '.claude/settings.json',
          }).permissions.allow,
        ).toEqual(['Bash(pwd)', 'Bash(rhx:*)']);
      });
      then('no backup is written', () => {
        expect(result.backups).toEqual([]);
      });
      then('stdout matches snapshot: no backup line', () => {
        expect(result.stdout).not.toContain('.bak.json');
        expect(
          asOutputMasked({ output: result.stdout, tempDir: result.tempDir }),
        ).toMatchSnapshot();
      });
    });

    when('[t2] permissions already match, old layout', () => {
      const result = useThen('the init runs', async () =>
        runInit({
          files: { '.claude/settings.json': { json: PERMISSIONS_CURRENT } },
        }),
      );
      then(
        'the file is unchanged, no backup, and stdout says already configured',
        () => {
          expect(result.exitCode).toBe(0);
          expect(
            readJson({
              tempDir: result.tempDir,
              relPath: '.claude/settings.json',
            }),
          ).toEqual(PERMISSIONS_CURRENT);
          expect(result.backups).toEqual([]);
          expect(result.stdout).toContain('already configured');
        },
      );
      then('stdout matches snapshot', () => {
        expect(
          asOutputMasked({ output: result.stdout, tempDir: result.tempDir }),
        ).toMatchSnapshot();
      });
    });

    when('[t3] permissions already match, split layout', () => {
      const result = useThen('the init runs', async () =>
        runInit({
          files: {
            '.claude/settings.of.repo.json': { json: PERMISSIONS_CURRENT },
            '.claude/settings.json': { link: 'home/.claude/settings.json' },
          },
        }),
      );
      then(
        'the file is unchanged, no backup, and stdout says already configured',
        () => {
          expect(result.exitCode).toBe(0);
          expect(
            readJson({
              tempDir: result.tempDir,
              relPath: '.claude/settings.of.repo.json',
            }),
          ).toEqual(PERMISSIONS_CURRENT);
          expect(result.backups).toEqual([]);
          expect(result.stdout).toContain('already configured');
        },
      );
      then('stdout matches snapshot', () => {
        expect(
          asOutputMasked({ output: result.stdout, tempDir: result.tempDir }),
        ).toMatchSnapshot();
      });
    });
  });

  /**
   * .what = run the check hook in a temp repo, after the init ran there
   * .why = the seam: the file the init writes must be the file the hook reads
   */
  const runCheckAfterInit = (input: {
    tempDir: string;
    command: string;
    configDir?: string; // relative to the temp dir; absent = CLAUDE_CONFIG_DIR unset
  }) => {
    const { CLAUDE_CONFIG_DIR: _runnerConfigDir, ...envBase } = process.env;
    const envRest = input.configDir
      ? {
          ...envBase,
          CLAUDE_CONFIG_DIR: path.join(input.tempDir, input.configDir),
        }
      : envBase;
    const spawned = spawnSync(
      'bash',
      [
        path.join(
          initsSrcDir,
          'claude.hooks',
          'pretooluse.check-permissions.sh',
        ),
      ],
      {
        cwd: input.tempDir,
        input: JSON.stringify({
          tool_name: 'Bash',
          tool_input: { command: input.command },
        }),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...envRest, HOME: path.join(input.tempDir, 'home') },
      },
    );
    return {
      exitCode: spawned.status ?? 1,
      stderr: (spawned.stderr ?? '').toString(),
    };
  };

  given('[case16] the hook reads the file the init writes', () => {
    when('[t0] split layout: the init writes settings.of.repo.json', () => {
      const result = useThen('the init runs, then the hook', async () => {
        const init = runInit({
          files: {
            '.claude/settings.json': { link: 'home/.claude/settings.json' },
            'home/.claude/settings.json': {
              json: { permissions: { allow: [] } },
            },
          },
        });
        return {
          initExitCode: init.exitCode,
          listed: runCheckAfterInit({
            tempDir: init.tempDir,
            command: 'rhx review --rules x',
          }),
          unlisted: runCheckAfterInit({
            tempDir: init.tempDir,
            command: 'wavetool --go',
          }),
        };
      });
      then('the init exits 0', () => {
        expect(result.initExitCode).toBe(0);
      });
      then('a command the init allowed passes the hook', () => {
        expect(result.listed.exitCode).toBe(0);
      });
      then('a command the init did not allow blocks', () => {
        expect(result.unlisted.exitCode).toBe(2);
      });
    });
    when('[t1] old layout: the init writes settings.json', () => {
      const result = useThen('the init runs, then the hook', async () => {
        const init = runInit({ files: {} });
        return {
          initExitCode: init.exitCode,
          listed: runCheckAfterInit({
            tempDir: init.tempDir,
            command: 'rhx review --rules x',
          }),
        };
      });
      then('the init exits 0', () => {
        expect(result.initExitCode).toBe(0);
      });
      then('a command the init allowed passes the hook', () => {
        expect(result.listed.exitCode).toBe(0);
      });
    });
    when(
      '[t2] split layout, a hash-actor clone with an empty actor dir: init, then the hook as that clone',
      () => {
        const result = useThen('the init runs, then the hook', async () => {
          const init = runInit({
            files: {
              '.claude/settings.json': { link: 'home/.claude/settings.json' },
              'home/.claude/settings.json': {
                json: { permissions: { allow: [] } },
              },
              'actor/.claude/settings.json': {
                json: { permissions: { allow: [] } },
              },
            },
            configDir: 'actor/.claude',
          });
          return {
            initExitCode: init.exitCode,
            tempDir: init.tempDir,
            listed: runCheckAfterInit({
              tempDir: init.tempDir,
              command: 'rhx review --rules x',
              configDir: 'actor/.claude',
            }),
          };
        });
        then('the init exits 0', () => {
          expect(result.initExitCode).toBe(0);
        });
        then(
          'the command the init allowed still blocks: the init writes only the repo .claude',
          () => {
            expect(result.listed.exitCode).toBe(2);
          },
        );
        then(
          'the fix names the clone actor file and re-enroll, which derives that file',
          () => {
            expect(result.listed.stderr).toContain(
              `fix: this clone reads its actor allowlist from ${path.join(result.tempDir, 'actor/.claude')}/settings.of.repo.json, which rhx enroll derives; re-enroll this clone`,
            );
            expect(result.listed.stderr).not.toContain(
              "to write the repo's allowlist",
            );
          },
        );
      },
    );
  });

  given(
    '[case17] old layout under a linked .claude dir, as rhachet 1.48 lays it out',
    () => {
      // rhachet 1.48 links <repo>/.claude to the repo actor's dir on the old layout too, where
      // claude loads a real settings.json; a linked dir must not read as the split layout, or
      // the init would write settings.of.repo.json, which that claude never loads
      when('[t0] .claude links to the actor dir; settings.json is real', () => {
        const result = useThen('the init runs', async () =>
          runInit({
            files: {
              '.claude/settings.json': {
                json: { permissions: { allow: ['Bash(old)'] } },
              },
            },
            claudeDirLinkTo: 'actor/brain/.claude',
          }),
        );
        then('exit 0', () => {
          expect(result.exitCode).toBe(0);
        });
        then('the init writes the mechanic allows into settings.json', () => {
          expect(
            readJson({
              tempDir: result.tempDir,
              relPath: '.claude/settings.json',
            }).permissions.allow,
          ).toEqual(['Bash(pwd)', 'Bash(rhx:*)']);
        });
        then('the init writes no settings.of.repo.json', () => {
          expect(
            fs.existsSync(
              path.join(result.tempDir, '.claude/settings.of.repo.json'),
            ),
          ).toBe(false);
        });
      });
    },
  );

  given(
    '[case15] the init configures the repo, not the caller actor (F15)',
    () => {
      when('[t0] CLAUDE_CONFIG_DIR names a hash actor dir', () => {
        const ACTOR_REPO = { permissions: { allow: ['Bash(rhx review:*)'] } };
        const result = useThen('the init runs', async () =>
          runInit({
            files: {
              '.claude/settings.of.repo.json': {
                json: { permissions: { allow: ['Bash(old)'] } },
              },
              'actor/.claude/settings.of.repo.json': { json: ACTOR_REPO },
            },
            configDir: 'actor/.claude',
          }),
        );
        then('exit 0', () => {
          expect(result.exitCode).toBe(0);
        });
        then(
          'the repo .claude/settings.of.repo.json holds the mechanic allows',
          () => {
            expect(
              readJson({
                tempDir: result.tempDir,
                relPath: '.claude/settings.of.repo.json',
              }).permissions.allow,
            ).toEqual(['Bash(pwd)', 'Bash(rhx:*)']);
          },
        );
        then('the actor settings.of.repo.json is untouched', () => {
          expect(
            readJson({
              tempDir: result.tempDir,
              relPath: 'actor/.claude/settings.of.repo.json',
            }),
          ).toEqual(ACTOR_REPO);
        });
        then('stdout names the clone config dir the init did not write', () => {
          expect(result.stdout).toContain(
            `note: this clone's config dir is ${result.tempDir}/actor/.claude`,
          );
          expect(
            asOutputMasked({ output: result.stdout, tempDir: result.tempDir }),
          ).toMatchSnapshot();
        });
      });
      when('[t1] CLAUDE_CONFIG_DIR is unset', () => {
        const result = useThen('the init runs', async () =>
          runInit({ files: {} }),
        );
        then('stdout carries no config dir note', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).not.toContain('config dir');
        });
      });
    },
  );
});
