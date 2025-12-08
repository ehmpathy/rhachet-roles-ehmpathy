import {
  type GStitcher,
  type RoleContext,
  StitchStepCompute,
  type Thread,
  type Threads,
} from 'rhachet';
import type { Artifact } from 'rhachet-artifact';
import { type GitFile, getGitRepoRoot } from 'rhachet-artifact-git';

/**
 * .what = creates a compute step that deletes the contents of an artifact
 * .why  = allows composer routes to purge the state of any artifact
 */
export const genStepArtDel = <
  TStitchee extends string,
  TArtee extends string,
  TThreads extends Threads<{
    [K in TStitchee]: RoleContext<
      K,
      {
        art: {
          [P in TArtee]: Artifact<typeof GitFile>;
        };
      }
    >;
  }>,
>({
  stitchee,
  artee,
  mode = 'delete',
  ...input
}: {
  stitchee: TStitchee;
  artee: TArtee;
  mode?: 'delete';
  condition?: ({ threads }: { threads: TThreads }) => 'SKIP' | 'EXEC';
}) =>
  new StitchStepCompute<
    GStitcher<TThreads, GStitcher['context'], 'SKIP' | 'EXEC'>
  >({
    form: 'COMPUTE',
    readme: null,
    slug: `[${stitchee}]<artifact:del>[${artee}]`,
    stitchee,
    invoke: async ({ threads }) => {
      const thread = threads[stitchee] as any as Thread<
        RoleContext<
          typeof stitchee,
          {
            art: {
              [P in typeof artee]: Artifact<typeof GitFile>;
            };
          }
        >
      >;
      const artifact = thread.context.stash.art[artee];

      // evaluate the condition, if one exists
      const decision = input.condition?.({ threads }) ?? 'EXEC';
      if (decision === 'SKIP')
        return { input: { mode, artifact }, output: 'SKIP' };

      // otherwise, execute the delete
      await artifact.del();
      console.log(
        `🎨️  art.${mode}ed, impacted ${artifact.ref.uri.replace(
          await getGitRepoRoot({ from: process.cwd() }),
          '',
        )}\n`,
      );
      return { input: { mode, artifact }, output: 'EXEC' };
    },
  });
