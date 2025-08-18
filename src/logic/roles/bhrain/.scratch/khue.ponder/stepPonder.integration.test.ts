import { toMilliseconds } from '@ehmpathy/uni-time';
import { enweaveOneStitcher, enrollThread } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, when, then, usePrep } from 'test-fns';

import { genContextLogTrail } from '../../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../../.test/getContextOpenAI';
import { getBhrainBriefs } from '../../getBhrainBrief';
import { stepPonder } from './stepPonder';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepPonder', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepPonder;

  const goal = `
catalog questions which are essential to envision a product journey
  `.trim();

  const artifacts = {
    'foci.goal.concept': genArtifactGitFile(
      { uri: __dirname + '/.temp/stepPonder/caller.foci.goal.concept.md' },
      { versions: true },
    ),
    'foci.goal.context': genArtifactGitFile(
      { uri: __dirname + '/.temp/stepPonder/caller.foci.goal.context.md' },
      { versions: true },
    ),
    feedback: genArtifactGitFile(
      { uri: __dirname + '/.temp/stepPonder/caller.feedback.md' },
      { versions: true },
    ),
    'focus.context': genArtifactGitFile(
      { uri: __dirname + '/.temp/stepPonder/thinker.focus.context.md' },
      { versions: true },
    ),
    'focus.concept': genArtifactGitFile(
      { uri: __dirname + '/.temp/stepPonder/thinker.focus.concept.md' },
      { versions: true },
    ),
    'foci.ponder.que.context': genArtifactGitFile(
      {
        uri: __dirname + '/.temp/stepPonder/thinker.foci.ponder.que.context.md',
      },
      { versions: true },
    ),
    'foci.ponder.que.concept': genArtifactGitFile(
      {
        uri: __dirname + '/.temp/stepPonder/thinker.foci.ponder.que.concept.md',
      },
      { versions: true },
    ),
  };

  given('we want to envision a product journey', () => {
    beforeEach(async () => {
      await artifacts['foci.goal.concept'].set({ content: goal });
      await artifacts.feedback.set({ content: '' });

      await artifacts['focus.context'].set({
        content: [
          '# focus.context',
          '',
          '- domain: generic (any domain)',
          '- constraints: quick triage; low-friction onboarding',
          '- audience: cross-functional team (product/design/eng/gtm) needing clarity fast',
        ].join('\n'),
      });

      await artifacts['focus.concept'].set({
        content: [
          '# focus.concept',
          '',
          'we are composing a question set for "envisioning a product journey" in a generic domain.',
          'the output will be a curated list of questions grouped by purpose.',
        ].join('\n'),
      });

      await artifacts['foci.ponder.que.context'].set({
        content: JSON.stringify(
          [
            'who is the primary audience or user for this journey?',
            'what problem or need is the journey meant to address?',
            'what starting point or trigger sets this journey in motion?',
            'what constraints (time, budget, technology, regulations) define the boundaries?',
            'what assumptions am i making about the user or the market?',
            'what’s unclear or missing about the current understanding of the journey?',
            'what existing factors (environment, competitors, trends) will shape this journey?',
          ],
          null,
          2,
        ),
      });

      await artifacts['foci.ponder.que.concept'].set({
        content: JSON.stringify(
          [
            'what is the desired end state or outcome of the product journey?',
            'what key stages or milestones must the journey pass through?',
            'what experience or feeling should the user have at each stage?',
            'what concept or theme could unify all the stages into one coherent story?',
            'what would success look like for both the user and the business?',
            'what models, metaphors, or analogies could help frame the journey?',
            'what single guiding principle should drive decisions along the journey?',
          ],
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
            ask: goal,
            art: {
              'foci.goal.concept': artifacts['foci.goal.concept'],
              'foci.goal.context': artifacts['foci.goal.context'],
              feedback: artifacts.feedback,
            },
            refs: [],
          },
        }),
        thinker: await enrollThread({
          role: 'thinker',
          stash: {
            art: {
              'focus.context': artifacts['focus.context'],
              'focus.concept': artifacts['focus.concept'],
              'foci.ponder.que.context': artifacts['foci.ponder.que.context'],
              'foci.ponder.que.concept': artifacts['foci.ponder.que.concept'],
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
        console.log(artifacts['focus.concept']);

        const { content } = await artifacts['focus.concept']
          .get()
          .expect('isPresent');

        expect(content.toLowerCase()).toContain('?');
      });
    });
  });
});
