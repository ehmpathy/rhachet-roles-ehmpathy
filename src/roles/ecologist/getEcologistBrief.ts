import type { Artifact } from 'rhachet-artifact';
import { type GitFile, genArtifactGitFile } from 'rhachet-artifact-git';

import type { BriefOptionEcologist } from './getEcologistBrief.Options.codegen';

/**
 * .what = loads an artifact:brief distilled for the mechanic to reference, from the `.briefs` directory
 * .why = enables reusable knowledge downloads for mechanic contexts (e.g., matrix-movie style)
 */
export const getEcologistBrief = (
  key: BriefOptionEcologist,
): Artifact<typeof GitFile> => {
  return genArtifactGitFile({
    uri: `${__dirname}/.briefs/${key}`,
  });
};

/**
 * .what = loads multiple artifact:brief distilled for the mechanic to reference, from the `.briefs` directory
 * .why = enables reusable knowledge downloads for mechanic contexts (e.g., matrix-movie style)
 */
export const getEcologistBriefs = (
  keys: BriefOptionEcologist[],
): Artifact<typeof GitFile>[] => keys.map(getEcologistBrief);
