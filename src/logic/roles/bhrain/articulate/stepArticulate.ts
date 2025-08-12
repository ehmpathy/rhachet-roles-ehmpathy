import { UnexpectedCodePathError } from 'helpful-errors';
import {
  asStitcherFlat,
  genStitchRoute,
  GStitcher,
  Threads,
  RoleContext,
  genStepImagineViaTemplate,
  genTemplate,
  getTemplateVarsFromRoleInherit,
  getTemplateValFromArtifacts,
} from 'rhachet';
import { Artifact } from 'rhachet-artifact';
import { GitFile } from 'rhachet-artifact-git';

import { ContextOpenAI, sdkOpenAi } from '../../../../data/sdk/sdkOpenAi';
import { genLoopFeedback } from '../../../artifact/genLoopFeedback';
import { genStepArtSet } from '../../../artifact/genStepArtSet';
import { getBhrainBriefs } from '../getBhrainBrief';

type StitcherDesired = GStitcher<
  Threads<{
    caller: RoleContext<
      'caller',
      {
        art: {
          goal: Artifact<typeof GitFile>;
          feedback: Artifact<typeof GitFile>;
        };
        refs: Artifact<typeof GitFile>[];
      }
    >;
    thinker: RoleContext<
      'thinker',
      {
        art: {
          // where we start from; uses the [focus] structure for representation
          'focus.context': Artifact<typeof GitFile>; // the context inflight
          'focus.concept': Artifact<typeof GitFile>; // the concept inflight

          // how we'll traverse; use's the <ponder> structure for question assembly
          'ponder.context': Artifact<typeof GitFile>; // the questions to contextualize with
          'ponder.concept': Artifact<typeof GitFile>; // the questions to conceptualize with
        };
      }
    >;
  }>,
  ContextOpenAI & GStitcher['context'],
  { content: string }
>;

const template = genTemplate<StitcherDesired['threads']>({
  ref: { uri: __filename.replace('.ts', '.template.md') },
  getVariables: async ({ threads }) => ({
    ...(await getTemplateVarsFromRoleInherit({ thread: threads.thinker })),

    // the guidance provided
    guide: {
      goal:
        (await threads.caller.context.stash.art.goal.get())?.content ||
        UnexpectedCodePathError.throw('goal not declared', {
          art: threads.caller.context.stash.art.goal,
        }),
      feedback:
        (await threads.caller.context.stash.art.feedback.get())?.content || '',
    },

    // the focus present
    focus: {
      context:
        (await threads.thinker.context.stash.art['focus.context'].get())
          ?.content || '',
      concept:
        (await threads.thinker.context.stash.art['focus.concept'].get())
          ?.content || '',
    },

    // the ponder plugins to leverage
    ponder: {
      contextualize:
        (await threads.thinker.context.stash.art['ponder.context'].get())
          ?.content || '',
      conceptualize:
        (await threads.thinker.context.stash.art['ponder.concept'].get())
          ?.content || '',
    },

    // the briefs to frame perspective
    skill: {
      briefs: await getTemplateValFromArtifacts({
        artifacts: [
          ...getBhrainBriefs([
            'trait.ocd.md',
            'cognition/cog401.questions.._.md',
            'cognition/cog000.overview.and.premise.md',
            'cognition/cog101.concept.treestruct._.md',
            'cognition/cog201.cortal.focus.p1.definition.md',
            'cognition/cog301.traversal.1.motion.primitives._.md',
            'cognition/cog401.questions.._.md',
            'cognition/cog401.questions.2.1.primitives.rough._.md',
            'cognition/cog501.cortal.assemblylang.4.structure._.ponder.md',
            'cognition/cog501.cortal.assemblylang.4.structure.ponder.[article].usage.md',
            'thinker.tactics/<articulate>._.[article].md',
            'cognition/cog201.cortal.focus.p2.acuity.md',
            'cognition/cog301.traversal.1.motion.primitives.acuity.md',
            'thinker.preferences/[brief].verbiage.outline.over.narrative.md',
          ]),
        ],
      }),
    },

    // any possible references
    references: await getTemplateValFromArtifacts({
      artifacts: threads.caller.context.stash.refs,
    }),
  }),
});

const stepImagine = genStepImagineViaTemplate<StitcherDesired>({
  slug: '@[thinker]<articulate>',
  stitchee: 'thinker',
  readme: '',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepPersist = genStepArtSet({
  stitchee: 'thinker',
  artee: 'focus.concept', // the latest set of questions
});

export const stepArticulate = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '@[thinker]<articulate>',
    readme: '@[thinker]<articulate> -> [[question]]',
    sequence: [stepImagine, stepPersist],
  }),
);

export const loopArticulate = genLoopFeedback({
  stitchee: 'thinker',
  artee: 'focus.concept',
  repeatee: stepArticulate,
});
