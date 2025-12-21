import {
  asStitcher,
  asStitcherFlat,
  type GStitcher,
  type GStitcherOf,
  genStitchCycle,
  genStitchRoute,
  type RoleContext,
  type StitchCycle,
  type Stitcher,
  StitchStepCompute,
  type Thread,
  type Threads,
} from 'rhachet';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';

import { genStepGrabCallerFeedbackToArtifact } from './genStepGrabCallerFeedbackToArtifact';

export const genLoopFeedback = <
  TStitchee extends string,
  TArtee extends string,
  TRepeatee extends Stitcher<GStitcher<any, any, any>>,
  TThreads extends GStitcherOf<TRepeatee>['threads'],
  TContext extends GStitcherOf<TRepeatee>['context'],
>({
  stitchee,
  artee,
  repeatee,
  halter,
}: {
  stitchee: TStitchee;
  artee: TArtee;
  repeatee: TRepeatee;
  halter?: StitchCycle<any>['halter'];
}): Stitcher<
  GStitcher<
    // extend the threads to require these minimums for these roles
    Threads<{
      [K in keyof TThreads & string]: RoleContext<
        K,
        K extends 'caller'
          ? TThreads['caller']['context']['stash'] & {
              ask: string;
              art: {
                feedback: Artifact<typeof GitFile>;
              };
            }
          : K extends TStitchee
            ? TThreads[TStitchee]['context']['stash'] & {
                art: { [P in TArtee]: Artifact<typeof GitFile> };
              }
            : TThreads[K]['context']['stash']
      >;
    }>,
    TContext,
    { feedback: GitFile | null }
  >
> => {
  const stepGetFeedback = genStepGrabCallerFeedbackToArtifact<
    TStitchee,
    TArtee,
    TThreads
  >({
    stitchee,
    artee,
  });

  const route = asStitcherFlat(
    genStitchRoute({
      slug: `[${stitchee}]<write>(<repeatee>-><write>-><feedback>)`,
      readme: `@[${stitchee}] imagines, writes, then @[caller] gives feedback`,
      sequence: [repeatee as any, asStitcher(stepGetFeedback)],
    }) as any,
  );

  const stepDecide = new StitchStepCompute<
    GStitcher<
      TThreads,
      GStitcher['context'],
      { choice: 'release' | 'repeat' | 'halt' }
    >
  >({
    form: 'COMPUTE',
    slug: `[caller]<feedback><hasNotes?>`,
    stitchee: 'caller' as const,
    readme: `check if feedback has content`,
    invoke: async ({ threads }) => {
      const thread = threads.caller as Thread<
        RoleContext<'caller', { art: { feedback: Artifact<typeof GitFile> } }>
      >;
      const feedback = await thread.context.stash.art.feedback.get();
      return {
        input: { feedback },
        output: { choice: feedback ? 'repeat' : 'release' },
      };
    },
  });

  const cycle = asStitcher(
    genStitchCycle({
      slug: `${repeatee.slug}<🌀loop:feedback>`,
      readme: `@${repeatee.slug} -> @[caller]<feedback> -> { notes? repeat, none?: <release> }`,
      repeatee: asStitcher(route),
      decider: asStitcher(stepDecide),
      halter,
    }),
  );

  return cycle as any;
};
