import { isPresent } from 'type-fns';

import {
  genArtifactGitFile,
  GitFile,
} from '../../../__nonpublished_modules__/rhachet-artifact-git/src';
import { Artifact } from '../../../__nonpublished_modules__/rhachet/src/domain/Artifact';

export const getRefOrgPatterns = (input: {
  purpose: 'prepare' | 'produce';
}): Artifact<typeof GitFile>[] =>
  [
    // genArtifactGitFile({
    //   uri: __dirname + '/.refs/pattern.mech.args.input-context.md',
    // }),
    // genArtifactGitFile({
    //   uri: __dirname + '/.refs/pattern.mech.arrowonly.md',
    // }),
    // genArtifactGitFile({
    //   uri: __dirname + '/.refs/pattern.mech.what-why.md',
    // }),
    genArtifactGitFile({
      uri: __dirname + '/.refs/patterm.mech.compressed.md', // compresses the 3 above
    }),
    input.purpose === 'prepare'
      ? genArtifactGitFile({
          uri: __dirname + '/.refs/pattern.tests.given-when-then.md',
        })
      : undefined,
  ].filter(isPresent);
