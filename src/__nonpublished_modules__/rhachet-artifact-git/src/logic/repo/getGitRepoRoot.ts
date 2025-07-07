import findUp from 'find-up';
import { BadRequestError } from 'helpful-errors';
import { resolve } from 'path';

/**
 * .what = gets the root directory of a Git repository
 * .why = used to resolve paths relative to the Git root
 */
export const getGitRepoRoot = async (input: {
  from: string;
}): Promise<string> => {
  const gitDir = await findUp('.git', {
    type: 'directory',
    cwd: input.from,
  });

  if (!gitDir)
    throw new BadRequestError('Not inside a Git repository', { input });

  return resolve(gitDir, '..');
};
