import { toMilliseconds } from '@ehmpathy/uni-time';
import { enweaveOneStitcher, enrollThread } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, when, then, usePrep } from 'test-fns';

import { genContextLogTrail } from '../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../.test/getContextOpenAI';
import { getBhrainBriefs } from '../getBhrainBrief';
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
      feedback: genArtifactGitFile(
        { uri: __dirname + '/.temp/stepArticulate/caller.feedback.md' },
        { versions: true },
      ),
      'foci.goal.concept': genArtifactGitFile(
        {
          uri: __dirname + '/.temp/stepArticulate/caller.foci.goal.concept.md',
        },
        { versions: true },
      ),
      'foci.goal.context': genArtifactGitFile(
        {
          uri: __dirname + '/.temp/stepArticulate/caller.foci.goal.context.md',
        },
        { versions: true },
      ),
    },
    thinker: {
      'focus.concept': genArtifactGitFile(
        { uri: __dirname + '/.temp/stepArticulate/thinker.focus.concept.md' },
        { versions: true },
      ),
      'focus.context': genArtifactGitFile(
        { uri: __dirname + '/.temp/stepArticulate/thinker.focus.context.md' },
        { versions: true },
      ),
      'foci.ponder.ans.concept': genArtifactGitFile(
        {
          uri:
            __dirname +
            '/.temp/stepArticulate/thinker.foci.ponder.ans.concept.md',
        },
        { versions: true },
      ),
    },
  };

  given('we want to articulate term joke', () => {
    beforeEach(async () => {
      await artifacts.caller.feedback.set({ content: '' });
      await artifacts.caller['foci.goal.concept'].set({ content: goal });

      await artifacts.thinker['focus.context'].set({
        content: ['psychology', 'evolution', 'ecology'].join('\n'),
      });

      await artifacts.thinker['focus.concept'].set({
        content: [].join('\n'),
      });
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: goal,
            art: {
              'foci.goal.concept': artifacts.caller['foci.goal.concept'],
              'foci.goal.context': artifacts.caller['foci.goal.context'],
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
              'foci.ponder.ans.concept':
                artifacts.thinker['foci.ponder.ans.concept'],
            },
            briefs: [],
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
