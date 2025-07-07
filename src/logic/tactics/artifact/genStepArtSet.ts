import { UnexpectedCodePathError } from 'helpful-errors';
import { GStitcher, Stitch, StitchStepCompute, Thread, Threads } from 'rhachet';

import { GitFile } from '../../../__nonpublished_modules__/rhachet-artifact-git/src';
import { Artifact } from '../../../__nonpublished_modules__/rhachet/src/domain/Artifact';
import { getStitch } from '../../../__nonpublished_modules__/rhachet/src/logic/getStitch';

type WithArt<TArtee extends string> = {
  art: Record<TArtee, Artifact<typeof GitFile>>;
};

export const genStepArtSet = <
  TThreads extends Threads<any, 'single'>,
  TStitchee extends keyof TThreads & string,
  TThread extends Thread<WithArt<any>> = TThreads[TStitchee],
  TArtee extends keyof TThread['context']['art'] &
    string = keyof TThread['context']['art'] & string,
>(input: {
  stitchee: TStitchee;
  artee: TArtee;
}) =>
  new StitchStepCompute<GStitcher<TThreads, GStitcher['context'], GitFile>>({
    form: 'COMPUTE',
    readme: null,
    slug: `[${input.stitchee}]<artifact:set>[${input.artee}]`,
    stitchee: input.stitchee,
    invoke: async ({ threads }) => {
      // grab the target thread
      const thread = threads[input.stitchee] as Thread<WithArt<TArtee>>;

      // lookup the target artifact
      const artifact = thread.context.art[input.artee];

      // lookup the latest content stitch, to set to the art
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

      // set the content to the artifact
      const output = await artifact.set({ content });
      return { input: { artifact, content }, output };
    },
  });
