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

import { type ContextOpenAI, sdkOpenAi } from '@src/data/sdk/sdkOpenAi';
import { genStepArtSet } from '@src/logic/artifact/genStepArtSet';
import { getDesignerBriefs } from '@src/roles/designer/getDesignerBrief';
import { getEcologistBriefs } from '@src/roles/ecologist/getEcologistBrief';
import { getMechanicBriefs } from '@src/roles/mechanic/getMechanicBrief';

type StitcherDesired = GStitcher<
  Threads<{
    designer: RoleContext<
      'designer',
      {
        ask: string;
        art: {
          roadmap: Artifact<typeof GitFile>;
        };
      }
    >;
    caller: RoleContext<
      'caller',
      {
        ask: string;
        art: {
          feedback: Artifact<typeof GitFile>;
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
    ...(await getTemplateVarsFromRoleInherit({ thread: threads.designer })),
    ask: threads.designer.context.stash.ask,
    briefs: await getTemplateValFromArtifacts({
      artifacts: [
        // cool to see explicit "cross-train" scenes
        ...getEcologistBriefs(['distilisys/sys101.distilisys.grammar.md']),
        ...getDesignerBriefs(['declarative-over-imperative.md']),
        ...getMechanicBriefs([
          'architecture/ubiqlang.md',
          'style.names.treestruct.md',
          'architecture/directional-dependencies.md',
          'architecture/bounded-contexts.md',
        ]),
      ],
    }),
    feedback:
      (await threads.caller.context.stash.art.feedback.get())?.content ?? '',
    inflight:
      (await threads.designer.context.stash.art.roadmap.get())?.content ?? '',
  }),
});

const stepImagine = genStepImagineViaTemplate<StitcherDesired>({
  slug: '[designer]<outline>[roadmap]<imagine>',
  stitchee: 'designer',
  readme: 'intent(design an outline.roadmap for the ask)',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepArtSet = genStepArtSet({
  stitchee: 'designer',
  artee: 'roadmap',
});

export const stepOutlineRoadmap = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '[designer]<outline>[roadmap]',
    readme: '@[designer]<outline>[roadmap] -> [roadmap]',
    sequence: [stepImagine, stepArtSet],
  }),
);
