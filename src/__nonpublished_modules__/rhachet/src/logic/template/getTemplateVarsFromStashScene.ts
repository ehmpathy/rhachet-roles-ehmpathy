import { UnexpectedCodePathError } from 'helpful-errors';
import { Thread } from 'rhachet';

import { GitFile } from '../../../../rhachet-artifact-git/src';
import { getGitRepoRoot } from '../../../../rhachet-artifact-git/src/logic/repo/getGitRepoRoot';
import { Artifact } from '../../domain/Artifact';

/**
 * .what = renders coderefs in stash.scene as a template-ready string
 * .why  = provides a human-readable scene view for code-based tasks
 */
export const getTemplateVarsFromStashScene = async <
  TThread extends Thread<{
    stash: { scene: { coderefs: Artifact<typeof GitFile>[] } };
  }>,
>(input: {
  thread: TThread;
}) => {
  const root = await getGitRepoRoot({ from: process.cwd() });

  const rendered = await Promise.all(
    input.thread.context.stash.scene.coderefs.map(async (ref) => {
      const content =
        (await ref.get())?.content ??
        UnexpectedCodePathError.throw('coderef artifact does not exist', {
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
  );

  const scene = rendered.join('\n\n');

  return {
    stash: {
      scene,
    },
  };
};
