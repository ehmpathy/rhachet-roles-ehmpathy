import { UnexpectedCodePathError } from 'helpful-errors';
import { asStitcherFlat, genStitchRoute, GStitcher, Threads } from 'rhachet';

import { GitFile } from '../../../__nonpublished_modules__/rhachet-artifact-git/src/domain/GitFile';
import { Artifact } from '../../../__nonpublished_modules__/rhachet/src/domain/Artifact';
import { RoleContext } from '../../../__nonpublished_modules__/rhachet/src/domain/RoleContext';
import { genStepImagineViaTemplate } from '../../../__nonpublished_modules__/rhachet/src/logic/template/genStepImagineViaTemplate';
import { genTemplate } from '../../../__nonpublished_modules__/rhachet/src/logic/template/genTemplate';
import { ContextOpenAI, sdkOpenAi } from '../../../data/sdk/sdkOpenAi';
import { castCodeRefsToTemplateScene } from '../../context/castCodeRefsToTemplateScene';
import { genStepArtSet } from '../artifact/genStepArtSet';

interface ThreadsDesired
  extends Threads<{
    artist: RoleContext<
      'artist',
      {
        ask: string;
        art: { inflight: Artifact<typeof GitFile> };
        scene: { coderefs: Artifact<typeof GitFile>[] };
      }
    >;
    student: RoleContext<
      'student',
      {
        art: { claims: Artifact<typeof GitFile> };
      }
    >;
  }> {}

type StitcherDesired = GStitcher<
  ThreadsDesired,
  ContextOpenAI & GStitcher['context'],
  { content: string }
>;

const template = genTemplate<ThreadsDesired>({
  ref: { uri: __dirname + '/genRouteArtistCodeDiffImagine.template.md' },
  getVariables: async ({ threads }) => ({
    ask: threads.artist.context.stash.ask,
    claims:
      (await threads.student.context.stash.art.claims.get())?.content ??
      UnexpectedCodePathError.throw(
        'could not get claims from student. file?.content does not exist',
        {
          threads,
        },
      ),
    context: {
      role: {
        traits: threads.artist.context.inherit.traits
          .map((trait) => trait.content)
          .join('\n\n'),
        skills: threads.artist.context.inherit.skills
          .map((skill) => skill.content)
          .join('\n\n'),
      },
      scene: await castCodeRefsToTemplateScene({
        threads,
        stitchee: 'artist',
      }),
    },
  }),
});

const stepImagineCodeDiff = genStepImagineViaTemplate<StitcherDesired>({
  slug: '[artist]<codediff><imagine>',
  stitchee: 'artist',
  readme: 'intent(imagines a code diff based on artist.ask)',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepArtSet = genStepArtSet({
  stitchee: 'artist',
  artee: 'inflight',
});

const routeArtistCodeDiffPropose = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '[artist]<codediff>',
    readme: '@[artist]<codediff><imagine> -> [target]',
    sequence: [stepImagineCodeDiff, stepArtSet],
  }),
);

export const genRouteArtistCodeDiffPropose = () => routeArtistCodeDiffPropose;
