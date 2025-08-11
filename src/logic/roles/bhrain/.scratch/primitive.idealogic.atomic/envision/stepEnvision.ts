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

import { ContextOpenAI, sdkOpenAi } from '../../../../../data/sdk/sdkOpenAi';
import { genLoopFeedback } from '../../../../artifact/genLoopFeedback';
import { genStepArtSet } from '../../../../artifact/genStepArtSet';
import { getEcologistBriefs } from '../../../ecologist/getEcologistBrief';
import { getMechanicBriefs } from '../../../mechanic/getMechanicBrief';

type StitcherDesired = GStitcher<
  Threads<{
    caller: RoleContext<
      'caller',
      {
        art: {
          motive: Artifact<typeof GitFile> | null;
          feedback: Artifact<typeof GitFile>;
        };
      }
    >;
    thinker: RoleContext<
      'thinker',
      {
        art: {
          inflight: Artifact<typeof GitFile>;
          upstream: Artifact<typeof GitFile>;
          structure: Artifact<typeof GitFile>;
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
      (await threads.thinker.context.stash.art.upstream.get())?.content ||
      UnexpectedCodePathError.throw('upstream not defined'),
    structure:
      (await threads.thinker.context.stash.art.structure.get())?.content || '',
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
  slug: '@[thinker]<envision>',
  stitchee: 'thinker',
  readme: '',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepPersist = genStepArtSet({
  stitchee: 'thinker',
  artee: 'inflight',
});

export const stepEnvision = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '@[thinker]<envision>',
    readme: '@[thinker]<envision> -> [[idea]]',
    sequence: [stepImagine, stepPersist],
  }),
);

export const loopEnvision = genLoopFeedback({
  stitchee: 'thinker',
  artee: 'inflight',
  repeatee: stepEnvision,
});
