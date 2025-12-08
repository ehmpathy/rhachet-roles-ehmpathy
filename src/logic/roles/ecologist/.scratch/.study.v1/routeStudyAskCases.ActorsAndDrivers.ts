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

import { type ContextOpenAI, sdkOpenAi } from '../../../../data/sdk/sdkOpenAi';
import { genStepArtSet } from '../../../artifact/genStepArtSet';
import { getMechanicBriefs } from '../../mechanic/getMechanicBrief';
import { getEcologistBriefs } from '../getEcologistBrief';

type StitcherDesired = GStitcher<
  Threads<{
    student: RoleContext<
      'student',
      {
        ask: string;
        art: {
          casesOfActorsAndDrivers: Artifact<typeof GitFile>;
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
  ref: { uri: __dirname + '/routeStudyAskCases.ActorsAndDrivers.template.md' },
  getVariables: async ({ threads }) => ({
    ...(await getTemplateVarsFromRoleInherit({ thread: threads.student })),
    ask: threads.student.context.stash.ask,
    architecture: {
      skills: await getTemplateValFromArtifacts({
        artifacts: getEcologistBriefs([
          'distilisys.md',
          'distilisys.usecases.2.md', // v2 is better
        ]),
      }),
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
  slug: '[student]<study>[ask][cases][actors+drivers]<imagine>',
  stitchee: 'student' as const,
  readme: 'intent(study the ask into usecase examples)',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepArtSet = genStepArtSet({
  stitchee: 'student',
  artee: 'casesOfActorsAndDrivers',
});

export const routeStudyAskCasesActorsAndDrivers =
  asStitcherFlat<StitcherDesired>(
    genStitchRoute({
      slug: '[student]<study>[ask][cases][actors+drivers]',
      readme: '@[student]<study>[ask][cases][actors+drivers] -> [[claim]]s',
      sequence: [stepStudyAskImagine, stepArtSet],
    }),
  );
