import { asUniDateTime } from '@ehmpathy/uni-time';
import { withExpectOutput } from 'as-procedure';
import { RefByUnique } from 'domain-objects';
import { asHashShake256 } from 'hash-fns';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import path from 'path';
import { isPresent, PickOne } from 'type-fns';

import { Artifact } from '../../../../rhachet/src/domain/Artifact';
import { GitFile } from '../../domain/GitFile';
import { castGitFileUriToAbsoluteUri } from './castGitFileUriToAbsoluteUri';
import { gitFileDel } from './gitFileDel';
import { gitFileGet } from './gitFileGet';
import { gitFileSet } from './gitFileSet';

export class ArtifactAccessDeniedError extends HelpfulError {}

const VERSION_ROUTE_STANDARD =
  './.rhachet/artifact/{key}/{unidatetime}.{hash}.{ext}' as const;

/**
 * .what = generates a GitFile-backed Artifact
 * .why  = enables typed read/write of file content using GitFile semantics
 * .note =
 *   - supports @gitroot/... url scheme
 *   - access mode 'readonly' disables write/delete
 *   - versioned copies written to retain path if enabled
 */
export const genArtifactGitFile = (
  ref: RefByUnique<typeof GitFile>,
  options?: {
    access?: 'readwrite' | 'readonly';
    versions?:
      | true
      | PickOne<{
          retain: typeof VERSION_ROUTE_STANDARD; // allow custom paths?
          omit: true;
        }>;
  },
): Artifact<typeof GitFile> => {
  const access = options?.access ?? 'readwrite';

  const uniRefPromise = castGitFileUriToAbsoluteUri(ref).then((uri) => ({
    uri,
  }));

  return new Artifact<typeof GitFile>({
    ref,
    get: withExpectOutput(
      async () => await gitFileGet({ ref: await uniRefPromise }),
    ),
    set: async ({ content }) => {
      if (access === 'readonly')
        ArtifactAccessDeniedError.throw(
          `artifact.access=readonly, can not .set`,
          { ref },
        );

      const { uri } = await uniRefPromise;
      const fileKey = path.basename(uri, path.extname(uri)); // removes extension
      const fileExtension = path.extname(uri); // includes the dot (e.g. '.ts')
      const setVersionRoute =
        options?.versions === true
          ? VERSION_ROUTE_STANDARD
          : options?.versions?.retain ?? null;
      const [setLatestResult] = await Promise.all(
        [
          gitFileSet({ ref: { uri }, content }),
          setVersionRoute
            ? gitFileSet({
                ref: {
                  uri: path.join(
                    path.dirname(uri),
                    setVersionRoute
                      .replace('{key}', fileKey)
                      .replace('{unidatetime}', asUniDateTime(new Date()))
                      .replace(
                        '{hash}',
                        await asHashShake256(content, { bytes: 8 }), // for easy grokability of like contents
                      )
                      .replace('.{ext}', fileExtension),
                  ),
                },
                content,
              })
            : null,
        ].filter(isPresent),
      );

      return (
        setLatestResult ??
        UnexpectedCodePathError.throw(
          'should have atleast had the latest write',
        )
      );
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
