import { toMilliseconds } from '@ehmpathy/uni-time';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/.test/getContextOpenAI';

import { stepEndialogue } from './stepEndialogue';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepEndialogue', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepEndialogue;

  given(
    'vague intent: what should we call reservable-but-not-reserved time?',
    () => {
      const askText = `
what should we call reservable-but-not-reserved time?
    `.trim();

      const journalArt = genArtifactGitFile(
        {
          uri:
            __dirname +
            '/.temp/stepEndialogue/woutseed.reservable-but-not-reserved-time.journal.md',
        },
        { versions: true },
      );

      const feedbackArt = genArtifactGitFile(
        {
          uri:
            __dirname +
            '/.temp/stepEndialogue/woutseed.reservable-but-not-reserved-time.feedback.md',
        },
        { versions: true },
      );
      const summaryArt = genArtifactGitFile(
        {
          uri:
            __dirname +
            '/.temp/stepEndialogue/woutseed.reservable-but-not-reserved-time.summary.md',
        },
        { versions: true },
      );

      beforeEach(async () => {
        await journalArt.del();
        await feedbackArt.del();
      });

      when('executed', () => {
        const threads = usePrep(async () => ({
          caller: await enrollThread({
            role: 'caller',
            stash: {
              ask: askText,
              art: {
                feedback: feedbackArt,
              },
            },
          }),
          thinker: await enrollThread({
            role: 'thinker',
            stash: {
              art: {
                journal: journalArt,
              },
            },
          }),
          summarizer: await enrollThread({
            role: 'summarizer',
            stash: {
              art: { summary: summaryArt },
            },
          }),
        }));

        then('upserts the artifact', async () => {
          const result = await enweaveOneStitcher(
            { stitcher: route, threads },
            context,
          );

          console.log(JSON.stringify(result.stitch, null, 2));

          console.log(journalArt);

          const { content } = await journalArt.get().expect('isPresent');
          expect(content).toContain('pro');
        });
      });
    },
  );
});
