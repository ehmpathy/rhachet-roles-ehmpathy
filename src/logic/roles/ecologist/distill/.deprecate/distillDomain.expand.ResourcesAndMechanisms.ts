import { asStitcherFlat, genStitchRoute, GStitcher, Threads } from 'rhachet';

import { GitFile } from '../../../../../__nonpublished_modules__/rhachet-artifact-git/src/domain/GitFile';
import { Artifact } from '../../../../../__nonpublished_modules__/rhachet/src/domain/Artifact';
import { RoleContext } from '../../../../../__nonpublished_modules__/rhachet/src/domain/RoleContext';
import { genStepImagineViaTemplate } from '../../../../../__nonpublished_modules__/rhachet/src/logic/template/genStepImagineViaTemplate';
import { genTemplate } from '../../../../../__nonpublished_modules__/rhachet/src/logic/template/genTemplate';
import { getTemplateValFromArtifacts } from '../../../../../__nonpublished_modules__/rhachet/src/logic/template/getTemplateValFromArtifacts';
import { getTemplateVarsFromRoleInherit } from '../../../../../__nonpublished_modules__/rhachet/src/logic/template/getTemplateVarsFromInheritance';
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
            'architecture/domain-driven-design.md',
          ]),
          ...getEcologistBriefs([
            'distilisys.md',
            'distill.refine.terms.ubiqlang.md',
            'analysis.behavior-reveals-system.md',
            'core.term.price.v2.md',
            // 'eco001.overview.md',
            'eco101.core-system-understanding.md',
            'eco505.systems-thinking.md',
            // 'econ001.overview.md',
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
    inflight: (
      await threads.student.context.stash.art.distilledResourcesAndMechanisms
        .get()
        .expect('isPresent')
    ).content,
  }),
});

const stepStudyAskExpand = genStepImagineViaTemplate<StitcherDesired>({
  slug: '[student]<distill>[domain][resources+mechanisms]<expand>',
  stitchee: 'student',
  readme: 'intent(expand on the imagined resources and mechanisms of a domain)',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepArtSet = genStepArtSet({
  stitchee: 'student',
  artee: 'distilledResourcesAndMechanisms',
});

export const distillDomainExpandResourcesAndMechanisms =
  asStitcherFlat<StitcherDesired>(
    genStitchRoute({
      slug: '[student]<distill>[domain][resources+mechanisms]<expand>',
      readme:
        '@[student]<distill>[domain][resources+mechanisms]<expand> -> [[domain.claims]]s',
      sequence: [stepStudyAskExpand, stepArtSet],
    }),
  );
