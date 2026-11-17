import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = clamps the pre-commit hook that halts a staged file with a raw timestamp
 * .why  = a timestamp in a snapshot permadrifts; the hook is the one gate that catches
 *         it before commit, so its verdicts and its refusal render are pinned here
 * .note = the hook lives in .husky/, which jest does not scan, so its test lives here
 */
describe('check.timestamps.sh', () => {
  const hookPath = path.join(__dirname, '../../.husky/check.timestamps.sh');

  /**
   * .what = stage one file in a fresh repo, then run the hook there
   */
  const runHookOnStaged = (input: {
    slug: string;
    relPath: string;
    content: string;
    blobDamaged?: boolean;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const cwd = genTempDir({ slug: input.slug, git: true });
    fs.mkdirSync(path.dirname(path.join(cwd, input.relPath)), {
      recursive: true,
    });
    fs.writeFileSync(path.join(cwd, input.relPath), input.content);
    spawnSync('git', ['add', input.relPath], { cwd });

    // drop the staged blob's loose object, so git cannot read the staged content
    if (input.blobDamaged) {
      const sha = spawnSync('git', ['rev-parse', `:${input.relPath}`], {
        cwd,
        encoding: 'utf-8',
      }).stdout.trim();
      fs.rmSync(path.join(cwd, '.git', 'objects', sha.slice(0, 2), sha.slice(2)));
    }
    const result = spawnSync('bash', [hookPath], {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  given('[case1] a staged snapshot that embeds a raw timestamp', () => {
    when('[t0] the hook runs', () => {
      const result = useBeforeAll(async () =>
        runHookOnStaged({
          slug: 'check-timestamps-stamp',
          relPath: '__snapshots__/reef.test.ts.snap',
          content: 'wave report observed at 2026-08-08T14:30:00Z\n',
        }),
      );

      then('it halts as a constraint on both streams, exit 2', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: timestamps are forbidden in staged files',
        );
        expect(result.stderr).toContain('✋ ConstraintError');
      });

      then('it names the file and line, and ends on a coconut command', () => {
        expect(result.stdout).toContain('__snapshots__/reef.test.ts.snap:1:');
        expect(result.stdout).toContain('🥥 did you know?');
        expect(result.stdout.trimEnd().split('\n').pop()).toEqual(
          '   └─ rhx git.repo.test --what unit --mode apply --resnap',
        );
        // mask the stamp the hook echoes, or this very snapshot trips the hook
        expect(
          result.stdout.replace(
            /T?\d\d:\d\d:\d\d(Z|[+-]\d\d:?\d\d)?/g,
            '<time>',
          ),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case2] a staged snapshot that holds only an iso duration', () => {
    when('[t0] the hook runs', () => {
      const result = useBeforeAll(async () =>
        runHookOnStaged({
          slug: 'check-timestamps-duration',
          relPath: '__snapshots__/reef.test.ts.snap',
          content: 'paddle out window: PT12:30:00\n',
        }),
      );

      then('it passes: a duration is a fixed span, not an instant', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toEqual('');
      });
    });
  });

  given('[case3] a staged file with no time at all', () => {
    when('[t0] the hook runs', () => {
      const result = useBeforeAll(async () =>
        runHookOnStaged({
          slug: 'check-timestamps-clean',
          relPath: 'notes/reef.md',
          content: 'the reef is calm today\n',
        }),
      );

      then('it passes silently', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toEqual('');
      });
    });
  });

  given('[case4] a staged file whose blob git cannot read', () => {
    when('[t0] the hook runs', () => {
      const result = useBeforeAll(async () =>
        runHookOnStaged({
          slug: 'check-timestamps-damaged',
          relPath: 'notes/reef.md',
          content: 'the reef is calm today\n',
          blobDamaged: true,
        }),
      );

      then('it halts as a malfunction on both streams, exit 1', () => {
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(
          '💥 MalfunctionError: could not read staged content for notes/reef.md',
        );
        expect(result.stderr).toContain(
          '💥 MalfunctionError: could not read staged content for notes/reef.md',
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });
});
