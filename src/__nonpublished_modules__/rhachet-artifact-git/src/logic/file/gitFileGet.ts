import { RefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';

import { GitFile } from '../../domain/GitFile';
import { gitFileGetLocal } from './gitFileGetLocal';

/**
 * .what = loads the content of a GitFile from disk or cloud
 * .why = enables artifact.get() resolution during a weave
 */
export const gitFileGet = async (input: {
  ref: RefByUnique<typeof GitFile>;
}): Promise<GitFile | null> => {
  const isLocal = true; // todo: support cloud sources, e.g., like s3?; route based on ref.uri
  if (isLocal) return await gitFileGetLocal(input);

  // otherwise, unsupported
  throw new UnexpectedCodePathError('unsupported file uri', { input });
};
