import { toMilliseconds } from '@ehmpathy/uni-time';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/.test/getContextOpenAI';
import { getBhrainBriefs } from '@src/roles/bhrain/getBhrainBrief';

import { stepInstantiate } from './stepInstantiate';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

const artifacts = {
  caller: {
    feedback: genArtifactGitFile(
      { uri: __dirname + '/.temp/stepInstantiate/caller.feedback.md' },
      { versions: true },
    ),
    'foci.goal.concept': genArtifactGitFile(
      {
        uri: __dirname + '/.temp/stepInstantiate/caller.foci.goal.concept.md',
      },
      { versions: true },
    ),
    'foci.goal.context': genArtifactGitFile(
      {
        uri: __dirname + '/.temp/stepInstantiate/caller.foci.goal.context.md',
      },
      { versions: true },
    ),
  },
  thinker: {
    'focus.concept': genArtifactGitFile(
      { uri: __dirname + '/.temp/stepInstantiate/thinker.focus.concept.md' },
      { versions: true },
    ),
    'focus.context': genArtifactGitFile(
      { uri: __dirname + '/.temp/stepInstantiate/thinker.focus.context.md' },
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
      inherit: {
        traits: getBhrainBriefs(['trait.ocd.md']),
      },
    }),
  }));

describe('stepInstantiate', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepInstantiate;

  given('we want to instantiate a joke', () => {
    const ask = 'instantiate a joke';

    beforeEach(async () => {
      await artifacts.caller.feedback.set({ content: '' });
      await artifacts.thinker['focus.context'].set({
        content: ['physics', 'dune', 'arrakis'].join('\n'),
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
        console.log(artifacts);
        console.log(artifacts.thinker['focus.concept']);

        const { content } = await artifacts.thinker['focus.concept']
          .get()
          .expect('isPresent');

        expect(content.toLowerCase()).toMatch(/dune|arrakis/i);
      });
    });
  });

  given('we want to instantiate a persona', () => {
    const goalConcept =
      'what is a representative persona of someone who books home services online?';
    const goalContext = ['neighbor', 'resident', 'plumber', 'landscaper'].join(
      '\n',
    );

    beforeEach(async () => {
      await artifacts.caller.feedback.set({ content: '' });
      await artifacts.thinker['focus.context'].set({
        content: goalContext, // todo: why is this on focus.context and not goal.context?
      });
      await artifacts.thinker['focus.concept'].set({
        content: [].join('\n'),
      });
      await artifacts.caller['foci.goal.concept'].set({
        content: goalConcept,
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
        console.log(artifacts);
        console.log(artifacts.thinker['focus.concept']);

        const { content } = await artifacts.thinker['focus.concept']
          .get()
          .expect('isPresent');

        expect(content.toLowerCase()).toMatch(/reviews/i);
      });
    });
  });
});
