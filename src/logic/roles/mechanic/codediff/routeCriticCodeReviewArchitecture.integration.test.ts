import { UnexpectedCodePathError } from 'helpful-errors';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../.test/getContextOpenAI';
import { getMechanicBrief } from '../getMechanicBrief';
import { getRefOrgPatterns } from './getRefOrgPatterns';
import { routeCriticCodeReviewArchitecture } from './routeCriticCodeReviewArchitecture';

describe('routeCriticCodeReviewArchitecture', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };

  const route = routeCriticCodeReviewArchitecture;

  const claimsArt = genArtifactGitFile(
    {
      uri: __dirname + '/.test/multiply.claims.md',
    },
    { access: 'readonly' },
  );

  given('inflight has code with architectural violations', () => {
    const inflightArt = genArtifactGitFile({
      uri:
        __dirname +
        '/.temp/review/architecture/multiply.hasblockers.toreview.ts',
    });

    const feedbackArt = genArtifactGitFile({
      uri:
        __dirname +
        '/.temp/review/architecture/multiply.hasblockers.feedback.md',
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
            art: { feedbackArchitecture: feedbackArt },
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
            art: { claims: claimsArt, domainBounds: null, domainTerms: null },
          },
        }),
      }));

      then('writes architectural feedback on the inflight diff', async () => {
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

  given.only('inflight has architecturally clean code', () => {
    const inflightArt = genArtifactGitFile({
      uri:
        __dirname +
        '/.temp/review/architecture/multiply.noblockers.toreview.ts',
    });

    const feedbackArt = genArtifactGitFile({
      uri:
        __dirname +
        '/.temp/review/architecture/multiply.noblockers.feedback.md',
    });

    beforeEach(async () => {
      await inflightArt.set({
        content: `
/**
 * .what = multiplies two numbers
 * .why = aligns with system contract for stateless numeric ops
 */
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
            art: { feedbackArchitecture: feedbackArt },
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
            art: { claims: claimsArt, domainBounds: null, domainTerms: null },
          },
        }),
      }));

      then('writes praise or no-blockers feedback', async () => {
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
