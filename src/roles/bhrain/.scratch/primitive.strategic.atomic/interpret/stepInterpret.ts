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
} from '@src/domain.operations/access/sdk/sdkOpenAi';
import { genLoopFeedback } from '@src/roles/artifact/genLoopFeedback';
import { genStepArtSet } from '@src/roles/artifact/genStepArtSet';
import { getBhrainBriefs } from '@src/roles/bhrain/.scratch/getBhrainBrief';
import { getEcologistBriefs } from '@src/roles/bhrain/ecologist/getEcologistBrief';
import { getMechanicBriefs } from '@src/roles/bhrain/mechanic/getMechanicBrief';

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
    grammar: await getTemplateValFromArtifacts({
      artifacts: getBhrainBriefs(['distilisys.grammar.compressed.md']),
    }),
  }),
});

const stepImagine = genStepImagineViaTemplate<StitcherDesired>({
  slug: '[thinker]<interpret>',
  stitchee: 'thinker',
  readme: '',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepPersist = genStepArtSet({
  stitchee: 'thinker',
  artee: 'inflight',
});

export const stepInterpret = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '@[thinker]<interpret>',
    readme: '@[thinker]<interpret> -> [[intent], [goal], [motive]]',
    sequence: [stepImagine, stepPersist],
  }),
);

export const loopInterpret = genLoopFeedback({
  stitchee: 'thinker',
  artee: 'inflight',
  repeatee: stepInterpret,
});
