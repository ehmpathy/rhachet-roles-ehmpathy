import { asStitcherFlat, genStitchRoute, GStitcher, Threads } from 'rhachet';

import { GitFile } from '../../../../__nonpublished_modules__/rhachet-artifact-git/src/domain/GitFile';
import { Artifact } from '../../../../__nonpublished_modules__/rhachet/src/domain/Artifact';
import { RoleContext } from '../../../../__nonpublished_modules__/rhachet/src/domain/RoleContext';
import { genStepImagineViaTemplate } from '../../../../__nonpublished_modules__/rhachet/src/logic/template/genStepImagineViaTemplate';
import { genTemplate } from '../../../../__nonpublished_modules__/rhachet/src/logic/template/genTemplate';
import { getTemplateValFromArtifacts } from '../../../../__nonpublished_modules__/rhachet/src/logic/template/getTemplateValFromArtifacts';
import { getTemplateVarsFromRoleInherit } from '../../../../__nonpublished_modules__/rhachet/src/logic/template/getTemplateVarsFromInheritance';
import { ContextOpenAI, sdkOpenAi } from '../../../../data/sdk/sdkOpenAi';
import { genStepArtSet } from '../../../artifact/genStepArtSet';
import { getEcologistBriefs } from '../getEcologistBrief';

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
        artifacts: getEcologistBriefs([
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
