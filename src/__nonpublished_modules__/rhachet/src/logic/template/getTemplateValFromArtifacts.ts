import { UnexpectedCodePathError } from 'helpful-errors';

import { GitFile } from '../../../../rhachet-artifact-git/src';
import { getGitRepoRoot } from '../../../../rhachet-artifact-git/src/logic/repo/getGitRepoRoot';
import { Artifact } from '../../domain/Artifact';

/**
 * .what = reads the artifacts given and returns a string for use in a template val
 * .why  = makes it easy to execute this common usecase
 */
export const getTemplateValFromArtifacts = async (input: {
  artifacts: Artifact<typeof GitFile>[];
}) => {
  const root = await getGitRepoRoot({ from: process.cwd() });

  return (
    await Promise.all(
      input.artifacts.map(async (ref) => {
        const content =
          (await ref.get())?.content ??
          UnexpectedCodePathError.throw('artifact does not exist', {
            ref,
          });
        return [
          '',
          '```ts',
          `// ${ref.ref.uri.replace(root, '@gitroot')}`,
          content,
          '```',
        ].join('\n');
      }),
    )
  ).join('\n\n');
};
