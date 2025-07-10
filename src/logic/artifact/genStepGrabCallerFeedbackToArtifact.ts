import inquirer from 'inquirer';
import { StitchStepCompute, GStitcher, Threads, Thread } from 'rhachet';

import { GitFile } from '../../__nonpublished_modules__/rhachet-artifact-git/src';
import { Artifact } from '../../__nonpublished_modules__/rhachet/src/domain/Artifact';
import { RoleContext } from '../../__nonpublished_modules__/rhachet/src/domain/RoleContext';

/**
 * .what = creates a compute step where the static 'caller' gives feedback on another role's artifact
 * .why  = enables human review or annotation flow to be dynamically targeted, but statically sourced
 */
export const genStepGrabCallerFeedbackToArtifact = <
  TStitchee extends string,
  TArtee extends string,
  TThreads extends Threads<{
    [K in TStitchee | 'caller']: RoleContext<
      K,
      K extends 'caller'
        ? { art: { feedback: Artifact<typeof GitFile> } }
        : { art: { [P in TArtee]: Artifact<typeof GitFile> } }
    >;
  }>,
>({
  stitchee,
  artee,
}: {
  stitchee: TStitchee;
  artee: TArtee;
}) =>
  new StitchStepCompute<
    GStitcher<TThreads, GStitcher['context'], { feedback: GitFile | null }>
  >({
    form: 'COMPUTE',
    slug: `[caller]<feedback><capture>[${stitchee}.${artee}]`,
    readme: `asks caller for feedback on ${stitchee}'s ${artee} and stores it in caller.art.feedback`,
    stitchee: 'caller',
    invoke: async ({ threads }) => {
      // grab the artifact to review
      const subjectThread = threads[stitchee] as any as Thread<
        RoleContext<
          typeof stitchee,
          { art: { [K in typeof artee]: Artifact<typeof GitFile> } }
        >
      >;
      const target = await subjectThread.context.stash.art[artee]
        .get()
        .expect('isPresent');

      // show the reviewer what they're reviewing
      console.log(`\n📝 feedback target: ${target.uri}\n`);

      // prompt to see if they want to leave notes
      const { hasNotes } = await inquirer.prompt<{ hasNotes: string }>([
        {
          type: 'list',
          name: 'hasNotes',
          message: 'have notes?',
          choices: ['no notes', 'yes notes'],
        },
      ]);

      // grab the feedback art
      const callerThread = threads.caller as Thread<
        RoleContext<'caller', { art: { feedback: Artifact<typeof GitFile> } }>
      >;
      const feedbackArt = callerThread.context.stash.art.feedback;

      // exit early if they have nothing to add
      if (hasNotes === 'no notes') {
        await feedbackArt.del(); // purge old notes, if they existed
        return {
          input: target,
          output: { feedback: null },
        };
      }

      // prompt for feedback content
      const { feedback } = await inquirer.prompt<{ feedback: string }>([
        {
          type: 'input',
          name: 'feedback',
          message: 'enter feedback:',
        },
      ]);

      // write the feedback to caller.art.feedback
      const updated = await feedbackArt.set({
        content: feedback,
      });

      // return the feedback file
      return {
        input: target,
        output: { feedback: updated },
      };
    },
  });
