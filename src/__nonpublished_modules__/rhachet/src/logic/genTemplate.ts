import { RefByUnique } from 'domain-objects';

import { GitFile } from '../../../rhachet-artifact-git/src/domain/GitFile';
import { genArtifactGitFile } from '../../../rhachet-artifact-git/src/logic/file/genArtifactGitFile';
import { genPromptViaTemplate } from './genPromptViaTemplate';

/**
 * .what = generates a template that can be .used easily to instantiate a prompt
 */
export const genTemplate = <TVariables>(
  ref: RefByUnique<typeof GitFile>,
): { use: (input: TVariables) => Promise<string> } => {
  return {
    use: (input: TVariables) =>
      genPromptViaTemplate({
        template: genArtifactGitFile(ref),
        variables: input,
      }),
  };
};
