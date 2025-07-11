import {
  GitFile,
  genArtifactGitFile,
} from '../../../__nonpublished_modules__/rhachet-artifact-git/src';
import { Artifact } from '../../../__nonpublished_modules__/rhachet/src/domain/Artifact';
import { BriefOptionDesigner } from './getDesignerBrief.Options.codegen';

/**
 * .what = loads an artifact:brief distilled for the mechanic to reference, from the `.briefs` directory
 * .why = enables reusable knowledge downloads for mechanic contexts (e.g., matrix-movie style)
 */
export const getDesignerBrief = (
  key: BriefOptionDesigner,
): Artifact<typeof GitFile> => {
  return genArtifactGitFile({
    uri: `${__dirname}/.briefs/${key}`,
  });
};

/**
 * .what = loads multiple artifact:brief distilled for the mechanic to reference, from the `.briefs` directory
 * .why = enables reusable knowledge downloads for mechanic contexts (e.g., matrix-movie style)
 */
export const getDesignerBriefs = (
  keys: BriefOptionDesigner[],
): Artifact<typeof GitFile>[] => keys.map(getDesignerBrief);
