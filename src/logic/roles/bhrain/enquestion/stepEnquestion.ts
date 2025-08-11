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
import { getEcologistBriefs } from '../../ecologist/getEcologistBrief';
import { getMechanicBriefs } from '../../mechanic/getMechanicBrief';

type StitcherDesired = GStitcher<
  Threads<{
    caller: RoleContext<
      'caller',
      {
        art: {
          goal: Artifact<typeof GitFile>;
          feedback: Artifact<typeof GitFile>;
        };
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
          'ponder.contextualize': Artifact<typeof GitFile>; // the questions to contextualize with
          'ponder.conceptualize': Artifact<typeof GitFile>; // the questions to conceptualize with
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
      concept:
        (await threads.thinker.context.stash.art['focus.concept'].get())
          ?.content || '',
      context:
        (await threads.thinker.context.stash.art['focus.context'].get())
          ?.content || '',
    },

    // the ponder plugins to leverage
    ponder: {
      conceptualize:
        (await threads.thinker.context.stash.art['focus.concept'].get())
          ?.content || '',
      contextualize:
        (await threads.thinker.context.stash.art['focus.context'].get())
          ?.content || '',
    },

    // the briefs to frame perspective
    briefs: await getTemplateValFromArtifacts({
      artifacts: [
        ...getMechanicBriefs([
          'architecture/ubiqlang.md',
          'style.names.treestruct.md',
        ]),
        ...getEcologistBriefs([
          'distilisys/sys101.distilisys.grammar.md',
          'distilisys/sys201.actor.motive._.summary.md',
          'distilisys/sys201.actor.motive.p5.motive.grammar.md',
          'ecology/eco001.overview.md',
          'economy/econ001.overview.md',
        ]),
      ],
    }),
  }),
});

const stepImagine = genStepImagineViaTemplate<StitcherDesired>({
  slug: '@[thinker]<enquestion>',
  stitchee: 'thinker',
  readme: '',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepPersist = genStepArtSet({
  stitchee: 'thinker',
  artee: 'focus.concept', // the latest set of questions
});

export const stepEnquestion = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '@[thinker]<enquestion>',
    readme: '@[thinker]<enquestion> -> [[question]]',
    sequence: [stepImagine, stepPersist],
  }),
);

export const loopEnquestion = genLoopFeedback({
  stitchee: 'thinker',
  artee: 'inflight',
  repeatee: stepEnquestion,
});
