import { Threads } from 'rhachet';

import { GitFile } from '../../__nonpublished_modules__/rhachet-artifact-git/src';
import { getGitRepoRoot } from '../../__nonpublished_modules__/rhachet-artifact-git/src/logic/repo/getGitRepoRoot';
import { Artifact } from '../../__nonpublished_modules__/rhachet/src/domain/Artifact';

export const castCodeRefsToTemplateScene = async <
  TStitchee extends string,
  TThreads extends Threads<
    Record<
      TStitchee,
      { stash: { scene: { coderefs: Artifact<typeof GitFile>[] } } }
    >
  >,
>({
  threads,
  stitchee,
}: {
  threads: TThreads;
  stitchee: TStitchee;
}) =>
  (
    await Promise.all(
      (
        threads[stitchee] as {
          context: {
            stash: { scene: { coderefs: Artifact<typeof GitFile>[] } };
          };
        }
      ).context.stash.scene.coderefs.map(async (ref) =>
        [
          '',
          '```ts',
          `// ${ref.ref.uri.replace(
            await getGitRepoRoot({ from: process.cwd() }),
            '@gitroot',
          )}`,
          (await ref.get())?.content,
          '```',
        ].join('\n'),
      ),
    )
  ).join('\n\n');
