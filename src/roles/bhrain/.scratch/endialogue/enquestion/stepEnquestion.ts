import {
  type GStitcher,
  genStepImagineViaTemplate,
  genTemplate,
  getTemplateValFromArtifacts,
  type RoleContext,
  type Threads,
} from 'rhachet';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import { withRetry, withTimeout } from 'wrapper-fns';

import { type ContextOpenAI, sdkOpenAi } from '@src/access/sdk/sdkOpenAi';
import { getEcologistBriefs } from '@src/roles/ecologist/getEcologistBrief';
import { getMechanicBriefs } from '@src/roles/mechanic/getMechanicBrief';

type StitcherDesired = GStitcher<
  Threads<{
    caller: RoleContext<
      'caller',
      {
        ask: string;
        art: {
          feedback: Artifact<typeof GitFile> | null;
        };
      }
    >;
    thinker: RoleContext<'thinker'>;
    summarizer: RoleContext<
      'summarizer',
      { art: { summary: Artifact<typeof GitFile> | null } }
    >;
  }>,
  ContextOpenAI & GStitcher['context'],
  { content: string }
>;

const template = genTemplate<StitcherDesired['threads']>({
  ref: { uri: __filename.replace('.ts', '.template.md') },
  getVariables: async ({ threads }) => ({
    intent: threads.caller.context.stash.ask, // todo: how to get distilled intent, from an artifact maybe?; also, claims?
    feedback:
      (await threads.caller.context.stash.art.feedback?.get())?.content ?? '',
    progress:
      // if summary exists, use it
      (await threads.summarizer.context.stash.art.summary?.get())?.content ??
      // otherwise, just use the full thread
      threads.thinker.stitches
        .filter((stitch) => stitch.stitcher?.form === 'IMAGINE')
        .map((stitch) => stitch.output.content)
        .join('\n\n\n--\n\n\n'),
    briefs: await getTemplateValFromArtifacts({
      artifacts: [
        ...getEcologistBriefs([
          // 'term.distillation.md',

          'distilisys/sys101.distilisys.grammar.md',
          'distilisys/sys201.actor.motive._.summary.md',
          'distilisys/sys201.actor.motive.p5.motive.grammar.md',
          'ecology/eco001.overview.md',
          'economy/econ001.overview.md',
        ]),
        ...getMechanicBriefs([
          'architecture/ubiqlang.md',
          'style.names.treestruct.md',
        ]),
      ],
    }),
  }),
});

const stepImagine = genStepImagineViaTemplate<StitcherDesired>({
  slug: '[thinker]<enquestion>',
  stitchee: 'thinker',
  readme: '',
  template,
  imagine: withRetry(
    withTimeout(sdkOpenAi.imagine, { threshold: { seconds: 30 } }),
  ),
});

export const stepEnquestion = stepImagine;
