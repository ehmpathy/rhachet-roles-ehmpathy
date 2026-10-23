import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { dirname, join, relative } from 'path';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  useThen,
  when,
} from 'test-fns';
import { stringify as asYaml } from 'yaml';

import { type BootYml, bootYmlTestKit } from './.test/bootYml.testkit';
import { getRoleRegistry } from './getRoleRegistry';

/**
 * .what = every registered role's boot.yml declares a budget, and boots within it
 * .why = a `budget:` pin caps today's boot size, so boot.yml growth fails loud here,
 *        not silently in every consumer's context window
 * .note = classified integration: it spawns `rhachet roles cost`, which reads the role
 *         dir from disk (rule.forbid.unit.remote-boundaries)
 * .note = one spec renders at a different size per view, since the paths it emits differ:
 *         - src    = the spec an author edits; its `<also>` roster lists unshipped test files
 *         - linked = the consumer view (`.agent/repo=ehmpathy/role=…`); the longest path prefix
 *         neither view bounds the other, so both are graded. `repo introspect` grades the
 *         dist spec at build, by the same tokenizer
 * .note = `roles cost` exits 0 over budget (it is a report), so the cap is asserted here
 */

const dirRepo = join(__dirname, '../..');

/**
 * .what = the token count + declared budget from `roles cost --what` output
 * .why = the report is prose; the cap needs the two numbers behind it
 */
const asBootCost = (input: {
  output: string;
}): { tokens: number; budget: number | null } => {
  const asNumber = (digits: string): number => Number(digits.replace(/,/g, ''));
  const tokensMatch = input.output.match(/tokens\s+=\s+([\d,]+)/);
  const budgetMatch = input.output.match(/budget\s+=\s+([\d,]+) tokens/);
  const budgetAbsent = /budget\s+=\s+none declared/.test(input.output);

  // reject output whose token count or budget line no longer parses, so format drift fails loud
  if (!tokensMatch || (!budgetMatch && !budgetAbsent))
    throw new MalfunctionError(
      'roles cost output carries no token count or budget line; did its format change?',
      {
        output: input.output,
        hint: 'update the tokens/budget regex in asBootCost to match the new roles cost format',
      },
    );

  // null only where rhachet says the spec declares no budget
  return {
    tokens: asNumber(tokensMatch[1]!),
    budget: budgetMatch ? asNumber(budgetMatch[1]!) : null,
  };
};

/**
 * .what = the spawn clock for one cost, and the jest clock for a pair of them
 * .why = rhachet 1.50.1 spends 20-40s per `roles cost` spawn under parallel load (a fail-fast call
 *        alone takes ~22s), so each spawn keeps 120s, and a hook that spawns a pair gets 300s
 */
const TIMEOUT_MS_COST = 120_000;
jest.setTimeout(300_000);

/**
 * .what = run rhachet's paved measure against one boot spec, whole or narrowed to one subject
 * .why = one measure for the whole-role cap and the per-subject cap, so both read on one scale
 * .note = the count tracks the path prefix the spec emits, so pass repo-relative paths to compare
 *         like with like
 */
const getOneBootCost = (input: {
  pathToSpec: string;
  slugSubject: string | null;
  timeoutMs: number;
}): { tokens: number; budget: number | null } => {
  // narrow to one subject when asked; null costs the whole spec
  const argSubject = input.slugSubject
    ? ` --subject '${input.slugSubject}'`
    : '';
  const output = execSync(
    `npx rhachet roles cost --what '${input.pathToSpec}'${argSubject} --top 0`,
    { encoding: 'utf-8', timeout: input.timeoutMs, cwd: dirRepo },
  );
  return asBootCost({ output });
};

/**
 * .what = the same measure, run from the spec's own dir, so every emitted path reads `briefs/…`
 * .why = an exact compare of two specs in two temp dirs must not see the dirs: each temp dir name
 *        carries a uuid, which tokenizes differently per dir and moves the count by itself
 */
