import { toMilliseconds } from '@ehmpathy/uni-time';
import { enweaveOneStitcher, enrollThread } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, when, then, usePrep } from 'test-fns';

import { genContextLogTrail } from '../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../.test/getContextOpenAI';
import { stepCollectTermUsecases } from './stepCollectTermUsecases';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepCollectTermUsecases', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepCollectTermUsecases;

  given('we want to explore the home service domain', () => {
    const askText = `
home service domain
- calendar event vs appointment, for a scheduling system
- what's a term that describes the schedule that a @[provider] can be booked at (which may or may not have appointments)
- specifically, we want to ensure that we avoid conflicts with events on their external calendar
- we need to know when they _could_ be scheduled
  - regardless of whether there's an service appointment already scheduled
  - since that could be rescheduled within our system, whereas an external event like a vacation can not
    - e.g., a @[neighbor] may want to see which other times are available
    - e.g., a @[neighbor] cancelled their appointment, our system needs to revive the availability from the "inventory" of time the @[provider] stated was available
    `.trim();

    const domainArt = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepCollectTermUsecases/homeservice.schedule.term.usecases.md',
      },
      {
        versions: true,
      },
    );

    beforeEach(async () => {
      await domainArt.del();
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: askText,
            art: {
              feedback: null,
            },
          },
        }),
        student: await enrollThread({
          role: 'student',
          stash: {
            art: {
              inflight: domainArt,
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

        const { content } = await domainArt.get().expect('isPresent');
        expect(content).toContain('pro');
      });
    });
  });
});
