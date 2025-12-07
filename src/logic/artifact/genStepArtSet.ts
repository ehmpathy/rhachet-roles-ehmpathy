import { UnexpectedCodePathError } from 'helpful-errors';
import {
  type GStitcher,
  getStitch,
  type RoleContext,
  type Stitch,
  StitchStepCompute,
  type Thread,
  type Threads,
} from 'rhachet';
import type { Artifact } from 'rhachet-artifact';
import { type GitFile, getGitRepoRoot } from 'rhachet-artifact-git';

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
  mode = 'upsert',
}: {
  stitchee: TStitchee;
  artee: TArtee;
  mode?: 'upsert' | 'append';
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

      // grab the content to write
      const contentAddition =
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

      // decide what to set to the artifact
      const contentOutcome = await (async () => {
        // if its an upsert, then replace the content
        if (mode === 'upsert') return contentAddition;

        // if its an append, then append the content
        if (mode === 'append')
          return [
            (await artifact.get())?.content,
            '',
            '---',
            '',
            contentAddition,
          ].join('\n');

        // otherwise, unexpected
        throw new UnexpectedCodePathError('unsupported mode', { mode });
      })();

      const output = await artifact.set({ content: contentOutcome });

      console.log(
        `🎨️  art.${mode}ed, saved to ${artifact.ref.uri.replace(
          await getGitRepoRoot({ from: process.cwd() }),
          '',
        )}\n`,
      );

      return { input: { mode, artifact, content: contentAddition }, output };
    },
  });
