import { RefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';

import { GitFile } from '../../domain/GitFile';
import { gitFileSetLocal } from './gitFileSetLocal';

/**
 * .what = writes the content of a GitFile to disk or cloud
 * .why = enables artifact.set() resolution during a weave
 */
export const gitFileSet = async (input: {
  ref: RefByUnique<typeof GitFile>;
  content: string;
}): Promise<GitFile> => {
  const isLocal = true; // todo: support non local file uri's
  if (isLocal) return await gitFileSetLocal(input);

  throw new UnexpectedCodePathError('unsupported file uri', { input });
};
