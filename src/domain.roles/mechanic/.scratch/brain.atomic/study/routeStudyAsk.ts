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

import { type ContextOpenAI, sdkOpenAi } from '@src/access/sdk/sdkOpenAi';
import { genStepArtSet } from '@src/domain.operations/artifact/genStepArtSet';

type StitcherDesired = GStitcher<
  Threads<{
    student: RoleContext<
      'student',
      {
        ask: string;
        art: { claims: Artifact<typeof GitFile> };
        scene: { coderefs: Artifact<typeof GitFile>[] };
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
    scene: await getTemplateValFromArtifacts({
      artifacts: threads.student.context.stash.scene.coderefs,
    }),
  }),
});

const stepStudyAskImagine = genStepImagineViaTemplate<StitcherDesired>({
  slug: '[student]<study>[ask]<imagine>',
  stitchee: 'student' as const,
  readme: 'intent(imagines a codediff)',
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