const getOneBootCostInPlace = (input: {
  pathToSpec: string;
  slugSubject: string | null;
}): { tokens: number; budget: number | null } => {
  const argSubject = input.slugSubject
    ? ` --subject '${input.slugSubject}'`
    : '';
  const output = execSync(
    `'${join(dirRepo, 'node_modules/.bin/rhachet')}' roles cost --what boot.yml${argSubject} --top 0`,
    {
      encoding: 'utf-8',
      timeout: TIMEOUT_MS_COST,
      cwd: dirname(input.pathToSpec),
    },
  );
  return asBootCost({ output });
};

/**
 * .what = the subjects that carry their own cap, apart from the role's whole-boot budget
 * .why = rhachet refuses a `budget:` inside a section and unions `always` into every subject, so a
 *        subject's own cap cannot live in boot.yml; it lives here
 */
const SUBJECT_BUDGETS = [
  { slugRole: 'mechanic', slugSubject: '101', tokens: 10_000 },
] as const;

/**
 * .what = a boot spec that holds one subject's section and an empty `always`
 * .why = `roles cost --subject` always adds `always`; with it emptied, the cost reads the section
 *        alone
 */
const asBootSpecSlice = (input: {
  bootYml: BootYml;
  slugSubject: string;
}): BootYml => {
  // reject a cap whose subject is absent, so a stale row cannot cost an empty section as green
  const section = input.bootYml[`subject.${input.slugSubject}`];
  if (!section)
    throw new ConstraintError(
      'subject with a cap is absent from its boot.yml',
      {
        slugSubject: input.slugSubject,
        hint: 'drop the row from SUBJECT_BUDGETS, or restore the subject',
      },
    );

  // reject a section that says no brief, so an emptied subject cannot cost ~0 as green
  if (!section.briefs?.say?.length)
    throw new ConstraintError('subject with a cap says no brief', {
      slugSubject: input.slugSubject,
      hint: 'restore its say rows, or drop the row from SUBJECT_BUDGETS',
    });

  return {
    always: { briefs: { say: [] } },
    [`subject.${input.slugSubject}`]: section,
  };
};

/**
 * .what = write a slice spec into a temp dir, beside links to the role's briefs + skills +
 *         readme; returns the spec's path
 * .why = rhachet's measure reads a spec from disk, and the spec's relative brief paths must find
 *        their files
 * .note = link targets are repo-relative: genTempDir resolves `to` against the git root, never the
 *         runner's cwd, so they hold from any cwd (an absolute `to` is joined onto the root, and breaks)
 */
const genOneSubjectSliceSpec = (input: {
  specSlice: BootYml;
  dirRoleRel: string;
  slugSubject: string;
}): string => {
  // lay the temp dir with links to the role's own dirs
  const dirTemp = genTempDir({
    slug: `boot-budget-slice-${input.slugSubject}`,
    symlink: [
      { at: 'briefs', to: join(input.dirRoleRel, 'briefs') },
      { at: 'skills', to: join(input.dirRoleRel, 'skills') },
      { at: 'readme.md', to: join(input.dirRoleRel, 'readme.md') },
    ],
  });

  // write the slice beside them
  const pathToSpecSlice = join(dirTemp, 'boot.yml');
  writeFileSync(pathToSpecSlice, asYaml(input.specSlice));
  return pathToSpecSlice;
};

/**
 * .what = the brief + skill paths a `roles boot` output emits, by mode, role-relative
 * .why = a seat sees paths first; compare them to boot.yml rows, free of the temp dir prefix
 * .note = a say row boots as its `.min` twin where one exists, so `.min` is cut to match the row
 */
