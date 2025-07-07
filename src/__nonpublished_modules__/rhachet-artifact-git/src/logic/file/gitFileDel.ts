import { RefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';

import { GitFile } from '../../domain/GitFile';
import { gitFileDelLocal } from './gitFileDelLocal';

/**
 * .what = deletes the content of a GitFile from disk or cloud
 * .why = enables artifact.del() resolution during a weave
 */
export const gitFileDel = async (input: {
  ref: RefByUnique<typeof GitFile>;
}): Promise<void> => {
  const isLocal = true; // todo: support non-local URIs
  if (isLocal) return await gitFileDelLocal(input);

  throw new UnexpectedCodePathError('unsupported file uri', { input });
};
