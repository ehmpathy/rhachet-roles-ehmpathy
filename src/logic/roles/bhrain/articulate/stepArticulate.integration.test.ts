import { toMilliseconds } from '@ehmpathy/uni-time';
import { enweaveOneStitcher, enrollThread } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, when, then, usePrep } from 'test-fns';

import { genContextLogTrail } from '../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../.test/getContextOpenAI';
import { getBhrainBriefs } from '../getBhrainBrief';
import { articulatePonderCatalog } from './ponder.catalog';
import { stepArticulate } from './stepArticulate';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepArticulate', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepArticulate;

  const goal = `
articulate the term "joke"; declare both the etymology and definition; include examples
  `.trim();

  const artifacts = {
    caller: {
      goal: genArtifactGitFile(
        { uri: __dirname + '/.temp/stepArticulate/caller.goal.md' },
        { versions: true },
      ),
      feedback: genArtifactGitFile(
        { uri: __dirname + '/.temp/stepArticulate/caller.feedback.md' },
        { versions: true },
      ),
    },
    thinker: {
      'focus.context': genArtifactGitFile(
        { uri: __dirname + '/.temp/stepArticulate/thinker.focus.context.md' },
        { versions: true },
      ),
      'focus.concept': genArtifactGitFile(
        { uri: __dirname + '/.temp/stepArticulate/thinker.focus.concept.md' },
        { versions: true },
      ),
      'ponder.context': genArtifactGitFile(
        {
          uri: __dirname + '/.temp/stepArticulate/thinker.ponder.context.md',
        },
        { versions: true },
      ),
      'ponder.concept': genArtifactGitFile(
        {
          uri: __dirname + '/.temp/stepArticulate/thinker.ponder.concept.md',
        },
        { versions: true },
      ),
    },
  };

  given('we want to articulate term joke', () => {
    beforeEach(async () => {
      await artifacts.caller.goal.set({ content: goal });
      await artifacts.caller.feedback.set({ content: '' });

      await artifacts.thinker['focus.context'].set({
        content: ['psychology', 'evolution', 'ecology'].join('\n'),
      });

      await artifacts.thinker['focus.concept'].set({
        content: [].join('\n'),
      });

      await artifacts.thinker['ponder.context'].set({
        content: JSON.stringify(articulatePonderCatalog.contextualize, null, 2),
      });

      await artifacts.thinker['ponder.concept'].set({
        content: JSON.stringify(articulatePonderCatalog.conceptualize, null, 2),
      });
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        caller: await enrollThread({
          role: 'caller',
          stash: {
            art: artifacts.caller,
            refs: [],
          },
        }),
        thinker: await enrollThread({
          role: 'thinker',
          stash: {
            art: artifacts.thinker,
          },
          inherit: {
            traits: getBhrainBriefs(['trait.ocd.md']),
          },
        }),
      }));

      then('upserts the thinker output', async () => {
        const result = await enweaveOneStitcher(
          { stitcher: route, threads },
          context,
        );
        console.log(JSON.stringify(result.stitch, null, 2));
        console.log(artifacts);
        console.log(artifacts.thinker['focus.concept']);

        const { content } = await artifacts.thinker['focus.concept']
          .get()
          .expect('isPresent');

        expect(content.toLowerCase()).toContain('joke');
      });
    });
  });
});
