import { execSync } from 'child_process';
import fg from 'fast-glob';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { type BootYml, bootYmlTestKit } from '../.test/bootYml.testkit';

/**
 * .what = integration tests for the mechanic boot.yml
 * .why = validates that rhachet roles boot reads boot.yml and filters by subject,
 *        and that boot.yml stays consistent with the briefs + skills on disk
 * .note = classified integration: the consistency block reads the filesystem
 *         (fast-glob, existsSync, boot.yml parse), a remote boundary forbidden in
 *         unit tests per rule.forbid.unit.remote-boundaries. the CLI block runs the real
 *         `rhachet roles boot` against the built `.agent/` links, which the build creates
 *         (the hooks-reachable suite reads the same links)
 */

const roleDirRel = '.agent/repo=ehmpathy/role=mechanic';
const roleDir = resolve(__dirname, '../../..', roleDirRel);

// rhachet 1.50.1 spends 20-40s per `roles boot` spawn under parallel load (a fail-fast call alone
// takes ~22s), so each spawn keeps 120s, and a test that spawns two gets 300s
jest.setTimeout(300_000);
const execBoot = (input: { args: string; cwd?: string }): string =>
  execSync(
    `npx rhachet roles boot --repo ehmpathy --role mechanic ${input.args}`,
    { encoding: 'utf-8', timeout: 120_000, cwd: input.cwd },
  );

/**
 * .what = extract the token count from boot output stats block
 * .why = enables token comparison assertions
 */
const parseStats = (
  output: string,
): {
  briefs: { say: number; ref: number };
  total: number;
  tokens: number;
} => {
  const sayMatch = output.match(/say = (\d+)/);
  const refMatch = output.match(/ref = (\d+)/);
  const tokensMatch = output.match(/tokens ≈ (\d+)/);
  const say = sayMatch ? Number(sayMatch[1]) : 0;
  const ref = refMatch ? Number(refMatch[1]) : 0;
  const tokens = tokensMatch ? Number(tokensMatch[1]) : 0;
  return { briefs: { say, ref }, total: say + ref, tokens };
};

