import { toMilliseconds } from '@ehmpathy/uni-time';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/logic/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/logic/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/logic/.test/getContextOpenAI';
import { getBhrainBriefs } from '@src/roles/bhrain/.scratch/getBhrainBrief';

import { stepDetect } from './stepDetect';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepDetect', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepDetect;
  const purposeText = `
explore the fundamental scenarios that need to be supported by the mechanisms referenced by the @[caller].

focus on primitive <get> and <set> operations on the [resource]s referenced
    `.trim();

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
    const askText = `appointment scheduler in the home service domain. use @[provider] and @[neighbor] actors involved

here's what we have so far

.ideas.enumerated =
- @[provider]<set>[reservable] work hours
- @[provider]<set>[reservation]s <pull>ed from external calendars
  - block out [reservable] time
- @[customer]<get>[appointable] times
- @[customer]<set>[appointment]s
  - .status=requested for new appointments
- @[provider]<set>[appointment].status=approved | rejected
  - optionally auto-approve all appointments
- @[provider]<get>[appointment]s on their schedule

.ideas.collapsed =
- @[provider]<set>[reservable] work hours
- @[provider]<set>[reservation]s to block out time, <pull>ed from external calendars
- @[customer]<get>[appointable] times for booking
- @[customer]<set>[appointment]s as requested
- @[provider]<set>[appointment].status=approved | rejected, with option for auto-approval
- @[provider]<get>[appointment]s on their schedule

.ideas.inspired =
- @[provider]<set>[reservation]s, <pull>ed from external calendars, could inspire integration with other platforms


      `;

    const inflightArtifact = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepDetect/updated/homeservice.schedule.term.usecases.md',
      },
      {
        versions: true,
      },
    );

    const feedbackArtifact = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepDetect/updated/homeservice.schedule.term.feedback.md',
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
            purpose: purposeText,
            grammar,
          },
          inherit: {
            traits: getBhrainBriefs(['trait.ocd.md']),
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
