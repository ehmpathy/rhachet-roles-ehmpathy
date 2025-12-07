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
import { stepOutlineRoadmap } from './stepOutlineRoadmap';

type StitcherDesired = GStitcher<
  Threads<{
    designer: RoleContext<
      'designer',
      {
        ask: string;
        art: {
          roadmap: Artifact<typeof GitFile>;
          // domainTerms: Artifact<typeof GitFile> | null;
          // domainBounds: Artifact<typeof GitFile> | null;
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
  artee: 'roadmap',
});

/**
 * .what = iteration of imagine + feedback
 */
const routeImagineThenFeedback = asStitcher(
  genStitchRoute({
    slug: '[designer]<outline>[roadmap]<iterate>-><feedback>',
    readme: '@[designer]<outline>[roadmap] then @[caller]<feedback>',
    sequence: [stepOutlineRoadmap, stepGetFeedback],
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
export const loopOutlineRoadmap = asStitcherFlat<StitcherDesired>(
  genStitchCycle({
    slug: '[designer]<outline>[roadmap]<🌀loop>',
    readme:
      '@[designer]<outline> -> @[caller]<feedback> -> { notes? repeat, none?: <release>[roadmap] }',
    repeatee: routeImagineThenFeedback,
    decider: stepDecideHasNotes,
    halter: {
      threshold: {
        repetitions: 10,
      },
    },
  }),
);
