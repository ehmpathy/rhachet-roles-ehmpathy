import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';

/**
 * .what = shape of a boot.yml subject's brief/skill declarations
 * .why = shared contract for every parse/collect/find operation below
 */
export interface BootYmlSubject {
  briefs?: { say?: string[]; ref?: string[] };
  skills?: { say?: string[]; ref?: string[] };
}

export type BootYml = Record<string, BootYmlSubject>;

/**
 * .what = parse a boot.yml file into a structured map of subjects
 * .why = provides typed access to boot.yml content for assertions
 */
const parse = (input: { path: string }): BootYml => {
  const raw = readFileSync(input.path, 'utf-8');
  return parseYaml(raw);
};

/**
 * .what = collect all brief paths from boot.yml across all subjects and modes
 * .why = enables completeness and existence checks
 */
const collectAllBriefPaths = (input: { bootYml: BootYml }): string[] => {
  const paths: string[] = [];
  for (const subject of Object.values(input.bootYml)) {
    if (subject.briefs?.say) paths.push(...subject.briefs.say);
    if (subject.briefs?.ref) paths.push(...subject.briefs.ref);
  }
  return paths;
};

/**
 * .what = collect brief paths declared say in the always subject (force-loaded every session)
 * .why = a blocker-severity rule must force-load every session, not merely appear in some
 *        conditional subject's say list. only the always subject boots unconditionally.
 */
const collectAlwaysSayBriefPaths = (input: { bootYml: BootYml }): string[] => {
  return input.bootYml.always?.briefs?.say ?? [];
};

/**
 * .what = collect brief paths per subject
 * .why = enables per-subject duplicate checks
 */
const collectBriefPathsPerSubject = (input: {
  bootYml: BootYml;
}): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  for (const [subjectName, subject] of Object.entries(input.bootYml)) {
    const paths: string[] = [];
    if (subject.briefs?.say) paths.push(...subject.briefs.say);
    if (subject.briefs?.ref) paths.push(...subject.briefs.ref);
    result[subjectName] = paths;
  }
  return result;
};

/**
 * .what = find brief paths that appear more than once within the same subject
 * .why = names the duplicate-detect intent so a caller reads narrative, not a
 *        manual set-tracked loop
 */
const findDuplicateBriefPaths = (input: {
  perSubject: Record<string, string[]>;
}): Array<{ subject: string; path: string }> => {
  const duplicates: Array<{ subject: string; path: string }> = [];
  for (const [subjectName, paths] of Object.entries(input.perSubject)) {
    const seen = new Set<string>();
    for (const path of paths) {
      if (seen.has(path)) duplicates.push({ subject: subjectName, path });
      seen.add(path);
    }
  }
  return duplicates;
};

/**
 * .what = find brief paths declared in both say and ref within the same subject
 * .why = names the conflict-detect intent; a brief in both lists signals a stale
 *        ref that should have been dropped once the brief promoted to say
 */
const findSayRefConflicts = (input: {
  bootYml: BootYml;
}): Array<{ subject: string; path: string }> => {
  const conflicts: Array<{ subject: string; path: string }> = [];
  for (const [subjectName, subject] of Object.entries(input.bootYml)) {
    const sayPaths = new Set(subject.briefs?.say ?? []);
    const refPaths = subject.briefs?.ref ?? [];
    for (const refPath of refPaths) {
      if (sayPaths.has(refPath))
        conflicts.push({ subject: subjectName, path: refPath });
    }
  }
  return conflicts;
};

/**
 * .what = check whether a brief-relative file path names a readme
 * .why = readme files at directory roots are not expected to appear in boot.yml;
 *        one named predicate replaces the prior inline checks for the same
 *        concept. criteria stays exactly as locked in on main: the original
 *        inline guard exempted `.readme.md` files, its second clause
 *        (`^practices/<dir>/.readme.md$`) a strict subset of `.endsWith`.
 *        so a `.readme.md` suffix is the single, unbroadened exemption — a bare
 *        `readme.md` is NOT exempt (none exists on disk today).
 */
const isReadmeFile = (input: { file: string }): boolean => {
  return input.file.endsWith('.readme.md');
};

/**
 * .what = convert a boot.yml brief path (carries a `briefs/` prefix) into its
 *         on-disk path (relative to the briefs/ directory, no prefix)
 * .why = boot.yml paths and the on-disk glob live in two path spaces; this
 *        aligns them once so callers compare like-for-like without a repeat
 *        of the prefix strip inline
 */
const asOnDiskBriefPath = (input: { bootPath: string }): string => {
  return input.bootPath.replace(/^briefs\//, '');
};

/**
 * .what = shared boot.yml test utilities, consumed by every role's boot.yml.test.ts
 * .why = a role's boot.yml shape and validation rules are identical; a bundled kit
 *        keeps parse/collect/find logic in one maintained place instead of a
 *        hand-copied fork per role (rule.prefer.most-common-denominator)
 */
export const bootYmlTestKit = {
  parse,
  collectAllBriefPaths,
  collectAlwaysSayBriefPaths,
  collectBriefPathsPerSubject,
  findDuplicateBriefPaths,
  findSayRefConflicts,
  isReadmeFile,
  asOnDiskBriefPath,
};
