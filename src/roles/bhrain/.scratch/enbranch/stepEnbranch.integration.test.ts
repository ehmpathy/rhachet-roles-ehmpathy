import { toMilliseconds } from '@ehmpathy/uni-time';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/domain.operations/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/domain.operations/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/domain.operations/.test/getContextOpenAI';

import { stepEnbranch } from './stepEnbranch';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepEnbranch', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepEnbranch;
  const purposeText = `
explore the fundamental scenarios that need to be supported by the mechanisms referenced by the @[caller].

focus on primitive <get> and <set> operations on the [resource]s referenced
    `.trim();
  const grammar = `@[actor]<mechanism> -> [resource] -> {drive:<<effect>>[motive]}`;

  given('we want to explore the home service domain', () => {
    const askText =
      'appointment scheduler in the home service domain. use @[provider] and @[neighbor] actors involved';

    const inflightArtifact = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepEnbranch/updated/homeservice.schedule.term.usecases.md',
      },
      {
        versions: true,
      },
    );

    const feedbackArtifact = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepEnbranch/updated/homeservice.schedule.term.feedback.md',
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
              domainSketch: null,
            },
          },
        }),
        thinker: await enrollThread({
          role: 'thinker',
          stash: {
            art: {
              inflight: inflightArtifact,
            },
            purpose: purposeText,
            grammar,
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
