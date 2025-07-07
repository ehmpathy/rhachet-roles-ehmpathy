import { RefByUnique } from 'domain-objects';

import { Artifact } from '../../../../rhachet/src/domain/Artifact';
import { GitFile } from '../../domain/GitFile';
import { castGitFileUriToAbsoluteUri } from './castGitFileUriToAbsoluteUri';
import { gitFileDel } from './gitFileDel';
import { gitFileGet } from './gitFileGet';
import { gitFileSet } from './gitFileSet';

/**
 * .what = generates a GitFile-backed Artifact
 * .why = enables typed read/write of file content using GitFile semantics
 * .note =
 *   - supports @gitroot/... url scheme
 */
export const genArtifactGitFile = (
  ref: RefByUnique<typeof GitFile>,
): Artifact<typeof GitFile> => {
  // resolve git file uri to absolute uri
  const uniRefPromise = castGitFileUriToAbsoluteUri(ref).then((uri) => ({
    uri,
  }));

  // create a tactic that operates against the absolute uri, while still referenced by the input uri
  return new Artifact<typeof GitFile>({
    ref,
    get: async () => await gitFileGet({ ref: await uniRefPromise }),
    del: async () => await gitFileDel({ ref: await uniRefPromise }),
    set: async ({ content }) =>
      await gitFileSet({ ref: await uniRefPromise, content }),
  });
};
