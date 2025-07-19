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
        ask: string;
        art: {
          feedback: Artifact<typeof GitFile>; // required to facilitate loop
        };
      }
    >;
    thinker: RoleContext<
      'thinker',
      {
        art: {
          inflight: Artifact<typeof GitFile>;
        };
        purpose: string;
        grammar: string;
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
    ask:
      (await threads.caller.context.stash.art.feedback?.get())?.content ||
      threads.caller.context.stash.ask,
    motive: threads.caller.context.stash.ask, // motive pulled from caller stash.ask
    purpose: threads.thinker.context.stash.purpose,
    grammar: threads.thinker.context.stash.grammar,
    inflight:
      (await threads.thinker.context.stash.art.inflight.get())?.content || '',
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
  slug: '[thinker]<diverge>',
  stitchee: 'thinker',
  readme: '',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepPersist = genStepArtSet({
  stitchee: 'thinker',
  artee: 'inflight',
});

// todo: expand into separation of domain discovery vs vision discovery

export const stepDiverge = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '@[thinker]<diverge>',
    readme: '@[thinker]<diverge> -> [[idea]]',
    sequence: [stepImagine, stepPersist],
  }),
);

export const loopDiverge = genLoopFeedback({
  stitchee: 'thinker',
  artee: 'inflight',
  repeatee: stepDiverge,
});
