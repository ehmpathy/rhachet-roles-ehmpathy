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
import { getEcologistBriefs } from '@src/roles/bhrain/ecologist/getEcologistBrief';
import { getMechanicBriefs } from '@src/roles/bhrain/mechanic/getMechanicBrief';

type StitcherDesired = GStitcher<
  Threads<{
    caller: RoleContext<
      'caller',
      {
        art: {
          motive: Artifact<typeof GitFile> | null;
          feedback: Artifact<typeof GitFile>; // required to facilitate loop
        };
      }
    >;
    thinker: RoleContext<
      'thinker',
      {
        art: {
          inflight: Artifact<typeof GitFile>;
          'upstream.collection': Artifact<typeof GitFile>;
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
    motive:
      (await threads.caller.context.stash.art.motive?.get())?.content || '',
    feedback:
      (await threads.caller.context.stash.art.feedback.get())?.content || '',
    purpose: threads.thinker.context.stash.purpose,
    grammar: threads.thinker.context.stash.grammar,
    inflight:
      (await threads.thinker.context.stash.art.inflight.get())?.content || '',
    upstream:
      (await threads.thinker.context.stash.art['upstream.collection'].get())
        ?.content || '',
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
  slug: '[thinker]<cluster>',
  stitchee: 'thinker',
  readme: '',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepPersist = genStepArtSet({
  stitchee: 'thinker',
  artee: 'inflight',
});

export const stepCluster = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '@[thinker]<cluster>',
    readme: '@[thinker]<cluster> -> [[idea]]',
    sequence: [stepImagine, stepPersist],
  }),
);

export const loopCluster = genLoopFeedback({
  stitchee: 'thinker',
  artee: 'inflight',
  repeatee: stepCluster,
});
