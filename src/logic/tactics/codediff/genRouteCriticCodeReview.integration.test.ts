import { UnexpectedCodePathError } from 'helpful-errors';
import { enweaveOneStitcher } from 'rhachet';
import { given, when, then } from 'test-fns';

import { genArtifactGitFile } from '../../../__nonpublished_modules__/rhachet-artifact-git/src';
import { enrollThread } from '../../../__nonpublished_modules__/rhachet/src/logic/enrollThread';
import { usePrep } from '../../../__nonpublished_modules__/test-fns/src/usePrep';
import { genContextLogTrail } from '../../../__test_assets__/genContextLogTrail';
import { genContextStitchTrail } from '../../../__test_assets__/genContextStitchTrail';
import { getContextOpenAI } from '../../../__test_assets__/getContextOpenAI';
import { genRouteCriticCodeReview } from './genRouteCriticCodeReview';

describe('genRouteCriticCodeReview', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };

  const route = genRouteCriticCodeReview();

  const claimsArt = genArtifactGitFile(
    {
      uri: __dirname + '/.test/multiply.claims.md',
    },
    { access: 'readonly' }, // this is a fixture, dont allow overwrite
  );

  const inflightArt = genArtifactGitFile({
    uri: __dirname + '/.temp/multiply.toreview.ts',
  });

  const feedbackArt = genArtifactGitFile({
    uri: __dirname + '/.temp/multiply.feedback.md',
  });

  given('inflight has code to be reviewed', () => {
    beforeEach(async () => {
      await inflightArt.set({
        content: 'export const multiply=(a,b)=>a*b;',
      });
      await feedbackArt.del();
    });

    when('executing the review route', () => {
      const threads = usePrep(async () => ({
        critic: await enrollThread({
          role: 'critic',
          stash: {
            art: { feedback: feedbackArt },
            org: {
              patterns: [
                // todo: centralize the access
                genArtifactGitFile({
                  uri: __dirname + '/.refs/pattern.mech.args.input-context.md',
                }),
                genArtifactGitFile({
                  uri: __dirname + '/.refs/pattern.mech.arrowonly.md',
                }),
                // note how we dont include the test patterns, since this isn't for a test -> <distill>[context]
              ],
            },
          },
          inherit: {
            traits: [
              genArtifactGitFile({
                uri: __dirname + '/.refs/style.compressed.md',
              }),
            ],
          },
        }),
        artist: await enrollThread({
          role: 'artist',
          stash: {
            art: { inflight: inflightArt },
            scene: { coderefs: [inflightArt] },
          },
        }),
        student: await enrollThread({
          role: 'student',
          stash: {
            art: { claims: claimsArt },
          },
        }),
      }));

      then('writes feedback about the inflight diff', async () => {
        const result = await enweaveOneStitcher(
          { stitcher: route, threads },
          context,
        );

        const file = await feedbackArt.get();
        const content =
          file?.content ?? UnexpectedCodePathError.throw('expected file');

        expect(content).toMatch(/blocker|nitpick|praise/i);
        expect(content.length).toBeGreaterThan(10);
        expect(result.threads.critic.stitches.length).toBeGreaterThan(0);
      });
    });
  });
});
