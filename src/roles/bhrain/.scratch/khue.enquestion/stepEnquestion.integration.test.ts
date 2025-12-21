import { toMilliseconds } from '@ehmpathy/uni-time';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/.test/getContextOpenAI';
import { getBhrainBriefs } from '@src/roles/bhrain/getBhrainBrief';

import { enquestionPonderCatalog } from './ponder.catalog';
import { stepEnquestion } from './stepEnquestion';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepEnquestion', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepEnquestion;

  const goal = `
catalog questions which are essential to envision a product journey
  `.trim();

  // all artifacts in one place
  const artifacts = {
    caller: {
      goal: genArtifactGitFile(
        { uri: __dirname + '/.temp/stepEnquestion/caller.goal.md' },
        { versions: true },
      ),
      feedback: genArtifactGitFile(
        { uri: __dirname + '/.temp/stepEnquestion/caller.feedback.md' },
        { versions: true },
      ),
    },
    thinker: {
      'focus.context': genArtifactGitFile(
        { uri: __dirname + '/.temp/stepEnquestion/thinker.focus.context.md' },
        { versions: true },
      ),
      'focus.concept': genArtifactGitFile(
        { uri: __dirname + '/.temp/stepEnquestion/thinker.focus.concept.md' },
        { versions: true },
      ),
      'ponder.context': genArtifactGitFile(
        {
          uri:
            __dirname + '/.temp/stepEnquestion/thinker.ponder.contextualize.md',
        },
        { versions: true },
      ),
      'ponder.concept': genArtifactGitFile(
        {
          uri:
            __dirname + '/.temp/stepEnquestion/thinker.ponder.conceptualize.md',
        },
        { versions: true },
      ),
    },
  };

  given('we want to envision a product journey', () => {
    beforeEach(async () => {
      // reset + seed inputs
      await artifacts.caller.goal.set({ content: goal });
      await artifacts.caller.feedback.set({ content: '' });

      await artifacts.thinker['focus.context'].set({
        content: [
          '# focus.context',
          '',
          '- domain: generic (any domain)',
          '- constraints: quick triage; low-friction onboarding',
          '- audience: cross-functional team (product/design/eng/gtm) needing clarity fast',
        ].join('\n'),
      });

      await artifacts.thinker['focus.concept'].set({
        content: [
          '# focus.concept',
          '',
          'we are composing a question set for "envisioning a product journey" in a generic domain.',
          'the output will be a curated list of questions grouped by purpose.',
        ].join('\n'),
      });

      await artifacts.thinker['ponder.context'].set({
        content: JSON.stringify(
          enquestionPonderCatalog.contextualize.P0,
          null,
          2,
        ),
      });

      await artifacts.thinker['ponder.concept'].set({
        content: JSON.stringify(
          enquestionPonderCatalog.conceptualize.P0,
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

        expect(content.toLowerCase()).toContain('question');
      });
    });
  });
});
