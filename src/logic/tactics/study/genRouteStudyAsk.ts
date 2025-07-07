import { asStitcherFlat, genStitchRoute, GStitcher, Threads } from 'rhachet';

import { GitFile } from '../../../__nonpublished_modules__/rhachet-artifact-git/src/domain/GitFile';
import { Artifact } from '../../../__nonpublished_modules__/rhachet/src/domain/Artifact';
import { RoleContext } from '../../../__nonpublished_modules__/rhachet/src/domain/RoleContext';
import { genStepImagineViaTemplate } from '../../../__nonpublished_modules__/rhachet/src/logic/template/genStepImagineViaTemplate';
import { genTemplate } from '../../../__nonpublished_modules__/rhachet/src/logic/template/genTemplate';
import { ContextOpenAI, sdkOpenAi } from '../../../data/sdk/sdkOpenAi';
import { castCodeRefsToTemplateScene } from '../../context/castCodeRefsToTemplateScene';
import { genStepArtSet } from '../artifact/genStepArtSet';

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
  ref: { uri: __dirname + '/genRouteStudyAsk.template.md' },
  getVariables: async ({ threads }) => ({
    ask: threads.student.context.stash.ask,
    context: {
      role: {
        traits: threads.student.context.inherit.traits
          .map((trait) => trait.content)
          .join('\n\n'),
        skills: threads.student.context.inherit.skills
          .map((skill) => skill.content)
          .join('\n\n'),
      },
      scene: await castCodeRefsToTemplateScene({
        threads,
        stitchee: 'student' as const,
      }),
    },
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

const routeStudyAsk = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '[student]<study>[ask]',
    readme: '@[student]<study>[ask] -> [[claim]]s',
    sequence: [stepStudyAskImagine, stepArtSet],
  }),
);

export const genRouteStudyAsk = () => routeStudyAsk;
