import { toMilliseconds } from '@ehmpathy/uni-time';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/domain.operations/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/domain.operations/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/domain.operations/.test/getContextOpenAI';
import { getBhrainBriefs } from '@src/roles/bhrain/.scratch/getBhrainBrief';

import { stepEnvision } from './stepEnvision';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepEnvision', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepEnvision;
  const purpose = `
envision the usecase from the upstream as a timeline, with the output format structure
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
    const inflightArtifact = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepEnvision/homeservice.schedule.usecases.usecases.md',
      },
      { versions: true },
    );

    const feedbackArtifact = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepEnvision/homeservice.schedule.usecases.feedback.md',
      },
      { versions: true },
    );

    const motiveArtifact = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepEnvision/homeservice.schedule.journey.motive.md',
      },
      { versions: true },
    );

    const upstreamArtifact = genArtifactGitFile(
      {
        uri: __dirname + '/.test/homeservice.schedule.journey.upstream.md',
      },
      { access: 'readonly' },
    );

    const structureArtifact = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepEnvision/homeservice.schedule.journey.structure.json',
      },
      { versions: true },
    );

    beforeEach(async () => {
      await inflightArtifact.del();
      await feedbackArtifact.del();
      await motiveArtifact.set({
        content: 'gather usecases for a product vision',
      });
      await structureArtifact.set({
        content: JSON.stringify(
          {
            journey: { title: 'string', summary: 'string' },
            timeline: [
              {
                who: '@[actor]',
                what: {
                  grammar: 'string',
                  summary: 'string',
                },
                when: {
                  time: 't+$duration, where $duration = n.min | n.hrs | n.days | ...',
                  trigger: 'string',
                },
                why: {
                  grammar: 'string',
                  summary: 'string',
                },
              },
            ],
          },
          null,
          2,
        ),
      });
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        caller: await enrollThread({
          role: 'caller',
          stash: {
            art: {
              motive: motiveArtifact,
              feedback: feedbackArtifact,
            },
          },
        }),
        thinker: await enrollThread({
          role: 'thinker',
          stash: {
            art: {
              inflight: inflightArtifact,
              upstream: upstreamArtifact,
              structure: structureArtifact,
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
        console.log(inflightArtifact);

        const { content } = await inflightArtifact.get().expect('isPresent');
        expect(content).toContain('pro');
      });
    });
  });
});
