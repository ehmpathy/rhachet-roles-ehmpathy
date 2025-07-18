import {
  GStitcher,
  Threads,
  RoleContext,
  genStepImagineViaTemplate,
  genTemplate,
  genStitchRoute,
  asStitcherFlat,
  getTemplateValFromArtifacts,
} from 'rhachet';
import { Artifact } from 'rhachet-artifact';
import { GitFile } from 'rhachet-artifact-git';
import { withRetry, withTimeout } from 'wrapper-fns';

import { ContextOpenAI, sdkOpenAi } from '../../../../../data/sdk/sdkOpenAi';
import { genStepArtSet } from '../../../../artifact/genStepArtSet';
import { getEcologistBriefs } from '../../../ecologist/getEcologistBrief';
import { getMechanicBriefs } from '../../../mechanic/getMechanicBrief';

type StitcherDesired = GStitcher<
  Threads<{
    thinker: RoleContext<'thinker'>;
    summarizer: RoleContext<
      'summarizer',
      { art: { summary: Artifact<typeof GitFile> } }
    >;
  }>,
  ContextOpenAI & GStitcher['context'],
  { content: string }
>;

const template = genTemplate<StitcherDesired['threads']>({
  ref: { uri: __filename.replace('.ts', '.template.md') },
  getVariables: async ({ threads }) => ({
    thread: threads.thinker.stitches
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
  slug: '[summarizer]<summarize>',
  stitchee: 'summarizer',
  readme: '',
  template,
  imagine: withRetry(
    withTimeout(sdkOpenAi.imagine, { threshold: { seconds: 30 } }),
  ),
});

const stepWrite = genStepArtSet({
  stitchee: 'summarizer',
  artee: 'summary',
  mode: 'upsert',
});

const route = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '[summarizer]<summarize>',
    readme: '@[summarizer]<imagine> -> @[summarizer]<write>',
    sequence: [stepImagine, stepWrite],
  }),
);

export const stepSummarize = route;
