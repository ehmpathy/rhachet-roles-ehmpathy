import { toMilliseconds } from '@ehmpathy/uni-time';
import { enweaveOneStitcher, enrollThread } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, when, then, usePrep } from 'test-fns';

import { genContextLogTrail } from '../../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../../.test/getContextOpenAI';
import { getBhrainBriefs } from '../../getBhrainBrief';
import { stepZoomout } from './stepZoomout';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepZoomout', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepZoomout;
  const purpose = `
5whys. why is this user journey relevant?
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

  given(
    'we want to <zoomout>.via([tactic:5whys]) on homeservice.schedule.journey',
    () => {
      const motive = 'understand this user.journey more thoroughly';

      const inflightArtifact = genArtifactGitFile(
        {
          uri:
            __dirname +
            '/.temp/stepZoomout/5whys/homeservice.schedule.journey.inflight.md',
        },
        { versions: true },
      );

      const feedbackArtifact = genArtifactGitFile(
        {
          uri:
            __dirname +
            '/.temp/stepZoomout/5whys/homeservice.schedule.journey.feedback.md',
        },
        { versions: true },
      );

      const motiveArtifact = genArtifactGitFile(
        {
          uri:
            __dirname +
            '/.temp/stepZoomout/5whys/homeservice.schedule.journey.motive.md',
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
          uri: __dirname + '/.test/structure.5whys.md',
        },
        { versions: true },
      );

      beforeEach(async () => {
        await inflightArtifact.del();
        await feedbackArtifact.del();
        await motiveArtifact.set({ content: motive });
      });

      when('we want to zoomout via 5whys.treestruct', () => {
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
    },
  );

  given.only(
    'we want to <zoomout>.via([tactic:abstraction_ladder]) on homeservice.schedule.journey',
    () => {
      const motive = 'understand this user.journey more thoroughly';
      const inflightArtifact = genArtifactGitFile(
        {
          uri:
            __dirname +
            '/.temp/stepZoomout/5abs/homeservice.schedule.journey.inflight.md',
        },
        { versions: true },
      );

      const feedbackArtifact = genArtifactGitFile(
        {
          uri:
            __dirname +
            '/.temp/stepZoomout/5abs/homeservice.schedule.journey.feedback.md',
        },
        { versions: true },
      );

      const motiveArtifact = genArtifactGitFile(
        {
          uri:
            __dirname +
            '/.temp/stepZoomout/5abs/homeservice.schedule.journey.motive.md',
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
          uri: __dirname + '/.test/structure.ladder_of_abstraction.md',
        },
        { versions: true },
      );

      beforeEach(async () => {
        await inflightArtifact.del();
        await feedbackArtifact.del();
        await motiveArtifact.set({ content: motive });
      });

      when('we want to zoomout via 5whys.treestruct', () => {
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
    },
  );
});
