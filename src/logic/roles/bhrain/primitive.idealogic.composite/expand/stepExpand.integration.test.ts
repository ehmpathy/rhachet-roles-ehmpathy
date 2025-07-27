import { toMilliseconds } from '@ehmpathy/uni-time';
import { enweaveOneStitcher, enrollThread } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { deSerialJSON, isSerialJSON } from 'serde-fns';
import { given, when, then, usePrep } from 'test-fns';

import { genContextLogTrail } from '../../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../../.test/getContextOpenAI';
import { getBhrainBriefs } from '../../getBhrainBrief';
import { stepExpand } from './stepExpand';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepExpand', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepExpand;
  const purpose = `
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
    const askText = `

    appointment scheduler in the home service domain. use @[provider] and @[neighbor] actors involved
    `.trim();

    const placeholderArtifact = genArtifactGitFile(
      {
        uri:
          __dirname + '/.temp/stepExpand/homeservice.schedule.placeholder.md',
      },
      { access: 'readonly' },
    );

    const feedbackArtifact = genArtifactGitFile(
      {
        uri: __dirname + '/.temp/stepExpand/homeservice.schedule.feedback.md',
      },
      { versions: true },
    );

    const inflightDivergeArtifact = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepExpand/homeservice.schedule.inflightsDiverge.md',
      },
      { versions: true },
    );

    const inflightCollectArtifact = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepExpand/homeservice.schedule.inflightsCollect.md',
      },
      { versions: true },
    );

    beforeEach(async () => {
      await feedbackArtifact.del();
      await inflightDivergeArtifact.del();
      await inflightCollectArtifact.del();
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
              inflight: placeholderArtifact,
              upstream: placeholderArtifact,
              'inflights.diverge': inflightDivergeArtifact,
              'inflights.collect': inflightCollectArtifact,
            },
            purpose,
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

        const { content } = await inflightCollectArtifact
          .get()
          .expect('isPresent');
        expect(content).toContain('pro');
      });

      then.only('retains all prior input on rerun, only expands', async () => {
        // run first time
        await enweaveOneStitcher({ stitcher: route, threads }, context);

        // count the length before
        const quantBefore = deSerialJSON<any[]>(
          isSerialJSON.assure(
            (await inflightCollectArtifact.get().expect('isPresent')).content,
          ),
        ).length;

        // run again
        await enweaveOneStitcher({ stitcher: route, threads }, context);

        // count the length after
        const quantAfter = deSerialJSON<any[]>(
          isSerialJSON.assure(
            (await inflightCollectArtifact.get().expect('isPresent')).content,
          ),
        ).length;

        // expect it has gone up
        expect(quantAfter).toBeGreaterThan(quantBefore);
      });
    });
  });
});
