import {
  asStitcherFlat,
  genStitchRoute,
  GStitcher,
  RoleContext,
  Threads,
} from 'rhachet';
import { Artifact } from 'rhachet-artifact';
import { GitFile } from 'rhachet-artifact-git';

import { ContextOpenAI } from '../../../../../data/sdk/sdkOpenAi';
import { genLoopFeedback } from '../../../../artifact/genLoopFeedback';
import { genStepArtSet } from '../../../../artifact/genStepArtSet';
import { stepSummarize } from '../summarize/stepSummarize';
import { stepEnanswer } from './enanswer/stepEnanswer';
import { stepEnquestion } from './enquestion/stepEnquestion';

type StitcherDesired = GStitcher<
  Threads<{
    caller: RoleContext<
      'caller',
      {
        ask: string;
        art: { feedback: Artifact<typeof GitFile> };
      }
    >;
    thinker: RoleContext<
      'thinker',
      { art: { journal: Artifact<typeof GitFile> } }
    >;
    summarizer: RoleContext<
      'summarizer',
      { art: { summary: Artifact<typeof GitFile> } }
    >;
  }>,
  ContextOpenAI & GStitcher['context'],
  { content: string }
>;

export const stepEnjournal = genStepArtSet({
  stitchee: 'thinker',
  artee: 'journal',
  mode: 'append',
});

export const stepEndialogue = genStitchRoute({
  slug: '[thinker]<endialogue>',
  readme: '@[thinker]<enquestion> -> @[thinker]<enanswer>',
  sequence: [
    asStitcherFlat<StitcherDesired>(stepEnquestion),
    stepEnjournal,
    asStitcherFlat<StitcherDesired>(stepEnanswer),
    stepEnjournal,
    stepSummarize,
  ],
});

export const loopEndialogue = genLoopFeedback({
  stitchee: 'thinker',
  artee: 'journal',
  repeatee: stepEndialogue,
});
