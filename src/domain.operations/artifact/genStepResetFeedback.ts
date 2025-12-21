import {
  type GStitcher,
  type RoleContext,
  StitchStepCompute,
  type Thread,
  type Threads,
} from 'rhachet';
import type { Artifact } from 'rhachet-artifact';
import { type GitFile, getGitRepoRoot } from 'rhachet-artifact-git';
import type { Empty } from 'type-fns';

/**
 * .what = creates a compute step that clears out the caller.art.feedback file
 * .why = ensures feedback state is reset before new input is gathered
 */
const genStepResetFeedback = <
  TThreads extends Threads<{
    caller: RoleContext<
      'caller',
      {
        art: {
          feedback: Artifact<typeof GitFile>;
        };
      }
    >;
  }>,
>(
  input?: Empty,
) =>
  new StitchStepCompute<
    GStitcher<TThreads, GStitcher['context'], { feedback: null }>
  >({
    form: 'COMPUTE',
    slug: `[caller]<feedback><reset>`,
    readme: `clears caller.art.feedback (resets it to null)`,
    stitchee: 'caller',
    invoke: async ({ threads }) => {
      const callerThread = threads.caller as Thread<
        RoleContext<'caller', { art: { feedback: Artifact<typeof GitFile> } }>
      >;

      const feedbackArt = callerThread.context.stash.art.feedback;

      await feedbackArt.del();

      console.log(
        `🧹 [feedback]<reset>: ${feedbackArt.ref.uri.replace(
          await getGitRepoRoot({ from: process.cwd() }),
          '',
        )}\n`,
      );

      return {
        input: null,
        output: { feedback: null },
      };
    },
  });

export const stepResetFeedback = genStepResetFeedback();
