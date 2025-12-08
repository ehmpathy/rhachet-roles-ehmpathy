import { UnexpectedCodePathError } from 'helpful-errors';
import {
  asStitcherFlat,
  type GStitcher,
  genStepImagineViaTemplate,
  genStitchRoute,
  genTemplate,
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
export const BRIEFS_FOR_DEMONSTRATE = getBhrainBriefs([
  'trait.ocd.md',
  'cognition/cog401.questions.._.md',
  'cognition/cog000.overview.and.premise.md',
  'cognition/cog101.concept.treestruct._.md',
  'cognition/cog201.cortal.focus.p1.definition.md',
  'cognition/cog301.traversal.1.motion.primitives._.md',
  'cognition/cog401.questions.._.md',
  'cognition/cog401.questions.2.1.primitives.rough._.md',
  'cognition/cog201.cortal.focus.p2.breadth.md',
  'cognition/cog301.traversal.1.motion.primitives.breadth.md',
  'cognition/cog301.traversal.1.motion.primitives.breadth.vary.md',
  'librarian.tactics/[brief].verbiage.outline.over.narrative.md',
  // 'librarian.tactics/<demonstrate>._.[article].frame.tactical.md',
  // 'librarian.tactics/<demonstrate>._.[article].frame.colloquial.md',
  // 'librarian.tactics/<demonstrate>.tactics.[catalog].md',
  'librarian.tactics/<demonstrate>._.[article].frame.colloquial.i2.by_grok.md',
  'librarian.tactics/<demonstrate>.variants.[catalog].md',
  // 'librarian.tactics/<demonstrate>.variants.contrast.[demo].usecase.vs_userjourney.by_chatgpt.md',
  'librarian.tactics/<demonstrate>.variants.example.[demo].tea.darjeeling.by_grok.md',
  'librarian.tactics/<demonstrate>.variants.counter.[demo].walkability.phoenix.by_chargpt.md',
  'librarian.tactics/<demonstrate>.variants.example.[demo].walkability.portland.by_chatgpt.i3.md',
  'librarian.tactics/<demonstrate>.variants.example.[demo].walkability.portland.by_grok.i2.md',
  'librarian.tactics/<demonstrate>.variants.example.structure.[article].i2.md',
  'librarian.tactics/<demonstrate>.variants.example.[lesson].howto.md',
]);

type StitcherDesired = GStitcher<
  Threads<{
    caller: RoleContext<
      'caller',
      {
        art: {
          feedback: Artifact<typeof GitFile>;
          'foci.goal.concept': Focus['concept'];
          'foci.goal.context': Focus['context'];
          'foci.input.concept': Focus['concept'];
          templates: Artifact<typeof GitFile>[]; // more of a librarian input ?
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

    seed: {
      concept:
        (await threads.caller.context.stash.art['foci.input.concept'].get())
          ?.content ||
        UnexpectedCodePathError.throw('input not declared', {
          art: threads.caller.context.stash.art['foci.input.concept'],
        }),
    },

    skill: {
      briefs: await getTemplateValFromArtifacts({
        artifacts: [
          ...BRIEFS_FOR_DEMONSTRATE,
          ...threads.thinker.context.stash.briefs,
        ],
      }),
    },

    references: await getTemplateValFromArtifacts({
      artifacts: threads.caller.context.stash.refs,
    }),

    templates: await getTemplateValFromArtifacts({
      artifacts: [...threads.caller.context.stash.art.templates],
    }),
  }),
});

const stepImagine = genStepImagineViaTemplate<StitcherDesired>({
  slug: '@[thinker]<demonstrate>',
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

export const stepDemonstrate = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '@[thinker]<demonstrate>',
    readme: '@[thinker]<demonstrate> -> [article]',
    sequence: [stepImagine, stepPersist],
  }),
);

export const loopDemonstrate = genLoopFeedback({
  stitchee: 'thinker',
  artee: 'focus.concept',
  repeatee: stepDemonstrate,
});
