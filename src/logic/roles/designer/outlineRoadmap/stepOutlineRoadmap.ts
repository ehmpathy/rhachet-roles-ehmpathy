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
import { getEcologistBriefs } from '../../ecologist/getEcologistBrief';
import { getMechanicBriefs } from '../../mechanic/getMechanicBrief';

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
        ...getEcologistBriefs(['distilisys.md']),
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