const asBootBriefPaths = (input: {
  output: string;
}): { say: string[]; ref: string[]; skills: string[] } => {
  // cut the temp dir prefix and the `.min` swap, so a path reads as its boot.yml row
  const asRowPath = (path: string): string =>
    path.replace(/^.*?(?=(briefs|skills)\/)/, '').replace(/\.min$/, '');

  // one path per tag, e.g. `<brief.say path="…">`
  const asTagPaths = (pattern: RegExp): string[] =>
    [...input.output.matchAll(pattern)].map((match) => asRowPath(match[1]!));

  // a roster block, `<briefs.ref base="…">` then one relative path per line
  const asRosterPaths = (pattern: RegExp): string[] =>
    [...input.output.matchAll(pattern)].flatMap((match) =>
      match[2]!
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => asRowPath(`${match[1]!}${line}`)),
    );

  // rhachet orders a boot by path, so rows compare sorted
  return {
    say: asTagPaths(/<brief\.say path="([^"]+)"/g).sort(),
    ref: [
      ...asTagPaths(/<brief\.ref path="([^"]+)"/g),
      ...asRosterPaths(
        /<briefs\.ref base="([^"]+)">([\s\S]*?)<\/briefs\.ref>/g,
      ),
    ].sort(),
    skills: [
      ...asTagPaths(/<skill\.(?:say|ref) path="([^"]+)"/g),
      ...asRosterPaths(
        /<skills\.ref base="([^"]+)">([\s\S]*?)<\/skills\.ref>/g,
      ),
    ].sort(),
  };
};

/**
 * .what = the most one ref roster line may cost, in tokens
 * .why = isolation lets the whole role grow by one roster line per section row (rhachet's render,
 *        F7) and no more; the longest row path today renders under this bound
 */
const TOKENS_PER_ROSTER_LINE_MAX = 30;

/**
 * .what = the slugs of a capped role's other subjects, read at collection
 * .why = each gets its own then, so each spawn pair fits jest's per-test clock
 * .note = a stale role row reads [] here; `[t0]` and `[t3]` fail it loud, and `[t4]` asserts the
 *         list is not empty, so a stale row cannot pass the isolation walk as vacuous
 */
const getAllOtherSubjectSlugs = (input: {
  roles: { slug: string; boot?: { uri: string } }[];
  slugRole: string;
  slugSubject: string;
}): string[] => {
  const role = input.roles.find(
    (roleFound) => roleFound.slug === input.slugRole,
  );
  if (!role?.boot) return [];
  return Object.keys(bootYmlTestKit.parse({ path: role.boot.uri }))
    .filter(
      (section) =>
        section.startsWith('subject.') &&
        section !== `subject.${input.slugSubject}`,
    )
    .map((section) => section.slice('subject.'.length));
};

/**
 * .what = the role's spec twice, in temp dirs: whole, and with one subject's section cut
 * .why = isolation compares a boot with and without the section; both copies sit at the same
 *        depth, so their emitted paths, and so their costs, compare like with like
 */
const genOneSpecPairForIsolation = (input: {
  bootYml: BootYml;
  slugSubject: string;
  dirRoleRel: string;
}): { pathWith: string; pathWithout: string } => ({
  pathWith: genOneSubjectSliceSpec({
    specSlice: input.bootYml,
    dirRoleRel: input.dirRoleRel,
    slugSubject: `${input.slugSubject}-with`,
  }),
  pathWithout: genOneSubjectSliceSpec({
    specSlice: Object.fromEntries(
      Object.entries(input.bootYml).filter(
        ([section]) => section !== `subject.${input.slugSubject}`,
      ),
    ),
    dirRoleRel: input.dirRoleRel,
    slugSubject: `${input.slugSubject}-without`,
  }),
});

/**
 * .what = an error as a reader sees it: its header line, then each metadata field, multi-line
 *         values kept as lines
 * .why = a snapped message embeds metadata as json, where a multi-line readout collapses to `\n`
 */
