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

import { type ContextOpenAI, sdkOpenAi } from '@src/logic/data/sdk/sdkOpenAi';
import { genStepArtSet } from '@src/logic/roles/artifact/genStepArtSet';
import { getEcologistBriefs } from '@src/logic/roles/ecologist/.scratch/getEcologistBrief';
import { getMechanicBriefs } from '@src/logic/roles/ecologist/mechanic/getMechanicBrief';

type StitcherDesired = GStitcher<
  Threads<{
    student: RoleContext<
      'student',
      {
        ask: string;
        art: {
          distilledActorsAndActions: Artifact<typeof GitFile>;
          // domainTerms: Artifact<typeof GitFile> | null;
          // domainBounds: Artifact<typeof GitFile> | null;
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
    ...(await getTemplateVarsFromRoleInherit({ thread: threads.student })),
    ask: threads.student.context.stash.ask,
    ecologist: {
      briefs: await getTemplateValFromArtifacts({
        artifacts: [
          ...getMechanicBriefs([
            'architecture/ubiqlang.md',
            'style.names.treestruct.md',
          ]),
          ...getEcologistBriefs([
            'distilisys.md',
            'distilisys.usecases.v2.md',
            'analysis.behavior-reveals-system.md',
            'core.term.price.v2.md',
            'eco001.overview.md',
            'eco101.core-system-understanding.md', // todo: do we need to expand into the p1-p4?
            'eco505.systems-thinking.md',
            'econ001.overview.md',
            'econ101.core-mechanics.md',
            'econ501.p1.game-theory.md',
            'econ501.p4.behavioral-economics.md',
          ]),
        ],
      }),
    },
    domain: {
      // terms:
      //   (
      //     await threads.student.context.stash.art.domainTerms
      //       ?.get()
      //       .expect('isPresent')
      //   )?.content ?? 'none relevant',
      // bounds:
      //   (
      //     await threads.student.context.stash.art.domainBounds
      //       ?.get()
      //       .expect('isPresent')
      //   )?.content ?? 'none relevant',
    },
  }),
});

const stepStudyAskImagine = genStepImagineViaTemplate<StitcherDesired>({
  slug: '[student]<distill>[domain][actors+actions]<imagine>',
  stitchee: 'student',
  readme: 'intent(distill the actors and actions of a domain)',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepArtSet = genStepArtSet({
  stitchee: 'student',
  artee: 'distilledActorsAndActions',
});

export const distillDomainActorsAndActions = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '[student]<distill>[domain][actors+actions]',
    readme: '@[student]<distill>[domain][actors+drivers] -> [[domain.claims]]s',
    sequence: [stepStudyAskImagine, stepArtSet],
  }),
);
