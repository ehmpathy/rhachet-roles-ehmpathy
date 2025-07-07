import { Threads } from 'rhachet';

import { GitFile } from '../../__nonpublished_modules__/rhachet-artifact-git/src';
import { Artifact } from '../../__nonpublished_modules__/rhachet/src/domain/Artifact';

export const castCodeRefsToTemplateScene = async <
  TStitchee extends string,
  TThreads extends Threads<
    Record<TStitchee, { scene: { coderefs: Artifact<typeof GitFile>[] } }>
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
          context: { scene: { coderefs: Artifact<typeof GitFile>[] } };
        }
      ).context.scene.coderefs.map(async (ref) =>
        [
          '',
          '```ts',
          `// ${ref.ref.uri}`,
          (await ref.get())?.content,
          '```',
        ].join('\n'),
      ),
    )
  ).join('\n\n');
