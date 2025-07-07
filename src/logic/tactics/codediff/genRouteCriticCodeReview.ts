import { UnexpectedCodePathError } from 'helpful-errors';
import { asStitcherFlat, genStitchRoute, GStitcher, Threads } from 'rhachet';

import { GitFile } from '../../../__nonpublished_modules__/rhachet-artifact-git/src/domain/GitFile';
import { Artifact } from '../../../__nonpublished_modules__/rhachet/src/domain/Artifact';
import { RoleContext } from '../../../__nonpublished_modules__/rhachet/src/domain/RoleContext';
import { genStepImagineViaTemplate } from '../../../__nonpublished_modules__/rhachet/src/logic/template/genStepImagineViaTemplate';
import { genTemplate } from '../../../__nonpublished_modules__/rhachet/src/logic/template/genTemplate';
import { getTemplateVarsFromRoleInherit } from '../../../__nonpublished_modules__/rhachet/src/logic/template/getTemplateVarsFromInheritance';
import { getTemplateVarsFromStashScene } from '../../../__nonpublished_modules__/rhachet/src/logic/template/getTemplateVarsFromStashScene';
import { ContextOpenAI, sdkOpenAi } from '../../../data/sdk/sdkOpenAi';
import { genStepArtSet } from '../artifact/genStepArtSet';

interface ThreadsDesired
  extends Threads<{
    critic: RoleContext<
      'critic',
      {
        art: { feedback: Artifact<typeof GitFile> };
      }
    >;
    artist: RoleContext<
      'artist',
      {
        art: {
          inflight: Artifact<typeof GitFile>;
        };
        scene: {
          coderefs: Artifact<typeof GitFile>[];
        };
      }
    >;
  }> {}

type StitcherDesired = GStitcher<
  ThreadsDesired,
  ContextOpenAI & GStitcher['context'],
  { content: string }
>;

const template = genTemplate<ThreadsDesired>({
  ref: { uri: __dirname + '/genRouteCriticCodeReview.template.md' },
  getVariables: async ({ threads }) => ({
    diff:
      (await threads.artist.context.stash.art.inflight.get())?.content ??
      UnexpectedCodePathError.throw(
        'could not get inflight artifact from artist',
        { threads },
      ),
    ...(await getTemplateVarsFromRoleInherit({ thread: threads.artist })),
    ...(await getTemplateVarsFromStashScene({ thread: threads.artist })),
  }),
});

const stepImagineFeedback = genStepImagineViaTemplate<StitcherDesired>({
  slug: '[critic]<codediff><review>',
  stitchee: 'critic',
  readme: 'intent(reviews artist inflight diff)',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepArtSet = genStepArtSet({
  stitchee: 'critic',
  artee: 'feedback',
});

const routeCriticCodeReview = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '[critic]<codereview>',
    readme: '@[critic]<codediff><review> -> [feedback]',
    sequence: [stepImagineFeedback, stepArtSet],
  }),
);

export const genRouteCriticCodeReview = () => routeCriticCodeReview;
