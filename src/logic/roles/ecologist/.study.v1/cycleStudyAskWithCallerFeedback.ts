import {
  asStitcher,
  genStitchCycle,
  genStitchRoute,
  StitchStepCompute,
  GStitcher,
  Threads,
  asStitcherFlat,
} from 'rhachet';

import { GitFile } from '../../../../__nonpublished_modules__/rhachet-artifact-git/src';
import { Artifact } from '../../../../__nonpublished_modules__/rhachet/src/domain/Artifact';
import { RoleContext } from '../../../../__nonpublished_modules__/rhachet/src/domain/RoleContext';
import { ContextOpenAI } from '../../../../data/sdk/sdkOpenAi';
import { routeStudyAsk } from './routeStudyAsk';
import { stepGrabCallerFeedbackToArtifact } from './stepGrabCallerFeedbackToArtifact';

interface ThreadsDesired
  extends Threads<{
    caller: RoleContext<
      'caller',
      {
        art: { feedback: Artifact<typeof GitFile> };
      }
    >;
    student: RoleContext<
      'student',
      {
        ask: string;
        art: { claims: Artifact<typeof GitFile> };
      }
    >;
  }> {}

export type CycleStudyAskWithCallerFeedbackStitcher = GStitcher<
  ThreadsDesired,
  GStitcher['context'] & ContextOpenAI,
  { feedback: GitFile | null }
>;

/**
 * .what = sequence of study -> feedback request
 */
const repeateeFeedbackRound = asStitcher(
  genStitchRoute({
    slug: '[caller]<feedback><round>',
    readme: '@[student]<study> then @[caller]<feedback>',
    sequence: [routeStudyAsk, stepGrabCallerFeedbackToArtifact],
  }),
);

/**
 * .what = looks at feedback artifact to decide whether to repeat or halt
 */
const stepDecideHasNotes = new StitchStepCompute<
  GStitcher<
    ThreadsDesired,
    GStitcher['context'],
    { choice: 'release' | 'repeat' | 'halt' }
  >
>({
  form: 'COMPUTE',
  slug: `[caller]<feedback><hasNotes?>`,
  stitchee: 'caller',
  readme: 'checks if the last feedback was null (no notes)',
  invoke: async ({ threads }) => {
    const feedback = await threads.caller.context.stash.art.feedback.get();
    return {
      input: { feedback },
      output: { choice: feedback ? 'repeat' : 'release' },
    };
  },
});

/**
 * .what = cycle of study + feedback, until caller confirms no more notes
 */
export const cycleStudyAskWithCallerFeedback =
  asStitcherFlat<CycleStudyAskWithCallerFeedbackStitcher>(
    genStitchCycle({
      slug: '[caller]<feedback><🌀loop>',
      readme:
        '@[student]<study> -> @[caller]<feedback> -> repeat if notes exist',
      repeatee: repeateeFeedbackRound,
      decider: stepDecideHasNotes,
      halter: {
        threshold: {
          repetitions: 10,
        },
      },
    }),
  );
