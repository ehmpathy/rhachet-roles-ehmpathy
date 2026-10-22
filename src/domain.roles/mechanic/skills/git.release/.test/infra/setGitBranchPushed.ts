import { spawnSync } from 'child_process';
import { MalfunctionError } from 'helpful-errors';

/**
 * .what = pin refs/remotes/origin/<branch> at HEAD for the checked-out branch
 * .why  = models a branch whose commits are all pushed; the F14 guard counts
 *         unpushed commits against origin/<branch>, and refuses as a
 *         malfunction when that ref is absent
 */
export const setGitBranchPushed = (input: { tempDir: string }): void => {
  // read the checked-out branch
  const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: input.tempDir,
    encoding: 'utf-8',
  });
  if (branch.status !== 0)
    throw new MalfunctionError('fixture could not read its branch', {
      tempDir: input.tempDir,
      stderr: branch.stderr,
    });

  // main ships via --from main, which the F14 guard skips; leave its refs as the
  // scene declared them
  const branchName = branch.stdout.trim();
  if (branchName === 'main') return;

  // pin its origin ref at HEAD
  const pin = spawnSync(
    'git',
    ['update-ref', `refs/remotes/origin/${branchName}`, 'HEAD'],
    { cwd: input.tempDir, encoding: 'utf-8' },
  );
  if (pin.status !== 0)
    throw new MalfunctionError('fixture could not pin its origin ref', {
      tempDir: input.tempDir,
      stderr: pin.stderr,
    });
};
