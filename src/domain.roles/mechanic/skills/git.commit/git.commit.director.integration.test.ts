import { spawnSync } from 'child_process';
import * as path from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = integration tests for git.commit.director.sh
 * .why = every quota refusal (git.commit.set, git.commit.push,
 *        git.branch.rebase begin, git.release) renders its fix through
 *        print_quota_grant_fix; a director-governed tree must name the
 *        director's grant line, and every other tree must keep the extant
 *        human fix byte for byte
 */
describe('git.commit.director.sh', () => {
  const directorPath = path.join(__dirname, 'git.commit.director.sh');

  /**
   * .what = source git.commit.director.sh and call one of its functions
   * .why = args travel as argv, never through a shell string, so the bytes
   *        under test are exactly what each surface passes
   */
  const runDirectorFn = (input: {
    fn: string;
    args: string[];
  }): { stdout: string; stderr: string; exitCode: number } => {
    const result = spawnSync(
      'bash',
      [
        '-c',
        'source "$0"; fn="$1"; shift; "$fn" "$@"',
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
  const GRANT_LINE = `rhx git.crew.grant --tree ${TREE} --quota <n> --push allow --why '<why>'`;

  // the extant fix of each surface, verbatim from main
  const SURFACES = [
    {
      surface: 'git.commit.set, no uses left',
      ask: 'grant more',
      indent: '',
      humanLead: 'ask your human to grant more:',
      humanCmd: '  $ git.commit.uses set --quant N --push allow|block',
    },
    {
      surface: 'git.commit.set, no quota set',
      ask: 'grant a quota',
      indent: '',
      humanLead: 'ask your human to grant:',
      humanCmd: '  $ git.commit.uses set --quant N --push allow|block',
    },
    {
      surface: 'git.commit.set, push not allowed',
      ask: 'grant push',
      indent: '',
      humanLead: 'ask your human to grant with --push allow',
      humanCmd: '',
    },
    {
      surface: 'git.commit.push, push not allowed',
      ask: 'grant push',
      indent: '',
      humanLead: 'ask your human to grant with --push allow:',
      humanCmd: '  $ git.commit.uses set --quant N --push allow',
    },
    {
      surface: 'git.branch.rebase begin, no uses left',
      ask: 'grant more',
      indent: '',
      humanLead: 'ask your human to grant more:',
      humanCmd: '  $ rhx git.commit.uses set --quant N --push allow',
    },
    {
      surface: 'git.release, no uses left',
      ask: 'grant more',
      indent: '   ',
      humanLead: '   ask your human to grant more:',
      humanCmd: '   $ git.commit.uses set --quant N --push allow',
    },
  ];

  const renderFix = (input: {
    director: string;
    surface: (typeof SURFACES)[number];
  }) =>
    runDirectorFn({
      fn: 'print_quota_grant_fix',
      args: [
        `director=${input.director}`,
        `tree=${TREE}`,
        `ask=${input.surface.ask}`,
        `indent=${input.surface.indent}`,
        `human_lead=${input.surface.humanLead}`,
        `human_cmd=${input.surface.humanCmd}`,
      ],
    });

  given('[case1] the detection seam, before the commander rules on F1', () => {
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
        then('the bytes match the extant human fix exactly', () => {
          const result = renderFix({ director: 'none', surface });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toEqual(
            `\n${surface.humanLead}\n${surface.humanCmd}\n`,
          );
        });
        then('no director and no git.crew.grant is named', () => {
          const result = renderFix({ director: 'none', surface });
          expect(result.stdout).not.toContain('director');
          expect(result.stdout).not.toContain('git.crew.grant');
        });
      }),
    );
  });

  given('[case3] a tree a director governs (director=charter)', () => {
    SURFACES.map((surface) =>
      when(`[t0] ${surface.surface} renders its fix`, () => {
        then('it tells the driver to ask its director, never a human', () => {
          const result = renderFix({ director: 'charter', surface });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain(
            `a director governs this tree; ask your director to ${surface.ask}. the director runs:`,
          );
          expect(result.stdout).not.toContain('ask your human');
        });
        then(
          'it names the line the director runs, with the real tree slug',
          () => {
            const result = renderFix({ director: 'charter', surface });
            expect(result.stdout).toContain(`$ ${GRANT_LINE}`);
            expect(result.stdout).not.toContain('<tree>');
          },
        );
        then('it keeps the surface indent', () => {
          const result = renderFix({ director: 'charter', surface });
          const lines = result.stdout.split('\n').filter((line) => line.length);
          lines.map((line) =>
            expect(line.startsWith(surface.indent)).toBe(true),
          );
        });
        then('the render matches the snapshot', () => {
          const result = renderFix({ director: 'charter', surface });
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
          then(
            'it names both granters, director first, so the fix is never hidden',
            () => {
              const result = renderFix({ director: 'unreadable', surface });
              expect(result.exitCode).toBe(0);
              expect(result.stdout).toContain('cannot be read');
              expect(result.stdout).toContain(`$ ${GRANT_LINE}`);
              expect(result.stdout).toContain(
                `else, ${surface.humanLead.trimStart()}`,
              );
              expect(result.stdout.indexOf('the director runs:')).toBeLessThan(
                result.stdout.indexOf('else, '),
              );
            },
          );
          then('the render matches the snapshot', () => {
            const result = renderFix({ director: 'unreadable', surface });
            expect(result.stdout).toMatchSnapshot();
          });
        }),
      );
    },
  );
});
