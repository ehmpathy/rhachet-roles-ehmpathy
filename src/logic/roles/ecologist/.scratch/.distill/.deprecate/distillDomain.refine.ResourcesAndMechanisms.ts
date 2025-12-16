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
import { getMechanicBriefs } from '@src/logic/roles/ecologist/mechanic/getMechanicBrief';

type StitcherDesired = GStitcher<
  Threads<{
    student: RoleContext<
      'student',
      {
        ask: string;
        art: {
          distilledResourcesAndMechanisms: Artifact<typeof GitFile>;
          refinedResourcesAndMechanisms: Artifact<typeof GitFile>;
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
    mechanic: {
      nameBriefs: await getTemplateValFromArtifacts({
        artifacts: [
          ...getMechanicBriefs([
            'architecture/ubiqlang.md',
            'style.names.treestruct.md',
          ]),
        ],
      }),
    },
    // ecologist: {
    //   briefs: await getTemplateValFromArtifacts({
    //     artifacts: [
    //       ...getEcologistBriefs([
    //         'distill.refine.terms.ubiqlang.md',
    //         'distill.refine.terms.symmetry.md',
    //       ]),
    //       ...getMechanicBriefs([
    //         'architecture/ubiqlang.md',
    //         'architecture/domain-driven-design.md',
    //       ]),
    //     ],
    //   }),
    // },
    inflight: (
      await threads.student.context.stash.art.distilledResourcesAndMechanisms
        .get()
        .expect('isPresent')
    ).content,
  }),
});

const stepStudyAskRefine = genStepImagineViaTemplate<StitcherDesired>({
  slug: '[student]<distill>[domain][resources+mechanisms]<refine>',
  stitchee: 'student',
  readme: 'intent(refine the named resources and mechanisms of a domain)',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepArtSet = genStepArtSet({
  stitchee: 'student',
  artee: 'refinedResourcesAndMechanisms',
});

export const distillDomainRefineResourcesAndMechanisms =
  asStitcherFlat<StitcherDesired>(
    genStitchRoute({
      slug: '[student]<distill>[domain][resources+mechanisms]<refine>',
      readme:
        '@[student]<distill>[domain][resources+mechanisms]<refine> -> [[domain.claims]]s',
      sequence: [stepStudyAskRefine, stepArtSet],
    }),
  );
