import { UnexpectedCodePathError } from 'helpful-errors';
import {
  GStitcher,
  Stitch,
  StitchStepCompute,
  Thread,
  Threads,
  RoleContext,
  getStitch,
} from 'rhachet';
import { Artifact } from 'rhachet-artifact';
import { GitFile } from 'rhachet-artifact-git';

/**
 * .what = creates a compute step that sets content onto a thread's stashed artifact
 * .why  = allows downstream steps to persist imagined or computed content into code artifacts
 */
export const genStepArtSet = <
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
}: {
  stitchee: TStitchee;
  artee: TArtee;
}) =>
  new StitchStepCompute<GStitcher<TThreads, GStitcher['context'], GitFile>>({
    form: 'COMPUTE',
    readme: null,
    slug: `[${stitchee}]<artifact:set>[${artee}]`,
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

      const content =
        getStitch({
          from: thread.stitches,
          where: (stitch): stitch is Stitch<{ content: string }> =>
            'content' in stitch.output &&
            typeof stitch.output.content === 'string',
        })?.output.content ??
        UnexpectedCodePathError.throw(
          'could not find stitch with output.content',
          { thread },
        );

      const output = await artifact.set({ content });
      return { input: { artifact, content }, output };
    },
  });
