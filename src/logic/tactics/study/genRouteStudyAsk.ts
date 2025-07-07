import { genStitchRoute, GStitcher, StitchStepImagine, Threads } from 'rhachet';

import { GitFile } from '../../../__nonpublished_modules__/rhachet-artifact-git/src/domain/GitFile';
import { Artifact } from '../../../__nonpublished_modules__/rhachet/src/domain/Artifact';
import { genTemplate } from '../../../__nonpublished_modules__/rhachet/src/logic/genTemplate';
import { ContextOpenAI, sdkOpenAi } from '../../../data/sdk/sdkOpenAi';
import { RoleContext } from '../../../domain/objects/RoleContext';
import { castCodeRefsToTemplateScene } from '../../context/castCodeRefsToTemplateScene';
import { genStepArtSet } from '../artifact/genStepArtSet';

const stepStudyAskImagine = new StitchStepImagine<
  GStitcher<
    Threads<{
      mechanic: RoleContext & {
        ask: string;
        art: { claims: Artifact<typeof GitFile> };
        scene: { coderefs: Artifact<typeof GitFile>[] };
      };
    }>,
    ContextOpenAI & GStitcher['context'],
    { content: string }
  >
>({
  form: 'IMAGINE',
  slug: '[mechanic]<study>[ask]<imagine>',
  stitchee: 'mechanic',
  readme: 'intent(imagines a codediff)',
  enprompt: async ({ threads }) =>
    genTemplate<{
      ask: string;
      context: { role: { traits: string; skills: string }; scene: string };
    }>({ uri: __dirname + '/genRouteStudyAsk.template.md' }).use({
      ask: threads.mechanic.context.ask,
      context: {
        role: {
          traits: '', // todo: filter in globally relevant ones?
          skills: '', // todo: filter in globally relevant ones?
        },
        scene: await castCodeRefsToTemplateScene({
          threads,
          stitchee: 'mechanic',
        }),
      },
    }),
  imagine: sdkOpenAi.imagine,
  deprompt: ({ promptOut, promptIn }) => ({
    output: { content: promptOut },
    input: { prompt: promptIn },
  }),
});

const routeStudyAsk = genStitchRoute({
  slug: '[mechanic]<study>[ask]',
  readme: '@[mechanic]<study>[ask] -> [[claim]]s',
  sequence: [
    stepStudyAskImagine,
    genStepArtSet({ stitchee: 'mechanic', artee: 'claims' }),
  ],
});

export const genRouteStudyAsk = () => routeStudyAsk;
