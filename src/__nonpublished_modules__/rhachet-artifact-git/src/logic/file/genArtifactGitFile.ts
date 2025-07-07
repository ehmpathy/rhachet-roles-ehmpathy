import { RefByUnique } from 'domain-objects';
import { HelpfulError } from 'helpful-errors';

import { Artifact } from '../../../../rhachet/src/domain/Artifact';
import { GitFile } from '../../domain/GitFile';
import { castGitFileUriToAbsoluteUri } from './castGitFileUriToAbsoluteUri';
import { gitFileDel } from './gitFileDel';
import { gitFileGet } from './gitFileGet';
import { gitFileSet } from './gitFileSet';

export class ArtifactAccessDeniedError extends HelpfulError {}

/**
 * .what = generates a GitFile-backed Artifact
 * .why  = enables typed read/write of file content using GitFile semantics
 * .note =
 *   - supports @gitroot/... url scheme
 *   - access mode 'readonly' disables write/delete
 */
export const genArtifactGitFile = (
  ref: RefByUnique<typeof GitFile>,
  options?: { access?: 'readwrite' | 'readonly' },
): Artifact<typeof GitFile> => {
  const access = options?.access ?? 'readwrite';

  const uniRefPromise = castGitFileUriToAbsoluteUri(ref).then((uri) => ({
    uri,
  }));

  return new Artifact<typeof GitFile>({
    ref,
    get: async () => await gitFileGet({ ref: await uniRefPromise }),
    set: async ({ content }) => {
      if (access === 'readonly')
        ArtifactAccessDeniedError.throw(
          `artifact.access=readonly, can not .set`,
          { ref },
        );
      return await gitFileSet({ ref: await uniRefPromise, content });
    },
    del: async () => {
      if (access === 'readonly')
        ArtifactAccessDeniedError.throw(
          `artifact.access=readonly, can not .del`,
          { ref },
        );
      return await gitFileDel({ ref: await uniRefPromise });
    },
  });
};
