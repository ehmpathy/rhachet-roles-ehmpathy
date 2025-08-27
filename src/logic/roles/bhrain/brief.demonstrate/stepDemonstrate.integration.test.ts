import { toMilliseconds } from '@ehmpathy/uni-time';
import { enweaveOneStitcher, enrollThread } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, when, then, usePrep } from 'test-fns';

import { genContextLogTrail } from '../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../.test/getContextOpenAI';
import { getBhrainBriefs } from '../getBhrainBrief';
import { stepDemonstrate } from './stepDemonstrate';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepDemonstrate', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepDemonstrate;

  const artifacts = {
    caller: {
      feedback: genArtifactGitFile(
        { uri: __dirname + '/.temp/stepDemonstrate/caller.feedback.md' },
        { versions: true },
      ),
      'foci.goal.concept': genArtifactGitFile(
        {
          uri: __dirname + '/.temp/stepDemonstrate/caller.foci.goal.concept.md',
        },
        { versions: true },
      ),
      'foci.goal.context': genArtifactGitFile(
        {
          uri: __dirname + '/.temp/stepDemonstrate/caller.foci.goal.context.md',
        },
        { versions: true },
      ),
      'foci.input.concept': genArtifactGitFile(
        {
          uri:
            __dirname + '/.temp/stepDemonstrate/caller.foci.input.concept.md',
        },
        { versions: true },
      ),
    },
    thinker: {
      'focus.concept': genArtifactGitFile(
        { uri: __dirname + '/.temp/stepDemonstrate/thinker.focus.concept.md' },
        { versions: true },
      ),
      'focus.context': genArtifactGitFile(
        { uri: __dirname + '/.temp/stepDemonstrate/thinker.focus.context.md' },
        { versions: true },
      ),
    },
  };

  given('we want to demonstrate concept of joke structure', () => {
    const inputConcept = `
the structure of a joke
      `.trim();

    beforeEach(async () => {
      await artifacts.caller.feedback.set({ content: '' });
      await artifacts.thinker['focus.context'].set({
        content: ['psychology', 'evolution', 'ecology'].join('\n'),
      });
      await artifacts.thinker['focus.concept'].set({
        content: [].join('\n'),
      });
      await artifacts.caller['foci.goal.concept'].set({
        content: 'learn how to make better jokes',
      });
    });

    const enthread = () =>
      usePrep(async () => ({
        caller: await enrollThread({
          role: 'caller',
          stash: {
            art: {
              'foci.goal.concept': artifacts.caller['foci.goal.concept'],
              'foci.goal.context': artifacts.caller['foci.goal.context'],
              'foci.input.concept': artifacts.caller['foci.input.concept'],
              feedback: artifacts.caller.feedback,
              templates: [],
            },
            refs: [],
          },
        }),
        thinker: await enrollThread({
          role: 'thinker',
          stash: {
            art: {
              'focus.context': artifacts.thinker['focus.context'],
              'focus.concept': artifacts.thinker['focus.concept'],
            },
            briefs: [],
          },
          inherit: {
            traits: getBhrainBriefs(['trait.ocd.md']),
          },
        }),
      }));

    when('coherent foci.input.concept', () => {
      beforeEach(async () => {
        await artifacts.caller['foci.input.concept'].set({
          content: inputConcept,
        });
      });

      const goalThreads = enthread();

      then('outputs answers', async () => {
        const result = await enweaveOneStitcher(
          { stitcher: route, threads: goalThreads },
          context,
        );
        console.log(JSON.stringify(result.stitch, null, 2));
        console.log(artifacts);
        console.log(artifacts.thinker['focus.concept']);

        const { content } = await artifacts.thinker['focus.concept']
          .get()
          .expect('isPresent');

        expect(content.toLowerCase()).toMatch(/knock[- ]knock|chicken|atom/i);
      });
    });

    when.skip('empty foci.input.concept', () => {
      beforeEach(async () => {
        await artifacts.caller['foci.input.concept'].set({
          content: ' ',
        });
      });

      const goalThreads = enthread();

      then('outputs BadRequestError', async () => {
        const result = await enweaveOneStitcher(
          { stitcher: route, threads: goalThreads },
          context,
        );
        console.log(JSON.stringify(result.stitch, null, 2));
        console.log(artifacts.thinker['focus.concept']);

        const { content } = await artifacts.thinker['focus.concept']
          .get()
          .expect('isPresent');

        expect(content).toContain('BadRequestError');
      });
    });
  });
});
