import {
  asStitcherFlat,
  genStitchRoute,
  GStitcher,
  StitchStepCompute,
  Threads,
} from 'rhachet';

import { GitFile } from '../../../__nonpublished_modules__/rhachet-artifact-git/src/domain/GitFile';
import { Artifact } from '../../../__nonpublished_modules__/rhachet/src/domain/Artifact';
import { RoleContext } from '../../../__nonpublished_modules__/rhachet/src/domain/RoleContext';
import { ContextOpenAI } from '../../../data/sdk/sdkOpenAi';
import { routeCriticCodeReviewCodestyle } from './routeCriticCodeReviewCodestyle';

interface ThreadsDesired
  extends Threads<{
    critic: RoleContext<
      'critic',
      {
        art: {
          feedback: Artifact<typeof GitFile>;
          feedbackCodestyle: Artifact<typeof GitFile>;
          // feedbackBehavior: Artifact<typeof GitFile>;
          // feedbackArchitecture: Artifact<typeof GitFile>;
        };
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

const stepMergeFeedbacks = new StitchStepCompute<
  GStitcher<ThreadsDesired, ContextOpenAI & GStitcher['context'], GitFile>
>({
  slug: '[critic]<merge>feedbacks',
  form: 'COMPUTE',
  stitchee: 'critic',
  readme:
    'intent(merge codestyle, behavior, and architecture feedback into a single file)',
  invoke: async ({ threads }) => {
    // grab & merge the contents
    const contents = await Promise.all(
      [threads.critic.context.stash.art.feedbackCodestyle].map(async (art) => {
        const content = (await art.get())?.content;
        return content ?? '';
      }),
    );
    const concatted = contents.join('\n\n');

    // set the the merged feedback
    const updated = await threads.critic.context.stash.art.feedback.set({
      content: concatted,
    });

    return {
      input: null,
      output: updated,
    };
  },
});

export const routeCriticCodeReview = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '[critic]<review>',
    readme: '@[critic]<review> -> [feedback]',
    sequence: [routeCriticCodeReviewCodestyle, stepMergeFeedbacks],
  }),
);
