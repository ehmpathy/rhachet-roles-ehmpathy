import { genStitchRoute, GStitcher, Threads } from 'rhachet';

import { GitFile } from '../../../__nonpublished_modules__/rhachet-artifact-git/src/domain/GitFile';
import { Artifact } from '../../../__nonpublished_modules__/rhachet/src/domain/Artifact';
import { RoleContext } from '../../../__nonpublished_modules__/rhachet/src/domain/RoleContext';
import { genStepImagineViaTemplate } from '../../../__nonpublished_modules__/rhachet/src/logic/template/genStepImagineViaTemplate';
import { genTemplate } from '../../../__nonpublished_modules__/rhachet/src/logic/template/genTemplate';
import { ContextOpenAI, sdkOpenAi } from '../../../data/sdk/sdkOpenAi';
import { castCodeRefsToTemplateScene } from '../../context/castCodeRefsToTemplateScene';
import { genStepArtSet } from '../artifact/genStepArtSet';

const template = genTemplate<
  Threads<{
    mechanic: RoleContext & {
      ask: string;
      art: { claims: Artifact<typeof GitFile> };
      scene: { coderefs: Artifact<typeof GitFile>[] };
    };
  }>
>({
  ref: { uri: __dirname + '/genRouteStudyAsk.template.md' },
  getVariables: async (input) => ({
    ask: input.threads.mechanic.context.ask,
    context: {
      role: {
        traits: '', // todo: filter in globally relevant ones?
        skills: '', // todo: filter in globally relevant ones?
      },
      scene: await castCodeRefsToTemplateScene({
        threads: input.threads,
        stitchee: 'mechanic',
      }),
    },
  }),
});

const stepStudyAskImagine = genStepImagineViaTemplate<
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
  slug: '[mechanic]<study>[ask]<imagine>',
  stitchee: 'mechanic',
  readme: 'intent(imagines a codediff)',
  template,
  imagine: sdkOpenAi.imagine,
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
