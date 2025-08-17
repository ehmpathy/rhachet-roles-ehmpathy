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

import { Focus } from '../../../../_topublish/rhachet-roles-bhrain/src/domain/objects/Focus';
import { ContextOpenAI, sdkOpenAi } from '../../../../data/sdk/sdkOpenAi';
import { genLoopFeedback } from '../../../artifact/genLoopFeedback';
import { genStepArtSet } from '../../../artifact/genStepArtSet';
import { getBhrainBriefs } from '../getBhrainBrief';

// exported so that we can pass them through to <ponder> too
export const BRIEFS_FOR_DIVERGE = getBhrainBriefs([
  'trait.ocd.md',
  'cognition/cog401.questions.._.md',
  'cognition/cog000.overview.and.premise.md',
  'cognition/cog101.concept.treestruct._.md',
  'cognition/cog201.cortal.focus.p1.definition.md',
  'cognition/cog301.traversal.1.motion.primitives._.md',
  'cognition/cog401.questions.._.md',
  'cognition/cog401.questions.2.1.primitives.rough._.md',
  'librarian.tactics/<articulate>._.[article].frame.cognitive.md', // todo: keep or remove
  'librarian.tactics/<articulate>._.[article].frame.tactical.md',
  'cognition/cog201.cortal.focus.p2.breadth.md',
  'cognition/cog301.traversal.1.motion.primitives.breadth.md',
  'cognition/cog301.traversal.1.motion.primitives.breadth.vary.md',
  'thinker.tactics/<diverge>._.[article].frame.tactical.md',
  'librarian.tactics/[brief].verbiage.outline.over.narrative.md',
]);

type StitcherDesired = GStitcher<
  Threads<{
    caller: RoleContext<
      'caller',
      {
        ask: string;
        art: {
          feedback: Artifact<typeof GitFile>;
          'foci.goal.concept': Focus['concept'];
          'foci.goal.context': Focus['context'];
        };
        refs: Artifact<typeof GitFile>[];
      }
    >;
    thinker: RoleContext<
      'thinker',
      {
        art: {
          'focus.concept': Focus['concept'];
          'focus.context': Focus['context'];
        };
        briefs: Artifact<typeof GitFile>[];
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

    guide: {
      goal:
        (await threads.caller.context.stash.art['foci.goal.concept'].get())
          ?.content ||
        UnexpectedCodePathError.throw('goal not declared', {
          art: threads.caller.context.stash.art['foci.goal.concept'],
        }),
      feedback:
        (await threads.caller.context.stash.art.feedback.get())?.content || '',
    },

    focus: {
      context:
        (await threads.thinker.context.stash.art['focus.context'].get())
          ?.content ||
        (await threads.caller.context.stash.art['foci.goal.context'].get()) // fallback to @[caller].focus[goal].context
          ?.content ||
        '',
      concept:
        (await threads.thinker.context.stash.art['focus.concept'].get())
          ?.content || '',
    },

    // todo: clarify to callers that foci.goal.concept is used as the [seed][question]; todo: distinguish guide.goal as focus.supergoal, seed.question as subgoal focus
    seed: {
      question:
        (await threads.caller.context.stash.art['foci.goal.concept'].get())
          ?.content ||
        UnexpectedCodePathError.throw('goal not declared', {
          art: threads.caller.context.stash.art['foci.goal.concept'],
        }),
    },

    skill: {
      briefs: await getTemplateValFromArtifacts({
        artifacts: [
          ...BRIEFS_FOR_DIVERGE,
          ...threads.thinker.context.stash.briefs,
        ],
      }),
    },

    references: await getTemplateValFromArtifacts({
      artifacts: threads.caller.context.stash.refs,
    }),
  }),
});

const stepImagine = genStepImagineViaTemplate<StitcherDesired>({
  slug: '@[thinker]<diverge>',
  stitchee: 'thinker',
  readme: '',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepPersist = genStepArtSet({
  stitchee: 'thinker',
  artee: 'focus.concept',
});

export const stepDiverge = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '@[thinker]<diverge>',
    readme: '@[thinker]<diverge> -> [article]',
    sequence: [stepImagine, stepPersist],
  }),
);

export const loopDiverge = genLoopFeedback({
  stitchee: 'thinker',
  artee: 'focus.concept',
  repeatee: stepDiverge,
});
