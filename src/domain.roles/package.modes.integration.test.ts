import { spawnSync } from 'child_process';
import * as fs from 'fs';
import { ConstraintError, MalfunctionError } from 'helpful-errors';
import * as path from 'path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = the published tarball ships every file 0644, or 0755 for *.sh
 * .why = a consumer must be able to hold a pnpm patch of any file in this
 *        package; a read-only mode (0555) fails it with ERR_PNPM_PATCH_FAILED.
 *        this clamps the half this package owns: the modes it publishes.
 * .note = npm pack keeps only the exec bit: a file with any x bit ships 0755,
 *         else 0644. so a dist file left 0555 ships 0755, and a .md at 0755
 *         is the signal this clamp catches
 * .note = the 0555 seen after install comes from `rhachet roles link`, which
 *         chmods linked role files; that cause is fixed in ehmpathy/rhachet
 */
describe('package file modes', () => {
  const dirRepo = path.join(__dirname, '..', '..');

  given('[case1] this package, built', () => {
    when('[t0] packed for publish', () => {
      const packed = useBeforeAll(async () => {
        // fail fast if the build is absent; a pack of no dist proves naught
        if (!fs.existsSync(path.join(dirRepo, 'dist', 'domain.roles')))
          throw new ConstraintError('dist/ is absent; the pack has no files', {
            hint: 'run: npm run build',
          });

        // pack the real tarball into a temp dir
        const packDir = genTempDir({ slug: 'package-modes', git: false });
        const pack = spawnSync(
          'npm',
          ['pack', '--ignore-scripts', '--pack-destination', packDir],
          { cwd: dirRepo, encoding: 'utf-8' }, // note: library api requires this term
        );
        if (pack.status !== 0)
          throw new MalfunctionError('npm pack failed', {
            stderr: pack.stderr,
            hint: 'run `npm pack --ignore-scripts` in the repo root by hand to see the failure',
          });
        const tarball = path.join(
          packDir,
          pack.stdout.trim().split('\n').pop()!,
        );

        // read each file entry's mode from the tarball headers
        const list = spawnSync('tar', ['-tvzf', tarball], {
          encoding: 'utf-8', // note: library api requires this term
          maxBuffer: 64 * 1024 * 1024,
        });
        if (list.status !== 0)
          throw new MalfunctionError('tar list failed', {
            stderr: list.stderr,
            tarball,
            hint: 'run `tar -tvzf <tarball>` by hand; a truncated pack reads as a gzip error',
          });
        const entries = list.stdout
          .split('\n')
          .filter((line) => line.startsWith('-'))
          .map((line) => ({
            mode: line.split(/\s+/)[0]!,
            path: line.split(/\s+/).pop()!,
          }));
        return { entries };
      });

      then('the tarball holds the role files', () => {
        expect(packed.entries.length).toBeGreaterThan(100);
        expect(
          packed.entries.some((entry) =>
            entry.path.endsWith('git.commit/git.commit.operations.sh'),
          ),
        ).toBe(true);
      });

      then('every file is 0644, or 0755 for *.sh — none read-only', () => {
        // a *.sh may ship 0644: a sourced lib (e.g. _hardnudge.lib.sh) needs
        // no exec bit. both modes are writable, so both hold a pnpm patch
        const offenders = packed.entries.filter((entry) => {
          if (entry.path.endsWith('.sh'))
            return entry.mode !== '-rwxr-xr-x' && entry.mode !== '-rw-r--r--';
          return entry.mode !== '-rw-r--r--';
        });
        expect(offenders).toEqual([]);
      });
    });
  });
});