const asErrorReadable = (input: {
  error: Error & { metadata?: Record<string, unknown> };
}): string =>
  [
    input.error.message.split('\n')[0]!,
    ...Object.entries(input.error.metadata ?? {}).map(([key, value]) =>
      [
        `${key}:`,
        // a number reads with its thousands grouped, as the cost readouts print it
        ...(typeof value === 'number'
          ? value.toLocaleString('en-US')
          : String(value)
        )
          .split('\n')
          .map((line) => `  ${line}`),
      ].join('\n'),
    ),
  ].join('\n');

/**
 * .what = a token count as its nearest thousand, e.g. `≈ 3k`
 * .why = a snapshot of the exact count churns on every brief edit; the nearest thousand moves only
 *        on a real shift, so a slice that drifts toward its cap shows as a snapshot diff
 */
const asTokensRounded = (input: { tokens: number }): string =>
  `≈ ${Math.round(input.tokens / 1_000)}k`;

/**
 * .what = the error a subject over its cap fails with, or null when it fits
 * .why = a pure verdict, so the over-cap message is tested at a forced cap, not only by hand
 */
const asSubjectCapBreach = (input: {
  slugRole: string;
  slugSubject: string;
  tokens: number;
  cap: number;
}): ConstraintError<{
  slugRole: string;
  tokens: number;
  cap: number;
  hint: string;
}> | null => {
  // fits → no breach
  if (input.tokens <= input.cap) return null;

  return new ConstraintError(
    `subject.${input.slugSubject} boots past its cap`,
    {
      slugRole: input.slugRole,
      tokens: input.tokens,
      cap: input.cap,
      hint: 'move a say row to ref, or condense it to a .min',
    },
  );
};

/**
 * .what = the src boot spec path of the role a subject cap names, repo-relative
 * .why = resolved inside a test step, so a stale row fails its own case, not the file's collection;
 *        repo-relative, the same form as the linked spec path, so costs compare like with like
 */
const getOneCappedRoleSpecPath = (input: {
  roles: { slug: string; boot?: { uri: string } }[];
  slugRole: string;
}): string => {
  // reject a cap whose role has no boot spec
  const role = input.roles.find(
    (roleFound) => roleFound.slug === input.slugRole,
  );
  if (!role?.boot)
    throw new ConstraintError(
      'a capped subject names a role with no boot spec',
      {
        slugRole: input.slugRole,
        hint: 'fix the slugRole in SUBJECT_BUDGETS',
      },
    );

  return relative(dirRepo, role.boot.uri);
};

/**
 * .what = the consumer-view spec path for a role, as linked into `.agent/`
 * .why = fail loud where the link is absent, rather than skip the view it grades
 */
const getOneLinkedSpecPath = (input: { slugRole: string }): string => {
  const pathToSpec = `.agent/repo=ehmpathy/role=${input.slugRole}/boot.yml`;
  if (!existsSync(join(dirRepo, pathToSpec)))
    throw new ConstraintError(
      'linked boot spec absent; the consumer view is ungraded',
      {
        pathToSpec,
        hint: 'run: npm run prepare:rhachet',
      },
    );
  return pathToSpec;
};

