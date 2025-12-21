import {
  asStitcherFlat,
  type GStitcher,
  genStepImagineViaTemplate,
  genStitchRoute,
  genTemplate,
  getTemplateValFromArtifacts,
  getTemplateVarsFromRoleInherit,
  type RoleContext,
  type Threads,
} from 'rhachet';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';

import { type ContextOpenAI, sdkOpenAi } from '@src/data/sdk/sdkOpenAi';
import { genStepArtSet } from '@src/logic/artifact/genStepArtSet';

interface ThreadsDesired
  extends Threads<{
    critic: RoleContext<
      'critic',
      {
        art: { feedbackBehavior: Artifact<typeof GitFile> };
        org: {
          patterns: Artifact<typeof GitFile>[];
        };
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
  ref: { uri: __dirname + '/routeCriticCodeReviewBehavior.template.md' },
  getVariables: async ({ threads }) => ({
    ...(await getTemplateVarsFromRoleInherit({ thread: threads.artist })),
    diff: (
      await threads.artist.context.stash.art.inflight.get().expect('isPresent')
    )?.content,
    codestyle: await getTemplateValFromArtifacts({
      artifacts: [
        // todo
      ],
    }),
  }),
});

const stepImagineFeedback = genStepImagineViaTemplate<StitcherDesired>({
  slug: '[critic]<review><behavior><imagine>',
  stitchee: 'critic',
  readme: 'intent(reviews artist inflight diff)',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepArtSet = genStepArtSet({
  stitchee: 'critic',
  artee: 'feedbackBehavior',
});

export const routeCriticCodeReviewBehavior = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '[critic]<review><behavior>',
    readme: '@[critic]<review><behavior> -> [feedbackBehavior]',
    sequence: [stepImagineFeedback, stepArtSet],
  }),
);
