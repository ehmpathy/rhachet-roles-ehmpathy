import { genStitchRoute, GStitcher, StitchStepImagine, Threads } from 'rhachet';
import { Empty } from 'type-fns';

import { GitFile } from '../../../__nonpublished_modules__/rhachet-artifact-git/src/domain/GitFile';
import { Artifact } from '../../../__nonpublished_modules__/rhachet/src/domain/Artifact';
import { genTemplate } from '../../../__nonpublished_modules__/rhachet/src/logic/genTemplate';
import { ContextOpenAI, sdkOpenAi } from '../../../data/sdk/sdkOpenAi';
import { RoleContext } from '../../../domain/objects/RoleContext';
import { castCodeRefsToTemplateScene } from '../../context/castCodeRefsToTemplateScene';
import { genStepArtSet } from '../artifact/genStepArtSet';

const stepImagineCodeDiff = new StitchStepImagine<
  GStitcher<
    Threads<{
      artist: RoleContext & {
        ask: string;
        art: { target: Artifact<typeof GitFile> };
        scene: { coderefs: Artifact<typeof GitFile>[] };
      };
      critic: Empty;
    }>,
    ContextOpenAI & GStitcher['context'],
    { content: string }
  >
>({
  form: 'IMAGINE',
  slug: '[artist]<codediff><imagine>',
  stitchee: 'artist',
  readme: 'intent(imagines how to change code given .ask)',
  enprompt: async ({ threads }) =>
    genTemplate<{
      ask: string;
      context: { role: { traits: string; skills: string }; scene: string };
    }>({ uri: __dirname + '/genRouteArtistCodeDiffImagine.template.md' }).use({
      ask: threads.artist.context.ask,
      context: {
        role: {
          traits: '',
          skills: '',
        },
        scene: await castCodeRefsToTemplateScene({
          threads,
          stitchee: 'artist',
        }),
      },
    }),
  imagine: sdkOpenAi.imagine,
  deprompt: ({ promptOut, promptIn }) => ({
    output: { content: promptOut },
    input: { prompt: promptIn },
  }),
});

const routeArtistCodeDiff = genStitchRoute({
  slug: '[artist]<codediff>',
  readme: '@[artist]<codediff><imagine> -> [art]',
  sequence: [
    stepImagineCodeDiff,
    genStepArtSet({ stitchee: 'artist', artee: 'target' }),
  ],
});

export const genRouteArtistCodeDiffImagine = () => routeArtistCodeDiff;
