import fg from 'fast-glob';
import { existsSync } from 'fs';
import { resolve } from 'path';

import { bootYmlTestKit } from '../.test/bootYml.testkit';

/**
 * .what = integration tests for the architect boot.yml
 * .why = validates that boot.yml is consistent with the briefs on disk.
 *        clamps the class of defect where the lang.prose cluster lands on
 *        disk but never reaches boot — so a blocker-severity prose rule
 *        ships with zero default effect.
 * .note = classified integration: these read the filesystem (fast-glob,
 *         existsSync, boot.yml parse), a remote boundary forbidden in unit
 *         tests per rule.forbid.unit.remote-boundaries.
 */

const bootYmlPath = resolve(__dirname, 'boot.yml');
const briefsDir = resolve(__dirname, 'briefs');

describe('boot.yml', () => {
  const bootYml = bootYmlTestKit.parse({ path: bootYmlPath });

  it('should parse as valid yaml', () => {
    expect(bootYml).toBeDefined();
    expect(typeof bootYml).toBe('object');
  });

  it('should have every brief path point to a file on disk', () => {
    const allPaths = bootYmlTestKit.collectAllBriefPaths({ bootYml });
    const absent = allPaths.filter((briefPath) => {
      const fullPath = resolve(__dirname, briefPath);
      return !existsSync(fullPath);
    });
    expect(absent).toEqual([]);
  });

  it('should not have any brief appear twice within the same subject', () => {
    const perSubject = bootYmlTestKit.collectBriefPathsPerSubject({ bootYml });
    const duplicates = bootYmlTestKit.findDuplicateBriefPaths({ perSubject });
    expect(duplicates).toEqual([]);
  });

  it('should not have a brief in both say and ref within the same subject', () => {
    const conflicts = bootYmlTestKit.findSayRefConflicts({ bootYml });
    expect(conflicts).toEqual([]);
  });

  it('should force-load every lang.prose brief as say', () => {
    // the lang.prose overlay declares blocker-severity rules. a blocker rule
    // that boots only as a ref pointer has zero default effect — the wish's
    // core verb ("entrain into the architect") goes unmet. so every non-readme
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

    const unsaid = proseFilesOnDisk.filter((file) => !sayBootPaths.has(file));

    expect(unsaid).toEqual([]);
  });
});
