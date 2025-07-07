import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import { resolve } from 'path';

import { getGitRepoRoot } from '../repo/getGitRepoRoot';

/**
 * .what = casts a git file uri to absolute uri
 * .why = resolves special supported uri schemes, as needed
 */
export const castGitFileUriToAbsoluteUri = async (input: {
  uri: string;
}): Promise<string> => {
  if (input.uri.startsWith('@gitroot/')) return resolveGitRootUri(input);
  return input.uri;
};

/**
 * Resolves a `@gitroot/...` URI to the actual file path.
 */
const resolveGitRootUri = async (input: { uri: string }): Promise<string> => {
  if (!input.uri.startsWith('@gitroot/'))
    UnexpectedCodePathError.throw(
      'why was resolveGitRootUri called on a non @gitroot uri?',
      { input },
    );

  const gitRoot =
    (await getGitRepoRoot({ from: process.cwd() })) ??
    BadRequestError.throw('Cannot resolve @gitroot: not inside a Git repo.', {
      input,
    });

  const suffix = input.uri.slice('@gitroot/'.length);
  return resolve(gitRoot, suffix);
};
