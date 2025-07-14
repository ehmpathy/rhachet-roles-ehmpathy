import { Artifact } from 'rhachet-artifact';
import { GitFile } from 'rhachet-artifact-git';
import { isPresent } from 'type-fns';

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
