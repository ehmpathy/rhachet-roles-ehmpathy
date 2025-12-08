import {
  asStitcher,
  asStitcherFlat,
  type GStitcher,
  genStitchCycle,
  genStitchRoute,
  type RoleContext,
  StitchStepCompute,
  type Threads,
} from 'rhachet';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';

import type { ContextOpenAI } from '../../../../data/sdk/sdkOpenAi';
import { genStepGrabCallerFeedbackToArtifact } from '../../../artifact/genStepGrabCallerFeedbackToArtifact';
import { stepOutlineDistilisys } from './stepOutlineDistilisys';

type StitcherDesired = GStitcher<
  Threads<{
    designer: RoleContext<
      'designer',
      {
        art: {
          roadmap: Artifact<typeof GitFile>;
          distilisys: Artifact<typeof GitFile>;
        };
      }
    >;
    caller: RoleContext<
      'caller',
      {
        ask: string;
        art: {
          feedback: Artifact<typeof GitFile>;
        };
      }
    >;
  }>,
  ContextOpenAI & GStitcher['context'],
  { content: string }
>;

/**
 * .what = await feedback
 */
const stepGetFeedback = genStepGrabCallerFeedbackToArtifact({
  stitchee: 'designer',
  artee: 'distilisys',
});

/**
 * .what = iteration of imagine + feedback
 */
const routeImagineThenFeedback = asStitcher(
  genStitchRoute({
    slug: '[designer]<outline>[distilisys]<iterate>-><feedback>',
    readme: '@[designer]<outline>[distilisys] then @[caller]<feedback>',
    sequence: [stepOutlineDistilisys, stepGetFeedback],
  }),
);

/**
 * .what = looks at feedback artifact to decide whether to repeat or halt
 */
const stepDecideHasNotes = new StitchStepCompute<
  GStitcher<
    StitcherDesired['threads'],
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
 * .what = loop until caller confirms no more notes
 * todo: generalize this loop wrapper onto any stitcher
 */
export const loopOutlineDistilisys = asStitcherFlat<StitcherDesired>(
  genStitchCycle({
    slug: '[designer]<outline>[distilisys]<🌀loop>',
    readme:
      '@[designer]<outline> -> @[caller]<feedback> -> { notes? repeat, none?: <release>[distilisys] }',
    repeatee: routeImagineThenFeedback,
    decider: stepDecideHasNotes,
    halter: {
      threshold: {
        repetitions: 10,
      },
    },
  }),
);
