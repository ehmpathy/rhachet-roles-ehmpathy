import { toMilliseconds } from '@ehmpathy/uni-time';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/domain.operations/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/domain.operations/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/domain.operations/.test/getContextOpenAI';

import { stepEnquestion } from './stepEnquestion';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepEnquestion', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepEnquestion;

  given(
    'vague intent: what should we call reservable-but-not-reserved time?, wout feedback',
    () => {
      const askText = `
what should we call reservable-but-not-reserved time?
    `.trim();

      const outputArt = genArtifactGitFile(
        {
          uri:
            __dirname +
            '/.temp/stepEnquestion/woutfeedback.reservable-but-not-reserved-time.stitches.md',
        },
        {
          versions: true,
        },
      );

      beforeEach(async () => {
        await outputArt.del();
      });

      when('executed', () => {
        const threads = usePrep(async () => ({
          caller: await enrollThread({
            role: 'caller',
            stash: {
              ask: askText,
              art: { feedback: null },
            },
          }),
          thinker: await enrollThread({
            role: 'thinker',
          }),
          summarizer: await enrollThread({
            role: 'summarizer',
            stash: {
              art: {
                summary: null,
              },
            },
          }),
        }));

        then('upserts the artifact', async () => {
          const result = await enweaveOneStitcher(
            { stitcher: route, threads },
            context,
          );

          console.log(JSON.stringify(result.stitch, null, 2));
          await outputArt.set({
            content: [
              (await outputArt.get())?.content,
              result.stitch.output.content,
            ].join('\n\n---\n\n'),
          });

          console.log(outputArt);

          const { content } = await outputArt.get().expect('isPresent');
          expect(content).toContain('pro');
        });
      });
    },
  );

  given(
    'vague intent: what should we call reservable-but-not-reserved time?, with feedback',
    () => {
      const askText = `
what should we call reservable-but-not-reserved time?
    `.trim();
      const feedbackText = `
lets zoomin on the usecases of home service appointments. @[provider]s need to set their [reservable] work hours. from them, we need to subtract [reservation]s in order to figure out this reservable-but-not-reserved time that appointements could be scheduled against. what are some intuitive words that could describe that? feel free to coin your own if none exist
    `.trim();

      const outputArt = genArtifactGitFile(
        {
          uri:
            __dirname +
            '/.temp/stepEnquestion/woutfeedback.reservable-but-not-reserved-time.stitches.md',
        },
        { versions: true },
      );
      const feedbackArt = genArtifactGitFile(
        {
          uri:
            __dirname +
            '/.temp/stepEnquestion/woutfeedback.reservable-but-not-reserved-time.feedback.md',
        },
        { versions: true },
      );

      beforeEach(async () => {
        await outputArt.del();
        await feedbackArt.set({ content: feedbackText });
      });

      when('executed', () => {
        const threads = usePrep(async () => ({
          caller: await enrollThread({
            role: 'caller',
            stash: {
              ask: askText,
              art: { feedback: feedbackArt },
            },
          }),
          thinker: await enrollThread({
            role: 'thinker',
          }),
          summarizer: await enrollThread({
            role: 'summarizer',
            stash: { art: { summary: null } },
          }),
        }));

        then('upserts the artifact', async () => {
          const result = await enweaveOneStitcher(
            { stitcher: route, threads },
            context,
          );

          console.log(JSON.stringify(result.stitch, null, 2));
          await outputArt.set({
            content: [
              (await outputArt.get())?.content,
              result.stitch.output.content,
            ].join('\n\n---\n\n'),
          });

          console.log(outputArt);

          const { content } = await outputArt.get().expect('isPresent');
          expect(content).toContain('home');
        });
      });
    },
  );

  given(
    'vague intent: what should we call reservable-but-not-reserved time?, with summary',
    () => {
      const askText = `
what should we call reservable-but-not-reserved time?
    `.trim();

      const outputArt = genArtifactGitFile(
        {
          uri:
            __dirname +
            '/.temp/stepEnquestion/woutfeedback.reservable-but-not-reserved-time.stitches.md',
        },
        { versions: true },
      );
      const summaryArt = genArtifactGitFile(
        {
          uri: __dirname + '/.test/reservable-but-not-reserved-time.summary.md',
        },
        { access: 'readonly' },
      );

      beforeEach(async () => {
        await outputArt.del();
      });

      when('executed', () => {
        const threads = usePrep(async () => ({
          caller: await enrollThread({
            role: 'caller',
            stash: {
              ask: askText,
              art: { feedback: null },
            },
          }),
          thinker: await enrollThread({
            role: 'thinker',
          }),
          summarizer: await enrollThread({
            role: 'summarizer',
            stash: {
              art: {
                summary: summaryArt,
              },
            },
          }),
        }));

        then('upserts the artifact', async () => {
          const result = await enweaveOneStitcher(
            { stitcher: route, threads },
            context,
          );

          console.log(JSON.stringify(result.stitch, null, 2));
          await outputArt.set({
            content: [
              (await outputArt.get())?.content,
              result.stitch.output.content,
            ].join('\n\n---\n\n'),
          });

          console.log(outputArt);

          const { content } = await outputArt.get().expect('isPresent');
          expect(content.toLowerCase()).toContain('bookable');
        });
      });
    },
  );
});
