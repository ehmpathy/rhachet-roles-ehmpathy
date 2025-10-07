import { toMilliseconds } from '@ehmpathy/uni-time';
import {
  enweaveOneStitcher,
  enrollThread,
  genContextStitchTrail,
} from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, when, then, usePrep } from 'test-fns';

import { genContextLogTrail } from '../../../../../.test/genContextLogTrail';
import { getContextOpenAI } from '../../../../../.test/getContextOpenAI';
import { stepPlanContextualize } from './stepPlanContextualize';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

const artifacts = {
  caller: {
    feedback: genArtifactGitFile(
      { uri: __dirname + '/.temp/stepPlanContextualize/caller.feedback.md' },
      { versions: true },
    ),
    'foci.goal.concept': genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepPlanContextualize/caller.foci.goal.concept.md',
      },
      { versions: true },
    ),
    'foci.goal.context': genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepPlanContextualize/caller.foci.goal.context.md',
      },
      { versions: true },
    ),
  },
  thinker: {
    'focus.concept': genArtifactGitFile(
      {
        uri:
          __dirname + '/.temp/stepPlanContextualize/thinker.focus.concept.md',
      },
      { versions: true },
    ),
    'focus.context': genArtifactGitFile(
      {
        uri:
          __dirname + '/.temp/stepPlanContextualize/thinker.focus.context.md',
      },
      { versions: true },
    ),
  },
};

const enthread = () =>
  usePrep(async () => ({
    caller: await enrollThread({
      role: 'caller',
      stash: {
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
      inherit: {},
    }),
  }));

describe('stepPlanContextualize', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepPlanContextualize;

  given('we want to commandPlan a file move', () => {
    const ask = `
rename files from stepPlanCommand to just stepPlan in dir src/roles/commander
      `;

    beforeEach(async () => {
      await artifacts.caller.feedback.set({ content: '' });
      await artifacts.thinker['focus.context'].set({
        content: [].join('\n'),
      });
      await artifacts.thinker['focus.concept'].set({
        content: [].join('\n'),
      });
      await artifacts.caller['foci.goal.concept'].set({
        content: ask,
      });
    });

    when('invoked', () => {
      const goalThreads = enthread();

      then('outputs an instance', async () => {
        const result = await enweaveOneStitcher(
          { stitcher: route, threads: goalThreads },
          context,
        );
        console.log(JSON.stringify(result.stitch, null, 2));
        console.log(artifacts.thinker['focus.concept']);

        const { content } = await artifacts.thinker['focus.concept']
          .get()
          .expect('isPresent');

        expect(content.toLowerCase()).toMatch(/directory/i);
      });
    });
  });

  given.only('we want to contextualize an ask to git commit', () => {
    const ask = `
git commit my changes
      `;

    beforeEach(async () => {
      await artifacts.caller.feedback.set({ content: '' });
      await artifacts.thinker['focus.context'].set({
        content: [].join('\n'),
      });
      await artifacts.thinker['focus.concept'].set({
        content: [].join('\n'),
      });
      await artifacts.caller['foci.goal.concept'].set({
        content: ask,
      });
    });

    when('invoked', () => {
      const goalThreads = enthread();

      then('outputs an instance', async () => {
        const result = await enweaveOneStitcher(
          { stitcher: route, threads: goalThreads },
          context,
        );
        console.log(JSON.stringify(result.stitch, null, 2));
        console.log(artifacts.thinker['focus.concept']);

        const { content } = await artifacts.thinker['focus.concept']
          .get()
          .expect('isPresent');

        expect(content.toLowerCase()).toMatch(/git diff/i);
      });
    });
  });
});
