import type { Artifact } from 'rhachet-artifact';
import { type GitFile, genArtifactGitFile } from 'rhachet-artifact-git';

import type { BriefOptionBhrain } from './getBhrainBrief.Options.codegen';

/**
 * .what = loads an artifact:brief distilled for the mechanic to reference, from the `briefs` directory
 * .why = enables reusable knowledge downloads for mechanic contexts (e.g., matrix-movie style)
 */
export const getBhrainBrief = (
  key: BriefOptionBhrain,
): Artifact<typeof GitFile> => {
  return genArtifactGitFile({
    uri: `${__dirname}/briefs/${key}`,
  });
};

/**
 * .what = loads multiple artifact:brief distilled for the mechanic to reference, from the `briefs` directory
 * .why = enables reusable knowledge downloads for mechanic contexts (e.g., matrix-movie style)
 */
export const getBhrainBriefs = (
  keys: BriefOptionBhrain[],
): Artifact<typeof GitFile>[] => keys.map(getBhrainBrief);
