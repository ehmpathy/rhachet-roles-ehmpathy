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
import { getMechanicBriefs } from '../../mechanic/getMechanicBrief';

type StitcherDesired = GStitcher<
  Threads<{
    student: RoleContext<
      'student',
      {
        ask: string;
        art: {
          claims: Artifact<typeof GitFile>;
          domainTerms: Artifact<typeof GitFile> | null;
          domainBounds: Artifact<typeof GitFile> | null;
        };
      }
    >;
  }>,
  ContextOpenAI & GStitcher['context'],
  { content: string }
>;

const template = genTemplate<StitcherDesired['threads']>({
  ref: { uri: __dirname + '/routeStudyAsk.template.md' },
  getVariables: async ({ threads }) => ({
    ...(await getTemplateVarsFromRoleInherit({ thread: threads.student })),
    ask: threads.student.context.stash.ask,
    architecture: {
      rules: await getTemplateValFromArtifacts({
        artifacts: getMechanicBriefs([
          'architecture/ubiqlang.md',
          'architecture/domain-driven-design.md',
          'architecture/bounded-contexts.md',
          'architecture/directional-dependencies.md',
        ]),
      }),
      domain: {
        terms:
          (
            await threads.student.context.stash.art.domainTerms
              ?.get()
              .expect('isPresent')
          )?.content ?? 'none relevant',
        bounds:
          (
            await threads.student.context.stash.art.domainBounds
              ?.get()
              .expect('isPresent')
          )?.content ?? 'none relevant',
      },
    },
  }),
});

const stepStudyAskImagine = genStepImagineViaTemplate<StitcherDesired>({
  slug: '[student]<study>[ask]<imagine>',
  stitchee: 'student' as const,
  readme: 'intent(study the ask into claims)',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepArtSet = genStepArtSet({ stitchee: 'student', artee: 'claims' });

export const routeStudyAsk = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '[student]<study>[ask]',
    readme: '@[student]<study>[ask] -> [[claim]]s',
    sequence: [stepStudyAskImagine, stepArtSet],
  }),
);
