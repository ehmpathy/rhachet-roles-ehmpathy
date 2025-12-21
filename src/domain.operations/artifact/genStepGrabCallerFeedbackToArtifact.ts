import inquirer from 'inquirer';
import {
  type GStitcher,
  type RoleContext,
  StitchStepCompute,
  type Thread,
  type Threads,
} from 'rhachet';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';

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

      // if this is running in an isolated attempt thread, then the user has no way to supply feedback
      if (process.env.RHACHET_ATTEMPT)
        return {
          input: target,
          output: {
            feedback: null,
            reason: 'in isolated attempt thread, no way to receive feedback',
          },
        };

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

      // grab feedback using inline input or open editor via ':edit'
      const feedback = await (async () => {
        // prompt inline first
        const { fromInline } = await inquirer.prompt<{ fromInline: string }>([
          {
            type: 'input',
            name: 'fromInline',
            message: 'enter feedback (type ":edit" to open editor):',
          },
        ]);

        const isEditorRequest = fromInline.trim() === ':edit';
        if (!isEditorRequest) {
          // return inline input directly (support \n)
          return fromInline.replace(/\\n/g, '\n');
        }

        // fallback to editor if requested
        const { fromEditor } = await inquirer.prompt<{ fromEditor: string }>([
          {
            type: 'editor',
            name: 'fromEditor',
            message: 'enter feedback in editor:',
            default: '# write your feedback above this line\n',
          },
        ]);

        return fromEditor;
      })();

      // write the feedback to caller.art.feedback
      const updated = await feedbackArt.set({
        content: feedback,
      });

      console.log('');
      console.log(`🎙️  heard, saved to ${feedbackArt.ref.uri}`);
      console.log('');
      console.log(feedback);
      console.log('');
      console.log('🫡  on it!');
      console.log('');

      // return the feedback file
      return {
        input: target,
        output: { feedback: updated },
      };
    },
  });
