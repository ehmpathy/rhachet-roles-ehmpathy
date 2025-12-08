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

import {
  type ContextOpenAI,
  sdkOpenAi,
} from '../../../../../data/sdk/sdkOpenAi';
import { genLoopFeedback } from '../../../../artifact/genLoopFeedback';
import { genStepArtSet } from '../../../../artifact/genStepArtSet';
import { getBhrainBriefs } from '../../getBhrainBrief';

type StitcherDesired = GStitcher<
  Threads<{
    caller: RoleContext<
      'caller',
      {
        ask: string;
        art: {
          'foci.goal.context': Artifact<typeof GitFile>;
          'foci.goal.concept': Artifact<typeof GitFile>;
          feedback: Artifact<typeof GitFile>;
        };
        refs: Artifact<typeof GitFile>[];
      }
    >;
    thinker: RoleContext<
      'thinker',
      {
        art: {
          'focus.context': Artifact<typeof GitFile>;
          'focus.concept': Artifact<typeof GitFile>;
          'foci.ponder.que.context': Artifact<typeof GitFile>;
          'foci.ponder.que.concept': Artifact<typeof GitFile>;
        };

        // any briefs that should be added for this usecase; enables extension of context
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

    // the guidance provided
    guide: {
      goal:
        (await threads.caller.context.stash.art['foci.goal.concept'].get())
          ?.content ||
        UnexpectedCodePathError.throw('goal context not declared', {
          art: threads.caller.context.stash.art['foci.goal.concept'],
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
        (
          await threads.thinker.context.stash.art[
            'foci.ponder.que.context'
          ].get()
        )?.content || '',
      conceptualize:
        (
          await threads.thinker.context.stash.art[
            'foci.ponder.que.concept'
          ].get()
        )?.content || '',
    },

    // the briefs to frame perspective
    skill: {
      briefs: await getTemplateValFromArtifacts({
        artifacts: [
          // generic briefs
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
            'librarian.tactics/[brief].verbiage.outline.over.narrative.md',
          ]),

          // applied briefs; enables composition in domain specific workflows
          ...threads.thinker.context.stash.briefs,
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
  slug: '@[thinker]<ponder>',
  stitchee: 'thinker',
  readme: '',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepPersist = genStepArtSet({
  stitchee: 'thinker',
  artee: 'focus.concept',
});

export const stepPonder = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '@[thinker]<ponder>',
    readme: '@[thinker]<ponder> -> [[concept]]',
    sequence: [stepImagine, stepPersist],
  }),
);

export const loopPonder = genLoopFeedback({
  stitchee: 'thinker',
  artee: 'focus.concept',
  repeatee: stepPonder,
});
