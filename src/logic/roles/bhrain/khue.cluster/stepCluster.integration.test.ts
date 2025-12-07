import { toMilliseconds } from '@ehmpathy/uni-time';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../.test/getContextOpenAI';
import { getBhrainBriefs } from '../getBhrainBrief';
import { stepCluster } from './stepCluster';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepCluster', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepCluster;

  const artifacts = {
    caller: {
      feedback: genArtifactGitFile(
        { uri: __dirname + '/.temp/stepCluster/caller.feedback.md' },
        { versions: true },
      ),
      'foci.goal.concept': genArtifactGitFile(
        {
          uri: __dirname + '/.temp/stepCluster/caller.foci.goal.concept.md',
        },
        { versions: true },
      ),
      'foci.goal.context': genArtifactGitFile(
        {
          uri: __dirname + '/.temp/stepCluster/caller.foci.goal.context.md',
        },
        { versions: true },
      ),
      'foci.input.concept': genArtifactGitFile(
        {
          uri: __dirname + '/.temp/stepCluster/caller.foci.input.concept.md',
        },
        { versions: true },
      ),
    },
    thinker: {
      'focus.concept': genArtifactGitFile(
        { uri: __dirname + '/.temp/stepCluster/thinker.focus.concept.md' },
        { versions: true },
      ),
      'focus.context': genArtifactGitFile(
        { uri: __dirname + '/.temp/stepCluster/thinker.focus.context.md' },
        { versions: true },
      ),
    },
  };

  given('we want to cluster diverged jokes', () => {
    const inputConceptFewJokes = `
[
    "Why did the chicken cross the road? To get to the other side!",
    "Why don't scientists trust atoms? Because they make up everything!",
    "What do you call fake spaghetti? An impasta!",
    "Why was the math book sad? Because it had too many problems.",
    "How do you organize a space party? You planet!",
    "What did one wall say to the other wall? I'll meet you at the corner!",
    "Why can’t your nose be 12 inches long? Because then it would be a foot!",
    "What do you call cheese that isn't yours? Nacho cheese!",
    "What did the janitor say when he jumped out of the closet? Supplies!",
    "Why did the scarecrow win an award? Because he was outstanding in his field!",
    "Why couldn’t the bicycle stand up by itself? It was two tired.",
    "What do you get when you cross a snowman with a vampire? Frostbite.",
    "How does a penguin build its house? Igloos it together!",
    "Why did the golfer bring two pairs of pants? In case he got a hole in one!",
    "What do you call a bear with no teeth? A gummy bear!",
    "What do you call a fish with no eye? Fsh!",
    "Why did the tomato turn red? Because it saw the salad dressing!",
    "What do you get if you put a radio in the fridge? Cool music.",
    "Why did the picture go to jail? Because it was framed!",
    "Why don't skeletons fight each other? They don't have the guts.",
    "What do you call a boomerang that won’t come back? A stick."
]
      `.trim();

    const inputConceptOneJoke = `
"Why did the chicken cross the road? To get to the other side!",
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

    when('multiple elements', () => {
      beforeEach(async () => {
        await artifacts.caller['foci.input.concept'].set({
          content: inputConceptFewJokes,
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

    when('only 1 element', () => {
      beforeEach(async () => {
        await artifacts.caller['foci.input.concept'].set({
          content: inputConceptOneJoke,
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
