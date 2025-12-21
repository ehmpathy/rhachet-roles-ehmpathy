import { toMilliseconds } from '@ehmpathy/uni-time';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/domain.operations/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/domain.operations/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/domain.operations/.test/getContextOpenAI';

import { stepInterpret } from './stepInterpret';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepInterpret', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepInterpret;

  given('we want to explore the home service domain', () => {
    const askText =
      'distill usecases for appointment scheduler in the home service domain. use @[provider] and @[neighbor] actors involved';

    const inflightArtifact = genArtifactGitFile(
      {
        uri:
          __dirname + '/.temp/stepInterpret/homeservice.schedule.inflight.md',
      },
      {
        versions: true,
      },
    );

    const feedbackArtifact = genArtifactGitFile(
      {
        uri:
          __dirname + '/.temp/stepInterpret/homeservice.schedule.feedback.md',
      },
      {
        versions: true,
      },
    );

    beforeEach(async () => {
      await inflightArtifact.del();
      await feedbackArtifact.del();
      await feedbackArtifact.set({ content: '' });
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: askText,
            art: {
              feedback: feedbackArtifact,
            },
          },
        }),
        thinker: await enrollThread({
          role: 'thinker',
          stash: {
            art: {
              inflight: inflightArtifact,
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

        const { content } = await inflightArtifact.get().expect('isPresent');
        expect(content).toContain('pro');
      });
    });
  });
  given('we want to distill usecases', () => {
    const askText = `
i want to explore usecases. specifically, detect+collect a ton of them, then cluster them

then i want to distill them into the key ones
      `;

    const inflightArtifact = genArtifactGitFile(
      {
        uri:
          __dirname + '/.temp/stepInterpret/homeservice.schedule.inflight.md',
      },
      {
        versions: true,
      },
    );

    const feedbackArtifact = genArtifactGitFile(
      {
        uri:
          __dirname + '/.temp/stepInterpret/homeservice.schedule.feedback.md',
      },
      {
        versions: true,
      },
    );

    beforeEach(async () => {
      await inflightArtifact.del();
      await feedbackArtifact.del();
      await feedbackArtifact.set({ content: '' });
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: askText,
            art: {
              feedback: feedbackArtifact,
            },
          },
        }),
        thinker: await enrollThread({
          role: 'thinker',
          stash: {
            art: {
              inflight: inflightArtifact,
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

        const { content } = await inflightArtifact.get().expect('isPresent');
        expect(content).toContain('<distill>');
        expect(content).toContain('<cluster>');
      });
    });
  });
});
