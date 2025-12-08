import { UnexpectedCodePathError } from 'helpful-errors';
import {
  asStitcherFlat,
  type GStitcher,
  genStepImagineViaTemplate,
  genStitchRoute,
  genTemplate,
  getTemplatePathByCallerPath,
  getTemplateValFromArtifacts,
  getTemplateVarsFromRoleInherit,
  type RoleContext,
  type Threads,
} from 'rhachet';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import { withRetry, withTimeout } from 'wrapper-fns';

import type { Focus } from '../../../../_topublish/rhachet-roles-bhrain/src/domain/objects/Focus';
import { type ContextOpenAI, sdkOpenAi } from '../../../../data/sdk/sdkOpenAi';
import { genLoopFeedback } from '../../../artifact/genLoopFeedback';
import { genStepArtSet } from '../../../artifact/genStepArtSet';
import { getBhrainBriefs } from '../getBhrainBrief';

// exported so that we can pass them through to <ponder> too
export const BRIEFS_FOR_ARTICULATE = getBhrainBriefs([
  'trait.ocd.md',
  'cognition/cog401.questions.._.md',
  'cognition/cog000.overview.and.premise.md',
  'cognition/cog101.concept.treestruct._.md',
  'cognition/cog201.cortal.focus.p1.definition.md',
  'cognition/cog301.traversal.1.motion.primitives._.md',
  'cognition/cog401.questions.._.md',
  'cognition/cog401.questions.2.1.primitives.rough._.md',
  'cognition/cog201.cortal.focus.p2.acuity.md',
  'cognition/cog301.traversal.1.motion.primitives.acuity.md',
  //
  'knowledge/kno201.documents.articles.[article].md',
  'knowledge/kno301.doc.enbrief.2.articulate.[article].md',
  'knowledge/kno301.doc.enbrief.2.articulate.[lesson].md',
  //
  'librarian.tactics/[brief].verbiage.outline.over.narrative.md',
  'librarian.tactics/<articulate>._.[article].frame.cognitive.md',
  'librarian.tactics/<articulate>._.[article].frame.tactical.md',
  'librarian.tactics/<articulate>.tactic.[catalog].md',
  'librarian.tactics/<articulate>.tactic.concept_dimension.examples.[article][seed].md',
  'librarian.tactics/<articulate>.tactic.concept_dimension.invariants.[article].md',
  'librarian.tactics/<articulate>.tactic.from.examples.md',
  'librarian.tactics/<articulate>.tactic.from.seed.md',
  'librarian.tactics/<articulate>.tactic.with.templates.[article].md',
  'librarian.tactics/<articulate>.tone.bluecollar.[article][seed].md', // todo: review this
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
          templates: Artifact<typeof GitFile>[];
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
  ref: { uri: getTemplatePathByCallerPath({ auto: true }) },
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

    templates: await getTemplateValFromArtifacts({
      artifacts: [...threads.caller.context.stash.art.templates],
    }),

    skill: {
      briefs: await getTemplateValFromArtifacts({
        artifacts: [
          ...BRIEFS_FOR_ARTICULATE,
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
  slug: '@[thinker]<articulate>',
  stitchee: 'thinker',
  readme: '',
  template,
  imagine: withRetry(
    withTimeout(sdkOpenAi.imagine, { threshold: { seconds: 60 } }), // allow up to 60 sec, for longer files
  ),
});

const stepPersist = genStepArtSet({
  stitchee: 'thinker',
  artee: 'focus.concept',
});

export const stepArticulate = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '@[thinker]<articulate>',
    readme: '@[thinker]<articulate> -> [article]',
    sequence: [stepImagine, stepPersist],
  }),
);

export const loopArticulate = genLoopFeedback({
  stitchee: 'thinker',
  artee: 'focus.concept',
  repeatee: stepArticulate,
});