describe('boot.budget', () => {
  const roles = getRoleRegistry().roles;

  given('[case0] the role registry', () => {
    when('[t0] each role is checked for a boot spec', () => {
      then('every registered role declares a boot spec', () => {
        // a role with no boot.yml boots every brief it holds, uncapped
        const rolesUnspecced = roles
          .filter((role) => !role.boot)
          .map((role) => role.slug);
        expect(rolesUnspecced).toEqual([]);
      });
    });
  });

  roles.forEach((role, index) => {
    given(`[case${index + 1}] the ${role.slug} role`, () => {
      when('[t0] its src spec is costed', () => {
        const cost = useThen('the measure succeeds', () =>
          getOneBootCost({
            pathToSpec: relative(dirRepo, role.boot!.uri),
            slugSubject: null,
            timeoutMs: TIMEOUT_MS_COST,
          }),
        );

        then('it declares a budget', () => {
          expect(cost.budget).not.toBeNull();
        });

        then('its boot fits within that budget', () => {
          // on red: trim the boot, or raise `budget.tokens` deliberately
          console.log(
            `${role.slug} (src): ${cost.tokens.toLocaleString()} / ${cost.budget?.toLocaleString()} tokens`,
          );
          expect(cost.tokens).toBeLessThanOrEqual(cost.budget!);
        });
      });

      when('[t1] its linked spec is costed, as a consumer boots it', () => {
        const cost = useThen('the measure succeeds', () =>
          getOneBootCost({
            pathToSpec: getOneLinkedSpecPath({ slugRole: role.slug }),
            slugSubject: null,
            timeoutMs: TIMEOUT_MS_COST,
          }),
        );

        then('its boot fits within that budget', () => {
          // on red: trim the boot, or raise `budget.tokens` deliberately
          console.log(
            `${role.slug} (linked): ${cost.tokens.toLocaleString()} / ${cost.budget?.toLocaleString()} tokens`,
          );
          expect(cost.budget).not.toBeNull();
          expect(cost.tokens).toBeLessThanOrEqual(cost.budget!);
        });
      });
    });
  });

  // labels name the cap, not a count of roles, so a new role leaves these snapshot keys intact
  SUBJECT_BUDGETS.forEach((cap) => {
    given(
      // the cap value stays out of the title, so a cap change leaves the snapshot keys intact
      `[cap.${cap.slugRole}.${cap.slugSubject}] the ${cap.slugRole} subject.${cap.slugSubject} section alone, under its cap`,
      () => {
        when('[t0] its section is costed alone, apart from always', () => {
          const costs = useThen('the measure succeeds', () => {
            // find the role's spec, and cut the subject's section out of it
            const pathToRoleSpec = getOneCappedRoleSpecPath({
              roles,
              slugRole: cap.slugRole,
            });
            const specSlice = asBootSpecSlice({
              bootYml: bootYmlTestKit.parse({
                path: join(dirRepo, pathToRoleSpec),
              }),
              slugSubject: cap.slugSubject,
            });

            // cost the slice alone, and the union rhachet boots for `--subject`
            const pathToSpecSlice = genOneSubjectSliceSpec({
              specSlice,
              dirRoleRel: dirname(pathToRoleSpec),
              slugSubject: cap.slugSubject,
            });
            return {
              slice: getOneBootCost({
                pathToSpec: pathToSpecSlice,
                slugSubject: cap.slugSubject,
                timeoutMs: TIMEOUT_MS_COST,
              }),
              union: getOneBootCost({
                pathToSpec: pathToRoleSpec,
                slugSubject: cap.slugSubject,
                timeoutMs: TIMEOUT_MS_COST,
              }),
            };
          });

          then('its slice fits within its cap', () => {
            // the union is what `roles cost --subject` reads, since rhachet adds always to every
            // subject; it is logged for the reader, and serves as the control below
            console.log(
              [
                `${cap.slugRole} subject.${cap.slugSubject}: ${costs.slice.tokens.toLocaleString()} / ${cap.tokens.toLocaleString()} tokens (section alone)`,
                `${cap.slugRole} subject.${cap.slugSubject}: ${costs.union.tokens.toLocaleString()} tokens with always (the union rhachet boots)`,
              ].join('\n'),
            );

            // one verdict: on breach, jest prints the named error — subject, both numbers, the levers
            const breach = asSubjectCapBreach({
              slugRole: cap.slugRole,
              slugSubject: cap.slugSubject,
              tokens: costs.slice.tokens,
              cap: cap.tokens,
            });
            expect(breach).toBeNull();

            // control: the slice measured aught, and `always` was truly cut from it
            expect(costs.slice.tokens).toBeGreaterThan(0);

            // snap the slice at the nearest thousand, so a drift under the cap still shows; the union
            // is a control only (logged above), so an `always` edit does not churn this snapshot
            expect({
              slice: `${asTokensRounded({ tokens: costs.slice.tokens })} / ${asTokensRounded({ tokens: cap.tokens })} tokens (section alone)`,
            }).toMatchSnapshot();

            // tripwire: once rhachet stops its union of `always`, the cap belongs in boot.yml
            if (costs.slice.tokens >= costs.union.tokens)
              throw new ConstraintError(
                'rhachet no longer unions always into a subject; the cap belongs in boot.yml',
                {
                  slugSubject: cap.slugSubject,
                  hint: 'declare the cap as `budget:` in boot.yml, then drop this row from SUBJECT_BUDGETS',
                },
              );
          });

          then('the union a seat boots fits within its cap too', () => {
            // a seat focused on the subject boots always ∪ section, so `always` stays lean enough
            // for the union to fit; on breach, move a row out of `always` into every other subject
            const breach = asSubjectCapBreach({
              slugRole: cap.slugRole,
              slugSubject: cap.slugSubject,
              tokens: costs.union.tokens,
              cap: cap.tokens,
            });
            expect(breach).toBeNull();
          });
        });

        when(
          '[t1] its slice is booted, as a seat focused on it would boot',
          () => {
            const boot = useThen('the boot succeeds', () => {
              // cut the slice exactly as the cost case does, then boot it in place of a cost
              const pathToRoleSpec = getOneCappedRoleSpecPath({
                roles,
                slugRole: cap.slugRole,
              });
              const specSlice = asBootSpecSlice({
                bootYml: bootYmlTestKit.parse({
                  path: join(dirRepo, pathToRoleSpec),
                }),
                slugSubject: cap.slugSubject,
              });
              const pathToSpecSlice = genOneSubjectSliceSpec({
                specSlice,
                dirRoleRel: dirname(pathToRoleSpec),
                slugSubject: cap.slugSubject,
              });
              const output = execSync(
                `npx rhachet roles boot --what '${pathToSpecSlice}' --subject '${cap.slugSubject}'`,
                { encoding: 'utf-8', timeout: 40_000, cwd: dirRepo },
              );
              return {
                section: specSlice[`subject.${cap.slugSubject}`]!,
                paths: asBootBriefPaths({ output }),
                output,
                dirRole: join(dirRepo, dirname(pathToRoleSpec)),
              };
            });

            then('each say row with a .min twin boots in its cue form', () => {
              // the cue form is the .min; a row whose twin exists must not boot at full size
              const sayWithMin = (boot.section.briefs?.say ?? []).filter(
                (row) => existsSync(join(boot.dirRole, `${row}.min`)),
              );
              const sayFull = sayWithMin.filter(
                (row) => !boot.output.includes(`${row}.min"`),
              );
              expect(sayWithMin.length).toBeGreaterThan(0);
              expect(sayFull).toEqual([]);
            });

            then('its say blocks are exactly the section say rows', () => {
              // no `always` brief, and no row dropped in silence
              expect(boot.paths.say).toEqual(
                [...(boot.section.briefs?.say ?? [])].sort(),
              );
            });

            then('the booted exit-code cue names 2 for a constraint', () => {
              // a cure reads this cue to pick its exit code; the path alone proves only that it boots
              const cue =
                boot.output
                  .split('<brief.say path="')
                  .find((block) =>
                    block.includes('rule.require.exit-code-semantics.md'),
                  ) ?? '';
              expect(cue).toContain('2 = constraint');
              expect(cue).toContain('1 = malfunction');
            });

            then('its ref roster holds exactly the section ref rows', () => {
              expect(boot.paths.ref).toEqual(
                [...(boot.section.briefs?.ref ?? [])].sort(),
              );
            });

            then('it boots no skill', () => {
              expect(boot.paths.skills).toEqual([]);
            });

            then('the paths a seat sees match the snapshot', () => {
              // paths only, no bodies or counts, so a brief edit leaves it intact
              expect(boot.paths).toMatchSnapshot();
            });
          },
        );

        when('[t2] a slice over its cap is judged', () => {
          then('it fails with the named breach', () => {
            // fixed numbers: the verdict is a pure comparison, so no spawn is owed here
            const breach = asSubjectCapBreach({
              slugRole: cap.slugRole,
              slugSubject: cap.slugSubject,
              tokens: 2_900,
              cap: 2_899,
            });
            expect(breach).toBeInstanceOf(ConstraintError);
            expect(breach?.metadata).toEqual({
              slugRole: cap.slugRole,
              tokens: 2_900,
              cap: 2_899,
              hint: 'move a say row to ref, or condense it to a .min',
            });
            expect(asErrorReadable({ error: breach! })).toMatchSnapshot();
          });

          then('a slice exactly at its cap fits', () => {
            // the cap is inclusive: `tokens <= cap` passes
            expect(
              asSubjectCapBreach({
                slugRole: cap.slugRole,
                slugSubject: cap.slugSubject,
                tokens: 2_900,
                cap: 2_900,
              }),
            ).toBeNull();
          });
        });

        when('[t3] its row goes stale', () => {
          then('an absent subject fails loud, with the fix named', async () => {
            const error = await getError(async () =>
              asBootSpecSlice({ bootYml: {}, slugSubject: cap.slugSubject }),
            );
            expect(error).toBeInstanceOf(ConstraintError);
            expect(asErrorReadable({ error })).toMatchSnapshot();
          });

          then(
            'an emptied subject fails loud, with the fix named',
            async () => {
              const error = await getError(async () =>
                asBootSpecSlice({
                  bootYml: { [`subject.${cap.slugSubject}`]: { briefs: {} } },
                  slugSubject: cap.slugSubject,
                }),
              );
              expect(error).toBeInstanceOf(ConstraintError);
              expect(asErrorReadable({ error })).toMatchSnapshot();
            },
          );

          then('an absent role fails loud, with the fix named', async () => {
            const error = await getError(async () =>
              getOneCappedRoleSpecPath({ roles: [], slugRole: cap.slugRole }),
            );
            expect(error).toBeInstanceOf(ConstraintError);
            expect(asErrorReadable({ error })).toMatchSnapshot();
          });
        });

        when(
          '[t4] the role is costed with and without the section, as isolation',
          () => {
            const slugsOther = getAllOtherSubjectSlugs({
              roles,
              slugRole: cap.slugRole,
              slugSubject: cap.slugSubject,
            });

            // one spec copy with the section, one without
            const specs = useBeforeAll(async () => {
              const pathToRoleSpec = getOneCappedRoleSpecPath({
                roles,
                slugRole: cap.slugRole,
              });
              const bootYml = bootYmlTestKit.parse({
                path: join(dirRepo, pathToRoleSpec),
              });
              return {
                ...genOneSpecPairForIsolation({
                  bootYml,
                  slugSubject: cap.slugSubject,
                  dirRoleRel: dirname(pathToRoleSpec),
                }),
                rowsOfSection:
                  (bootYml[`subject.${cap.slugSubject}`]?.briefs?.say?.length ??
                    0) +
                  (bootYml[`subject.${cap.slugSubject}`]?.briefs?.ref?.length ??
                    0),
              };
            });

            then('the walk has other subjects to cost', () => {
              expect(slugsOther.length).toBeGreaterThan(0);
            });

            slugsOther.forEach((slugOther) => {
              then(`subject.${slugOther} costs the same either way`, () => {
                // a section another subject does not select must not move that subject's boot
                const costWith = getOneBootCostInPlace({
                  pathToSpec: specs.pathWith,
                  slugSubject: slugOther,
                });
                const costWithout = getOneBootCostInPlace({
                  pathToSpec: specs.pathWithout,
                  slugSubject: slugOther,
                });
                expect(costWith.tokens).toEqual(costWithout.tokens);
              });
            });

            then(
              'the whole role grows by roster lines at most, never by a brief body',
              () => {
                // rhachet lists a re-claimed row in the ref roster (F7): one short line per row.
                // a say claim that upgrades another section's ref adds a whole body, far past this
                const costWith = getOneBootCostInPlace({
                  pathToSpec: specs.pathWith,
                  slugSubject: null,
                });
                const costWithout = getOneBootCostInPlace({
                  pathToSpec: specs.pathWithout,
                  slugSubject: null,
                });
                const delta = costWith.tokens - costWithout.tokens;
                console.log(
                  `${cap.slugRole} whole role, with vs without subject.${cap.slugSubject}: +${delta} tokens`,
                );
                expect(delta).toBeGreaterThanOrEqual(0);
                expect(delta).toBeLessThanOrEqual(
                  TOKENS_PER_ROSTER_LINE_MAX * specs.rowsOfSection,
                );
              },
            );
          },
        );
      },
    );
  });

  given('[readout] a roles cost readout', () => {
    when('[t0] it declares no budget', () => {
      then('the budget reads null, not a malfunction', () => {
        const cost = asBootCost({
          output: [
            '   ├─ tokens  = 3,046 (full emitted payload, o200k_base)',
            '   ├─ budget  = none declared — this boot is uncapped',
          ].join('\n'),
        });
        expect(cost).toEqual({ tokens: 3046, budget: null });
      });
    });

    when('[t1] its token count no longer parses', () => {
      then('it fails loud, with the fix named', async () => {
        const error = await getError(async () =>
          asBootCost({ output: 'a readout in a format nobody parses' }),
        );
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(asErrorReadable({ error })).toMatchSnapshot();
      });
    });

    when('[t2] its budget line no longer parses', () => {
      then(
        'it fails loud, rather than read as a spec with no budget',
        async () => {
          const error = await getError(async () =>
            asBootCost({
              output: [
                '   ├─ tokens  = 3,046 (full emitted payload, o200k_base)',
                '   └─ cap     = 30k',
              ].join('\n'),
            }),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(asErrorReadable({ error })).toMatchSnapshot();
        },
      );
    });

    when('[t3] it declares a budget', () => {
      then('the budget reads as a number, commas stripped', () => {
        const cost = asBootCost({
          output: [
            '   ├─ tokens  = 12,421 (full emitted payload, o200k_base)',
            '   ├─ budget  = 30,000 tokens (41% used)',
          ].join('\n'),
        });
        expect(cost).toEqual({ tokens: 12_421, budget: 30_000 });
      });
    });
  });

  given('[paths] a boot output, fixed', () => {
    when('[t0] its tags and rosters are parsed', () => {
      then('each path reads as its boot.yml row, sorted', () => {
        // one of each form: a say tag (as its .min cue), a ref tag, a ref roster, a skill roster
        const output = [
          '<brief.say path="/tmp/x/briefs/practices/rule.b.md.min">',
          'body',
          '</brief.say>',
          '<brief.say path="/tmp/x/briefs/practices/rule.a.md">',
          '</brief.say>',
          '<brief.ref path="/tmp/x/briefs/practices/rule.c.md"/>',
          '<briefs.ref base="/tmp/x/">',
          '  briefs/practices/rule.e.md',
          '  briefs/practices/rule.d.md',
          '</briefs.ref>',
          '<skills.ref base="/tmp/x/">',
          '  skills/git.sh',
          '</skills.ref>',
        ].join('\n');
        expect(asBootBriefPaths({ output })).toEqual({
          say: ['briefs/practices/rule.a.md', 'briefs/practices/rule.b.md'],
          ref: [
            'briefs/practices/rule.c.md',
            'briefs/practices/rule.d.md',
            'briefs/practices/rule.e.md',
          ],
          skills: ['skills/git.sh'],
        });
      });
    });
  });
});
