import { asStitcherFlat, genStitchRoute, GStitcher, Threads } from 'rhachet';
import { RoleContext } from 'rhachet';
import { genStepImagineViaTemplate } from 'rhachet';
import { genTemplate } from 'rhachet';
import { getTemplateValFromArtifacts } from 'rhachet';
import { getTemplateVarsFromRoleInherit } from 'rhachet';
import { Artifact } from 'rhachet-artifact';
import { GitFile } from 'rhachet-artifact-git';

import { ContextOpenAI, sdkOpenAi } from '../../../../../data/sdk/sdkOpenAi';
import { genStepArtSet } from '../../../../artifact/genStepArtSet';
import { getMechanicBriefs } from '../../../mechanic/getMechanicBrief';
import { getEcologistBriefs } from '../../getEcologistBrief';

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
