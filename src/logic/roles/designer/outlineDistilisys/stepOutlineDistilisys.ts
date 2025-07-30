import {
  asStitcherFlat,
  genStepImagineViaTemplate,
  genStitchRoute,
  genTemplate,
  getTemplateValFromArtifacts,
  getTemplateVarsFromRoleInherit,
  GStitcher,
  RoleContext,
  Threads,
} from 'rhachet';
import { Artifact } from 'rhachet-artifact';
import { GitFile } from 'rhachet-artifact-git';

import { ContextOpenAI, sdkOpenAi } from '../../../../data/sdk/sdkOpenAi';
import { genStepArtSet } from '../../../artifact/genStepArtSet';
import { getEcologistBriefs } from '../../ecologist/getEcologistBrief';
import { getMechanicBriefs } from '../../mechanic/getMechanicBrief';
import { getDesignerBriefs } from '../getDesignerBrief';

type StitcherDesired = GStitcher<
  Threads<{
    designer: RoleContext<
      'designer',
      {
        art: {
          roadmap: Artifact<typeof GitFile>;
          distilisys: Artifact<typeof GitFile>;
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
    ask: threads.caller.context.stash.ask,
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
    brief: {
      distilisys: await getTemplateValFromArtifacts({
        artifacts: [
          ...getEcologistBriefs(['distilisys/sys101.distilisys.grammar.md']),
        ],
      }),
    },
    feedback:
      (await threads.caller.context.stash.art.feedback.get())?.content ?? '',
    inflight:
      (await threads.designer.context.stash.art.distilisys.get())?.content ??
      '',
    roadmap:
      (await threads.designer.context.stash.art.roadmap.get())?.content ?? '',
  }),
});

const stepImagine = genStepImagineViaTemplate<StitcherDesired>({
  slug: '[designer]<outline>[distilisys]<imagine>',
  stitchee: 'designer',
  readme: 'intent(design an outline.distilisys for the ask)',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepArtSet = genStepArtSet({
  stitchee: 'designer',
  artee: 'distilisys',
});

export const stepOutlineDistilisys = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '[designer]<outline>[distilisys]',
    readme: '@[designer]<outline>[distilisys] -> [distilisys]',
    sequence: [stepImagine, stepArtSet],
  }),
);