describe('boot.yml integration', () => {
  given('[case1] the mechanic role, booted by subject', () => {
    when('[t0] the boot asks for --subject code.test', () => {
      const boot = useThen('the boot succeeds', () => ({
        output: execBoot({ args: '--subject code.test' }),
      }));

      then('it returns always + test briefs', () => {
        const output = boot.output;
        const stats = parseStats(output);

        // always has 12 say + 9 ref = 21 briefs
        // code.test has 10 say + 6 ref = 16 briefs
        // total = 37 briefs
        expect(stats.total).toBeGreaterThanOrEqual(30);
        expect(stats.briefs.say).toBeGreaterThan(0);
        expect(stats.briefs.ref).toBeGreaterThan(0);

        // should contain test-specific briefs
        expect(output).toContain('code.test');

        console.log(
          `  [code.test] ${stats.briefs.say} say + ${stats.briefs.ref} ref = ${stats.total} briefs, ~${stats.tokens} tokens`,
        );
      });

      then('say briefs are emitted with full content', () => {
        // say briefs should appear as <brief.say> tags with content
        expect(boot.output).toMatch(/<brief\.say\b/);
      });

      then('ref briefs are emitted as path-only links', () => {
        // ref briefs appear as one <briefs.ref base="…"> roster (path only, no content);
        // rhachet hoists the shared prefix into the block header
        expect(boot.output).toMatch(/<briefs\.ref base="/);
      });
    });

    when('[t1] the boot asks for --subject code.prod', () => {
      then('it returns always + prod briefs', () => {
        const output = execBoot({ args: '--subject code.prod' });
        const stats = parseStats(output);

        // always + code.prod should be significantly more than always alone
        expect(stats.total).toBeGreaterThanOrEqual(60);
        expect(stats.briefs.say).toBeGreaterThan(0);
        expect(stats.briefs.ref).toBeGreaterThan(0);

        // should contain prod-specific briefs
        expect(output).toContain('code.prod');

        console.log(
          `  [code.prod] ${stats.briefs.say} say + ${stats.briefs.ref} ref = ${stats.total} briefs, ~${stats.tokens} tokens`,
        );
      });
    });

    when('[t2] the boot asks for an unrecognized --subject', () => {
      then('it fails fast', () => {
        expect(() => execBoot({ args: '--subject nonexistent' })).toThrow();
      });
    });

    when('[t3] the boot asks for --subject 101', () => {
      const boot = useThen('the boot succeeds', () => ({
        output: execBoot({ args: '--subject 101' }),
      }));

      then('every 101 say row boots as a say block', () => {
        // a declared row that rhachet drops (e.g. a `.md.min` path) boots naught and says naught,
        // so each row is checked in the emitted boot, not only in boot.yml
        const say101 =
          bootYmlTestKit.parse({ path: bootYmlPath })['subject.101']?.briefs
            ?.say ?? [];
        const sayAbsent = say101.filter(
          (row) =>
            !boot.output.includes(`<brief.say path="${roleDirRel}/${row}`),
        );
        expect(say101.length).toBeGreaterThan(0);
        expect(sayAbsent).toEqual([]);
      });
    });
  });

  given('[case2] a role dir with and without boot.yml', () => {
    when('[t0] the role boots both ways', () => {
      then('boot.yml uses fewer tokens than without', () => {
        // set up a temp dir that mirrors the role dir structure
        const tempDir = genTempDir({
          slug: 'boot-yml-token-compare',
          symlink: [
            { at: 'node_modules', to: 'node_modules' },
            {
              at: '.agent/repo=ehmpathy/role=mechanic/briefs',
              to: `${roleDirRel}/briefs`,
            },
            {
              at: '.agent/repo=ehmpathy/role=mechanic/skills',
              to: `${roleDirRel}/skills`,
            },
            {
              at: '.agent/repo=ehmpathy/role=mechanic/readme.md',
              to: `${roleDirRel}/readme.md`,
            },
          ],
        });

        // sanity: the temp dir should NOT have a boot.yml
        expect(
          existsSync(
            resolve(tempDir, '.agent/repo=ehmpathy/role=mechanic/boot.yml'),
          ),
        ).toBe(false);

        // boot WITHOUT boot.yml -> all briefs as say
        const withoutBootYml = execBoot({ args: '', cwd: tempDir });
        const statsWithout = parseStats(withoutBootYml);

        // now add boot.yml and boot WITH it
        execSync(
          [
            'ln -s',
            `${roleDir}/boot.yml`,
            `${resolve(tempDir, '.agent/repo=ehmpathy/role=mechanic/boot.yml')}`,
          ].join(' '),
        );

        // boot WITH boot.yml -> say/ref split applied
        const withBootYml = execBoot({ args: '', cwd: tempDir });
        const statsWith = parseStats(withBootYml);

        const saved = statsWithout.tokens - statsWith.tokens;
        const pct = Math.round((saved / statsWithout.tokens) * 100);

        console.log(
          [
            `  [token compare]`,
            `    without boot.yml: ${statsWithout.briefs.say} say + ${statsWithout.briefs.ref} ref = ${statsWithout.total} briefs, ~${statsWithout.tokens} tokens`,
            `    with    boot.yml: ${statsWith.briefs.say} say + ${statsWith.briefs.ref} ref = ${statsWith.total} briefs, ~${statsWith.tokens} tokens`,
            `    saved: ~${saved} tokens (-${pct}%)`,
          ].join('\n'),
        );

        // with boot.yml should use fewer tokens (ref briefs are path-only)
        expect(statsWith.tokens).toBeLessThan(statsWithout.tokens);

        // with boot.yml should have some ref briefs (without has none)
        expect(statsWith.briefs.ref).toBeGreaterThan(0);
        expect(statsWithout.briefs.ref).toBe(0);
      });
    });
  });
});

const bootYmlPath = resolve(__dirname, 'boot.yml');
const briefsDir = resolve(__dirname, 'briefs');
const skillsDir = resolve(__dirname, 'skills');

/**
 * .what = collect all skill paths from boot.yml across all subjects and modes
 * .why = enables completeness checks for skills (mechanic-only; the kit covers briefs)
 */
const collectAllSkillPaths = (bootYml: BootYml): string[] => {
  const paths: string[] = [];
  for (const subject of Object.values(bootYml)) {
    if (subject.skills?.say) paths.push(...subject.skills.say);
    if (subject.skills?.ref) paths.push(...subject.skills.ref);
  }
  return paths;
};

/**
 * .what = patterns for internal/helper skill files that are not entry points
 * .why = these are sourced by other skills, not invoked directly
 */
const INTERNAL_SKILL_PATTERNS = [
  /\/output\.sh$/, // output helpers
  /\/operations\.sh$/, // shared operations
  /\.operations\.sh$/, // shared operations (variant)
  /\/keyrack\.operations\.sh$/, // keyrack helpers
  /\/templates\//, // template files
  /\/exec\.sh$/, // subcommand: exec
  /\/init\.sh$/, // subcommand: init
];

/**
 * .what = check if a skill file is an entry point vs a subcommand
 * .why = subcommands are dispatched by the main entry point, not invoked directly
 *
 * entry points:
 *   - skills/{name}.sh (root level)
 *   - skills/{group}/{group}.sh (main entry for a group)
 *
 * subcommands:
 *   - skills/{group}/{group}.{subcommand}.sh
 *   - skills/{group}/{other}.sh where other != group
 */
const isEntryPoint = (skillPath: string): boolean => {
  const parts = skillPath.split('/');

  // root level: always entry point (e.g., declapract.upgrade.sh)
  if (parts.length === 1) return true;

  // group level: entry point if filename matches group name
  // e.g., git.branch.rebase/git.branch.rebase.sh is entry point
  // e.g., git.branch.rebase/git.branch.rebase.abort.sh is subcommand
  const group = parts[0] ?? '';
  const filename = parts[parts.length - 1] ?? '';
  const filenameWithoutExt = filename.replace(/\.sh$/, '');

  // entry point: {group}/{group}.sh
  if (filenameWithoutExt === group) return true;

  // subcommand: {group}/{group}.{subcommand}.sh
  if (filenameWithoutExt.startsWith(group + '.')) return false;

  // other files in subdirectory: likely internal
  return false;
};

describe('boot.yml consistency', () => {
  given('[case1] the mechanic boot.yml on disk', () => {
    when('[t0] it is parsed and checked against briefs/ and skills/', () => {
      const bootYml = bootYmlTestKit.parse({ path: bootYmlPath });

      then('parse as valid yaml', () => {
        expect(bootYml).toBeDefined();
        expect(typeof bootYml).toBe('object');
      });

      then('declare the expected subjects', () => {
        const subjects = Object.keys(bootYml);
        expect(subjects).toContain('always');
        expect(subjects).toContain('subject.code.prod');
        expect(subjects).toContain('subject.code.test');
        expect(subjects).toContain('subject.arch');
        expect(subjects).toContain('subject.flow');
        expect(subjects).toContain('subject.101');
      });

      then(
        'pin subject.101 to the eight cure rules at say, their args at ref, no skills',
        () => {
          // 101 is a contract with director seats: a dropped cue, or an overlay that slips in, must fail here
          const subject101 = bootYml['subject.101'];
          expect(subject101?.briefs?.say).toEqual([
            'briefs/practices/code.prod/pitofsuccess.errors/rule.require.failfast.md',
            'briefs/practices/code.prod/pitofsuccess.errors/rule.require.failloud.md',
            'briefs/practices/code.prod/pitofsuccess.errors/rule.forbid.failhide.md.pt1.md',
            'briefs/practices/code.prod/pitofsuccess.errors/rule.require.exit-code-semantics.md',
            'briefs/practices/code.prod/pitofsuccess.errors/rule.require.qualified-error-headers.md',
            'briefs/practices/code.prod/pitofsuccess.procedures/rule.forbid.nonidempotent-mutations.md',
            'briefs/practices/code.prod/pitofsuccess.typedefs/rule.forbid.as-cast.md',
            'briefs/practices/work.flow/diagnose/rule.require.clamp-edge-cases.md',
          ]);
          expect(subject101?.briefs?.ref).toEqual([
            'briefs/practices/code.prod/pitofsuccess.errors/rule.forbid.failhide.md.pt2.md',
            'briefs/practices/code.prod/pitofsuccess.errors/rule.require.failfast.[seed].md',
            'briefs/practices/code.prod/pitofsuccess.errors/rule.require.failfast.[demo].shell.md',
            'briefs/practices/code.prod/pitofsuccess.procedures/rule.require.idempotent-procedures.md',
            'briefs/practices/code.prod/pitofsuccess.typedefs/rule.require.assure-via-type-checks.md',
            'briefs/practices/work.flow/diagnose/rule.require.test-covered-repairs.md',
          ]);
          expect(subject101?.skills).toBeUndefined();
        },
      );

      then(
        'say the rows held out of always in every subject but 101, and never in always',
        () => {
          // a 101 seat cures tools and commits its route; it never releases or merges, and it is not
          // the seaturtle. each other subject repeats these rows, so its own boot holds them as before
          const rowsHeldOut = {
            briefs: [
              'briefs/practices/lang.tones/rule.im_an.ehmpathy_seaturtle.md',
              'briefs/practices/lang.tones/rule.prefer.chill-nature-emojis.md',
              'briefs/practices/lang.tones/define.why-seaturtles-love-software.md',
            ],
            skills: [
              'skills/git.commit/git.commit.push.sh',
              'skills/git.branch.rebase/git.branch.rebase.sh',
              'skills/git.release/git.release.sh',
              'skills/git.repo.get/git.repo.get.sh',
              'skills/show.gh.test.errors.sh',
            ],
          };

          // every subject but 101 says each row
          const gaps = Object.entries(bootYml)
            .filter(
              ([section]) =>
                section.startsWith('subject.') && section !== 'subject.101',
            )
            .flatMap(([section, subject]) =>
              (['briefs', 'skills'] as const).flatMap((kind) =>
                rowsHeldOut[kind]
                  .filter((row) => !(subject[kind]?.say ?? []).includes(row))
                  .map((row) => `${section} lacks ${row}`),
              ),
            );
          expect(gaps).toEqual([]);

          // always holds none, else a 101 seat boots them again
          const rowsInAlways = (['briefs', 'skills'] as const).flatMap((kind) =>
            [
              ...(bootYml.always?.[kind]?.say ?? []),
              ...(bootYml.always?.[kind]?.ref ?? []),
            ].filter((row) => rowsHeldOut[kind].includes(row)),
          );
          expect(rowsInAlways).toEqual([]);
        },
      );

      then(
        'not say in subject.101 a brief another section holds at ref',
        () => {
          // a say claim upgrades a ref in the full role's boot, so 101 must not grow the full role
          const say101 = bootYml['subject.101']?.briefs?.say ?? [];
          const refElsewhere = Object.entries(bootYml)
            .filter(([section]) => section !== 'subject.101')
            .flatMap(([, subject]) => subject.briefs?.ref ?? []);
          expect(say101.filter((path) => refElsewhere.includes(path))).toEqual(
            [],
          );
        },
      );

      then(
        'use only keys rhachet reads, in each section and each curation',
        () => {
          // rhachet strips an unknown key in silence: a typo'd `brief:` drops a section, and a typo'd `sya:` reads as "say all"
          const keysForeign = Object.entries(bootYml)
            .filter(([section]) => section !== 'budget')
            .flatMap(([section, subject]) => [
              ...Object.keys(subject)
                .filter((key) => !['briefs', 'skills'].includes(key))
                .map(
                  (key) =>
                    `${section}.${key} — a section reads only briefs, skills`,
                ),
              ...(['briefs', 'skills'] as const).flatMap((kind) =>
                Object.keys(subject[kind] ?? {})
                  .filter((key) => !['say', 'ref', 'not'].includes(key))
                  .map(
                    (key) =>
                      `${section}.${kind}.${key} — a curation reads only say, ref, not`,
                  ),
              ),
            ]);
          expect(keysForeign).toEqual([]);
        },
      );

      then('declare no row by its .min path, in any section', () => {
        // rhachet swaps in a `.min` twin itself; a row declared as `.md.min` boots naught, in silence
        const rowsMin = Object.entries(bootYml)
          .filter(([section]) => section !== 'budget')
          .flatMap(([section, subject]) =>
            (['briefs', 'skills'] as const).flatMap((kind) =>
              [...(subject[kind]?.say ?? []), ...(subject[kind]?.ref ?? [])]
                .filter((row) => row.endsWith('.min'))
                .map(
                  (row) =>
                    `${section}.${kind}: ${row} — drop the .min; rhachet swaps in the twin`,
                ),
            ),
          );
        expect(rowsMin).toEqual([]);
      });

      then('have every brief path point to a file on disk', () => {
        const allPaths = bootYmlTestKit.collectAllBriefPaths({ bootYml });
        const absent = allPaths.filter((briefPath) => {
          const fullPath = resolve(__dirname, briefPath);
          return !existsSync(fullPath);
        });
        expect(absent).toEqual([]);
      });

      then('not have any brief appear twice within the same subject', () => {
        const perSubject = bootYmlTestKit.collectBriefPathsPerSubject({
          bootYml,
        });
        const duplicates = bootYmlTestKit.findDuplicateBriefPaths({
          perSubject,
        });
        expect(duplicates).toEqual([]);
      });

      then(
        'account for every brief file in briefs/ in at least one subject',
        () => {
          const briefFilesOnDisk = fg.sync('**/*.md', {
            cwd: briefsDir,
            onlyFiles: true,
          });

          const allBootPaths = new Set(
            bootYmlTestKit
              .collectAllBriefPaths({ bootYml })
              .map((bootPath) =>
                bootYmlTestKit.asOnDiskBriefPath({ bootPath }),
              ),
          );

          const unaccounted = briefFilesOnDisk.filter(
            (file) => !allBootPaths.has(file),
          );

          // readme files at directory roots are not expected in boot.yml
          const unaccountedNonReadme = unaccounted.filter(
            (file) => !bootYmlTestKit.isReadmeFile({ file }),
          );

          expect(unaccountedNonReadme).toEqual([]);
        },
      );

      then(
        'not have a brief in both say and ref within the same subject',
        () => {
          const conflicts = bootYmlTestKit.findSayRefConflicts({ bootYml });
          expect(conflicts).toEqual([]);
        },
      );

      then('force-load every lang.prose brief as say', () => {
        // the lang.prose overlay declares blocker-severity rules. a blocker rule
        // that boots only as a ref pointer has zero default effect — the wish's
        // core verb ("entrain into the mechanic") goes unmet. this cluster
        // regressed once already (8 unaccounted files), so every non-readme
        // lang.prose brief on disk must appear in the always subject's say list.
        const proseFilesOnDisk = fg
          .sync('practices/lang.prose/**/*.md', {
            cwd: briefsDir,
            onlyFiles: true,
          })
          .filter((file) => !bootYmlTestKit.isReadmeFile({ file }));

        // floor: a zero-match glob makes the containment check vacuously pass and
        // masks a renamed/moved/absent cluster. fail loud when the cluster is gone.
        expect(proseFilesOnDisk.length).toBeGreaterThan(0);

        // on-disk files are relative to briefsDir (no prefix); boot.yml say paths
        // carry a `briefs/` prefix. asOnDiskBriefPath aligns both to one path space.
        const sayBootPaths = new Set(
          bootYmlTestKit
            .collectAlwaysSayBriefPaths({ bootYml })
            .map((bootPath) => bootYmlTestKit.asOnDiskBriefPath({ bootPath })),
        );

        const unsaid = proseFilesOnDisk.filter(
          (file) => !sayBootPaths.has(file),
        );

        expect(unsaid).toEqual([]);
      });

      then('have every skill path in boot.yml point to a file on disk', () => {
        const allSkillPaths = collectAllSkillPaths(bootYml);
        const absent = allSkillPaths.filter((skillPath) => {
          const fullPath = resolve(__dirname, skillPath);
          return !existsSync(fullPath);
        });
        expect(absent).toEqual([]);
      });

      then('account for every entry-point skill in skills/', () => {
        const skillFilesOnDisk = fg.sync('**/*.sh', {
          cwd: skillsDir,
          onlyFiles: true,
        });

        // filter out internal/helper skills that are not entry points
        const entryPointSkills = skillFilesOnDisk.filter(
          (file) =>
            !INTERNAL_SKILL_PATTERNS.some((pattern) => pattern.test(file)) &&
            isEntryPoint(file),
        );

        const allBootPaths = new Set(
          collectAllSkillPaths(bootYml).map((p) => p.replace(/^skills\//, '')),
        );

        const unaccounted = entryPointSkills.filter(
          (file) => !allBootPaths.has(file),
        );

        expect(unaccounted).toEqual([]);
      });
    });
  });
});
