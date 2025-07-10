import inquirer from 'inquirer';
import { StitchStepCompute, GStitcher, Threads } from 'rhachet';

import { GitFile } from '../../../../__nonpublished_modules__/rhachet-artifact-git/src';
import { Artifact } from '../../../../__nonpublished_modules__/rhachet/src/domain/Artifact';
import { RoleContext } from '../../../../__nonpublished_modules__/rhachet/src/domain/RoleContext';

export const stepGrabCallerFeedbackToArtifact = new StitchStepCompute<
  GStitcher<
    Threads<{
      caller: RoleContext<
        'caller',
        {
          art: { feedback: Artifact<typeof GitFile> };
        }
      >;
      student: RoleContext<
        'student',
        {
          art: { claims: Artifact<typeof GitFile> };
        }
      >;
    }>,
    GStitcher['context'],
    { feedback: GitFile | null }
  >
>({
  form: 'COMPUTE',
  slug: `[caller]<feedback><capture>`,
  readme:
    'asks whether notes exist, then optionally prompts user for CLI feedback to store in caller.art.feedback',
  stitchee: 'caller',
  invoke: async ({ threads }) => {
    // grab the claims and print a ref to the file for review
    const claims = await threads.student.context.stash.art.claims
      .get()
      .expect('isPresent');
    console.log(`\n📝 feedback target: ${claims.uri}\n`);

    // check whether the caller has notes about this
    const { hasNotes } = await inquirer.prompt<{ hasNotes: string }>([
      {
        type: 'list',
        name: 'hasNotes',
        message: 'have notes?',
        choices: ['no notes', 'yes notes'],
      },
    ]);

    // if none, then all good, exit here
    if (hasNotes === 'no notes') {
      return {
        input: claims,
        output: { feedback: null },
      };
    }

    // otherwise, ask for feedback
    const { feedback } = await inquirer.prompt<{ feedback: string }>([
      {
        type: 'input',
        name: 'feedback',
        message: 'enter feedback:',
      },
    ]);

    // write the feedback to the artifact
    const updated = await threads.caller.context.stash.art.feedback.set({
      content: feedback,
    });

    // and expose it
    return {
      input: claims,
      output: { feedback: updated },
    };
  },
});
