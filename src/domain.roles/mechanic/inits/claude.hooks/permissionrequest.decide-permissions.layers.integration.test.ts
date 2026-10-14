import * as fs from 'fs';
import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

import {
  genPermissionLayersFixture,
  type PermissionLayerFileContent,
} from './genPermissionLayersFixture';

/**
 * .what = integration tests for which settings layers permissionrequest.decide-permissions.sh reads
 * .why = the decider must judge by the same allow + deny layers gate 2 reads (issue #895):
 *        a repo allow in settings.of.repo.json approves; a deny in any layer vetoes an allow in
 *        another; another actor's settings.of.repo.json never approves; the audit log lands in
 *        the clone's own config dir
 */
describe('permissionrequest.decide-permissions.sh layers', () => {
  const scriptPath = path.join(
    __dirname,
    'permissionrequest.decide-permissions.sh',
  );

  /**
   * .what = a settings file with Bash(<pattern>) per allow and deny pattern
   * .why = each layout declares its allows and denies in one short call
   */
  const perms = (input: {
    allow: string[];
    deny: string[];
  }): PermissionLayerFileContent => ({
    json: {
      permissions: {
        allow: input.allow.map((p) => `Bash(${p})`),
        deny: input.deny.map((p) => `Bash(${p})`),
      },
    },
  });

  /**
   * .what = run the decider for one command in a fresh fixture; decode the verdict
   * .why = each case asserts one verdict (allow, deny, or LIFT) against its own layout
   */
  const runDecide = (input: {
    files: Record<string, PermissionLayerFileContent>;
    command: string;
    configDir: string | null;
  }) => {
    const fixture = genPermissionLayersFixture({
      slug: 'decide-permissions-layers',
      files: input.files,
    });
    const result = fixture.run({
      scriptPath,
      stdin: JSON.stringify({
        tool_name: 'Bash',
        hook_event_name: 'PermissionRequest',
        tool_input: { command: input.command },
      }),
      configDir: input.configDir,
      args: [],
    });
    const verdict =
      result.stdout.trim() === ''
        ? 'LIFT'
        : JSON.parse(result.stdout.trim()).hookSpecificOutput.decision.behavior;
    return { ...result, verdict, tempDir: fixture.tempDir };
  };

  given('[case11] the decider reads the layered allow and deny sets', () => {
    when(
      '[t0] split, walk; settings.of.repo.json allows npm run build, home allows tail',
      () => {
        const files = {
          '.claude/settings.of.repo.json': perms({
            allow: ['npm run build:*'],
            deny: [],
          }),
          '.claude/settings.json': { linkTo: 'home/.claude/settings.json' },
          'home/.claude/settings.json': perms({ allow: ['tail:*'], deny: [] }),
        };
        then(
          'the compound `npm run build | tail -5` gets decision allow',
          () => {
            const result = runDecide({
              files,
              command: 'npm run build | tail -5',
              configDir: null,
            });
            expect(result.verdict).toBe('allow');
          },
        );
        then(
          'with settings.of.repo.json absent, the same compound gets no allow',
          () => {
            const {
              ['.claude/settings.of.repo.json']: _repo,
              ...filesWithout
            } = files;
            const control = runDecide({
              files: filesWithout,
              command: 'npm run build | tail -5',
              configDir: null,
            });
            expect(control.verdict).toBe('LIFT');
          },
        );
      },
    );

    when(
      '[t1] split, walk; settings.of.repo.json denies rhx git.commit.uses set; home allows rhx and cat',
      () => {
        const home = perms({ allow: ['rhx:*', 'cat:*'], deny: [] });
        then(
          '`rhx git.commit.uses set --quant 1 | cat` gets no allow: the repo deny wins',
          () => {
            const result = runDecide({
              files: {
                '.claude/settings.of.repo.json': perms({
                  allow: [],
                  deny: ['rhx git.commit.uses set:*'],
                }),
                '.claude/settings.json': {
                  linkTo: 'home/.claude/settings.json',
                },
                'home/.claude/settings.json': home,
              },
              command: 'rhx git.commit.uses set --quant 1 | cat',
              configDir: null,
            });
            expect(result.verdict).toBe('LIFT');
          },
        );
        then(
          'without that deny, the same compound gets allow (the veto came from the repo layer)',
          () => {
            const control = runDecide({
              files: {
                '.claude/settings.of.repo.json': perms({ allow: [], deny: [] }),
                '.claude/settings.json': {
                  linkTo: 'home/.claude/settings.json',
                },
                'home/.claude/settings.json': home,
              },
              command: 'rhx git.commit.uses set --quant 1 | cat',
              configDir: null,
            });
            expect(control.verdict).toBe('allow');
          },
        );
      },
    );

    when(
      '[t2] ccd; actor files allow cat; only the walk-up settings.of.repo.json allows wavetool',
      () => {
        then(
          '`wavetool --go | cat` gets no allow: a foreign allow never approves',
          () => {
            const result = runDecide({
              files: {
                'actor/.claude/settings.of.repo.json': perms({
                  allow: ['cat:*'],
                  deny: [],
                }),
                '.claude/settings.of.repo.json': perms({
                  allow: ['wavetool:*'],
                  deny: [],
                }),
              },
              command: 'wavetool --go | cat',
              configDir: 'actor/.claude',
            });
            expect(result.verdict).toBe('LIFT');
          },
        );
      },
    );

    when('[t3] walk; no settings file in any layer', () => {
      const result = useThen('the decider runs', async () =>
        runDecide({
          files: {},
          command: 'npm run build | cat',
          configDir: null,
        }),
      );
      then('the decision is a lift, never allow', () => {
        expect(result.verdict).toBe('LIFT');
      });
      then(
        'stderr says no pre-approved bash permissions were found, and names each path sought',
        () => {
          expect(result.stderr).toContain(
            'no pre-approved bash permissions were found',
          );
          expect(result.stderr).toContain(
            `${path.join(result.tempDir, '.claude/settings.of.repo.json')}: absent`,
          );
          expect(result.stderr).toContain(
            `${path.join(result.tempDir, 'home/.claude/settings.json')}: absent`,
          );
        },
      );
      then('stderr matches snapshot: the no allowlist warn', () => {
        expect(
          result.stderr.split(result.tempDir).join('<tmp>'),
        ).toMatchSnapshot();
      });
    });

    when(
      '[t4] ccd; the actor settings.of.repo.json allows the compound',
      () => {
        const result = useThen('the decider runs', async () =>
          runDecide({
            files: {
              'actor/.claude/settings.of.repo.json': perms({
                allow: ['npm run build:*', 'cat:*'],
                deny: [],
              }),
            },
            command: 'npm run build | cat',
            configDir: 'actor/.claude',
          }),
        );
        then('the decision is allow', () => {
          expect(result.verdict).toBe('allow');
        });
        then(
          'the audit line lands in $CLAUDE_CONFIG_DIR/permission.decisions.local.log',
          () => {
            const log = fs.readFileSync(
              path.join(
                result.tempDir,
                'actor/.claude/permission.decisions.local.log',
              ),
              'utf-8',
            );
            expect(log).toContain('"verdict":"allow"');
          },
        );
        then('the walk-up dir holds no audit log', () => {
          expect(
            fs.existsSync(
              path.join(
                result.tempDir,
                '.claude/permission.decisions.local.log',
              ),
            ),
          ).toBe(false);
        });
      },
    );

    when(
      '[t5] ccd; only the actor settings.local.json allows the compound, a file claude does not load',
      () => {
        then(
          'the decision is a lift: decide never auto-approves from a file claude would not honor',
          () => {
            const result = runDecide({
              files: {
                'actor/.claude/settings.local.json': perms({
                  allow: ['npm run build:*', 'cat:*'],
                  deny: [],
                }),
              },
              command: 'npm run build | cat',
              configDir: 'actor/.claude',
            });
            expect(result.verdict).toBe('LIFT');
          },
        );
        then(
          'the same allows in the actor settings.of.repo.json get allow (the lift came from the file, not the allows)',
          () => {
            const control = runDecide({
              files: {
                'actor/.claude/settings.of.repo.json': perms({
                  allow: ['npm run build:*', 'cat:*'],
                  deny: [],
                }),
              },
              command: 'npm run build | cat',
              configDir: 'actor/.claude',
            });
            expect(control.verdict).toBe('allow');
          },
        );
      },
    );

    when(
      '[t6] ccd, split; only the user settings.json denies a command the actor settings.of.repo.json allows',
      () => {
        then(
          'the deny still vetoes: the deny set reads every layer claude loads, since a wider deny only removes an approve',
          () => {
            const result = runDecide({
              files: {
                'actor/.claude/settings.of.repo.json': perms({
                  allow: ['npm run build:*', 'cat:*'],
                  deny: [],
                }),
                'actor/.claude/settings.json': perms({
                  allow: [],
                  deny: ['npm run build:*'],
                }),
              },
              command: 'npm run build | cat',
              configDir: 'actor/.claude',
            });
            expect(result.verdict).toBe('LIFT');
          },
        );
      },
    );

    when(
      '[t6b] ccd, split; only the actor settings.local.json denies a command the actor settings.of.repo.json allows',
      () => {
        then(
          'the deny does not count: claude does not load settings.local.json on the split layout, so the decider matches claude',
          () => {
            const result = runDecide({
              files: {
                'actor/.claude/settings.of.repo.json': perms({
                  allow: ['npm run build:*', 'cat:*'],
                  deny: [],
                }),
                'actor/.claude/settings.local.json': perms({
                  allow: [],
                  deny: ['npm run build:*'],
                }),
              },
              command: 'npm run build | cat',
              configDir: 'actor/.claude',
            });
            expect(result.verdict).toBe('allow');
          },
        );
      },
    );

    when(
      '[t7] walk; settings.of.repo.json allows the compound; home settings.json is not json',
      () => {
        const result = useThen('the decider runs', async () =>
          runDecide({
            files: {
              '.claude/settings.of.repo.json': perms({
                allow: ['npm run build:*', 'cat:*'],
                deny: [],
              }),
              'home/.claude/settings.json': { text: '{ "permissions": ' },
            },
            command: 'npm run build | cat',
            configDir: null,
          }),
        );
        then('the other layers still count: the decision is allow', () => {
          expect(result.verdict).toBe('allow');
        });
        then('stderr names the corrupt file, once per key read', () => {
          const needle = `could not parse ${path.join(result.tempDir, 'home/.claude/settings.json')} as json`;
          expect(result.stderr.split(needle).length - 1).toBe(2);
        });
        then('stderr matches snapshot: the corrupt-layer warn', () => {
          // .note = jq 1.6/1.7 lead the cause with `jq: `, later builds drop it, and the
          //         position text varies by build; the snapshot pins the shape, not the host's jq
          expect(
            result.stderr
              .split(result.tempDir)
              .join('<tmp>')
              .replace(
                /(?:jq: )?parse error: .*$/gm,
                'jq: parse error: <cause>',
              ),
          ).toMatchSnapshot();
        });
      },
    );

    when(
      '[t8] ccd; an empty actor dir; only the project settings.json allows the compound (cell #25)',
      () => {
        // pins today's verdict: the project layer counts for approve. an enrolled clone
        // spawned with --setting-sources user,local does not load it, so this allow would
        // over-approve there; the 5.3 gate settles which layers such a clone loads
        const result = useThen('the decider runs', async () =>
          runDecide({
            files: {
              'actor/.claude/.keep': { text: '' },
              '.claude/settings.json': perms({
                allow: ['npm run build:*', 'cat:*'],
                deny: [],
              }),
            },
            command: 'npm run build | cat',
            configDir: 'actor/.claude',
          }),
        );
        then('the decision is allow, from the project layer', () => {
          expect(result.verdict).toBe('allow');
        });
        then('stderr carries no warn: the allow set is not empty', () => {
          expect(result.stderr).not.toContain('no pre-approved');
        });
      },
    );

    when('[t9] ccd; no layer holds an allow', () => {
      const result = useThen('the decider runs', async () =>
        runDecide({
          files: { 'actor/.claude/.keep': { text: '' } },
          command: 'npm run build | cat',
          configDir: 'actor/.claude',
        }),
      );
      then('the decision is a lift', () => {
        expect(result.verdict).toBe('LIFT');
      });
      then('the fix names the actor file, not rhx init', () => {
        expect(result.stderr).toContain(
          `fix: this clone reads its actor allowlist from ${path.join(result.tempDir, 'actor/.claude')}/settings.of.repo.json`,
        );
        expect(result.stderr).not.toContain("to write the repo's allowlist");
      });
      then('stderr matches snapshot: the ccd no allowlist warn', () => {
        expect(
          result.stderr.split(result.tempDir).join('<tmp>'),
        ).toMatchSnapshot();
      });
    });
  });
});
