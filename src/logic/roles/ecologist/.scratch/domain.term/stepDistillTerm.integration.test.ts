import { toMilliseconds } from '@ehmpathy/uni-time';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/logic/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/logic/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/logic/.test/getContextOpenAI';

import { stepDistillTerm } from './stepDistillTerm';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepDistillTerm', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepDistillTerm;

  given('we want to explore the home service domain, no usecases', () => {
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

    const inflightArt = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepDistillTerm/woutcases.homeservice.schedule.term.md',
      },
      {
        versions: true,
      },
    );
    const feedbackArt = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepDistillTerm/woutcases.homeservice.schedule.feedback.md',
      },
      { versions: true },
    );

    beforeEach(async () => {
      await inflightArt.del();
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: askText,
            art: {
              feedback: feedbackArt,
              usecases: null,
            },
          },
        }),
        student: await enrollThread({
          role: 'student',
          stash: {
            art: {
              inflight: inflightArt,
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

        const { content } = await inflightArt.get().expect('isPresent');
        expect(content).toContain('pro');
      });
    });
  });

  given('we want to explore the home service domain, w/ usecases', () => {
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

    const inflightArt = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepDistillTerm/withcases.homeservice.schedule.inflight.md',
      },
      { versions: true },
    );
    const feedbackArt = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepDistillTerm/withcases.homeservice.schedule.feedback.md',
      },
      { versions: true },
    );
    const usecasesArt = genArtifactGitFile(
      { uri: __dirname + '/.test/schedule.term.usecases.md' },
      { access: 'readonly' },
    );

    beforeEach(async () => {
      await inflightArt.del();
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: askText,
            art: {
              feedback: feedbackArt,
              usecases: usecasesArt,
            },
          },
        }),
        student: await enrollThread({
          role: 'student',
          stash: {
            art: {
              inflight: inflightArt,
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

        const { content } = await inflightArt.get().expect('isPresent');
        expect(content).toContain('pro');
      });
    });
  });
});
