import { RefByUnique } from 'domain-objects';
import { mkdir, writeFile } from 'fs/promises';
import { UnexpectedCodePathError } from 'helpful-errors';
import { dirname } from 'path';

import { GitFile } from '../../domain/GitFile';
import { gitFileGetLocal } from './gitFileGetLocal';

/**
 * .what = writes content to a local GitFile and confirms by reading it back
 * .why = ensures write success and consistent hash traceability
 */
export const gitFileSetLocal = async (input: {
  ref: RefByUnique<typeof GitFile>;
  content: string;
}): Promise<GitFile> => {
  await mkdir(dirname(input.ref.uri), { recursive: true });
  await writeFile(input.ref.uri, input.content, 'utf-8'); // todo: support other file formats

  const file =
    (await gitFileGetLocal({ ref: input.ref })) ??
    UnexpectedCodePathError.throw('file does not exist after write', {
      ref: input.ref,
    });

  if (file.content !== input.content)
    throw new UnexpectedCodePathError('file content mismatch after write', {
      expected: input.content,
      realized: file.content,
    });

  return file;
};
