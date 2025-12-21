import { toMilliseconds } from '@ehmpathy/uni-time';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/.test/getContextOpenAI';

import { stepClarify } from './stepClarify';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepClarify', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepClarify;

  given('we want to explore the home service domain', () => {
    const askText =
      'appointment scheduler in the home service domain. use @[provider] and @[neighbor] actors involved';

    const inflightArtifact = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepClarify/updated/homeservice.schedule.inflight.md',
      },
      { versions: true },
    );
    const feedbackArtifact = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepClarify/updated/homeservice.schedule.feedback.md',
      },
      { versions: true },
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
            art: { feedback: feedbackArtifact },
          },
        }),
        thinker: await enrollThread({
          role: 'thinker',
          stash: {
            art: { inflight: inflightArtifact },
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
});
