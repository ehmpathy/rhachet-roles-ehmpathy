import { toMilliseconds } from '@ehmpathy/uni-time';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/.test/getContextOpenAI';
import { getBhrainBriefs } from '@src/roles/bhrain/getBhrainBrief';

import { stepDiverge } from './stepDiverge';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepDiverge', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepDiverge;

  const artifacts = {
    caller: {
      feedback: genArtifactGitFile(
        { uri: __dirname + '/.temp/stepDiverge/caller.feedback.md' },
        { versions: true },
      ),
      'foci.goal.concept': genArtifactGitFile(
        {
          uri: __dirname + '/.temp/stepDiverge/caller.foci.goal.concept.md',
        },
        { versions: true },
      ),
      'foci.goal.context': genArtifactGitFile(
        {
          uri: __dirname + '/.temp/stepDiverge/caller.foci.goal.context.md',
        },
        { versions: true },
      ),
    },
    thinker: {
      'focus.concept': genArtifactGitFile(
        { uri: __dirname + '/.temp/stepDiverge/thinker.focus.concept.md' },
        { versions: true },
      ),
      'focus.context': genArtifactGitFile(
        { uri: __dirname + '/.temp/stepDiverge/thinker.focus.context.md' },
        { versions: true },
      ),
    },
  };

  given('we want to diverge term joke', () => {
    const goalStatement = `
    diverge 21 examples of "joke"
      `.trim();

    const goalQuestion = `
    what are 21 examples of a joke?
      `.trim();

    beforeEach(async () => {
      await artifacts.caller.feedback.set({ content: '' });
      await artifacts.thinker['focus.context'].set({
        content: ['psychology', 'evolution', 'ecology'].join('\n'),
      });
      await artifacts.thinker['focus.concept'].set({
        content: [].join('\n'),
      });
    });

    const enthread = (input: { ask: string }) =>
      usePrep(async () => ({
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: input.ask,
            art: {
              'foci.goal.concept': artifacts.caller['foci.goal.concept'],
              'foci.goal.context': artifacts.caller['foci.goal.context'],
              feedback: artifacts.caller.feedback,
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

    when('goal is a question', () => {
      beforeEach(async () => {
        await artifacts.caller['foci.goal.concept'].set({
          content: goalQuestion,
        });
      });

      const goalThreads = enthread({ ask: goalQuestion });

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

    when('goal is a statement', () => {
      beforeEach(async () => {
        await artifacts.caller['foci.goal.concept'].set({
          content: goalStatement,
        });
      });

      const goalThreads = enthread({ ask: goalStatement });

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
