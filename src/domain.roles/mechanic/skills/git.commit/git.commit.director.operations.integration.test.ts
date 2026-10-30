import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

/**
 * .what = integration tests for git.commit.director.operations.sh
 * .why = every quota refusal (git.commit.set, git.commit.push,
 *        git.branch.rebase begin, git.release, git.stage.add) renders its fix through
 *        print_quota_grant_fix; a director-governed tree must name the
 *        director's grant line, and every other tree must keep the extant
 *        human fix byte for byte
 */
describe('git.commit.director.operations.sh', () => {
  const directorPath = path.join(
    __dirname,
    'git.commit.director.operations.sh',
  );

  /**
   * .what = source git.commit.director.operations.sh and call one of its functions
   * .why = args travel as argv, never through a shell string, so the bytes
   *        under test are exactly what each surface passes
   */
  const runDirectorFn = (input: {
    fn: string;
    args: string[];
    prelude?: string;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const result = spawnSync(
      'bash',
      [
        '-c',
        `set -euo pipefail; source "$0"; ${input.prelude ?? ''} fn="$1"; shift; "$fn" "$@"`,
        directorPath,
        input.fn,
        ...input.args,
      ],
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    );
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  const TREE = 'svc-quotes.beav.fix-ask-for-details-survives-crash';
  const REPO_ROOT = `/home/surfer/git/_worktrees/${TREE}`;
  const asGrantLine = (input: { grantFlag: string }) =>
    `rhx git.crew.grant --tree ${TREE} --quota <n> ${input.grantFlag} --why '<why>'`;

  // each surface as its call site passes it: the refusal kind, the meter state
  // it meets, and whether the driver's own command needs push (`wantsPush`).
  // the extant human fix is verbatim from main; `indent` is the surface's
  // frame, which the renderer owns, so lead and cmd come unindented.
  // `ask` and `grantFlag` are what the renderer must derive, never inputs
  const SURFACES = [
    {
      surface: 'git.commit.set, no uses left (a commit-only tree)',
      refusal: 'uses-out',
      wantsPush: false,
      meter: { uses: 0, push: 'block' },
      indent: '',
      humanLead: 'ask your human to grant more:',
      humanCmd: '  $ git.commit.uses set --quant N --push allow|block',
      ask: 'grant more',
      grantFlag: '--push block',
    },
    {
      surface: 'git.commit.set --push, no uses left (a commit-only tree)',
      refusal: 'uses-out',
      wantsPush: true,
      meter: { uses: 0, push: 'block' },
      indent: '',
      humanLead: 'ask your human to grant more:',
      humanCmd: '  $ git.commit.uses set --quant N --push allow|block',
      ask: 'grant more',
      grantFlag: '--push allow',
    },
    {
      surface: 'git.commit.set, no uses left (stage granted)',
      refusal: 'uses-out',
      wantsPush: false,
      meter: { uses: 0, push: 'allow', stage: 'allow' },
      indent: '',
      humanLead: 'ask your human to grant more:',
      humanCmd: '  $ git.commit.uses set --quant N --push allow|block',
      ask: 'grant more',
      grantFlag: '--push allow --stage allow',
    },
    {
      surface: 'git.commit.set, no quota set',
      refusal: 'quota-absent',
      wantsPush: false,
      meter: null,
      indent: '',
      humanLead: 'ask your human to grant:',
      humanCmd: '  $ git.commit.uses set --quant N --push allow|block',
      ask: 'grant a quota',
      grantFlag: '--push <allow|block>',
    },
    {
      surface: 'git.commit.set, push not allowed',
      refusal: 'push-blocked',
      wantsPush: false,
      meter: { uses: 3, push: 'block' },
      indent: '',
      humanLead: 'ask your human to grant with --push allow',
      humanCmd: '',
      ask: 'grant push',
      grantFlag: '--push allow',
    },
    {
      surface: 'git.commit.push, push not allowed',
      refusal: 'push-blocked',
      wantsPush: false,
      meter: { uses: 3, push: 'block' },
      indent: '',
      humanLead: 'ask your human to grant with --push allow:',
      humanCmd: '  $ git.commit.uses set --quant N --push allow',
      ask: 'grant push',
      grantFlag: '--push allow',
    },
    {
      surface: 'git.branch.rebase begin, no quota set',
      refusal: 'quota-absent',
      wantsPush: true,
      meter: null,
      indent: '',
      humanLead: 'ask your human to grant permission:',
      humanCmd: '  $ rhx git.commit.uses set --quant N --push allow',
      ask: 'grant a quota',
      grantFlag: '--push allow',
    },
    {
      surface: 'git.branch.rebase begin, push not allowed',
      refusal: 'push-blocked',
      wantsPush: false,
      meter: { uses: 3, push: 'block' },
      indent: '',
      humanLead: 'ask your human to grant permission:',
      humanCmd: '  $ rhx git.commit.uses set --quant N --push allow',
      ask: 'grant push',
      grantFlag: '--push allow',
    },
    {
      surface: 'git.branch.rebase begin, no uses left',
      refusal: 'uses-out',
      wantsPush: true,
      meter: { uses: 0, push: 'allow' },
      indent: '',
      humanLead: 'ask your human to grant more:',
      humanCmd: '  $ rhx git.commit.uses set --quant N --push allow',
      ask: 'grant more',
      grantFlag: '--push allow',
    },
    {
      surface: 'git.release, no quota set',
      refusal: 'quota-absent',
      wantsPush: false,
      meter: null,
      indent: '   ',
      humanLead: 'ask your human to grant:',
      humanCmd: '$ git.commit.uses set --quant N --push allow',
      ask: 'grant a quota',
      grantFlag: '--push <allow|block>',
    },
    {
      surface: 'git.release, no uses left (push allowed)',
      refusal: 'uses-out',
      wantsPush: false,
      meter: { uses: 0, push: 'allow' },
      indent: '   ',
      humanLead: 'ask your human to grant more:',
      humanCmd: '$ git.commit.uses set --quant N --push allow',
      ask: 'grant more',
      grantFlag: '--push allow',
    },
    {
      surface: 'git.stage.add, no quota set',
      refusal: 'stage-blocked',
      wantsPush: false,
      meter: null,
      indent: '',
      humanLead: 'ask your human to grant stage permission:',
      humanCmd:
        '  $ git.commit.uses set --quant N --push allow|block --stage allow',
      ask: 'grant stage',
      grantFlag: '--push <allow|block> --stage allow',
    },
    {
      surface: 'git.stage.add, stage not allowed (a commit-only tree)',
      refusal: 'stage-blocked',
      wantsPush: false,
      meter: { uses: 3, push: 'block', stage: 'block' },
      indent: '',
      humanLead: 'ask your human to grant stage permission:',
      humanCmd:
        '  $ git.commit.uses set --quant N --push allow|block --stage allow',
      ask: 'grant stage',
      grantFlag: '--push block --stage allow',
    },
  ];

  // one temp dir holds each surface's meter file, written once per surface
  const METER_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'director-meter-'));
  afterAll(() => fs.rmSync(METER_DIR, { recursive: true, force: true }));

  /**
   * .what = the meter file a surface meets, or a path to no file
   * .why = the renderer reads push and stage from the meter itself
   */
  const asMeterFile = (input: {
    meter: Record<string, unknown> | null;
  }): string => {
    const meterFile = path.join(
      METER_DIR,
      `${JSON.stringify(input.meter).replace(/[^a-z0-9]/gi, '_')}.jsonc`,
    );
    if (input.meter !== null)
      fs.writeFileSync(meterFile, JSON.stringify(input.meter));
    return meterFile;
  };

  /**
   * .what = render one surface's quota fix under one director state
   * .why = every case drives the same render; only the state and surface vary
   */
  const renderFix = (input: {
    director: string | null;
    surface: (typeof SURFACES)[number];
    prelude?: string;
  }) =>
    runDirectorFn({
      fn: 'print_quota_grant_fix',
      prelude: input.prelude,
      args: [
        ...(input.director === null ? [] : [`director=${input.director}`]),
        `repo_root=${REPO_ROOT}`,
        `refusal=${input.surface.refusal}`,
        `meter_file=${asMeterFile({ meter: input.surface.meter })}`,
        `wants_push=${input.surface.wantsPush}`,
        `indent=${input.surface.indent}`,
        `human_lead=${input.surface.humanLead}`,
        `human_cmd=${input.surface.humanCmd}`,
      ],
    });

  given('[case1] the detection seam, which reads no marker', () => {
    when('[t0] a tree asks whether a director governs it', () => {
      then('it answers none, so every refusal keeps its extant fix', () => {
        const result = runDirectorFn({
          fn: 'get_one_tree_director_state',
          args: ['repo_root=/tmp/any-tree'],
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe('none');
      });
    });
  });

  given('[case2] a tree no director governs (director=none)', () => {
    SURFACES.map((surface) =>
      when(`[t0] ${surface.surface} renders its fix`, () => {
        // render once per surface; each then reads the shared result
        const result = useThen('it renders', () =>
          renderFix({ director: 'none', surface }),
        );
        then('the bytes match the extant human fix exactly', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toEqual(
            `\n${surface.indent}${surface.humanLead}\n${surface.indent}${surface.humanCmd}\n`,
          );
        });
        then('no director and no git.crew.grant is named', () => {
          expect(result.stdout).not.toContain('director');
          expect(result.stdout).not.toContain('git.crew.grant');
        });
      }),
    );
  });

  given('[case3] a tree a director governs (director=charter)', () => {
    SURFACES.map((surface) =>
      when(`[t0] ${surface.surface} renders its fix`, () => {
        // render once per surface; each then reads the shared result
        const result = useThen('it renders', () =>
          renderFix({ director: 'charter', surface }),
        );
        then('it tells the driver to ask its director, never a human', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain(
            `a director governs this tree; ask your director to ${surface.ask}. the director runs:`,
          );
          expect(result.stdout).not.toContain('ask your human');
        });
        then(
          'it names the line the director runs, with the real tree slug',
          () => {
            expect(result.stdout).toContain(
              `$ ${asGrantLine({ grantFlag: surface.grantFlag })}`,
            );
            expect(result.stdout).not.toContain('<tree>');
          },
        );
        then('it keeps the surface indent', () => {
          const lines = result.stdout.split('\n').filter((line) => line.length);
          lines.map((line) =>
            expect(line.startsWith(surface.indent)).toBe(true),
          );
        });
        then('the render matches the snapshot', () => {
          expect(result.stdout).toMatchSnapshot();
        });
      }),
    );
  });

  given(
    '[case4] a director marker that cannot be read (director=unreadable)',
    () => {
      SURFACES.map((surface) =>
        when(`[t0] ${surface.surface} renders its fix`, () => {
          // render once per surface; each then reads the shared result
          const result = useThen('it renders', () =>
            renderFix({ director: 'unreadable', surface }),
          );
          then(
            'it names both granters, director first, so the fix is never hidden',
            () => {
              expect(result.exitCode).toBe(0);
              expect(result.stdout).toContain('cannot be read');
              expect(result.stdout).toContain(
                `$ ${asGrantLine({ grantFlag: surface.grantFlag })}`,
              );
              expect(result.stdout).toContain(`else, ${surface.humanLead}`);
              expect(result.stdout.indexOf('the director runs:')).toBeLessThan(
                result.stdout.indexOf('else, '),
              );
            },
          );
          then('the two command lines align, and no blank line trails', () => {
            const lines = result.stdout.split('\n');
            const cmdIndents = lines
              .filter((line) => line.trimStart().startsWith('$ '))
              .map((line) => line.length - line.trimStart().length);
            expect(new Set(cmdIndents).size).toBe(1);
            expect(result.stdout.endsWith('\n\n')).toBe(false);
          });
          then('the render matches the snapshot', () => {
            expect(result.stdout).toMatchSnapshot();
          });
        }),
      );
    },
  );

  given(
    '[case5] a director state the render does not know (a detector fault)',
    () => {
      SURFACES.map((surface) =>
        when(`[t0] ${surface.surface} renders under director=Charter`, () => {
          // render once per surface; each then reads the shared result
          const result = useThen('it renders', () =>
            renderFix({ director: 'Charter', surface }),
          );
          const resultUnreadable = useThen('the unreadable render', () =>
            renderFix({ director: 'unreadable', surface }),
          );
          then('it never falls back to a silent human-only fix', () => {
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain(
              `$ ${asGrantLine({ grantFlag: surface.grantFlag })}`,
            );
            expect(result.stdout).toContain('cannot be read');
          });
          then('it renders exactly as unreadable', () => {
            expect(result.stdout).toEqual(resultUnreadable.stdout);
          });
        }),
      );
    },
  );

  given('[case6] the caller passes no director, as every skill does', () => {
    SURFACES.map((surface) =>
      when(`[t0] ${surface.surface} renders its fix`, () => {
        // render once per surface; each then reads the shared result
        const result = useThen('it renders', () =>
          renderFix({ director: null, surface }),
        );
        const resultNone = useThen('the none render', () =>
          renderFix({ director: 'none', surface }),
        );
        then('the state is read from the tree at render time', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toEqual(resultNone.stdout);
        });
      }),
    );
  });

  given('[case7] the director read fails, under set -euo pipefail', () => {
    SURFACES.map((surface) =>
      when(`[t0] ${surface.surface} renders its fix`, () => {
        // render once per surface; each then reads the shared result
        const result = useThen('it renders', () =>
          renderFix({
            director: null,
            surface,
            prelude: 'get_one_tree_director_state() { return 1; };',
          }),
        );
        const resultUnreadable = useThen('the unreadable render', () =>
          renderFix({ director: 'unreadable', surface }),
        );
        then('the skill is not aborted: the render exits 0', () => {
          expect(result.exitCode).toBe(0);
        });
        then(
          'the fault renders as unreadable, so the fix is never hidden',
          () => {
            expect(result.stdout).toEqual(resultUnreadable.stdout);
          },
        );
      }),
    );
  });

  given(
    '[case8] the json-mode push refusal (git.commit.push --output json)',
    () => {
      const surface = SURFACES.find(
        (surface) => surface.surface === 'git.commit.push, push not allowed',
      )!;

      /**
       * .what = the json fix text for the push refusal under one director state
       * .why = json mode carries the director fix in a `fix` field; with no
       *        director it carries none, so main's json bytes stand
       */
      const getJsonFix = (input: { director: string | null }) =>
        runDirectorFn({
          fn: 'get_one_quota_grant_fix_for_json',
          args: [
            ...(input.director === null ? [] : [`director=${input.director}`]),
            `repo_root=${REPO_ROOT}`,
            `refusal=${surface.refusal}`,
            `meter_file=${asMeterFile({ meter: surface.meter })}`,
            `human_lead=${surface.humanLead}`,
            `human_cmd=${surface.humanCmd}`,
          ],
        });

      when('[t0] no director governs the tree', () => {
        const result = useThen('it computes the fix', () =>
          getJsonFix({ director: null }),
        );
        then('the fix is empty, so the json carries no fix field', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toEqual('');
        });
      });

      when('[t1] a director governs the tree', () => {
        const result = useThen('it computes the fix', () =>
          getJsonFix({ director: 'charter' }),
        );
        then('the fix names the director grant, never a human', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('ask your director to grant push');
          expect(result.stdout).toContain(
            `$ ${asGrantLine({ grantFlag: surface.grantFlag })}`,
          );
          expect(result.stdout).not.toContain('ask your human');
        });
        then('the fix has no lead blank line', () => {
          expect(result.stdout.startsWith('\n')).toBe(false);
        });
        then('the fix matches the snapshot', () => {
          expect(result.stdout).toMatchSnapshot();
        });
      });

      when('[t2] the director state cannot be read', () => {
        const result = useThen('it computes the fix', () =>
          getJsonFix({ director: 'unreadable' }),
        );
        then('the fix names both granters, director first', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('cannot be read');
          expect(result.stdout).toContain(
            `$ ${asGrantLine({ grantFlag: surface.grantFlag })}`,
          );
          expect(result.stdout).toContain(`else, ${surface.humanLead}`);
        });
        then('the fix matches the snapshot', () => {
          expect(result.stdout).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case9] the push flag of a grant line that must not change push',
    () => {
      const PUSH_FLAG_CASES = [
        { push: 'allow', flag: '--push allow' },
        { push: 'block', flag: '--push block' },
        { push: '', flag: '--push <allow|block>' },
        { push: 'null', flag: '--push <allow|block>' },
      ];
      PUSH_FLAG_CASES.map((thisCase) =>
        when(`[t0] the meter's push state is '${thisCase.push}'`, () => {
          then(`the flag is '${thisCase.flag}'`, () => {
            const result = runDirectorFn({
              fn: 'get_one_push_grant_flag',
              args: [`push=${thisCase.push}`],
            });
            expect(result.exitCode).toBe(0);
            expect(result.stdout.trim()).toEqual(thisCase.flag);
          });
        }),
      );

      when('[t1] a commit-only tree (push block) runs out of uses', () => {
        const surface = SURFACES.find((one) =>
          one.surface.startsWith('git.commit.set, no uses left (a commit-only'),
        )!;
        const result = useThen('it renders under a director', () =>
          renderFix({ director: 'charter', surface }),
        );
        then('the director line keeps push blocked, never widens it', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('--push block');
          expect(result.stdout).not.toContain('--push allow');
        });
      });
    },
  );

  given('[case10] the grant flags, by refusal kind and meter state', () => {
    // the renderer's own policy: lift only what the refusal (or the driver's
    // command) needs; keep push and stage as the meter has them
    const FLAG_CASES = [
      {
        refusal: 'uses-out',
        meter: { push: 'block' },
        wantsPush: false,
        flags: '--push block',
      },
      {
        refusal: 'uses-out',
        meter: { push: 'block' },
        wantsPush: true,
        flags: '--push allow',
      },
      {
        refusal: 'uses-out',
        meter: { push: 'allow', stage: 'allow' },
        wantsPush: false,
        flags: '--push allow --stage allow',
      },
      {
        refusal: 'quota-absent',
        meter: null,
        wantsPush: false,
        flags: '--push <allow|block>',
      },
      {
        refusal: 'push-blocked',
        meter: { push: 'block' },
        wantsPush: false,
        flags: '--push allow',
      },
      {
        refusal: 'stage-blocked',
        meter: { push: 'block', stage: 'block' },
        wantsPush: false,
        flags: '--push block --stage allow',
      },
      {
        refusal: 'stage-blocked',
        meter: null,
        wantsPush: false,
        flags: '--push <allow|block> --stage allow',
      },
      {
        refusal: 'a-kind-no-skill-names',
        meter: { push: 'block' },
        wantsPush: false,
        flags: '--push block',
      },
      {
        refusal: '',
        meter: null,
        wantsPush: false,
        flags: '--push <allow|block>',
      },
    ];
    FLAG_CASES.map((thisCase) =>
      when(
        `[t0] refusal '${thisCase.refusal}', meter ${JSON.stringify(thisCase.meter)}, wants_push ${thisCase.wantsPush}`,
        () => {
          then(`the flags are '${thisCase.flags}'`, () => {
            const result = runDirectorFn({
              fn: 'get_one_director_grant_flags',
              args: [
                `refusal=${thisCase.refusal}`,
                `meter_file=${asMeterFile({ meter: thisCase.meter })}`,
                `wants_push=${thisCase.wantsPush}`,
              ],
            });
            expect(result.exitCode).toBe(0);
            expect(result.stdout.trim()).toEqual(thisCase.flags);
          });
        },
      ),
    );

    when('[t1] the meter file is not json', () => {
      then('push and stage read as unknown: the director must choose', () => {
        const meterFile = path.join(METER_DIR, 'corrupt.jsonc');
        fs.writeFileSync(meterFile, '{ uses: 3, push: ');
        const result = runDirectorFn({
          fn: 'get_one_director_grant_flags',
          args: [
            'refusal=uses-out',
            `meter_file=${meterFile}`,
            'wants_push=false',
          ],
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toEqual('--push <allow|block>');
      });
    });
  });
});
