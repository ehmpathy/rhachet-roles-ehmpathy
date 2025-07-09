import { isPresent } from 'type-fns';

import { GitFile } from '../../../../__nonpublished_modules__/rhachet-artifact-git/src';
import { Artifact } from '../../../../__nonpublished_modules__/rhachet/src/domain/Artifact';
import { getMechanicBrief } from '../getMechanicBrief';

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
    getMechanicBrief('codestyle/_mech.compressed.md'),
    input.purpose === 'prepare'
      ? getMechanicBrief('codestyle/mech.tests.given-when-then.md')
      : undefined,
  ].filter(isPresent);
