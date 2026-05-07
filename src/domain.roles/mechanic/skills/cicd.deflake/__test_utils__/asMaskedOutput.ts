/**
 * .what = mask dynamic content in skill output for stable snapshots
 * .why = masks paths, timestamps, and counts that vary between runs
 */
export const asMaskedOutput = (input: {
  stdout: string;
  tempDir?: string;
}): string => {
  let output = input.stdout;

  // mask full worktree + genTempDir paths (e.g., /home/.../worktree/.temp/genTempDir.symlink/xxx/)
  output = output.replace(
    /\/[^\s]*\.temp\/genTempDir\.symlink\/[^\s/]+/g,
    '.temp/$TEMP',
  );

  // mask worktree paths (e.g., /home/vlad/git/ehmpathy/_worktrees/rhachet-roles-ehmpathy.vlad.xxx/)
  output = output.replace(/\/home\/[^\s]*\/_worktrees\/[^\s/]+/g, '$WORKTREE');

  // mask /tmp/ paths (e.g., /tmp/cicd-deflake-test-xxx/)
  output = output.replace(/\/tmp\/[^\s/]+/g, '/tmp/$TEMP');

  // mask specific tempDir if provided (handles absolute paths)
  if (input.tempDir) {
    output = output.replace(
      new RegExp(input.tempDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      '.temp/$TEMP',
    );
  }

  // mask timestamps
  output = output.replace(/\d{4}-\d{2}-\d{2}T[\d:.+-]+Z?/g, '$TIMESTAMP');

  // mask "last N days"
  output = output.replace(/last \d+ days/g, 'last $N days');

  // mask runs_analyzed counts
  output = output.replace(/runs_analyzed: \d+/g, 'runs_analyzed: $N');

  // mask flakes count (varies with real GitHub data)
  output = output.replace(/flakes: \d+/g, 'flakes: $N');

  return output;
};
