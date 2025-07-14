import { UnexpectedCodePathError } from 'helpful-errors';
import { enweaveOneStitcher, enrollThread } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, when, then, usePrep } from 'test-fns';

import { genContextLogTrail } from '../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../.test/getContextOpenAI';
import { getMechanicBrief } from '../getMechanicBrief';
import { getRefOrgPatterns } from './getRefOrgPatterns';
import { routeCriticCodeReview } from './routeCriticCodeReview';

describe('routeCriticCodeReview', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };

  const route = routeCriticCodeReview;

  const claimsArt = genArtifactGitFile(
    {
      uri: __dirname + '/.test/multiply.claims.md',
    },
    { access: 'readonly' }, // this is a fixture, dont allow overwrite
  );

  given('inflight has code to be reviewed, expected to have blockers', () => {
    const inflightArt = genArtifactGitFile({
      uri: __dirname + '/.temp/review/all/multiply.hasblockers.toreview.ts',
    });

    const feedbackArt = genArtifactGitFile({
      uri: __dirname + '/.temp/review/all/multiply.hasblockers.feedback.md',
    });
    const feedbackCodestyleArt = genArtifactGitFile({
      uri:
        __dirname +
        '/.temp/review/all/multiply.noblockers.feedback.codestyle.md',
    });
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
            art: {
              feedback: feedbackArt,
              feedbackCodestyle: feedbackCodestyleArt,
            },
            org: {
              patterns: await getRefOrgPatterns({ purpose: 'produce' }),
            },
          },
          inherit: {
            traits: [getMechanicBrief('style.compressed.md')],
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

        expect(content).toMatch(/blocker/i);
        expect(content.length).toBeGreaterThan(10);
        expect(result.threads.critic.stitches.length).toBeGreaterThan(0);
      });
    });
  });

  given('inflight has code to be reviewed, expected no blockers', () => {
    const inflightArt = genArtifactGitFile({
      uri: __dirname + '/.temp/review/all/multiply.noblockers.toreview.ts',
    });

    const feedbackArt = genArtifactGitFile({
      uri: __dirname + '/.temp/review/all/multiply.noblockers.feedback.md',
    });
    const feedbackCodestyleArt = genArtifactGitFile({
      uri:
        __dirname +
        '/.temp/review/all/multiply.noblockers.feedback.codestyle.md',
    });
    beforeEach(async () => {
      await inflightArt.set({
        content: `
export const multiply = ({ a, b }: { a: number, b: number }): number => {
    return a * b;
};
        `,
      });
      await feedbackArt.del();
    });

    when('executing the review route', () => {
      const threads = usePrep(async () => ({
        critic: await enrollThread({
          role: 'critic',
          stash: {
            art: {
              feedback: feedbackArt,
              feedbackCodestyle: feedbackCodestyleArt,
            },
            org: {
              patterns: await getRefOrgPatterns({ purpose: 'produce' }),
            },
          },
          inherit: {
            traits: [getMechanicBrief('style.compressed.md')],
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

        expect(content).not.toMatch(/blocker/i);
        expect(content.length).toBeGreaterThan(1);
        expect(result.threads.critic.stitches.length).toBeGreaterThan(0);
      });
    });
  });
});
