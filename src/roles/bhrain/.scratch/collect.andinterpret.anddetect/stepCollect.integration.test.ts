import { toMilliseconds } from '@ehmpathy/uni-time';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/.test/getContextOpenAI';

import { stepCollect } from './stepCollect';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepCollect', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepCollect;

  const grammar = `
structure:
@[actor]<mechanism> -> [resource] -> {drive:<<effect>>[motive]}

standards:
- all <verb>s should be declared as <mechanism>s
- all [noun]s should be declared as [resource]s
- all <mechanism>s should be prefixed with their root operation
  - <get> for reads
  - <set> for dobj mutations
  - <rec> for event emissions
- use <mechanism>[resource] syntax for brevity, when applicable
- scope [resources] within [domain]s when needed for specificity
  - [domain][resource]
- leverage [resources] .attributes when needed
  - [resource].attribute
`;

  given('we want to explore the home service domain', () => {
    const askText = `
home service domain. scheduler system for @[provider]s to enable @[neighbor]s to book appointments on their own, automatically

@[provider]s <set>[reservable] work hours

@[provider]s <set>[reservation]s, <pull>ed from external calendars, which
 block out reservable time

@[customer]s <get>[appointable] times, from which they can book new [appo
intment]s

@[customer]s <set>[appointment]s, .status=requested, for when they want a
 new appointment

@[provider]s <set>[appointment].status = approved | rejected. optionally,
 they can auto-approve all appointments

@[provider]s <get>[appointment]s on their schedule
    `.trim();

    const inflightArtifact = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepCollect/updated/homeservice.schedule.inflight.md',
      },
      { versions: true },
    );
    const feedbackArtifact = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepCollect/updated/homeservice.schedule.feedback.md',
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
