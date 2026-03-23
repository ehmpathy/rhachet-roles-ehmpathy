import fg from 'fast-glob';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { parse as parseYaml } from 'yaml';

/**
 * .what = unit tests for the mechanic boot.yml
 * .why = validates that boot.yml is consistent with the briefs and skills on disk
 */

const bootYmlPath = resolve(__dirname, 'boot.yml');
const briefsDir = resolve(__dirname, 'briefs');
const skillsDir = resolve(__dirname, 'skills');

/**
 * .what = parse boot.yml into a structured map of subjects
 * .why = provides typed access to boot.yml content for assertions
 */
const parseBootYml = (): Record<
  string,
  {
    briefs?: { say?: string[]; ref?: string[] };
    skills?: { say?: string[]; ref?: string[] };
  }
> => {
  const raw = readFileSync(bootYmlPath, 'utf-8');
  return parseYaml(raw);
};

/**
 * .what = collect all brief paths from boot.yml across all subjects and modes
 * .why = enables dedup and completeness checks
 */
const collectAllBriefPaths = (
  bootYml: ReturnType<typeof parseBootYml>,
): string[] => {
  const paths: string[] = [];
  for (const subject of Object.values(bootYml)) {
    if (subject.briefs?.say) paths.push(...subject.briefs.say);
    if (subject.briefs?.ref) paths.push(...subject.briefs.ref);
  }
  return paths;
};

/**
 * .what = collect brief paths per subject
 * .why = enables per-subject duplicate checks
 */
const collectBriefPathsPerSubject = (
  bootYml: ReturnType<typeof parseBootYml>,
): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  for (const [subjectName, subject] of Object.entries(bootYml)) {
    const paths: string[] = [];
    if (subject.briefs?.say) paths.push(...subject.briefs.say);
    if (subject.briefs?.ref) paths.push(...subject.briefs.ref);
    result[subjectName] = paths;
  }
  return result;
};

/**
 * .what = collect all skill paths from boot.yml across all subjects and modes
 * .why = enables completeness checks for skills
 */
const collectAllSkillPaths = (
  bootYml: ReturnType<typeof parseBootYml>,
): string[] => {
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

describe('boot.yml', () => {
  const bootYml = parseBootYml();

  it('should parse as valid yaml', () => {
    expect(bootYml).toBeDefined();
    expect(typeof bootYml).toBe('object');
  });

  it('should declare the expected subjects', () => {
    const subjects = Object.keys(bootYml);
    expect(subjects).toContain('always');
    expect(subjects).toContain('subject.code.prod');
    expect(subjects).toContain('subject.code.test');
    expect(subjects).toContain('subject.arch');
    expect(subjects).toContain('subject.flow');
  });

  it('should have every brief path resolve to a file on disk', () => {
    const allPaths = collectAllBriefPaths(bootYml);
    const absent = allPaths.filter((briefPath) => {
      const fullPath = resolve(__dirname, briefPath);
      return !existsSync(fullPath);
    });
    expect(absent).toEqual([]);
  });

  it('should not have any brief appear twice within the same subject', () => {
    const perSubject = collectBriefPathsPerSubject(bootYml);
    const duplicates: Array<{ subject: string; path: string }> = [];
    for (const [subjectName, paths] of Object.entries(perSubject)) {
      const seen = new Set<string>();
      for (const path of paths) {
        if (seen.has(path)) duplicates.push({ subject: subjectName, path });
        seen.add(path);
      }
    }
    expect(duplicates).toEqual([]);
  });

  it('should account for every brief file in briefs/ in at least one subject', () => {
    const briefFilesOnDisk = fg.sync('**/*.md', {
      cwd: briefsDir,
      onlyFiles: true,
    });

    const allBootPaths = new Set(
      collectAllBriefPaths(bootYml).map((p) => p.replace(/^briefs\//, '')),
    );

    const unaccounted = briefFilesOnDisk.filter(
      (file) => !allBootPaths.has(file),
    );

    // readme files at directory roots are not expected in boot.yml
    const unaccountedNonReadme = unaccounted.filter(
      (file) =>
        !file.endsWith('.readme.md') &&
        !file.match(/^practices\/[^/]+\/\.readme\.md$/),
    );

    expect(unaccountedNonReadme).toEqual([]);
  });

  it('should not have a brief in both say and ref within the same subject', () => {
    const conflicts: Array<{ subject: string; path: string }> = [];
    for (const [subjectName, subject] of Object.entries(bootYml)) {
      const sayPaths = new Set(subject.briefs?.say ?? []);
      const refPaths = subject.briefs?.ref ?? [];
      for (const refPath of refPaths) {
        if (sayPaths.has(refPath))
          conflicts.push({ subject: subjectName, path: refPath });
      }
    }
    expect(conflicts).toEqual([]);
  });

  it('should have every skill path in boot.yml point to a file on disk', () => {
    const allSkillPaths = collectAllSkillPaths(bootYml);
    const absent = allSkillPaths.filter((skillPath) => {
      const fullPath = resolve(__dirname, skillPath);
      return !existsSync(fullPath);
    });
    expect(absent).toEqual([]);
  });

  it('should account for every entry-point skill in skills/', () => {
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
