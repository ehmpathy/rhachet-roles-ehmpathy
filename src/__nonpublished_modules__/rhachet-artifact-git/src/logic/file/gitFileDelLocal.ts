import { RefByUnique } from 'domain-objects';
import { unlink } from 'fs/promises';
import { UnexpectedCodePathError } from 'helpful-errors';

import { GitFile } from '../../domain/GitFile';

/**
 * .what = deletes a GitFile from the local filesystem
 * .why = used by artifact.del() to remove persisted file content
 */
export const gitFileDelLocal = async (input: {
  ref: RefByUnique<typeof GitFile>;
}): Promise<void> => {
  try {
    await unlink(input.ref.uri);
  } catch (err: any) {
    if (err.code === 'ENOENT') return; // soft delete: already gone is okay
    throw new UnexpectedCodePathError('failed to delete local GitFile', {
      uri: input.ref.uri,
      cause: err,
    });
  }
};
