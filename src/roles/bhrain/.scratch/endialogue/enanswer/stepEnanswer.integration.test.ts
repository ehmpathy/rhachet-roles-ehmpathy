import { asUniDateTime, toMilliseconds } from '@ehmpathy/uni-time';
import { enrollThread, enweaveOneStitcher, Stitch } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { genContextLogTrail } from '@src/domain.operations/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/domain.operations/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/domain.operations/.test/getContextOpenAI';

import { stepEnanswer } from './stepEnanswer';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepEnanswer', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepEnanswer;

  given(
    'vague intent: what should we call reservable-but-not-reserved time?',
    () => {
      const askText = `
what should we call reservable-but-not-reserved time?
    `.trim();

      const questionsText = `
1. What are the key differences between "reservable" and "reserved" time, and why are those distinctions important?
2. How does "reservable-but-not-reserved" time differ from both "free" time and "busy" time in a practical sense?
3. What purpose does labeling this specific type of time serve in terms of productivity or personal organization?
4. Are there existing terms for similar concepts in time management, and how are they used?
5. How would people benefit from recognizing and categorizing this kind of time separately?
    `;

      const outputArt = genArtifactGitFile(
        {
          uri:
            __dirname +
            '/.temp/stepEnanswer/withquestionsonly.reservable-but-not-reserved-time.stitches.md',
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
            },
          }),
          summarizer: await enrollThread({
            role: 'summarizer',
            stash: { art: { summary: null } },
          }),
          thinker: {
            ...(await enrollThread({
              role: 'thinker',
            })),
            stitches: [
              // todo: generalize into a fn that creates test stitches easily
              new Stitch({
                uuid: getUuid(),
                createdAt: asUniDateTime(new Date()),
                input: null,
                trail: { desc: '' },
                stitcher: {
                  form: 'IMAGINE',
                  slug: '[thinker]<enquestion>',
                  readme: '',
                },
                output: {
                  content: questionsText,
                },
              }),
            ],
          },
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
});
