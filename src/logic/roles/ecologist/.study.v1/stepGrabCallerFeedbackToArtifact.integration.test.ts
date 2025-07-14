import inquirer from 'inquirer';
import { enweaveOneStitcher } from 'rhachet';
import { enrollThread } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, when, then } from 'test-fns';

import { genContextLogTrail } from '../../../../__test_assets__/genContextLogTrail';
import { genContextStitchTrail } from '../../../../__test_assets__/genContextStitchTrail';
import { getContextOpenAI } from '../../../../__test_assets__/getContextOpenAI';
import { stepGrabCallerFeedbackToArtifact } from './stepGrabCallerFeedbackToArtifact';

describe('stepGrabCallerFeedbackToArtifact', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };

  const feedbackArt = genArtifactGitFile({
    uri: __dirname + '/.temp/test.feedback.md',
  });

  const claimsArt = genArtifactGitFile({
    uri: __dirname + '/.temp/test.claims.md',
  });

  beforeEach(async () => {
    await feedbackArt.del();
    await claimsArt.set({ content: 'original claim' });
  });

  /**
   * .what = mocks inquirer.prompt unless INQUIRE=true
   * .why = to allow automated testing of CLI steps, but optionally permit real prompts
   */
  const usePromptMockResponse = (mocked: Record<string, any>) => {
    if (process.env.INQUIRE === 'true') return;
    jest
      .spyOn(inquirer, 'prompt')
      .mockImplementation(() => Promise.resolve(mocked) as any);
  };

  given('the caller has feedback for the student claims', () => {
    const askText = 'please summarize multiplication';

    when('the step is run', () => {
      const threadsPrep = async () => ({
        caller: await enrollThread({
          role: 'caller',
          stash: { art: { feedback: feedbackArt } },
        }),
        student: await enrollThread({
          role: 'student',
          stash: { ask: askText, art: { claims: claimsArt } },
        }),
      });

      then('writes the feedback artifact if input is provided', async () => {
        usePromptMockResponse({
          hasNotes: 'yes notes',
          feedback: 'this is mock feedback',
        });

        const threads = await threadsPrep();

        const result = await enweaveOneStitcher(
          { stitcher: stepGrabCallerFeedbackToArtifact, threads },
          context,
        );

        const updated = await feedbackArt.get();
        expect(updated?.content).toContain('mock feedback');
        expect(result.stitch.output.feedback).toBeDefined();
      });

      then('skips writing if hasNotes is "no notes"', async () => {
        usePromptMockResponse({
          hasNotes: 'no notes',
        });

        const threads = await threadsPrep();

        const result = await enweaveOneStitcher(
          { stitcher: stepGrabCallerFeedbackToArtifact, threads },
          context,
        );

        expect(result.stitch.output.feedback).toBeNull();

        const updated = await feedbackArt.get();
        expect(updated).toBeNull();
      });
    });
  });
});
