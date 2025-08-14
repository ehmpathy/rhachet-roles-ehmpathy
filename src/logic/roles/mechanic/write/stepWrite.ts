import {
  asStitcherFlat,
  genStitchRoute,
  GStitcher,
  Threads,
  RoleContext,
  genStepImagineViaTemplate,
  genTemplate,
  getTemplateValFromArtifacts,
  getTemplateVarsFromRoleInherit,
} from 'rhachet';
import { Artifact } from 'rhachet-artifact';
import { GitFile } from 'rhachet-artifact-git';
import { withRetry, withTimeout } from 'wrapper-fns';

import { ContextOpenAI, sdkOpenAi } from '../../../../data/sdk/sdkOpenAi';
import { genStepArtSet } from '../../../artifact/genStepArtSet';
import { getEcologistBriefs } from '../../ecologist/getEcologistBrief';
import { getMechanicBriefs } from '../getMechanicBrief';

type StitcherDesired = GStitcher<
  Threads<{
    caller: RoleContext<
      'caller',
      {
        ask: string;
        art: {
          feedback: Artifact<typeof GitFile> | null;
          references: Artifact<typeof GitFile>[];
        };
      }
    >;
    mechanic: RoleContext<
      'mechanic',
      {
        art: {
          inflight: Artifact<typeof GitFile>;
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
    ...(await getTemplateVarsFromRoleInherit({ thread: threads.mechanic })),
    ask:
      (await threads.caller.context.stash.art.feedback?.get())?.content ||
      threads.caller.context.stash.ask,
    references: await getTemplateValFromArtifacts({
      artifacts: threads.caller.context.stash.art.references ?? [],
    }),
    briefs: await getTemplateValFromArtifacts({
      artifacts: [
        ...getMechanicBriefs([
          'architecture/ubiqlang.md',
          'style.names.treestruct.md',
          'codestyle/mech.what-why.v2.md',
        ]),
        ...getEcologistBriefs([
          'distilisys/sys101.distilisys.grammar.md',
          'distilisys/sys201.actor.motive._.summary.md',
        ]),
      ],
    }),
    inflight:
      (await threads.mechanic.context.stash.art.inflight.get())?.content ?? '',
  }),
});

const stepImagine = genStepImagineViaTemplate<StitcherDesired>({
  slug: '[mechanic]<write><imagine>',
  stitchee: 'mechanic',
  readme: '',
  template,
  imagine: withRetry(
    withTimeout(sdkOpenAi.imagine, { threshold: { seconds: 60 } }), // allow up to 60 sec, for longer files
  ),
});

const stepPersist = genStepArtSet({
  stitchee: 'mechanic',
  artee: 'inflight',
});

export const stepWrite = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '[mechanic]<write>',
    readme: '@[mechanic]<write> -> [inflight]',
    sequence: [stepImagine, stepPersist],
  }),
);
